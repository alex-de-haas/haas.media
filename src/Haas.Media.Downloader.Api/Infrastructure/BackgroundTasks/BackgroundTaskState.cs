namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public class BackgroundTaskState
{
    public required Guid Id { get; init; }

    public required string Type { get; init; }

    public required string Name { get; init; }

    public BackgroundTaskStatus Status { get; set; }

    public double Progress { get; set; }

    public string? ErrorMessage { get; set; }

    public DateTimeOffset CreatedAt { get; init; }

    public DateTimeOffset? StartedAt { get; set; }

    public DateTimeOffset? CompletedAt { get; set; }
}

public sealed class BackgroundTaskState<TPayload> : BackgroundTaskState
{
    public TPayload? Payload { get; set; }
}
