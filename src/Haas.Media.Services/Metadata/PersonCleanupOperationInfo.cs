namespace Haas.Media.Services.Metadata;

public sealed record PersonCleanupOperationInfo(
    string Id,
    int TotalPeople,
    int CheckedPeople,
    int DeletedPeople,
    string Stage,
    DateTime? StartedAt = null,
    DateTime? CompletedAt = null,
    string? LastError = null
)
{
    public PersonCleanupOperationInfo()
        : this(
            Id: Guid.NewGuid().ToString(),
            TotalPeople: 0,
            CheckedPeople: 0,
            DeletedPeople: 0,
            Stage: "Initializing",
            StartedAt: DateTime.UtcNow
        ) { }
}
