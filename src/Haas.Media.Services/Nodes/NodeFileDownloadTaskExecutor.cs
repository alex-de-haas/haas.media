using Haas.Media.Core.BackgroundTasks;
using Haas.Media.Services.Metadata;
using Haas.Media.Services.Utilities;
using LiteDB;

namespace Haas.Media.Services.Nodes;

internal sealed class NodeFileDownloadTaskExecutor
    : IBackgroundTaskExecutor<NodeFileDownloadTask, NodeFileDownloadInfo>
{
    private readonly ILiteCollection<NodeInfo> _nodesCollection;
    private readonly ILogger<NodeFileDownloadTaskExecutor> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMetadataApi _metadataApi;
    private readonly IConfiguration _configuration;
    private const int ProgressUpdateIntervalBytes = 1024 * 1024 * 5; // Update every 5 MB

    public NodeFileDownloadTaskExecutor(
        LiteDatabase database,
        ILogger<NodeFileDownloadTaskExecutor> logger,
        IHttpClientFactory httpClientFactory,
        IMetadataApi metadataApi,
        IConfiguration configuration
    )
    {
        _nodesCollection = database.GetCollection<NodeInfo>("nodes");
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _metadataApi = metadataApi;
        _configuration = configuration;
    }

    public async Task ExecuteAsync(
        BackgroundWorkerContext<NodeFileDownloadTask, NodeFileDownloadInfo> context
    )
    {
        var task = context.Task;
        var cancellationToken = context.CancellationToken;

        _logger.LogInformation(
            "Starting file download from node {NodeId}: {RemoteFilePath} to directory {DestinationDirectory}",
            task.NodeId,
            task.RemoteFilePath,
            task.DestinationDirectory
        );

        // Get the node
        var node = _nodesCollection.FindById(task.NodeId);
        if (node == null)
        {
            _logger.LogWarning("Node not found: {NodeId}", task.NodeId);
            throw new InvalidOperationException($"Node with ID {task.NodeId} not found");
        }

        if (!node.IsEnabled)
        {
            _logger.LogWarning("Node is disabled: {NodeId}", task.NodeId);
            throw new InvalidOperationException($"Node {node.Name} is disabled");
        }

        // Get the DATA_DIRECTORY path
        var dataDirectory =
            _configuration["DATA_DIRECTORY"]
            ?? throw new InvalidOperationException("DATA_DIRECTORY configuration is required");

        // Build the local destination path
        var destinationPath = Path.Combine(dataDirectory, task.DestinationDirectory);
        var fileName = Path.GetFileName(task.RemoteFilePath);
        var localFilePath = Path.Combine(destinationPath, fileName);

        // Ensure the destination directory exists
        Directory.CreateDirectory(destinationPath);

        // Create HTTP client
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromMinutes(30); // Allow longer timeout for file downloads

        if (!string.IsNullOrWhiteSpace(node.ApiKey))
        {
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", node.ApiKey);
        }

        // Build the URL to stream the file from the remote node
        var streamEndpoint =
            $"{node.Url.TrimEnd('/')}/api/files/stream?path={Uri.EscapeDataString(task.RemoteFilePath)}";

        _logger.LogDebug("Downloading file from {Endpoint}", streamEndpoint);

        try
        {
            var response = await httpClient.GetAsync(
                streamEndpoint,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken
            );
            response.EnsureSuccessStatusCode();

            // Get total file size from Content-Length header
            var totalBytes = response.Content.Headers.ContentLength ?? 0;

            // Get file metadata to retrieve expected MD5 hash
            var allFileMetadata = await _metadataApi.GetFileMetadataAsync();
            var fileMetadata = allFileMetadata.FirstOrDefault(fm =>
                fm.NodeId == task.NodeId && fm.FilePath == task.RemoteFilePath
            );
            var expectedMd5Hash = fileMetadata?.Md5Hash;

            if (!string.IsNullOrEmpty(expectedMd5Hash))
            {
                _logger.LogInformation(
                    "File has expected MD5 hash: {Hash}. Will validate after download.",
                    expectedMd5Hash
                );
            }
            else
            {
                _logger.LogWarning(
                    "No MD5 hash found for file. Download will proceed without validation."
                );
            }

            // Initialize payload
            var initialInfo = new NodeFileDownloadInfo(
                task.Id.ToString(),
                task.NodeId,
                node.Name,
                task.RemoteFilePath,
                task.DestinationDirectory,
                totalBytes,
                0, // DownloadedBytes
                DateTime.UtcNow,
                null, // CompletedTime
                null, // LocalFilePath
                expectedMd5Hash, // ExpectedMd5Hash
                null, // ActualMd5Hash
                null // HashValidated
            );
            context.SetPayload(initialInfo);

            // Stream the file to disk
            await using var contentStream = await response.Content.ReadAsStreamAsync(
                cancellationToken
            );
            await using var fileStream = new FileStream(
                localFilePath,
                FileMode.Create,
                FileAccess.Write,
                FileShare.None
            );

            var buffer = new byte[81920];
            long totalDownloaded = 0;
            long lastProgressUpdate = 0;
            int bytesRead;

            while (
                (bytesRead = await contentStream.ReadAsync(buffer, 0, buffer.Length, cancellationToken))
                > 0
            )
            {
                await fileStream.WriteAsync(buffer, 0, bytesRead, cancellationToken);
                totalDownloaded += bytesRead;

                // Update progress every 5 MB or when complete
                if (
                    totalDownloaded - lastProgressUpdate >= ProgressUpdateIntervalBytes
                    || totalDownloaded == totalBytes
                )
                {
                    var progressPercentage =
                        totalBytes > 0 ? (totalDownloaded * 100.0) / totalBytes : 0;

                    var updatedInfo = initialInfo with
                    {
                        DownloadedBytes = totalDownloaded,
                    };

                    context.SetPayload(updatedInfo);
                    context.ReportProgress(progressPercentage);

                    lastProgressUpdate = totalDownloaded;
                }
            }

            // Get relative path (relative to DATA_DIRECTORY)
            var relativePath = Path.GetRelativePath(dataDirectory, localFilePath);

            // Validate MD5 hash if expected hash is available
            string? actualMd5Hash = null;
            bool? hashValidated = null;

            if (!string.IsNullOrEmpty(expectedMd5Hash))
            {
                _logger.LogInformation("Calculating MD5 hash of downloaded file...");

                actualMd5Hash = await FileHashUtility.CalculateMd5HashAsync(
                    localFilePath,
                    cancellationToken
                );

                hashValidated = string.Equals(
                    actualMd5Hash,
                    expectedMd5Hash,
                    StringComparison.OrdinalIgnoreCase
                );

                if (hashValidated == true)
                {
                    _logger.LogInformation(
                        "MD5 hash validation successful. Hash: {Hash}",
                        actualMd5Hash
                    );
                }
                else
                {
                    _logger.LogError(
                        "MD5 hash validation FAILED! Expected: {Expected}, Actual: {Actual}",
                        expectedMd5Hash,
                        actualMd5Hash
                    );

                    // Clean up the downloaded file since it's corrupted
                    try
                    {
                        File.Delete(localFilePath);
                        _logger.LogInformation("Deleted corrupted file: {LocalFilePath}", localFilePath);
                    }
                    catch (Exception deleteEx)
                    {
                        _logger.LogWarning(
                            deleteEx,
                            "Failed to delete corrupted file: {LocalFilePath}",
                            localFilePath
                        );
                    }

                    throw new InvalidOperationException(
                        $"File integrity check failed. Expected MD5: {expectedMd5Hash}, " +
                        $"Actual MD5: {actualMd5Hash}. The file may be corrupted during transfer."
                    );
                }
            }
            else
            {
                _logger.LogWarning(
                    "Skipping MD5 validation - no expected hash available for this file."
                );
            }

            // Update file metadata from node version to local version
            await UpdateFileMetadataToLocalAsync(
                task.NodeId,
                task.RemoteFilePath,
                relativePath,
                actualMd5Hash,
                cancellationToken
            );

            // Complete the task
            var completedInfo = initialInfo with
            {
                DownloadedBytes = totalDownloaded,
                CompletedTime = DateTime.UtcNow,
                LocalFilePath = relativePath,
                ActualMd5Hash = actualMd5Hash,
                HashValidated = hashValidated,
            };

            context.SetPayload(completedInfo);
            context.ReportProgress(100);
            context.ReportStatus(BackgroundTaskStatus.Completed);

            _logger.LogInformation(
                "Successfully downloaded file from node {NodeName} to {LocalFilePath}. Hash validated: {HashValidated}",
                node.Name,
                localFilePath,
                hashValidated ?? false
            );
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(
                ex,
                "Failed to download file from node {NodeName}: {Message}",
                node.Name,
                ex.Message
            );

            // Clean up partial file if it exists
            if (File.Exists(localFilePath))
            {
                try
                {
                    File.Delete(localFilePath);
                }
                catch (Exception deleteEx)
                {
                    _logger.LogWarning(
                        deleteEx,
                        "Failed to delete partial file: {LocalFilePath}",
                        localFilePath
                    );
                }
            }

            context.ReportStatus(BackgroundTaskStatus.Failed);
            throw;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("File download was cancelled for {RemoteFilePath}", task.RemoteFilePath);

            // Clean up partial file if it exists
            if (File.Exists(localFilePath))
            {
                try
                {
                    File.Delete(localFilePath);
                }
                catch (Exception deleteEx)
                {
                    _logger.LogWarning(
                        deleteEx,
                        "Failed to delete partial file: {LocalFilePath}",
                        localFilePath
                    );
                }
            }

            context.ReportStatus(BackgroundTaskStatus.Cancelled);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error downloading file from node {NodeName}", node.Name);

            // Clean up partial file if it exists
            if (File.Exists(localFilePath))
            {
                try
                {
                    File.Delete(localFilePath);
                }
                catch (Exception deleteEx)
                {
                    _logger.LogWarning(
                        deleteEx,
                        "Failed to delete partial file: {LocalFilePath}",
                        localFilePath
                    );
                }
            }

            context.ReportStatus(BackgroundTaskStatus.Failed);
            throw;
        }
    }

    /// <summary>
    /// Creates new local file metadata after successful download.
    /// Finds the FileMetadata record with the matching NodeId and FilePath, then creates a new local version
    /// with NodeId set to null and FilePath to the local path, and optionally the MD5 hash.
    /// The original node file metadata is preserved.
    /// </summary>
    private async Task UpdateFileMetadataToLocalAsync(
        string nodeId,
        string remoteFilePath,
        string localFilePath,
        string? md5Hash,
        CancellationToken cancellationToken
    )
    {
        try
        {
            // Find file metadata records that match the node ID and remote file path
            var allFileMetadata = await _metadataApi.GetFileMetadataAsync();
            var matchingMetadata = allFileMetadata
                .Where(fm => fm.NodeId == nodeId && fm.FilePath == remoteFilePath)
                .ToList();

            if (matchingMetadata.Count == 0)
            {
                _logger.LogWarning(
                    "No file metadata found for NodeId={NodeId}, FilePath={FilePath}. " +
                    "The metadata may need to be created manually or will be discovered in the next metadata scan.",
                    nodeId,
                    remoteFilePath
                );
                return;
            }

            // Create new local file metadata for each matching node metadata record
            foreach (var nodeMetadata in matchingMetadata)
            {
                // Create a new local file metadata based on the node metadata
                var localMetadata = new FileMetadata
                {
                    Id = Guid.NewGuid().ToString(), // New ID for the local file
                    NodeId = null, // No longer associated with a node
                    LibraryId = null, // Not associated with a library (will be set during next metadata scan if needed)
                    FilePath = localFilePath,
                    TmdbId = nodeMetadata.TmdbId,
                    LibraryType = nodeMetadata.LibraryType,
                    SeasonNumber = nodeMetadata.SeasonNumber,
                    EpisodeNumber = nodeMetadata.EpisodeNumber,
                    Md5Hash = !string.IsNullOrEmpty(md5Hash) ? md5Hash : nodeMetadata.Md5Hash,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var created = await _metadataApi.AddFileMetadataAsync(localMetadata);
                if (created != null)
                {
                    _logger.LogInformation(
                        "Created new local file metadata ID={Id} based on node metadata ID={NodeMetadataId} " +
                        "(NodeId={NodeId}, RemoteFilePath={RemoteFilePath}) " +
                        "→ (LocalFilePath={LocalFilePath})",
                        created.Id,
                        nodeMetadata.Id,
                        nodeId,
                        remoteFilePath,
                        localFilePath
                    );
                }
                else
                {
                    _logger.LogWarning(
                        "Failed to create local file metadata based on node metadata ID={NodeMetadataId}",
                        nodeMetadata.Id
                    );
                }
            }
        }
        catch (Exception ex)
        {
            // Log the error but don't fail the download task
            _logger.LogError(
                ex,
                "Error creating local file metadata for NodeId={NodeId}, FilePath={FilePath}. " +
                "The file was downloaded successfully, but metadata creation failed.",
                nodeId,
                remoteFilePath
            );
        }
    }
}
