namespace Haas.Media.Downloader.Api.Metadata;

public class PaginatedResult<T>
{
    public required IReadOnlyList<T> Items { get; init; }
    public required int TotalCount { get; init; }
    public required int Skip { get; init; }
    public required int Take { get; init; }
    public bool HasMore => Skip + Items.Count < TotalCount;
}
