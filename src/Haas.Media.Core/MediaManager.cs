using System.Globalization;
using Haas.Media.Core.FFMpeg;

namespace Haas.Media.Core;

public static class MediaManager
{
    public static async Task<MediaInfo> GetMediaInfoAsync(string filePath)
    {
        var ffProbeAnalysis = await MediaHelper.GetFFProbeAnalysisAsync(filePath);

        var streams = ffProbeAnalysis
            .Streams.Select(x => new MediaInfo.Stream
            {
                Index = x.Index,
                Type = GetStreamType(x),
                Codec = GetStreamCodec(x),
                Features = GetStreamFeatures(x),
                Language = GetStreamLanguage(x),
                Title = GetStreamTitle(x),
                Duration = MediaHelper.ParseDuration(x),
                Width = x.Width,
                Height = x.Height,
                BitRate = long.TryParse(x.BitRate, out var bitRate) ? bitRate : 0,
                BitDepth = int.TryParse(x.BitsPerRawSample, out var bitDepth) ? bitDepth : 0,
                Channels = x.Channels,
                SampleRate = int.TryParse(x.SampleRate, out var sampleRate) ? sampleRate : 0,
            })
            .ToArray();

        var mediaInfo = new MediaInfo { Streams = streams };
        return mediaInfo;
    }

    private static StreamType GetStreamType(FFProbeStream stream)
    {
        return stream.CodecType switch
        {
            "video" => StreamType.Video,
            "audio" => StreamType.Audio,
            "subtitle" => StreamType.Subtitle,
            _ => StreamType.Unknown,
        };
    }

    private static StreamCodec GetStreamCodec(FFProbeStream stream)
    {
        return stream.CodecName switch
        {
            "h264" => StreamCodec.H264,
            "hevc" => StreamCodec.HEVC,
            "mpeg2video" => StreamCodec.Mpeg2Video,
            "mpeg4" => StreamCodec.Mpeg4Part2,
            "vp8" => StreamCodec.VP8,
            "vp9" => StreamCodec.VP9,
            "av1" => StreamCodec.AV1,
            "vc1" => StreamCodec.VC1,
            "prores" or "prores_ks" or "prores_aw" => StreamCodec.ProRes,
            "theora" => StreamCodec.Theora,
            "aac" => StreamCodec.AdvancedAudioCoding,
            "ac3" => StreamCodec.DolbyDigital,
            "eac3" => StreamCodec.DolbyDigitalPlus,
            "truehd" => StreamCodec.DolbyTrueHD,
            "mp3" => StreamCodec.MpegLayer3,
            "flac" => StreamCodec.Flac,
            "opus" => StreamCodec.Opus,
            "vorbis" => StreamCodec.Vorbis,
            "dts" => StreamCodec.DTS,
            "alac" => StreamCodec.ALAC,
            var s when s.StartsWith("pcm_", StringComparison.Ordinal) => StreamCodec.PCM,
            // Subtitles
            "subrip" => StreamCodec.SubRip,
            "webvtt" => StreamCodec.WebVTT,
            "ass" => StreamCodec.AdvancedSubStationAlpha,
            "ssa" => StreamCodec.SubStationAlpha,
            "hdmv_pgs_subtitle" => StreamCodec.PGS,
            "dvd_subtitle" => StreamCodec.DvdSubtitle,
            "eia_608" => StreamCodec.ClosedCaptionsEia608,
            "eia_708" => StreamCodec.ClosedCaptionsEia708,
            _ => StreamCodec.Unknown,
        };
    }

    private static StreamFeatures GetStreamFeatures(FFProbeStream stream)
    {
        var features = StreamFeatures.None;

        if (stream.CodecTagString == "dvhe" || stream.CodecTagString == "dvh1")
        {
            features |= StreamFeatures.DolbyVision;
        }

        if (stream.Profile?.Contains("atmos", StringComparison.InvariantCultureIgnoreCase) == true) // Dolby Atmos
        {
            features |= StreamFeatures.DolbyAtmos;
        }

        return features;
    }

    private static string? GetStreamTitle(FFProbeStream stream)
    {
        return stream.Tags?.GetValueOrDefault("title");
    }

    private static CultureInfo? GetStreamLanguage(FFProbeStream stream)
    {
        var languageCode = stream.Tags?.GetValueOrDefault("language");
        if (ValidLanguageCodes.Contains(languageCode))
        {
            return new CultureInfo(languageCode!);
        }

        return null;
    }

    private static readonly string[] ValidLanguageCodes = CultureInfo
        .GetCultures(CultureTypes.AllCultures)
        .Select(c => c.TwoLetterISOLanguageName)
        .Distinct()
        .ToArray();
}
