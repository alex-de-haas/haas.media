using Haas.Media.Core.BackgroundTasks;
using Microsoft.AspNetCore.Builder;

namespace Haas.Media.Services.Infrastructure.BackgroundTasks;

public static class BackgroundTasksConfiguration
{
    public static WebApplication UseBackgroundTasks(this WebApplication app)
    {
        app.MapHub<BackgroundTaskHub>("/hub/background-tasks");

        app.MapGet(
                "api/background-tasks",
                (IBackgroundTaskManager backgroundTaskManager) =>
                {
                    var tasks = backgroundTaskManager.GetTasks();
                    return Results.Ok(tasks);
                }
            )
            .WithName("GetBackgroundTasks")
            .RequireAuthorization();

        app.MapGet(
                "api/background-tasks/{type}",
                (string type, IBackgroundTaskManager backgroundTaskManager) =>
                {
                    var tasks = backgroundTaskManager.GetTasks(type);
                    return Results.Ok(tasks);
                }
            )
            .WithName("GetBackgroundTasksByType")
            .RequireAuthorization();

        app.MapGet(
                "api/background-tasks/{taskId:guid}",
                (Guid taskId, IBackgroundTaskManager backgroundTaskManager) =>
                {
                    return backgroundTaskManager.TryGetTask(taskId, out var taskInfo)
                        ? Results.Ok(taskInfo)
                        : Results.NotFound();
                }
            )
            .WithName("GetBackgroundTask")
            .RequireAuthorization();

        app.MapDelete(
                "api/background-tasks/{taskId:guid}",
                (Guid taskId, IBackgroundTaskManager backgroundTaskManager) =>
                {
                    return backgroundTaskManager.CancelTask(taskId)
                        ? Results.Ok()
                        : Results.NotFound();
                }
            )
            .WithName("CancelBackgroundTask")
            .RequireAuthorization();

        return app;
    }
}
