// Mirrors backend EncodingInfo (Encodings/EncodingInfo.cs)
export interface EncodingInfo {
  id: string;
  sourcePath: string;
  outputPath: string;
  progress: number;
  elapsedTimeSeconds: number;
  estimatedTimeSeconds: number;
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
    typeof v.id === 'string' &&
    typeof v.sourcePath === 'string' &&
    typeof v.outputPath === 'string' &&
    typeof v.progress === 'number' &&
    typeof v.elapsedTimeSeconds === 'number' &&
    typeof v.estimatedTimeSeconds === 'number'
  );
}

export function isEncodingInfoArray(value: unknown): value is EncodingInfo[] {
  return Array.isArray(value) && value.every(isEncodingInfo);
}
