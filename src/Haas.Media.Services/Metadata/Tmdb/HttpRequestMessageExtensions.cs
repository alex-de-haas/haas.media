namespace Haas.Media.Services.Metadata.Tmdb;

internal static class HttpRequestMessageExtensions
{
    public static async Task<HttpRequestMessage> CloneAsync(
        this HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        ArgumentNullException.ThrowIfNull(request);

        var clone = new HttpRequestMessage(request.Method, request.RequestUri)
        {
            Version = request.Version,
            VersionPolicy = request.VersionPolicy,
            Content = null,
        };

        foreach (var header in request.Headers)
        {
            clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        if (request.Content != null)
        {
            var buffer = new MemoryStream();
            await request.Content.CopyToAsync(buffer, cancellationToken).ConfigureAwait(false);
            buffer.Position = 0;

            var contentClone = new StreamContent(buffer);
            foreach (var header in request.Content.Headers)
            {
                contentClone.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }

            clone.Content = contentClone;
        }

        return clone;
    }
}
