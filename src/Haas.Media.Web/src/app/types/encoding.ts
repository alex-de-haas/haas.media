// Mirrors backend EncodingInfo (Files/EncodingInfo.cs)
export interface EncodingInfo {
  hash: string;
  outputFileName: string;
  progress: number;
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
