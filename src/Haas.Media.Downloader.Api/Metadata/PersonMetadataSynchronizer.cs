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
    public static async Task<PersonSyncStatistics> SyncAsync(
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
            return PersonSyncStatistics.Empty;
        }

        var totalRequested = distinctIds.Count;
        var syncedCount = 0;
        var failedCount = 0;

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
                syncedCount++;
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
                    failedCount++;
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

                syncedCount++;
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
                failedCount++;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(100), cancellationToken);
        }

        return new PersonSyncStatistics(totalRequested, syncedCount, failedCount);
    }
}

internal readonly record struct PersonSyncStatistics(int Requested, int Synced, int Failed)
{
    public static PersonSyncStatistics Empty { get; } = new(0, 0, 0);

    public PersonSyncStatistics Add(PersonSyncStatistics other)
    {
        return new PersonSyncStatistics(
            Requested + other.Requested,
            Synced + other.Synced,
            Failed + other.Failed
        );
    }
}
