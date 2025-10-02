namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddBackgroundTasks(this IServiceCollection services)
    {
        services.AddSingleton<BackgroundTaskManager>();
        services.AddSingleton<IBackgroundTaskManager>(sp => sp.GetRequiredService<BackgroundTaskManager>());
        services.AddHostedService(sp => sp.GetRequiredService<BackgroundTaskManager>());
        return services;
    }

    public static IServiceCollection AddBackgroundTask<TTask, TPayload, TWorker>(this IServiceCollection services)
        where TTask : BackgroundTaskBase
        where TWorker : class, IBackgroundWorker<TTask, TPayload>
    {
        services.AddSingleton<IBackgroundWorker<TTask, TPayload>, TWorker>();

        return services;
    }
}
