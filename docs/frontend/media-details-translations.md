# Media Details Translation Keys

This document describes the new translation keys added for movie details, TV show details, and episode details components.

## Overview

All translations were added to the `messages/*.json` files in the following sections:

- `movies` - Movie-related translations
- `tvShows` - TV show and episode-related translations

## Added Translation Keys

### Movies Section

The following keys were added to the `movies` section:

```json
{
  "voteCount": "{count} votes",
  "backToMovies": "Back to Movies",
  "movieNotFound": "Movie not found",
  "movieNotFoundDescription": "The movie you requested could not be found.",
  "openMovieActions": "Open movie actions",
  "deleteMovie": "Delete Movie",
  "deleteMovieConfirm": "Delete {title}?",
  "deleteMovieDescription": "This action cannot be undone. The metadata for this movie will be permanently removed.",
  "deleting": "Deleting...",
  "movieDeleted": "Movie Deleted",
  "movieDeletedMessage": "{title} metadata was removed.",
  "deleteFailed": "Delete Failed",
  "deleteFailedMessage": "Unable to delete movie metadata.",
  "watched": "Watched",
  "plays": "{count} plays",
  "play": "{count} play",
  "favorite": "Favorite",
  "theatricalReleaseDate": "Theatrical Release Date",
  "digitalReleaseDate": "Digital Release Date",
  "budget": "Budget",
  "revenue": "Revenue",
  "associatedFiles": "Associated Files",
  "noFilesLinked": "No files linked",
  "local": "Local",
  "remote": "Remote",
  "cancelDownload": "Cancel download",
  "downloadFile": "Download file",
  "preparing": "Preparing...",
  "downloadCancelled": "Download Cancelled",
  "downloadCancelledMessage": "The download has been cancelled.",
  "cancellationFailed": "Cancellation Failed",
  "cancellationFailedMessage": "Failed to cancel the download.",
  "downloadStarted": "Download Started",
  "downloadStartedMessage": "File download has been queued. Check progress below.",
  "downloadFailedNoDirectories": "No movie directories configured. Please configure movie directories in settings.",
  "credits": "Credits",
  "creditsDescription": "Browse cast and crew details",
  "showingCastMembers": "Showing {displayed} of {total} cast members",
  "showingCrewMembers": "Showing {displayed} of {total} crew members"
}
```

### TV Shows Section

The following keys were added to the `tvShows` section:

```json
{
  "episode": "Episode",
  "season": "Season",
  "voteCount": "{count} votes",
  "backToTVShows": "Back to TV Shows",
  "tvShowNotFound": "TV Show not found",
  "tvShowNotFoundDescription": "The TV show you requested could not be found.",
  "episodeNotFound": "Episode not found",
  "episodeNotFoundDescription": "The episode you requested could not be found.",
  "openShowActions": "Open show actions",
  "deleteShow": "Delete TV Show",
  "deleteShowConfirm": "Delete {title}?",
  "deleteShowDescription": "This action cannot be undone. The metadata for this TV show will be permanently removed.",
  "deleting": "Deleting...",
  "showDeleted": "TV Show Deleted",
  "showDeletedMessage": "{title} metadata was removed.",
  "deleteFailed": "Delete Failed",
  "deleteFailedMessage": "Unable to delete TV show metadata.",
  "watchedEpisodes": "{count} watched",
  "totalPlayCount": "{count} plays",
  "favorite": "Favorite",
  "overview": "Overview",
  "credits": "Credits",
  "creditsDescription": "Browse cast and crew details",
  "cast": "Cast",
  "crew": "Crew",
  "showingCastMembers": "Showing {displayed} of {total} cast members",
  "showingCrewMembers": "Showing {displayed} of {total} crew members",
  "totalEpisodes": "{count} episodes",
  "expandAll": "Expand All",
  "collapseAll": "Collapse All",
  "seasonNumber": "Season {number}",
  "episodeCount": "{count} episodes",
  "noLocalFile": "No local file linked",
  "airDate": "Air Date",
  "runtime": "Runtime",
  "minutes": "{count} min",
  "backToShow": "Back to {title}"
}
```

## Variable Placeholders

The following translation keys contain variables that need to be preserved in translations:

- `{count}` - Numeric count (votes, plays, episodes, etc.)
- `{title}` - Movie or TV show title
- `{year}` - Year value
- `{displayed}` - Number displayed
- `{total}` - Total number
- `{number}` - Season or episode number
- `{plural}` - Plural suffix (may vary by language)

## Components Updated

The following components now use these translations:

1. **`movie-details.tsx`** - Movie detail page
   - Uses `movies` and `common` namespaces
   - Includes file download functionality
   - Shows cast/crew credits

2. **`tvshow-details.tsx`** - TV show detail page
   - Uses `tvShows` and `common` namespaces
   - Includes season/episode accordion
   - Shows merged cast/crew from show and episodes

3. **`episode-details.tsx`** - Individual episode detail page
   - Uses `tvShows` namespace
   - Shows episode-specific cast and crew
   - Links back to parent show

## Translation Guidelines

When translating these keys to other languages:

1. **Maintain variable placeholders** - Keep `{variable}` syntax intact
2. **Adjust word order** - Place variables where natural in the target language
3. **Pluralization** - Consider language-specific plural rules
4. **Formal vs. Informal** - Match the tone used in existing translations
5. **Button actions** - Keep action verbs clear and concise
6. **Error messages** - Ensure clarity for user guidance

## Example Translations

### Dutch (nl.json) Example

```json
{
  "backToMovies": "Terug naar Films",
  "deleteMovie": "Film Verwijderen",
  "deleteMovieConfirm": "{title} verwijderen?",
  "watched": "Bekeken",
  "favorite": "Favoriet",
  "credits": "Credits",
  "cast": "Cast",
  "crew": "Crew"
}
```

### German (de.json) Example

```json
{
  "backToMovies": "Zurück zu Filmen",
  "deleteMovie": "Film Löschen",
  "deleteMovieConfirm": "{title} löschen?",
  "watched": "Angesehen",
  "favorite": "Favorit",
  "credits": "Credits",
  "cast": "Besetzung",
  "crew": "Crew"
}
```

## Usage in Components

Components use the `useTranslations` hook from `next-intl`:

```tsx
import { useTranslations } from "next-intl";

function MovieDetails() {
  const t = useTranslations("movies");
  const tCommon = useTranslations("common");

  return (
    <div>
      <h1>{t("movieDetails")}</h1>
      <Button>{tCommon("delete")}</Button>
    </div>
  );
}
```

## See Also

- [Internationalization Guide](./internationalization.md)
- [Theme System](./theme-system.md)
- Main translations file: `src/Haas.Media.Web/messages/en.json`
