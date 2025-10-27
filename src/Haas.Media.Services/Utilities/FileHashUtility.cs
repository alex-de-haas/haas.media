using System.Security.Cryptography;

namespace Haas.Media.Services.Utilities;

/// <summary>
/// Utility class for calculating file hashes
/// </summary>
public static class FileHashUtility
{
    /// <summary>
    /// Calculate MD5 hash of a file
    /// </summary>
    /// <param name="filePath">Full path to the file</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>MD5 hash as lowercase hex string</returns>
    public static async Task<string> CalculateMd5HashAsync(
        string filePath,
        CancellationToken cancellationToken = default
    )
    {
        await using var stream = new FileStream(
            filePath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 4096,
            useAsync: true
        );

        var hash = await MD5.HashDataAsync(stream, cancellationToken);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    /// <summary>
    /// Calculate MD5 hash of a stream
    /// </summary>
    /// <param name="stream">Stream to hash</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>MD5 hash as lowercase hex string</returns>
    public static async Task<string> CalculateMd5HashAsync(
        Stream stream,
        CancellationToken cancellationToken = default
    )
    {
        var hash = await MD5.HashDataAsync(stream, cancellationToken);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    /// <summary>
    /// Verify if a file's hash matches the expected hash
    /// </summary>
    /// <param name="filePath">Full path to the file</param>
    /// <param name="expectedHash">Expected MD5 hash (case-insensitive)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if hashes match, false otherwise</returns>
    public static async Task<bool> ValidateMd5HashAsync(
        string filePath,
        string expectedHash,
        CancellationToken cancellationToken = default
    )
    {
        var actualHash = await CalculateMd5HashAsync(filePath, cancellationToken);
        return string.Equals(actualHash, expectedHash, StringComparison.OrdinalIgnoreCase);
    }
}
