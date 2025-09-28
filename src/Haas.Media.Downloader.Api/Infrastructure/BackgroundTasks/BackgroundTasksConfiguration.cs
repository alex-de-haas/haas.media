using Microsoft.AspNetCore.Builder;

namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public static class BackgroundTasksConfiguration
{
    public static WebApplication UseBackgroundTasks(this WebApplication app)
    {
        app.MapHub<BackgroundTaskHub>("/hub/background-tasks");

        app.MapGet(
                "api/background-tasks",
                (IBackgroundTaskService backgroundTaskService) =>
                {
                    var tasks = backgroundTaskService.GetTasks();
                    return Results.Ok(tasks);
                }
            )
            .WithName("GetBackgroundTasks")
            .RequireAuthorization();

        app.MapGet(
                "api/background-tasks/{taskId:guid}",
                (Guid taskId, IBackgroundTaskService backgroundTaskService) =>
                {
                    return backgroundTaskService.TryGetTask(taskId, out var taskInfo)
                        ? Results.Ok(taskInfo)
                        : Results.NotFound();
                }
            )
            .WithName("GetBackgroundTask")
            .RequireAuthorization();

        app.MapDelete(
                "api/background-tasks/{taskId:guid}",
                (Guid taskId, IBackgroundTaskService backgroundTaskService) =>
                {
                    return backgroundTaskService.TryCancel(taskId)
                        ? Results.Ok()
                        : Results.NotFound();
                }
            )
            .WithName("CancelBackgroundTask")
            .RequireAuthorization();

        return app;
    }
}
