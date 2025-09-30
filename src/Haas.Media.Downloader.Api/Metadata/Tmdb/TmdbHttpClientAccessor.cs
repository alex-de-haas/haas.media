using System;
using System.Net.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Haas.Media.Downloader.Api.Metadata.Tmdb;

internal sealed class TmdbHttpClientAccessor : IDisposable
{
    public TmdbHttpClientAccessor(IServiceProvider serviceProvider)
    {
        ArgumentNullException.ThrowIfNull(serviceProvider);

        var handler = ActivatorUtilities.CreateInstance<TmdbThrottlingHandler>(serviceProvider);
        handler.InnerHandler = new HttpClientHandler();

        HttpClient = new HttpClient(handler, disposeHandler: true)
        {
            BaseAddress = new Uri("https://api.themoviedb.org/3/"),
        };
    }

    public HttpClient HttpClient { get; }

    public void Dispose()
    {
        HttpClient.Dispose();
    }
}
