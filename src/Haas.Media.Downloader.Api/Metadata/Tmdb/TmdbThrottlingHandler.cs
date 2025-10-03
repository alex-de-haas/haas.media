using System.Net.Http.Headers;
using System.Threading.RateLimiting;
using Microsoft.Extensions.Options;

namespace Haas.Media.Downloader.Api.Metadata.Tmdb;

public sealed class TmdbThrottlingHandler : DelegatingHandler
{
    private static readonly Random Random = Random.Shared;

    private readonly ILogger<TmdbThrottlingHandler> _logger;
    private readonly IOptionsMonitor<TmdbClientOptions> _optionsMonitor;
    private readonly TimeProvider _timeProvider;

    private RateLimiter _rateLimiter;
    private RateLimiter _concurrencyLimiter;
    private readonly IDisposable? _optionsReloadToken;

    public TmdbThrottlingHandler(
        IOptionsMonitor<TmdbClientOptions> optionsMonitor,
        ILogger<TmdbThrottlingHandler> logger,
        TimeProvider timeProvider
    )
    {
        _optionsMonitor = optionsMonitor;
        _logger = logger;
        _timeProvider = timeProvider;

        (_rateLimiter, _concurrencyLimiter) = CreateLimiters(optionsMonitor.CurrentValue);
        _optionsReloadToken = optionsMonitor.OnChange(options =>
        {
            var (newRateLimiter, newConcurrencyLimiter) = CreateLimiters(options);

            var oldRateLimiter = Interlocked.Exchange(ref _rateLimiter, newRateLimiter);
            var oldConcurrencyLimiter = Interlocked.Exchange(ref _concurrencyLimiter, newConcurrencyLimiter);

            oldRateLimiter?.Dispose();
            oldConcurrencyLimiter?.Dispose();
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _optionsReloadToken?.Dispose();
            _rateLimiter.Dispose();
            _concurrencyLimiter.Dispose();
        }

        base.Dispose(disposing);
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        ArgumentNullException.ThrowIfNull(request);

        var options = _optionsMonitor.CurrentValue;
        options.Validate();

        var maxAttempts = Math.Max(1, options.MaxRetryAttempts + 1);
        var attempt = 0;
        HttpResponseMessage? response = null;

        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();
            attempt++;

            using var rateLease = await _rateLimiter.AcquireAsync(1, cancellationToken).ConfigureAwait(false);
            EnsureLease(rateLease, "rate limit");

            using var concurrencyLease = await _concurrencyLimiter.AcquireAsync(1, cancellationToken)
                .ConfigureAwait(false);
            EnsureLease(concurrencyLease, "concurrency limit");

            var clonedRequest = await request.CloneAsync(cancellationToken).ConfigureAwait(false);

            response = await base.SendAsync(clonedRequest, cancellationToken).ConfigureAwait(false);

            if (!ShouldRetry(response, out var retryAfter, out var reason))
            {
                return response;
            }

            if (attempt >= maxAttempts)
            {
                _logger.LogWarning(
                    "TMDb request {Path} exhausted {Attempts} retries due to {Reason}",
                    request.RequestUri?.AbsolutePath,
                    maxAttempts - 1,
                    reason
                );
                return response;
            }

            response.Dispose();

            var backoffDelay = CalculateBackoffDelay(attempt, options);
            var effectiveDelay = retryAfter.HasValue && retryAfter.Value > backoffDelay
                ? retryAfter.Value
                : backoffDelay;

            if (effectiveDelay < TimeSpan.Zero)
            {
                effectiveDelay = TimeSpan.Zero;
            }

            _logger.LogWarning(
                "TMDb request {Path} retrying in {Delay}ms because {Reason} (attempt {Attempt}/{MaxAttempts})",
                request.RequestUri?.AbsolutePath,
                (int)effectiveDelay.TotalMilliseconds,
                reason,
                attempt,
                maxAttempts - 1
            );

            await DelayAsync(effectiveDelay, cancellationToken).ConfigureAwait(false);
        }
    }

    private bool ShouldRetry(
        HttpResponseMessage response,
        out TimeSpan? retryAfter,
        out string reason
    )
    {
        retryAfter = null;
        reason = response.StatusCode.ToString();

        var statusCode = (int)response.StatusCode;
        if (statusCode == 429 || statusCode == 500 || statusCode == 502 || statusCode == 503 || statusCode == 504)
        {
            if (TryParseRetryAfter(response.Headers.RetryAfter, out var serverDelay))
            {
                retryAfter = serverDelay;
            }

            return true;
        }

        return false;
    }

    private bool TryParseRetryAfter(
        RetryConditionHeaderValue? header,
        out TimeSpan? retryAfter
    )
    {
        retryAfter = null;
        if (header == null)
        {
            return false;
        }

        if (header.Delta.HasValue)
        {
            retryAfter = header.Delta.Value;
            return true;
        }

        if (header.Date.HasValue)
        {
            var now = _timeProvider.GetUtcNow();
            var date = header.Date.Value.UtcDateTime;

            if (date > now)
            {
                retryAfter = date - now;
                return true;
            }
        }

        return false;
    }

    private static (RateLimiter rateLimiter, RateLimiter concurrencyLimiter) CreateLimiters(TmdbClientOptions options)
    {
        var rateLimiter = new TokenBucketRateLimiter(new TokenBucketRateLimiterOptions
        {
            TokenLimit = Math.Max(1, options.MaxRequestsPerSecond),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = options.MaxRequestsPerSecond * 2,
            ReplenishmentPeriod = TimeSpan.FromSeconds(1),
            TokensPerPeriod = Math.Max(1, options.MaxRequestsPerSecond),
            AutoReplenishment = true,
        });

        var concurrencyLimiter = new ConcurrencyLimiter(new ConcurrencyLimiterOptions
        {
            PermitLimit = Math.Max(1, options.MaxConcurrency),
            QueueLimit = options.MaxConcurrency * 2,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        });

        return (rateLimiter, concurrencyLimiter);
    }

    private static TimeSpan CalculateBackoffDelay(int attempt, TmdbClientOptions options)
    {
        var exponential = Math.Pow(2, Math.Max(0, attempt - 1)) * options.BaseDelayMs;
        var jitter = Random.Next(0, options.BaseDelayMs + 1);

        var delayMs = Math.Min(options.MaxDelayMs, exponential + jitter);

        return TimeSpan.FromMilliseconds(delayMs);
    }

    private static void EnsureLease(RateLimitLease lease, string resource)
    {
        if (lease.IsAcquired)
        {
            return;
        }

        lease.TryGetMetadata(MetadataName.RetryAfter, out TimeSpan retryAfter);
        throw new HttpRequestException(
            $"TMDb {resource} unavailable. Retry after {retryAfter.TotalMilliseconds} ms.");
    }

    private async Task DelayAsync(TimeSpan delay, CancellationToken cancellationToken)
    {
        if (delay <= TimeSpan.Zero)
        {
            return;
        }

        var tcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        ITimer? timer = null;

        timer = _timeProvider.CreateTimer(static state =>
        {
            var source = (TaskCompletionSource<bool>)state!;
            source.TrySetResult(true);
        }, tcs, delay, Timeout.InfiniteTimeSpan);

        var registration = cancellationToken.Register(static state =>
        {
            var tuple = ((TaskCompletionSource<bool> completion, ITimer timer, CancellationToken token))state!;
            if (tuple.completion.TrySetCanceled(tuple.token))
            {
                tuple.timer.Dispose();
            }
        }, (tcs, timer, cancellationToken));

        try
        {
            await tcs.Task.ConfigureAwait(false);
        }
        finally
        {
            registration.Dispose();
            timer.Dispose();
        }
    }
}
