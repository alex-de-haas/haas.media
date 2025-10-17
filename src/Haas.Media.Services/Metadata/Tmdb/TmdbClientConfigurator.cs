using System.Reflection;
using TMDbLib.Client;

namespace Haas.Media.Services.Metadata.Tmdb;

internal static class TmdbClientConfigurator
{
    private const string RestClientFieldName = "_client";
    private const string HttpClientBackingFieldName = "<HttpClient>k__BackingField";

    public static void UseHttpClient(TMDbClient client, HttpClient httpClient)
    {
        ArgumentNullException.ThrowIfNull(client);
        ArgumentNullException.ThrowIfNull(httpClient);

        var restClientField = typeof(TMDbClient).GetField(
            RestClientFieldName,
            BindingFlags.Instance | BindingFlags.NonPublic
        );

        if (restClientField == null)
        {
            throw new InvalidOperationException("Unable to find TMDbClient internal RestClient field");
        }

        var restClient = restClientField.GetValue(client)
            ?? throw new InvalidOperationException("TMDbClient internal RestClient is null");

        var restClientType = restClient.GetType();
        var httpClientField = restClientType.GetField(
            HttpClientBackingFieldName,
            BindingFlags.Instance | BindingFlags.NonPublic
        );

        if (httpClientField == null)
        {
            throw new InvalidOperationException("Unable to access RestClient HttpClient field");
        }

        if (httpClientField.GetValue(restClient) is HttpClient existing && !ReferenceEquals(existing, httpClient))
        {
            existing.Dispose();
        }

        httpClientField.SetValue(restClient, httpClient);
    }
}
