using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Haas.Media.Downloader.Api.Metadata;

namespace Haas.Media.Downloader.Api.Jellyfin;

public class JellyfinService
{
    private readonly IMetadataApi _metadataApi;
    private readonly ILogger<JellyfinService> _logger;
    private readonly string _dataDirectory;
    private readonly string _serverId;
    private const string ImageBaseUrl = "https://image.tmdb.org/t/p/";
    
    // Helper method to get first file for a media item
    private async Task<FileMetadata?> GetFirstFileForMediaAsync(int mediaId, LibraryType mediaType)
    {
        var files = await _metadataApi.GetFilesByMediaIdAsync(mediaId, mediaType);
        return files.FirstOrDefault();
    }
    
    // Helper method to get file for a specific episode
    private async Task<FileMetadata?> GetEpisodeFileAsync(int tvShowId, int seasonNumber, int episodeNumber)
    {
        var files = await _metadataApi.GetFilesByMediaIdAsync(tvShowId, LibraryType.TVShows);
        return files.FirstOrDefault(f => f.SeasonNumber == seasonNumber && f.EpisodeNumber == episodeNumber);
    }

    public JellyfinService(
        IMetadataApi metadataApi,
        IConfiguration configuration,
        ILogger<JellyfinService> logger
    )
    {
        _metadataApi = metadataApi;
        _logger = logger;
        _dataDirectory =
            configuration["DATA_DIRECTORY"]
            ?? throw new InvalidOperationException("DATA_DIRECTORY is not configured");

        _serverId = ComputeServerId(_dataDirectory);
    }

    public string ServerId => _serverId;

    public JellyfinSystemInfoResponse GetSystemInfo()
    {
        var version = typeof(JellyfinService).Assembly.GetName().Version?.ToString() ?? "0.0.0";
        var osDescription = System.Runtime.InteropServices.RuntimeInformation.OSDescription;

        return new JellyfinSystemInfoResponse
        {
            Id = _serverId,
            ServerName = "Haas.Media",
            ProductName = "Haas.Media Jellyfin Bridge",
            Version = version,
            OperatingSystem = osDescription,
            StartupWizardCompleted = true,
        };
    }

    public async Task<JellyfinLibraryEnvelope> GetLibrariesAsync(CancellationToken cancellationToken = default)
    {
        var libraries = (await _metadataApi.GetLibrariesAsync()).ToList();
        var items = new List<JellyfinLibraryItem>(libraries.Count);

        foreach (var library in libraries)
        {
            var collectionType = library.Type == LibraryType.Movies ? "movies" : "tvshows";
            var childCount = library.Type == LibraryType.Movies
                ? await CountMoviesAsync(library.Id)
                : await CountTvShowsAsync(library.Id);

            items.Add(
                new JellyfinLibraryItem
                {
                    Id = JellyfinIdHelper.CreateLibraryId(library.Id ?? string.Empty),
                    Name = library.Title,
                    CollectionType = collectionType,
                    ServerId = _serverId,
                    ChildCount = childCount,
                }
            );
        }

        return new JellyfinLibraryEnvelope
        {
            Items = items.ToArray(),
            TotalRecordCount = items.Count,
        };
    }

    public async Task<JellyfinItemsEnvelope> GetLibraryViewsAsync(CancellationToken cancellationToken = default)
    {
        var librariesEnvelope = await GetLibrariesAsync(cancellationToken);
        var items = librariesEnvelope
            .Items
            .Select(MapLibraryItemToFolder)
            .ToArray();

        return new JellyfinItemsEnvelope
        {
            Items = items,
            TotalRecordCount = items.Length,
        };
    }

    public async Task<JellyfinVirtualFolderInfo[]> GetVirtualFoldersAsync(CancellationToken cancellationToken = default)
    {
        var libraries = await _metadataApi.GetLibrariesAsync();
        return libraries
            .Select(library => new JellyfinVirtualFolderInfo
            {
                Name = library.Title,
                Locations = new[] { library.DirectoryPath },
                CollectionType = library.Type == LibraryType.Movies ? "movies" : "tvshows",
                ItemId = JellyfinIdHelper.CreateLibraryId(library.Id ?? string.Empty),
                PrimaryImageItemId = null,
                RefreshProgress = null,
                RefreshStatus = null
            })
            .ToArray();
    }

    public async Task<JellyfinItemsEnvelope> GetItemsAsync(
        JellyfinItemsQuery query,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(query.ParentId))
        {
            var librariesEnvelope = await GetLibrariesAsync(cancellationToken);
            var items = librariesEnvelope
                .Items
                .Select(library => MapLibraryItemToFolder(library))
                .ToArray();

            return new JellyfinItemsEnvelope
            {
                Items = items,
                TotalRecordCount = items.Length,
            };
        }

        if (JellyfinIdHelper.TryParseLibraryId(query.ParentId, out var libraryId))
        {
            var library = await _metadataApi.GetLibraryAsync(libraryId);
            if (library is null)
            {
                return EmptyItems();
            }

            return await BuildLibraryItemsAsync(library, query);
        }

        if (JellyfinIdHelper.TryParseSeriesId(query.ParentId, out var seriesId))
        {
            var series = await _metadataApi.GetTVShowMetadataByIdAsync(seriesId);
            if (series is null)
            {
                return EmptyItems();
            }

            return await BuildSeriesChildrenAsync(series, query);
        }

        if (
            JellyfinIdHelper.TryParseSeasonId(query.ParentId, out var parentSeriesId, out var seasonNumber)
        )
        {
            var show = await _metadataApi.GetTVShowMetadataByIdAsync(parentSeriesId);
            if (show is null)
            {
                return EmptyItems();
            }

            return await BuildSeasonEpisodesAsync(show, seasonNumber, query);
        }

        return EmptyItems();
    }

    public async Task<JellyfinItem?> GetItemByIdAsync(string itemId, CancellationToken cancellationToken = default)
    {
        if (JellyfinIdHelper.TryParseLibraryId(itemId, out var libraryId))
        {
            var library = await _metadataApi.GetLibraryAsync(libraryId);
            if (library is null)
            {
                return null;
            }

            var libraryCollectionType = library.Type == LibraryType.Movies ? "movies" : "tvshows";
            return new JellyfinItem
            {
                Id = JellyfinIdHelper.CreateLibraryId(libraryId),
                Name = library.Title,
                OriginalTitle = library.Title,
                SortName = library.Title,
                Type = "CollectionFolder",
                DisplayPreferencesId = JellyfinIdHelper.CreateLibraryId(libraryId),
                CollectionType = libraryCollectionType,
                MediaType = "Folder",
                ParentId = null,
                IsFolder = true,
                Overview = library.Description,
                ServerId = _serverId,
                Genres = null,
                UserData = new JellyfinUserData { Played = false },
            };
        }

        if (JellyfinIdHelper.TryParseMovieId(itemId, out var movieId))
        {
            var movie = await _metadataApi.GetMovieMetadataByIdAsync(movieId);
            if (movie is null)
            {
                return null;
            }

            return await MapMovieAsync(movie);
        }

        if (JellyfinIdHelper.TryParseSeriesId(itemId, out var seriesId))
        {
            var show = await _metadataApi.GetTVShowMetadataByIdAsync(seriesId);
            if (show is null)
            {
                return null;
            }

            return await MapSeriesAsync(show);
        }

        if (JellyfinIdHelper.TryParseSeasonId(itemId, out var seriesIdForSeason, out var seasonNumber))
        {
            var show = await _metadataApi.GetTVShowMetadataByIdAsync(seriesIdForSeason);
            if (show is null)
            {
                return null;
            }

            return MapSeason(show, seasonNumber);
        }

        if (
            JellyfinIdHelper.TryParseEpisodeId(
                itemId,
                out var episodeSeriesId,
                out var episodeSeason,
                out var episodeNumber
            )
        )
        {
            var show = await _metadataApi.GetTVShowMetadataByIdAsync(episodeSeriesId);
            if (show is null)
            {
                return null;
            }

            var episodeMetadata = show
                .Seasons.FirstOrDefault(s => s.SeasonNumber == episodeSeason)?
                .Episodes.FirstOrDefault(e => e.EpisodeNumber == episodeNumber);

            if (episodeMetadata is null)
            {
                return null;
            }

            return await MapEpisodeAsync(show, episodeMetadata);
        }

        return null;
    }

    public async Task<JellyfinMediaPath?> ResolveMediaPathAsync(string itemId, string? mediaSourceId = null)
    {
        if (JellyfinIdHelper.TryParseMovieId(itemId, out var movieId))
        {
            var movie = await _metadataApi.GetMovieMetadataByIdAsync(movieId);
            if (movie is null)
            {
                return null;
            }

            var fileMetadata = await GetFirstFileForMediaAsync(movieId, LibraryType.Movies);
            if (fileMetadata is null)
            {
                return null;
            }

            return GetMediaPath(fileMetadata.FilePath);
        }

        if (
            JellyfinIdHelper.TryParseEpisodeId(itemId, out var seriesId, out var seasonNumber, out var episodeNumber)
        )
        {
            var series = await _metadataApi.GetTVShowMetadataByIdAsync(seriesId);
            if (series is null)
            {
                return null;
            }

            var fileMetadata = await GetEpisodeFileAsync(seriesId, seasonNumber, episodeNumber);
            if (fileMetadata is null)
            {
                return null;
            }

            return GetMediaPath(fileMetadata.FilePath);
        }

        if (JellyfinIdHelper.TryParseSeriesId(itemId, out var showId))
        {
            var series = await _metadataApi.GetTVShowMetadataByIdAsync(showId);
            if (series is null)
            {
                return null;
            }

            var fileMetadata = await GetFirstFileForMediaAsync(showId, LibraryType.TVShows);
            if (fileMetadata is null)
            {
                return null;
            }

            return GetMediaPath(fileMetadata.FilePath);
        }

        return null;
    }

    public async Task<string?> GetImageUrlAsync(
        string itemId,
        string imageType,
        string size = "w780",
        CancellationToken cancellationToken = default
    )
    {
        string? relativePath = null;

        if (JellyfinIdHelper.TryParseMovieId(itemId, out var movieId))
        {
            var movie = await _metadataApi.GetMovieMetadataByIdAsync(movieId);
            if (movie is null)
            {
                return null;
            }

            relativePath = string.Equals(imageType, "Primary", StringComparison.OrdinalIgnoreCase)
                ? movie.PosterPath
                : movie.BackdropPath;
        }
        else if (JellyfinIdHelper.TryParseSeriesId(itemId, out var seriesId))
        {
            var show = await _metadataApi.GetTVShowMetadataByIdAsync(seriesId);
            if (show is null)
            {
                return null;
            }

            relativePath = string.Equals(imageType, "Backdrop", StringComparison.OrdinalIgnoreCase)
                ? show.BackdropPath
                : show.PosterPath;
        }
        else if (
            JellyfinIdHelper.TryParseSeasonId(itemId, out var seriesIdForSeason, out var seasonNumber)
        )
        {
            var show = await _metadataApi.GetTVShowMetadataByIdAsync(seriesIdForSeason);
            var season = show?.Seasons.FirstOrDefault(s => s.SeasonNumber == seasonNumber);
            relativePath = season?.PosterPath;
        }

        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return null;
        }

        var sanitizedSize = string.IsNullOrWhiteSpace(size) ? "original" : size.Trim('/');
        return $"{ImageBaseUrl}{sanitizedSize}{relativePath}";
    }

    private async Task<JellyfinItemsEnvelope> BuildLibraryItemsAsync(
        LibraryInfo library,
        JellyfinItemsQuery query
    )
    {
        if (library.Type == LibraryType.Movies)
        {
            var movies = (await _metadataApi.GetMovieMetadataAsync(library.Id)).ToList();
            var filtered = FilterByName(movies, query.SearchTerm, movie => movie.Title);
            var mappingTasks = filtered.Select(async movie => await MapMovieAsync(movie));
            var allItems = await Task.WhenAll(mappingTasks);
            var items = allItems.Where(item => MatchesType(item, query)).ToArray();

            if (query.Recursive)
            {
                return new JellyfinItemsEnvelope { Items = items, TotalRecordCount = items.Length };
            }

            return new JellyfinItemsEnvelope { Items = items, TotalRecordCount = items.Length };
        }
        else
        {
            var shows = (await _metadataApi.GetTVShowMetadataAsync(library.Id)).ToList();
            var filtered = FilterByName(shows, query.SearchTerm, show => show.Title);
            var mappingTasks = filtered.Select(async show => await MapSeriesAsync(show));
            var allItems = await Task.WhenAll(mappingTasks);
            var items = allItems.Where(item => MatchesType(item, query)).ToList();

            if (query.Recursive)
            {
                var additional = new List<JellyfinItem>();
                foreach (var show in filtered)
                {
                    additional.AddRange(await MapAllEpisodesAsync(show, query));
                }
                items.AddRange(additional);
            }

            return new JellyfinItemsEnvelope
            {
                Items = items.ToArray(),
                TotalRecordCount = items.Count,
            };
        }
    }

    private async Task<JellyfinItemsEnvelope> BuildSeriesChildrenAsync(TVShowMetadata show, JellyfinItemsQuery query)
    {
        var items = new List<JellyfinItem>();
        foreach (var season in show.Seasons.OrderBy(s => s.SeasonNumber))
        {
            var seasonItem = MapSeason(show, season.SeasonNumber);
            if (MatchesType(seasonItem, query))
            {
                items.Add(seasonItem);
            }

            if (query.Recursive)
            {
                foreach (var episode in season.Episodes.OrderBy(e => e.EpisodeNumber))
                {
                    var mappedEpisode = await MapEpisodeAsync(show, episode);
                    if (MatchesType(mappedEpisode, query))
                    {
                        items.Add(mappedEpisode);
                    }
                }
            }
        }

        return new JellyfinItemsEnvelope
        {
            Items = items.ToArray(),
            TotalRecordCount = items.Count,
        };
    }

    private async Task<JellyfinItemsEnvelope> BuildSeasonEpisodesAsync(
        TVShowMetadata show,
        int seasonNumber,
        JellyfinItemsQuery query
    )
    {
        var season = show.Seasons.FirstOrDefault(s => s.SeasonNumber == seasonNumber);
        if (season is null)
        {
            return EmptyItems();
        }

        var episodeList = new List<JellyfinItem>();
        foreach (var episode in season.Episodes.OrderBy(e => e.EpisodeNumber))
        {
            var mappedEpisode = await MapEpisodeAsync(show, episode);
            if (MatchesType(mappedEpisode, query))
            {
                episodeList.Add(mappedEpisode);
            }
        }

        return new JellyfinItemsEnvelope
        {
            Items = episodeList.ToArray(),
            TotalRecordCount = episodeList.Count,
        };
    }

    private async Task<IEnumerable<JellyfinItem>> MapAllEpisodesAsync(TVShowMetadata show, JellyfinItemsQuery query)
    {
        var items = new List<JellyfinItem>();
        
        foreach (var season in show.Seasons)
        {
            if (MatchesType("Season", query.IncludeItemTypes))
            {
                items.Add(MapSeason(show, season.SeasonNumber));
            }

            foreach (var episode in season.Episodes)
            {
                var mapped = await MapEpisodeAsync(show, episode);
                if (MatchesType(mapped, query))
                {
                    items.Add(mapped);
                }
            }
        }
        
        return items;
    }

    private JellyfinItem MapLibraryItemToFolder(JellyfinLibraryItem library)
    {
        return new JellyfinItem
        {
            Id = library.Id,
            Name = library.Name,
            OriginalTitle = library.Name,
            SortName = library.Name,
            Type = "CollectionFolder",
            DisplayPreferencesId = library.Id,
            CollectionType = library.CollectionType,
            MediaType = "Folder",
            ParentId = null,
            IsFolder = true,
            ServerId = _serverId,
            MediaSources = null,
            UserData = null,
            ChildCount = library.ChildCount,
            ImageTags = null,
            BackdropImageTags = null,
            LocationType = "FileSystem",
        };
    }

    private async Task<JellyfinItem> MapMovieAsync(MovieMetadata metadata)
    {
        // Get first file metadata for this movie
        var fileMetadata = await GetFirstFileForMediaAsync(metadata.Id, LibraryType.Movies);
        var parentId = fileMetadata?.LibraryId is null
            ? null
            : JellyfinIdHelper.CreateLibraryId(fileMetadata.LibraryId);

        var mediaSource = TryCreateMediaSource(JellyfinIdHelper.CreateMovieId(metadata.Id), fileMetadata?.FilePath);
        var imageTags = BuildPrimaryImageTag(metadata.PosterPath);
        var backdropTags = BuildBackdropImageTag(metadata.BackdropPath);

        return new JellyfinItem
        {
            Id = JellyfinIdHelper.CreateMovieId(metadata.Id),
            Name = metadata.Title,
            OriginalTitle = metadata.OriginalTitle,
            SortName = metadata.Title,
            Type = "Movie",
            DisplayPreferencesId = JellyfinIdHelper.CreateMovieId(metadata.Id),
            CollectionType = "movies",
            MediaType = "Video",
            ParentId = parentId,
            IsFolder = false,
            Overview = metadata.Overview,
            Tagline = null,
            Path = mediaSource?.Path,
            ServerId = _serverId,
            PremiereDate = metadata.ReleaseDate is null ? null : DateTime.SpecifyKind(metadata.ReleaseDate.Value, DateTimeKind.Utc),
            ProductionYear = metadata.ReleaseDate?.Year,
            RunTimeTicks = null,
            ImageTags = imageTags,
            BackdropImageTags = backdropTags,
            LocationType = "FileSystem",
            MediaSources = mediaSource is null ? [] : new[] { mediaSource },
            UserData = new JellyfinUserData { Played = false },
            Genres = metadata.Genres,
        };
    }

    private async Task<JellyfinItem> MapSeriesAsync(TVShowMetadata metadata)
    {
        // Get first file metadata for this TV show to determine library
        var fileMetadata = await GetFirstFileForMediaAsync(metadata.Id, LibraryType.TVShows);
        var parentId = fileMetadata?.LibraryId is null
            ? null
            : JellyfinIdHelper.CreateLibraryId(fileMetadata.LibraryId);

        var posterTags = BuildPrimaryImageTag(metadata.PosterPath);
        var backdropTags = BuildBackdropImageTag(metadata.BackdropPath);

        return new JellyfinItem
        {
            Id = JellyfinIdHelper.CreateSeriesId(metadata.Id),
            Name = metadata.Title,
            OriginalTitle = metadata.OriginalTitle,
            SortName = metadata.Title,
            Type = "Series",
            DisplayPreferencesId = JellyfinIdHelper.CreateSeriesId(metadata.Id),
            CollectionType = "tvshows",
            MediaType = "Video",
            ParentId = parentId,
            IsFolder = true,
            Overview = metadata.Overview,
            Tagline = null,
            Path = null,
            ServerId = _serverId,
            PremiereDate = null,
            ProductionYear = null,
            RunTimeTicks = null,
            ImageTags = posterTags,
            BackdropImageTags = backdropTags,
            LocationType = "FileSystem",
            UserData = new JellyfinUserData { Played = false },
            Genres = metadata.Genres,
        };
    }

    private JellyfinItem MapSeason(TVShowMetadata metadata, int seasonNumber)
    {
        var season = metadata.Seasons.FirstOrDefault(s => s.SeasonNumber == seasonNumber);
        var seasonName = season is null ? $"Season {seasonNumber}" : $"Season {season.SeasonNumber}";
        var imageTags = BuildPrimaryImageTag(season?.PosterPath);

        return new JellyfinItem
        {
            Id = JellyfinIdHelper.CreateSeasonId(metadata.Id, seasonNumber),
            Name = seasonName,
            OriginalTitle = seasonName,
            SortName = seasonName,
            Type = "Season",
            DisplayPreferencesId = JellyfinIdHelper.CreateSeasonId(metadata.Id, seasonNumber),
            CollectionType = "tvshows",
            MediaType = "Video",
            ParentId = JellyfinIdHelper.CreateSeriesId(metadata.Id),
            IsFolder = true,
            Overview = season?.Overview,
            Tagline = null,
            Path = null,
            ServerId = _serverId,
            PremiereDate = null,
            ProductionYear = null,
            RunTimeTicks = null,
            ImageTags = imageTags,
            BackdropImageTags = null,
            LocationType = "FileSystem",
            UserData = new JellyfinUserData { Played = false },
            ParentIndexNumberName = metadata.Title,
            IndexNumber = season?.SeasonNumber ?? seasonNumber,
            Genres = null,
        };
    }

    private async Task<JellyfinItem> MapEpisodeAsync(TVShowMetadata show, TVEpisodeMetadata episode)
    {
        // Get file metadata for this specific episode
        var fileMetadata = await GetEpisodeFileAsync(show.Id, episode.SeasonNumber, episode.EpisodeNumber);
        var mediaSource = TryCreateMediaSource(
            JellyfinIdHelper.CreateEpisodeId(show.Id, episode.SeasonNumber, episode.EpisodeNumber),
            fileMetadata?.FilePath
        );

        return new JellyfinItem
        {
            Id = JellyfinIdHelper.CreateEpisodeId(show.Id, episode.SeasonNumber, episode.EpisodeNumber),
            Name = episode.Name,
            OriginalTitle = episode.Name,
            SortName = episode.Name,
            Type = "Episode",
            DisplayPreferencesId = JellyfinIdHelper.CreateEpisodeId(show.Id, episode.SeasonNumber, episode.EpisodeNumber),
            CollectionType = "tvshows",
            MediaType = "Video",
            ParentId = JellyfinIdHelper.CreateSeasonId(show.Id, episode.SeasonNumber),
            IsFolder = false,
            Overview = episode.Overview,
            Tagline = null,
            Path = mediaSource?.Path,
            ServerId = _serverId,
            PremiereDate = null,
            ProductionYear = null,
            RunTimeTicks = null,
            ImageTags = null,
            BackdropImageTags = null,
            LocationType = "FileSystem",
            MediaSources = mediaSource is null ? Array.Empty<JellyfinMediaSource>() : new[] { mediaSource },
            UserData = new JellyfinUserData { Played = false },
            IndexNumber = episode.EpisodeNumber,
            ParentIndexNumber = episode.SeasonNumber,
            SeriesName = show.Title,
            SeriesId = JellyfinIdHelper.CreateSeriesId(show.Id),
            SeasonId = JellyfinIdHelper.CreateSeasonId(show.Id, episode.SeasonNumber),
            SeasonName = $"Season {episode.SeasonNumber}",
            Genres = null,
        };
    }

    private JellyfinMediaSource? TryCreateMediaSource(string itemId, string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return null;
        }

        var mediaPath = GetMediaPath(relativePath);
        if (mediaPath is null)
        {
            return null;
        }

        long? size = null;
        if (File.Exists(mediaPath.AbsolutePath))
        {
            size = new FileInfo(mediaPath.AbsolutePath).Length;
        }

        var mediaStreams = new List<JellyfinMediaStream>
        {
            new JellyfinMediaStream
            {
                Type = "Video",
                Codec = null,
                Index = 0,
                Language = null,
                IsDefault = true,
            },
        };

        return new JellyfinMediaSource
        {
            Id = $"{itemId}-source",
            Path = mediaPath.RelativePath,
            Protocol = "File",
            Container = mediaPath.Container,
            Size = size,
            SupportsDirectPlay = true,
            SupportsDirectStream = true,
            SupportsTranscoding = true,
            MediaStreams = mediaStreams,
        };
    }

    private JellyfinMediaPath? GetMediaPath(string relativePath)
    {
        var absolute = Path.Combine(_dataDirectory, relativePath);
        var normalizedAbsolute = Path.GetFullPath(absolute);
        var normalizedRoot = Path.GetFullPath(_dataDirectory);

        if (!normalizedAbsolute.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Rejected media path outside data directory: {Path}", normalizedAbsolute);
            return null;
        }

        var container = Path.GetExtension(normalizedAbsolute)
            .TrimStart('.')
            .ToLowerInvariant();

        return new JellyfinMediaPath
        {
            AbsolutePath = normalizedAbsolute,
            RelativePath = Path.GetRelativePath(_dataDirectory, normalizedAbsolute),
            Container = string.IsNullOrWhiteSpace(container) ? null : container,
        };
    }

    private static IReadOnlyDictionary<string, string>? BuildPrimaryImageTag(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return null;
        }

        return new Dictionary<string, string>
        {
            ["Primary"] = path.Trim(),
        };
    }

    private static IReadOnlyList<string>? BuildBackdropImageTag(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return null;
        }

        return new[] { path.Trim() };
    }

    private static IReadOnlyList<T> FilterByName<T>(
        IReadOnlyList<T> source,
        string? searchTerm,
        Func<T, string> selector
    )
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
        {
            return source;
        }

        var comparer = StringComparison.OrdinalIgnoreCase;
        return source.Where(item => selector(item).Contains(searchTerm, comparer)).ToList();
    }

    private static JellyfinItemsEnvelope EmptyItems() =>
        new() { Items = Array.Empty<JellyfinItem>(), TotalRecordCount = 0 };

    private bool MatchesType(JellyfinItem item, JellyfinItemsQuery query)
    {
        if (query.IncludeItemTypes.Count == 0)
        {
            return true;
        }

        return MatchesType(item.Type, query.IncludeItemTypes);
    }

    private static bool MatchesType(string type, IReadOnlySet<string> requestedTypes)
    {
        if (requestedTypes.Count == 0)
        {
            return true;
        }

        foreach (var requested in requestedTypes)
        {
            if (string.Equals(requested, type, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private async Task<int> CountMoviesAsync(string? libraryId)
    {
        if (string.IsNullOrWhiteSpace(libraryId))
        {
            return 0;
        }

        var movies = await _metadataApi.GetMovieMetadataAsync(libraryId);
        return movies.Count();
    }

    private async Task<int> CountTvShowsAsync(string? libraryId)
    {
        if (string.IsNullOrWhiteSpace(libraryId))
        {
            return 0;
        }

        var shows = await _metadataApi.GetTVShowMetadataAsync(libraryId);
        return shows.Count();
    }

    internal static string ComputeServerId(string rootPath)
    {
        var normalized = Path.GetFullPath(rootPath).ToLowerInvariant();
        var bytes = Encoding.UTF8.GetBytes(normalized);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash)[..16];
    }
}
