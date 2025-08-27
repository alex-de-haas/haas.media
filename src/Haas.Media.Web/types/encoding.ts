// Mirrors backend EncodingInfo (Encodings/EncodingInfo.cs)
export interface EncodingInfo {
  id: string;
  sourcePath: string;
  outputPath: string;
  progress: number;
}

// Mirrors backend EncodeRequest (Encodings/EncodeRequest.cs)
export interface EncodeRequest {
  streams: EncodeRequestStream[];
}

export interface EncodeRequestStream {
  inputFilePath: string;
  streamIndex: number;
  streamType: number;
}

export function isEncodingInfo(value: unknown): value is EncodingInfo {
  if (!value || typeof value !== 'object') return false;
  const v = value as any;
  return (
    typeof v.hash === 'string' &&
    typeof v.outputFileName === 'string' &&
    typeof v.progress === 'number'
  );
}

export function isEncodingInfoArray(value: unknown): value is EncodingInfo[] {
  return Array.isArray(value) && value.every(isEncodingInfo);
}
