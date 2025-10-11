using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using LiteDB;
using Microsoft.Extensions.Logging;
using TMDbLib.Client;

namespace Haas.Media.Downloader.Api.Metadata;

internal static class PersonMetadataSynchronizer
{
    public static async Task SyncAsync(
        TMDbClient tmdbClient,
        ILiteCollection<PersonMetadata> personCollection,
        ILogger logger,
        IEnumerable<int> personIds,
        bool refreshExisting,
        CancellationToken cancellationToken
    )
    {
        var distinctIds = personIds.Where(id => id > 0).Distinct().ToList();
        if (distinctIds.Count == 0)
        {
            return;
        }

        foreach (var personId in distinctIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            PersonMetadata? existingMetadata = null;

            try
            {
                existingMetadata = personCollection.FindById(new BsonValue(personId));
            }
            catch (Exception ex)
            {
                logger.LogDebug(
                    ex,
                    "Failed to read person metadata for TMDb person {PersonId}",
                    personId
                );
            }

            if (existingMetadata is not null && !refreshExisting)
            {
                continue;
            }

            try
            {
                var personDetails = await tmdbClient.GetPersonAsync(
                    personId,
                    cancellationToken: cancellationToken
                );

                if (personDetails is null)
                {
                    logger.LogDebug(
                        "TMDb returned null when requesting person metadata for {PersonId}",
                        personId
                    );
                    continue;
                }

                if (existingMetadata is null)
                {
                    var newMetadata = personDetails.Create();
                    personCollection.Upsert(newMetadata);
                }
                else
                {
                    personDetails.Update(existingMetadata);
                    personCollection.Update(existingMetadata);
                }
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "Failed to synchronize person metadata for TMDb person {PersonId}",
                    personId
                );
            }

            await Task.Delay(TimeSpan.FromMilliseconds(100), cancellationToken);
        }
    }
}
