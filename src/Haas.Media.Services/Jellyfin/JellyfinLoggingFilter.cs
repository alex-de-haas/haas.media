using System.Text.Json;

namespace Haas.Media.Services.Jellyfin;

internal sealed class JellyfinLoggingFilter : IEndpointFilter
{
    private static readonly JsonSerializerOptions LoggingJsonOptions =
        new()
        {
            PropertyNamingPolicy = null,
            DictionaryKeyPolicy = null,
            DefaultIgnoreCondition = System
                .Text
                .Json
                .Serialization
                .JsonIgnoreCondition
                .WhenWritingNull,
            WriteIndented = true,
        };

    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next
    )
    {
        var httpContext = context.HttpContext;
        var logger = httpContext.RequestServices.GetRequiredService<
            ILogger<JellyfinLoggingFilter>
        >();
        var path = httpContext.Request.Path.Value;
        var method = httpContext.Request.Method;
        var queryString = httpContext.Request.QueryString.HasValue
            ? httpContext.Request.QueryString.Value
            : "";

        // Log request
        logger.LogInformation(
            "Jellyfin Request: {Method} {Path}{QueryString}",
            method,
            path,
            queryString
        );

        // Log request headers at debug level (useful for debugging auth issues)
        if (logger.IsEnabled(LogLevel.Debug))
        {
            var relevantHeaders = httpContext
                .Request.Headers.Where(h =>
                    h.Key.StartsWith("X-", StringComparison.OrdinalIgnoreCase)
                    || h.Key.Equals("Authorization", StringComparison.OrdinalIgnoreCase)
                )
                .Select(h =>
                    h.Key.Equals("Authorization", StringComparison.OrdinalIgnoreCase)
                        ? $"{h.Key}: [REDACTED]"
                        : $"{h.Key}: {h.Value}"
                );

            if (relevantHeaders.Any())
            {
                logger.LogDebug(
                    "Jellyfin Request Headers: {Headers}",
                    string.Join(", ", relevantHeaders)
                );
            }
        }

        // Execute the endpoint
        var result = await next(context);

        // Log response with body details
        var statusCode = httpContext.Response.StatusCode;

        // Try to extract response data from JSON results
        try
        {
            object? responseData = null;

            // Check for JsonHttpResult<T> using reflection since the generic type varies
            var resultType = result?.GetType();
            if (
                resultType != null
                && resultType.IsGenericType
                && resultType.Name.Contains("JsonHttpResult")
            )
            {
                var valueProperty = resultType.GetProperty("Value");
                if (valueProperty != null)
                {
                    responseData = valueProperty.GetValue(result);
                }
            }

            if (responseData != null)
            {
                var responseJson = JsonSerializer.Serialize(responseData, LoggingJsonOptions);
                logger.LogInformation(
                    "Jellyfin Response: {Method} {Path} -> {StatusCode}\n{Response}",
                    method,
                    path,
                    statusCode,
                    responseJson
                );
            }
            else
            {
                logger.LogInformation(
                    "Jellyfin Response: {Method} {Path} -> {StatusCode} ({ResultType})",
                    method,
                    path,
                    statusCode,
                    result?.GetType().Name ?? "null"
                );
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Jellyfin Response: {Method} {Path} -> {StatusCode} (Failed to serialize response)",
                method,
                path,
                statusCode
            );
        }

        return result;
    }
}
