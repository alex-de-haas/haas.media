namespace Haas.Media.Services.Files;

/// <summary>
/// Wrapper stream that limits the number of bytes that can be read from an underlying stream.
/// Used for HTTP range requests to ensure Content-Length matches actual bytes written.
/// </summary>
public class LimitedStream : Stream
{
    private readonly Stream _innerStream;
    private readonly long _maxLength;
    private long _bytesRead;

    public LimitedStream(Stream innerStream, long maxLength)
    {
        _innerStream = innerStream ?? throw new ArgumentNullException(nameof(innerStream));
        _maxLength = maxLength;
        _bytesRead = 0;
    }

    public override bool CanRead => _innerStream.CanRead;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length => _maxLength;
    public override long Position
    {
        get => _bytesRead;
        set => throw new NotSupportedException();
    }

    public override int Read(byte[] buffer, int offset, int count)
    {
        var remaining = _maxLength - _bytesRead;
        if (remaining <= 0)
        {
            return 0;
        }

        var toRead = (int)Math.Min(count, remaining);
        var read = _innerStream.Read(buffer, offset, toRead);
        _bytesRead += read;
        return read;
    }

    public override async Task<int> ReadAsync(
        byte[] buffer,
        int offset,
        int count,
        CancellationToken cancellationToken
    )
    {
        var remaining = _maxLength - _bytesRead;
        if (remaining <= 0)
        {
            return 0;
        }

        var toRead = (int)Math.Min(count, remaining);
        var read = await _innerStream.ReadAsync(buffer.AsMemory(offset, toRead), cancellationToken);
        _bytesRead += read;
        return read;
    }

    public override async ValueTask<int> ReadAsync(
        Memory<byte> buffer,
        CancellationToken cancellationToken = default
    )
    {
        var remaining = _maxLength - _bytesRead;
        if (remaining <= 0)
        {
            return 0;
        }

        var toRead = (int)Math.Min(buffer.Length, remaining);
        var read = await _innerStream.ReadAsync(buffer.Slice(0, toRead), cancellationToken);
        _bytesRead += read;
        return read;
    }

    public override void Flush() => _innerStream.Flush();

    public override Task FlushAsync(CancellationToken cancellationToken) =>
        _innerStream.FlushAsync(cancellationToken);

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

    public override void SetLength(long value) => throw new NotSupportedException();

    public override void Write(byte[] buffer, int offset, int count) =>
        throw new NotSupportedException();

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _innerStream?.Dispose();
        }
        base.Dispose(disposing);
    }

    public override async ValueTask DisposeAsync()
    {
        if (_innerStream != null)
        {
            await _innerStream.DisposeAsync();
        }
        await base.DisposeAsync();
    }
}
