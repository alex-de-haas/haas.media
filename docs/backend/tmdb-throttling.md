# TMDb Client Throttling

This document describes the throttling and retry behavior implemented for the TMDb client and how to tune it safely.

## Overview

The API calls made through `TMDbLib` are wrapped by a delegating handler that combines a token-bucket rate limiter with a concurrency limiter. When the TMDb service answers with `429` or transient `5xx` responses the handler retries the call using exponential backoff with jitter and honours the `Retry-After` header if the server provides one.

## Configuration Keys

All settings live under the `Tmdb` configuration section (for example `appsettings.json`, environment variables, or any other bound configuration source). Each option has a deliberate default that stays within TMDb’s published limits.

| Key | Default | Purpose |
| --- | --- | --- |
| `MaxRequestsPerSecond` | `20` | Upper bound for requests issued per second. This feeds the token bucket limiter and should stay well below TMDb’s burst limits to avoid 429s. |
| `MaxConcurrency` | `4` | Hard cap on simultaneous in-flight TMDb requests. Helps prevent local spikes when multiple background scans run together. |
| `MaxRetryAttempts` | `6` | Maximum number of retry attempts after the initial request. A value of `0` disables retries while still performing rate limiting. |
| `BaseDelayMs` | `250` | Base delay (milliseconds) used for exponential backoff. The delay doubles with each retry attempt before jitter is applied. |
| `MaxDelayMs` | `8000` | Maximum delay the backoff algorithm is allowed to wait. The server-provided `Retry-After` can still exceed this if TMDb demands a longer pause. |

The values bind to `Haas.Media.Downloader.Api.Metadata.Tmdb.TmdbClientOptions`, which calls `Validate()` after binding to guard against invalid combinations.

### Representing Values via Environment Variables

Each key can be provided through environment variables using `__` as section separators (for example `Tmdb__MaxRequestsPerSecond`).

## Retry Algorithm

When the handler receives `429`, `500`, `502`, `503`, or `504` responses it triggers a retry sequence:

1. The handler calculates a backoff delay using `delay = min(MaxDelayMs, (2^(attempt-1) * BaseDelayMs) + Random(0..BaseDelayMs))`.
2. If TMDb supplies a `Retry-After` header, the handler respects it and will choose the longer delay between the server instruction and the computed backoff.
3. The request is retried until the response succeeds or `MaxRetryAttempts` is exceeded. The total number of tries equals `MaxRetryAttempts + 1` (initial attempt + retries).
4. When retries are exhausted, the last response is surfaced without further wrapping so upstream code can log or handle it.

## Logging

Each retry attempt writes a structured warning log containing:

- the request path,
- the HTTP status that triggered the retry,
- the delay applied before retrying,
- the current attempt number and configured maximum.

An additional warning fires when the request gives up after all retries.

## Operational Guidance

- **Start with defaults.** They are intentionally conservative and should work for most deployments.
- **Scaling up requests.** If you need higher throughput increase `MaxRequestsPerSecond` and `MaxConcurrency` gradually, monitoring for server throttling (`429` responses).
- **Backoff tuning.** Increase `BaseDelayMs` to reduce stress on TMDb when you see repeated throttling. `MaxDelayMs` provides an upper bound so extreme retries do not yield multi-minute pauses unless TMDb explicitly requests it.
- **Disabling retries.** Set `MaxRetryAttempts` to `0` if you operate in a mode where only first-attempt success is desired, keeping the rate limiter active.
- **Diagnostics.** Watch warning logs for retry summaries. They are your early signal that the application is approaching TMDb’s limits or the service is under load.

Keep the configuration values within TMDb’s acceptable use guidelines to avoid long-term bans or reduced quota.
