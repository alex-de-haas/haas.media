using Microsoft.Extensions.DependencyInjection;

namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddBackgroundTasks(this IServiceCollection services)
    {
        services.AddSingleton<BackgroundTaskService>();
        services.AddSingleton<IBackgroundTaskService>(sp => sp.GetRequiredService<BackgroundTaskService>());
        services.AddHostedService(sp => sp.GetRequiredService<BackgroundTaskService>());
        return services;
    }
}
