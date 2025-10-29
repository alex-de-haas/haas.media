using TMDbLib.Objects.General;
using TMDbLib.Objects.TvShows;
using MovieCredits = TMDbLib.Objects.Movies.Credits;
using TvCredits = TMDbLib.Objects.TvShows.Credits;

namespace Haas.Media.Services.Metadata;

/// <summary>
/// Selects top cast and crew members based on scoring rules defined in people-sync-logic.md
/// </summary>
internal static class CreditsSelector
{
    private static readonly Dictionary<string, int> JobWeights = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Director"] = 100,
        ["Writer"] = 90,
        ["Screenplay"] = 90,
        ["Teleplay"] = 90,
        ["Story"] = 90,
        ["Executive Producer"] = 85, // For TV: showrunner heuristic
        ["Producer"] = 80,
        ["Director of Photography"] = 75,
        ["Cinematographer"] = 75,
        ["Cinematography"] = 75,
        ["Editor"] = 70,
        ["Film Editor"] = 70,
        ["Production Designer"] = 65,
        ["Original Music Composer"] = 60,
        ["Theme Music Composer"] = 60,
        ["Music"] = 60,
        ["Casting Director"] = 55,
        ["Costume Designer"] = 50,
        ["VFX Supervisor"] = 45,
        ["Special Effects Supervisor"] = 45,
        ["Sound Designer"] = 40,
        ["Supervising Sound Editor"] = 40
    };

    /// <summary>
    /// Normalizes job titles to canonical forms for consistent weighting
    /// </summary>
    private static string NormalizeJob(string job)
    {
        if (string.Equals(job, "Cinematography", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(job, "Cinematographer", StringComparison.OrdinalIgnoreCase))
        {
            return "Director of Photography";
        }

        if (string.Equals(job, "Film Editor", StringComparison.OrdinalIgnoreCase))
        {
            return "Editor";
        }

        if (string.Equals(job, "Music", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(job, "Theme Music Composer", StringComparison.OrdinalIgnoreCase))
        {
            return "Original Music Composer";
        }

        return job;
    }

    /// <summary>
    /// Gets the weight for a job title (normalized)
    /// </summary>
    private static int GetJobWeight(string job)
    {
        var normalized = NormalizeJob(job);
        return JobWeights.TryGetValue(normalized, out var weight) ? weight : 10; // default weight for unrecognized jobs
    }

    /// <summary>
    /// Selects top cast members from movie credits
    /// </summary>
    public static CastMember[] SelectTopCast(MovieCredits credits, int topCount)
    {
        if (credits?.Cast == null || credits.Cast.Count == 0)
        {
            return [];
        }

        return credits.Cast
            .GroupBy(c => c.Id) // Deduplicate by person ID
            .Select(g =>
            {
                var first = g.First();
                var hasProfile = !string.IsNullOrEmpty(first.ProfilePath);
                var popularity = first.Popularity;

                // Score: order (lower is better) + profile boost + popularity
                var score = -first.Order // Negative because lower order is better
                          + (hasProfile ? 5 : 0)
                          + Math.Min(popularity, 50) * 0.1; // Cap and scale popularity

                return new
                {
                    Cast = first,
                    Score = score
                };
            })
            .OrderByDescending(x => x.Score)
            .Take(topCount)
            .Select(x => x.Cast.Map())
            .ToArray();
    }

    /// <summary>
    /// Selects top cast members from TV show credits
    /// </summary>
    public static CastMember[] SelectTopCastForTv(TvCredits credits, int topCount)
    {
        if (credits?.Cast == null || credits.Cast.Count == 0)
        {
            return [];
        }

        return credits.Cast
            .GroupBy(c => c.Id) // Deduplicate by person ID
            .Select(g =>
            {
                var first = g.First();
                var hasProfile = !string.IsNullOrEmpty(first.ProfilePath);
                var popularity = first.Popularity;

                // Score: order (lower is better) + profile boost + popularity
                var score = -first.Order // Negative because lower order is better
                          + (hasProfile ? 5 : 0)
                          + Math.Min(popularity, 50) * 0.1; // Cap and scale popularity

                return new
                {
                    Cast = first,
                    Score = score
                };
            })
            .OrderByDescending(x => x.Score)
            .Take(topCount)
            .Select(x => x.Cast.Map())
            .ToArray();
    }

    /// <summary>
    /// Selects top crew members from movie credits
    /// </summary>
    public static CrewMember[] SelectTopCrew(MovieCredits credits, int topCount)
    {
        if (credits?.Crew == null || credits.Crew.Count == 0)
        {
            return [];
        }

        return credits.Crew
            .GroupBy(c => c.Id) // Deduplicate by person ID
            .Select(g =>
            {
                var person = g.First();
                
                // Choose the best job instance for scoring
                var bestJob = g.Select(c => new
                {
                    Job = NormalizeJob(c.Job),
                    RawJob = c.Job,
                    Weight = GetJobWeight(c.Job),
                    Department = c.Department
                })
                .OrderByDescending(x => x.Weight)
                .First();

                var hasProfile = !string.IsNullOrEmpty(person.ProfilePath);
                var popularity = person.Popularity;
                var popularityScaled = Math.Min(popularity, 50); // Cap to avoid outliers

                var score = bestJob.Weight
                          + (hasProfile ? 5 : 0)
                          + popularityScaled;

                return new
                {
                    PersonId = person.Id,
                    Name = person.Name,
                    PrimaryJob = bestJob.Job,
                    Department = bestJob.Department,
                    ProfilePath = person.ProfilePath,
                    Score = score
                };
            })
            .OrderByDescending(x => x.Score)
            .Take(topCount)
            .Select(x => new CrewMember
            {
                Id = x.PersonId,
                Name = x.Name,
                Job = x.PrimaryJob,
                Department = x.Department,
                ProfilePath = x.ProfilePath
            })
            .ToArray();
    }

    /// <summary>
    /// Selects top crew members from TV show credits
    /// </summary>
    public static CrewMember[] SelectTopCrewForTv(
        TvCredits credits,
        List<CreatedBy>? creators,
        int topCount)
    {
        if (credits?.Crew == null || credits.Crew.Count == 0)
        {
            return [];
        }

        var creatorIds = new HashSet<int>(creators?.Select(c => c.Id) ?? []);

        return credits.Crew
            .GroupBy(c => c.Id) // Deduplicate by person ID
            .Select(g =>
            {
                var person = g.First();
                
                // Choose the best job instance for scoring
                var bestJob = g.Select(c => new
                {
                    Job = NormalizeJob(c.Job),
                    RawJob = c.Job,
                    Weight = GetJobWeight(c.Job),
                    Department = c.Department
                })
                .OrderByDescending(x => x.Weight)
                .First();

                var hasProfile = !string.IsNullOrEmpty(person.ProfilePath);
                var popularity = person.Popularity;
                var popularityScaled = Math.Min(popularity, 50); // Cap to avoid outliers
                var isCreator = creatorIds.Contains(person.Id);
                var creatorBoost = isCreator ? 40 : 0;

                var score = bestJob.Weight
                          + (hasProfile ? 5 : 0)
                          + popularityScaled
                          + creatorBoost;

                return new
                {
                    PersonId = person.Id,
                    Name = person.Name,
                    PrimaryJob = bestJob.Job,
                    Department = bestJob.Department,
                    ProfilePath = person.ProfilePath,
                    Score = score
                };
            })
            .OrderByDescending(x => x.Score)
            .Take(topCount)
            .Select(x => new CrewMember
            {
                Id = x.PersonId,
                Name = x.Name,
                Job = x.PrimaryJob,
                Department = x.Department,
                ProfilePath = x.ProfilePath
            })
            .ToArray();
    }
}
