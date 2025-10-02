namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public abstract class BackgroundTaskBase
{
    protected BackgroundTaskBase(Guid? id = null)
    {
        Id = id ?? Guid.CreateVersion7();
    }

    public Guid Id { get; }

    public string Type => GetType().Name;

    public virtual string Name => Type;
}
