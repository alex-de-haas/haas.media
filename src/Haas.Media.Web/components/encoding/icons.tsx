import React from "react";
import { StreamType, StreamCodec, streamTypeToString, streamCodecToString } from "@/types/media-info";

// Generic icon wrapper
const IconBox: React.FC<React.PropsWithChildren<{ title: string }>> = ({ children, title }) => (
  <span
    title={title}
    aria-label={title}
    className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold text-gray-700 dark:text-gray-200 select-none"
  >
    {children}
  </span>
);

export function streamTypeIcon(type: StreamType | number | undefined | null) {
  const label = streamTypeToString(type as StreamType);
  switch (type) {
    case StreamType.Video:
      return (
        <IconBox title={label}>
          {/* Film strip */}
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4" />
          </svg>
        </IconBox>
      );
    case StreamType.Audio:
      return (
        <IconBox title={label}>
          {/* Speaker */}
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 5 6 9H3v6h3l5 4z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07M18.07 5.93a9 9 0 0 1 0 12.73" />
          </svg>
        </IconBox>
      );
    case StreamType.Subtitle:
      return (
        <IconBox title={label}>
          {/* Caption icon */}
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M7 15h4M13 15h4M7 11h2M11 11h6" />
          </svg>
        </IconBox>
      );
    default:
      return <IconBox title={label}>?</IconBox>;
  }
}

function codecAbbreviation(codec: StreamCodec | number | undefined | null): string {
  switch (codec) {
    case StreamCodec.H264:
      return "H264";
    case StreamCodec.HEVC:
      return "HEVC";
    case StreamCodec.AdvancedAudioCoding:
      return "AAC";
    case StreamCodec.DolbyDigital:
      return "DD";
    case StreamCodec.DolbyDigitalPlus:
      return "DD+";
    case StreamCodec.DolbyTrueHD:
      return "TrueHD";
    case StreamCodec.Mpeg2Video:
      return "MPEG2";
    case StreamCodec.Mpeg4Part2:
      return "MPEG4";
    case StreamCodec.VP8:
      return "VP8";
    case StreamCodec.VP9:
      return "VP9";
    case StreamCodec.AV1:
      return "AV1";
    case StreamCodec.ProRes:
      return "ProRes";
    case StreamCodec.Theora:
      return "Theora";
    case StreamCodec.MpegLayer3:
      return "MP3";
    case StreamCodec.Flac:
      return "FLAC";
    case StreamCodec.Opus:
      return "OPUS";
    case StreamCodec.Vorbis:
      return "VORB";
    case StreamCodec.DTS:
      return "DTS";
    case StreamCodec.ALAC:
      return "ALAC";
    case StreamCodec.PCM:
      return "PCM";
    case StreamCodec.SubRip:
      return "SRT";
    case StreamCodec.WebVTT:
      return "VTT";
    case StreamCodec.AdvancedSubStationAlpha:
      return "ASS";
    case StreamCodec.SubStationAlpha:
      return "SSA";
    case StreamCodec.PGS:
      return "PGS";
    case StreamCodec.DvdSubtitle:
      return "DVD";
    case StreamCodec.ClosedCaptionsEia608:
      return "CC608";
    case StreamCodec.ClosedCaptionsEia708:
      return "CC708";
    default:
      return "?";
  }
}

export function streamCodecIcon(codec: StreamCodec | number | undefined | null) {
  const label = streamCodecToString(codec as StreamCodec);
  const abbr = codecAbbreviation(codec);
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-emerald-200/60 dark:bg-emerald-700/40 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200"
    >
      {abbr}
    </span>
  );
}

function getResolutionLabel(width: number, height: number): { label: string; title: string } {
  // 4K (Ultra HD) - 3840x2160 or similar
  if (height >= 2000) {
    return { label: "4K", title: `4K Ultra HD (${width}×${height})` };
  }
  // Full HD - 1920x1080 or similar
  if (height >= 1000) {
    return { label: "FHD", title: `Full HD (${width}×${height})` };
  }
  // HD - 1280x720 or similar
  if (height >= 700) {
    return { label: "HD", title: `HD (${width}×${height})` };
  }
  // SD - anything below HD
  return { label: "SD", title: `Standard Definition (${width}×${height})` };
}

export function resolutionIcon(width: number | undefined, height: number | undefined) {
  if (!width || !height) return null;

  const { label, title } = getResolutionLabel(width, height);

  return (
    <span
      title={title}
      aria-label={title}
      className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-purple-200/60 dark:bg-purple-700/40 text-[10px] font-semibold text-purple-800 dark:text-purple-200"
    >
      {label}
    </span>
  );
}
