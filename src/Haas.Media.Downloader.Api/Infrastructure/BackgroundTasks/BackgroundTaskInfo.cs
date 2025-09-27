namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public record BackgroundTaskInfo(
    Guid Id,
    string Name,
    BackgroundTaskState State,
    double Progress,
    string? StatusMessage,
    DateTimeOffset CreatedAt,
    DateTimeOffset? StartedAt = null,
    DateTimeOffset? CompletedAt = null,
    object? Payload = null,
    string? ErrorMessage = null
)
{
    public static BackgroundTaskInfo CreatePending(Guid id, string name) =>
        new(
            id,
            name,
            BackgroundTaskState.Pending,
            0,
            "Pending",
            DateTimeOffset.UtcNow
        );
}
