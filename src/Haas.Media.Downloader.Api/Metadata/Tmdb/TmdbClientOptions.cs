using System.ComponentModel.DataAnnotations;

namespace Haas.Media.Downloader.Api.Metadata.Tmdb;

public sealed class TmdbClientOptions
{
    public const int DefaultMaxRequestsPerSecond = 20;
    public const int DefaultMaxConcurrency = 4;
    public const int DefaultMaxRetryAttempts = 6;
    public const int DefaultBaseDelayMs = 250;
    public const int DefaultMaxDelayMs = 8000;

    [Range(1, 1000)]
    public int MaxRequestsPerSecond { get; set; } = DefaultMaxRequestsPerSecond;

    [Range(1, 100)]
    public int MaxConcurrency { get; set; } = DefaultMaxConcurrency;

    [Range(0, 20)]
    public int MaxRetryAttempts { get; set; } = DefaultMaxRetryAttempts;

    [Range(1, 60000)]
    public int BaseDelayMs { get; set; } = DefaultBaseDelayMs;

    [Range(1, 120000)]
    public int MaxDelayMs { get; set; } = DefaultMaxDelayMs;

    public void Validate()
    {
        if (MaxDelayMs < BaseDelayMs)
        {
            throw new ValidationException(
                $"{nameof(MaxDelayMs)} ({MaxDelayMs}) must be greater than or equal to {nameof(BaseDelayMs)} ({BaseDelayMs})."
            );
        }
    }
}
