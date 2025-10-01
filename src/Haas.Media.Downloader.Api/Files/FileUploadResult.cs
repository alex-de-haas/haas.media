using System;
using System.Collections.Generic;

namespace Haas.Media.Downloader.Api.Files;

public record FileUploadResult(int Uploaded, int Skipped, IReadOnlyList<string> Errors)
{
    public static FileUploadResult None => new(0, 0, Array.Empty<string>());

    public int Failed => Errors.Count;

    public string Message =>
        Failed == 0
            ? $"Uploaded {Uploaded} file{(Uploaded == 1 ? string.Empty : "s")}"
            : $"Uploaded {Uploaded} file{(Uploaded == 1 ? string.Empty : "s")}, skipped {Skipped}, failed {Failed}";
}
