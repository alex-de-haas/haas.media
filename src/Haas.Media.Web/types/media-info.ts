// Media info types mirroring backend C# record in Haas.Media.Core/MediaInfo.cs
// Keep property names camelCase to align with System.Text.Json default policy.

export enum StreamCodec {
  Unknown = 0,
  H264 = 101,
  HEVC = 102,
  Mpeg2Video = 103,
  Mpeg4Part2 = 104,
  VP8 = 105,
  VP9 = 106,
  AV1 = 107,
  VC1 = 108,
  ProRes = 109,
  Theora = 110,
  AdvancedAudioCoding = 201,
  DolbyDigital = 202,
  DolbyDigitalPlus = 203,
  DolbyTrueHD = 204,
  MpegLayer3 = 205,
  Flac = 206,
  Opus = 207,
  Vorbis = 208,
  DTS = 209,
  ALAC = 210,
  PCM = 211,
  SubRip = 301,
  WebVTT = 302,
  AdvancedSubStationAlpha = 303,
  SubStationAlpha = 304,
  PGS = 305,
  DvdSubtitle = 306,
  ClosedCaptionsEia608 = 307,
  ClosedCaptionsEia708 = 308,
}

export enum StreamType {
  Unknown = 0,
  Video = 1,
  Audio = 2,
  Subtitle = 3,
}

// Bit flag enum (match numeric values from backend)
export enum StreamFeatures {
  None = 0,
  DolbyVision = 1 << 0,
  DolbyAtmos = 1 << 1,
}

export interface MediaStream {
  index: number;
  type: StreamType;
  codec: StreamCodec;
  features: StreamFeatures;
  duration?: string; // TimeSpan serialized as string
  language?: string | null; // Culture code
  title?: string | null;
  width?: number | null;
  height?: number | null;
  bitRate?: number | null;
  bitDepth?: number | null;
  channels?: number | null;
  sampleRate?: number | null;
  // Allow any extra properties the backend might add without breaking the UI
  [key: string]: unknown;
}

export interface MediaInfo {
  streams: MediaStream[];
  // Allow future expansion
  [key: string]: unknown;
}

export function isMediaInfo(value: unknown): value is MediaInfo {
  if (!value || typeof value !== 'object') return false;
  const v = value as MediaInfo;
  return Array.isArray(v.streams);
}

// Human friendly mapping helpers
const streamTypeNames: Record<StreamType, string> = {
  [StreamType.Unknown]: 'Unknown',
  [StreamType.Video]: 'Video',
  [StreamType.Audio]: 'Audio',
  [StreamType.Subtitle]: 'Subtitle',
};

export function streamTypeToString(type: StreamType | number | undefined | null): string {
  if (typeof type !== 'number') return 'Unknown';
  return streamTypeNames[type as StreamType] ?? 'Unknown';
}

const streamCodecNames: Record<StreamCodec, string> = {
  [StreamCodec.Unknown]: 'Unknown',
  [StreamCodec.H264]: 'H.264',
  [StreamCodec.HEVC]: 'HEVC',
  [StreamCodec.Mpeg2Video]: 'MPEG-2 Video',
  [StreamCodec.Mpeg4Part2]: 'MPEG-4 Part 2',
  [StreamCodec.VP8]: 'VP8',
  [StreamCodec.VP9]: 'VP9',
  [StreamCodec.AV1]: 'AV1',
  [StreamCodec.VC1]: 'VC-1',
  [StreamCodec.ProRes]: 'Apple ProRes',
  [StreamCodec.Theora]: 'Theora',
  [StreamCodec.AdvancedAudioCoding]: 'AAC',
  [StreamCodec.DolbyDigital]: 'Dolby Digital (AC-3)',
  [StreamCodec.DolbyDigitalPlus]: 'Dolby Digital Plus (E-AC-3)',
  [StreamCodec.DolbyTrueHD]: 'Dolby TrueHD',
  [StreamCodec.MpegLayer3]: 'MP3',
  [StreamCodec.Flac]: 'FLAC',
  [StreamCodec.Opus]: 'Opus',
  [StreamCodec.Vorbis]: 'Vorbis',
  [StreamCodec.DTS]: 'DTS',
  [StreamCodec.ALAC]: 'ALAC',
  [StreamCodec.PCM]: 'PCM',
  [StreamCodec.SubRip]: 'SubRip (SRT)',
  [StreamCodec.WebVTT]: 'WebVTT',
  [StreamCodec.AdvancedSubStationAlpha]: 'Advanced SubStation Alpha (ASS)',
  [StreamCodec.SubStationAlpha]: 'SubStation Alpha (SSA)',
  [StreamCodec.PGS]: 'PGS',
  [StreamCodec.DvdSubtitle]: 'DVD Subtitle',
  [StreamCodec.ClosedCaptionsEia608]: 'Closed Captions (CEA-608)',
  [StreamCodec.ClosedCaptionsEia708]: 'Closed Captions (CEA-708)',
};

export function streamCodecToString(codec: StreamCodec | number | undefined | null): string {
  if (typeof codec !== 'number') return 'Unknown';
  return streamCodecNames[codec as StreamCodec] ?? 'Unknown';
}

export function streamFeaturesToStrings(features: StreamFeatures | number | undefined | null): string[] {
  if (typeof features !== 'number' || features === StreamFeatures.None) return [];
  const out: string[] = [];
  if (features & StreamFeatures.DolbyVision) out.push('Dolby Vision');
  if (features & StreamFeatures.DolbyAtmos) out.push('Dolby Atmos');
  return out;
}
