using System.Text;
using Instances;

namespace Haas.Media.Core;

public class MediaEncodingBuilder
{
    protected List<string> Outputs { get; } = [];
    protected List<string> Inputs { get; } = [];

    protected List<MediaInfo.Stream> Streams { get; } = [];

    protected StreamCodec VideoCodec { get; set; }

    public static MediaEncodingBuilder Create()
    {
        return new MediaEncodingBuilder();
    }

    public MediaEncodingBuilder FromFileInput(string inputFilePath)
    {
        Inputs.Add(inputFilePath);
        return this;
    }

    public MediaEncodingBuilder ToFileOutput(string outputFilePath)
    {
        Outputs.Add(outputFilePath);
        return this;
    }

    public MediaEncodingBuilder WithVideoCodec(StreamCodec codec)
    {
        VideoCodec = codec;
        return this;
    }

    public MediaEncodingBuilder WithStream(MediaInfo.Stream stream)
    {
        Streams.Add(stream);
        return this;
    }

    public Task<IProcessResult> EncodeAsync()
    {
        var ffmpegArguments = BuildFFMpegArguments();
        return MediaHelper.StartFFMpegEncodeAsync(ffmpegArguments);
    }

    public IProcessInstance Encode()
    {
        var ffmpegArguments = BuildFFMpegArguments();
        return MediaHelper.StartFFMpegEncode(ffmpegArguments);
    }

    private string BuildFFMpegArguments()
    {
        var command = new StringBuilder();
        foreach (var input in Inputs)
        {
            command.Append($" -i \"{input}\"");
        }

        if (Streams.Count == 0)
        {
            command.Append(" -map 0:v");
            command.Append(" -map 0:a");
        }
        else
        {
            foreach (var stream in Streams)
            {
                command.Append($" -map 0:{stream.Index}");
            }
        }

        command.Append($" -c:v {GetFFMpegCodec(VideoCodec)}");
        command.Append(" -c:a copy");

        command.Append($" \"{Outputs.First()}\"");

        return command.ToString();
    }

    private string GetFFMpegCodec(StreamCodec codec)
    {
        return codec switch
        {
            StreamCodec.H264 => "libx264",
            StreamCodec.HEVC => "libx265",
            StreamCodec.AdvancedAudioCoding => "aac",
            StreamCodec.DolbyDigital => "ac3",
            StreamCodec.DolbyDigitalPlus => "eac3",
            StreamCodec.DolbyTrueHD => "truehd",
            _ => throw new NotSupportedException($"Codec {codec} is not supported"),
        };
    }
}
