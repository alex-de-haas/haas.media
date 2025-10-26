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

        // Log request body for POST/PUT/PATCH requests
        if (
            logger.IsEnabled(LogLevel.Debug)
            && httpContext.Request.ContentLength > 0
            && (method == "POST" || method == "PUT" || method == "PATCH")
        )
        {
            try
            {
                // Enable buffering to allow reading the body multiple times
                httpContext.Request.EnableBuffering();

                // Read the request body
                using var reader = new StreamReader(
                    httpContext.Request.Body,
                    encoding: System.Text.Encoding.UTF8,
                    detectEncodingFromByteOrderMarks: false,
                    leaveOpen: true
                );

                var body = await reader.ReadToEndAsync();

                // Reset the stream position for the endpoint to read
                httpContext.Request.Body.Position = 0;

                if (!string.IsNullOrWhiteSpace(body))
                {
                    // Try to parse and pretty-print JSON, otherwise log as-is
                    try
                    {
                        var jsonDoc = JsonDocument.Parse(body);
                        var prettyJson = JsonSerializer.Serialize(
                            jsonDoc.RootElement,
                            LoggingJsonOptions
                        );
                        logger.LogDebug(
                            "Jellyfin Request Body: {Method} {Path}\n{Body}",
                            method,
                            path,
                            prettyJson
                        );
                    }
                    catch
                    {
                        // Not JSON, log as-is
                        logger.LogDebug(
                            "Jellyfin Request Body: {Method} {Path}\n{Body}",
                            method,
                            path,
                            body
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "Failed to read request body for {Method} {Path}",
                    method,
                    path
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
