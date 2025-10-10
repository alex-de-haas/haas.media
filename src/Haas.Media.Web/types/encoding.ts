import type { MediaFileInfo } from "./media-file-info";
import { StreamCodec } from "./media-info";

// Mirrors backend EncodingProcessInfo (for active encoding processes)
export interface EncodingProcessInfo {
  id: string;
  sourcePath: string;
  outputPath: string;
  progress: number;
  elapsedTimeSeconds: number;
  estimatedTimeSeconds: number;
}

// Mirrors backend EncodingInfo (Encodings/EncodingInfo.cs) for GetEncodingInfoAsync response
export interface EncodingInfo {
  hardwareAccelerations: HardwareAccelerationInfo[];
  mediaFiles: MediaFileInfo[];
}

// Mirrors backend HardwareAccelerationInfo (Core/HardwareAccelerationInfo.cs)
export interface HardwareAccelerationInfo {
  hardwareAcceleration: HardwareAcceleration;
  devices: string[];
  encoders: number[]; // StreamCodec enum values
  decoders: number[]; // StreamCodec enum values
  encoderCrfSupport: Record<number, boolean>; // Maps StreamCodec to CRF support
}

// Mirrors backend EncodeRequest (Encodings/EncodeRequest.cs)
export interface EncodeRequest {
  hardwareAcceleration: HardwareAcceleration;
  videoCodec: StreamCodec;
  device?: string | null;
  streams: EncodeRequestStream[];
  videoBitrate?: number | null;
  crf?: number | null;
  resolution?: EncodingResolution | null;
}

export interface EncodeRequestStream {
  inputFilePath: string;
  streamIndex: number;
  streamType: number;
}

// Mirrors backend enum Haas.Media.Core.HardwareAcceleration
export enum HardwareAcceleration {
  None = 0,
  NVENC = 1,
  QSV = 2,
  AMF = 3,
  VideoToolbox = 4,
  VAAPI = 5,
  Auto = 99,
}

export enum EncodingResolution {
  Source = 0,
  SD = 1,
  HD = 2,
  FHD = 3,
  UHD4K = 4,
}

export function isHardwareAccelerationInfo(value: unknown): value is HardwareAccelerationInfo {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  return (
    typeof v.hardwareAcceleration === "number" &&
    Array.isArray(v.devices) &&
    v.devices.every((d: any) => typeof d === "string") &&
    Array.isArray(v.encoders) &&
    v.encoders.every((e: any) => typeof e === "number") &&
    Array.isArray(v.decoders) &&
    v.decoders.every((d: any) => typeof d === "number") &&
    typeof v.encoderCrfSupport === "object" &&
    v.encoderCrfSupport !== null
  );
}

export function isMediaEncodingInfo(value: unknown): value is EncodingInfo {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  return (
    Array.isArray(v.hardwareAccelerations) &&
    v.hardwareAccelerations.every(isHardwareAccelerationInfo) &&
    Array.isArray(v.mediaFiles) &&
    v.mediaFiles.every((f: any) => typeof f === "object" && f !== null)
  );
}

export function isEncodingInfo(value: unknown): value is EncodingProcessInfo {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  return (
    typeof v.id === "string" &&
    typeof v.sourcePath === "string" &&
    typeof v.outputPath === "string" &&
    typeof v.progress === "number" &&
    typeof v.elapsedTimeSeconds === "number" &&
    typeof v.estimatedTimeSeconds === "number"
  );
}

export function isEncodingInfoArray(value: unknown): value is EncodingProcessInfo[] {
  return Array.isArray(value) && value.every(isEncodingInfo);
}
