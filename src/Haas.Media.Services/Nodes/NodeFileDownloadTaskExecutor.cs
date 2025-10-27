using Haas.Media.Core.BackgroundTasks;
using Haas.Media.Services.Metadata;
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
            "Starting file download from node {NodeId}: {RemoteFilePath} to library {LibraryId}",
            task.NodeId,
            task.RemoteFilePath,
            task.LibraryId
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

        // Get the library
        var library = await _metadataApi.GetLibraryAsync(task.LibraryId);
        if (library == null)
        {
            _logger.LogWarning("Library not found: {LibraryId}", task.LibraryId);
            throw new InvalidOperationException($"Library with ID {task.LibraryId} not found");
        }

        // Get the DATA_DIRECTORY path
        var dataDirectory =
            _configuration["DATA_DIRECTORY"]
            ?? throw new InvalidOperationException("DATA_DIRECTORY configuration is required");

        // Build the local destination path
        var libraryPath = Path.Combine(dataDirectory, library.DirectoryPath);
        var fileName = Path.GetFileName(task.RemoteFilePath);
        var localFilePath = Path.Combine(libraryPath, fileName);

        // Ensure the library directory exists
        Directory.CreateDirectory(libraryPath);

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

            // Initialize payload
            var initialInfo = new NodeFileDownloadInfo(
                task.Id.ToString(),
                task.NodeId,
                node.Name,
                task.RemoteFilePath,
                task.LibraryId,
                totalBytes,
                0, // DownloadedBytes
                DateTime.UtcNow,
                null, // CompletedTime
                null // LocalFilePath
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

            // Complete the task
            var completedInfo = initialInfo with
            {
                DownloadedBytes = totalDownloaded,
                CompletedTime = DateTime.UtcNow,
                LocalFilePath = relativePath,
            };

            context.SetPayload(completedInfo);
            context.ReportProgress(100);
            context.ReportStatus(BackgroundTaskStatus.Completed);

            _logger.LogInformation(
                "Successfully downloaded file from node {NodeName} to {LocalFilePath}",
                node.Name,
                localFilePath
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
}
