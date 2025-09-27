namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

internal readonly record struct BackgroundTaskStatusUpdate(
    BackgroundTaskState? State,
    double? Progress,
    string? StatusMessage,
    object? Payload,
    string? ErrorMessage
);
