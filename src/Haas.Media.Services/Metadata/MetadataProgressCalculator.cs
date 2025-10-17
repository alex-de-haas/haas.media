namespace Haas.Media.Services.Metadata;

/// <summary>
/// Helper class for calculating progress in metadata scan and refresh tasks.
/// </summary>
internal static class MetadataProgressCalculator
{
    /// <summary>
    /// Calculates progress percentage based on processed items and synced people.
    /// Items contribute 70% of progress, people contribute 30%.
    /// </summary>
    /// <param name="processedItems">Number of items (files/movies/TV shows) processed so far.</param>
    /// <param name="totalItems">Total number of items to process.</param>
    /// <param name="syncedPeople">Number of people metadata records synced so far.</param>
    /// <param name="totalPeople">Total number of people metadata records to sync.</param>
    /// <returns>Progress percentage between 0.0 and 100.0.</returns>
    public static double Calculate(
        int processedItems,
        int totalItems,
        int syncedPeople,
        int totalPeople
    )
    {
        // Calculate progress based on items and people
        // Items contribute 70% of progress, people contribute 30%
        var itemProgress = totalItems > 0 ? (double)processedItems / totalItems * 70.0 : 70.0;

        var peopleProgress = totalPeople > 0 ? (double)syncedPeople / totalPeople * 30.0 : 0.0;

        var progress = itemProgress + peopleProgress;
        return Math.Min(progress, 100.0);
    }
}
