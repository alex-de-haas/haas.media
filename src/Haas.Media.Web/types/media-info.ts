// Media info types mirroring backend C# record in Haas.Media.Core/MediaInfo.cs
// Keep property names camelCase to align with System.Text.Json default policy.

export enum StreamCodec {
  Unknown = 0,
  H264 = 101,
  HEVC = 102,
  AdvancedAudioCoding = 201,
  DolbyDigital = 202,
  DolbyDigitalPlus = 203,
  DolbyTrueHD = 204,
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
  [StreamCodec.AdvancedAudioCoding]: 'AAC',
  [StreamCodec.DolbyDigital]: 'Dolby Digital (AC-3)',
  [StreamCodec.DolbyDigitalPlus]: 'Dolby Digital Plus (E-AC-3)',
  [StreamCodec.DolbyTrueHD]: 'Dolby TrueHD',
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
