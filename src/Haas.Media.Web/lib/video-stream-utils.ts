/**
 * Video streaming utilities for handling direct and transcoded video playback
 */

export interface VideoStreamOptions {
  /** Relative path to the video file */
  path: string;
  /** Force transcoding even if format is supported */
  forceTranscode?: boolean;
  /** Output format when transcoding (default: mp4) */
  format?: 'mp4' | 'webm' | 'mkv';
  /** Quality preset when transcoding (default: medium) */
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

/**
 * Check if a video format requires transcoding for better compatibility
 */
export function shouldTranscodeVideo(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  // Formats that work well across all browsers
  const universalFormats = ['mp4', 'm4v'];
  
  // Formats that may need transcoding
  const needsTranscode = ['mkv', 'avi', 'wmv', 'flv', 'mov', 'mpg', 'mpeg', '3gp'];
  
  if (ext && universalFormats.includes(ext)) {
    return false; // No transcoding needed
  }
  
  if (ext && needsTranscode.includes(ext)) {
    return true; // Transcoding recommended
  }
  
  // For WebM and OGV, depends on browser support
  // Generally supported in modern browsers, but can transcode for older ones
  return false;
}

/**
 * Build video stream URL with appropriate parameters
 */
export function buildVideoStreamUrl(options: VideoStreamOptions): string {
  const { path, forceTranscode, format = 'mp4', quality = 'medium' } = options;
  
  const params = new URLSearchParams({
    path: path,
  });
  
  // Determine if we should transcode
  const needsTranscode = forceTranscode || shouldTranscodeVideo(path);
  
  if (needsTranscode) {
    params.set('transcode', 'true');
    params.set('format', format);
    params.set('quality', quality);
  }
  
  return `/api/video-stream?${params.toString()}`;
}

/**
 * Get MIME type for video format
 */
export function getVideoMimeType(format: string): string {
  switch (format.toLowerCase()) {
    case 'mp4':
    case 'm4v':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mkv':
      return 'video/x-matroska';
    case 'avi':
      return 'video/x-msvideo';
    case 'mov':
      return 'video/quicktime';
    case 'ogv':
      return 'video/ogg';
    default:
      return 'video/mp4';
  }
}

/**
 * Get appropriate MIME type for streaming URL
 * If transcoding is enabled, returns the transcoded format's MIME type
 */
export function getStreamMimeType(options: VideoStreamOptions): string {
  const needsTranscode = options.forceTranscode || shouldTranscodeVideo(options.path);
  
  if (needsTranscode) {
    // When transcoding, use the output format's MIME type
    return getVideoMimeType(options.format || 'mp4');
  }
  
  // When streaming directly, use the source file's MIME type
  const ext = options.path.split('.').pop() || 'mp4';
  return getVideoMimeType(ext);
}

/**
 * Check if the current browser supports a specific video codec
 */
export function canPlayVideoCodec(mimeType: string): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  
  const video = document.createElement('video');
  const canPlay = video.canPlayType(mimeType);
  
  // Returns 'probably', 'maybe', or ''
  return canPlay === 'probably' || canPlay === 'maybe';
}

/**
 * Detect optimal streaming strategy based on file and browser capabilities
 */
export function detectStreamingStrategy(filename: string): {
  transcode: boolean;
  format: 'mp4' | 'webm' | 'mkv';
  reason: string;
} {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // MP4 is universally supported
  if (ext === 'mp4' || ext === 'm4v') {
    return {
      transcode: false,
      format: 'mp4',
      reason: 'MP4 format is universally supported'
    };
  }
  
  // WebM is well supported in modern browsers
  if (ext === 'webm' && canPlayVideoCodec('video/webm; codecs="vp9"')) {
    return {
      transcode: false,
      format: 'webm',
      reason: 'Browser supports WebM natively'
    };
  }
  
  // Check if browser can play the source format
  const sourceMimeType = getVideoMimeType(ext);
  if (canPlayVideoCodec(sourceMimeType)) {
    return {
      transcode: false,
      format: 'mp4', // Doesn't matter, won't transcode
      reason: `Browser supports ${ext.toUpperCase()} natively`
    };
  }
  
  // Default: transcode to MP4 for maximum compatibility
  return {
    transcode: true,
    format: 'mp4',
    reason: `Format ${ext.toUpperCase()} requires transcoding for compatibility`
  };
}

/**
 * Get user-friendly format information
 */
export interface FormatInfo {
  name: string;
  videoCodec: string;
  audioCodec: string;
  description: string;
  browserSupport: 'excellent' | 'good' | 'limited';
}

export function getFormatInfo(format: 'mp4' | 'webm' | 'mkv'): FormatInfo {
  switch (format) {
    case 'mp4':
      return {
        name: 'MP4 (H.264)',
        videoCodec: 'H.264',
        audioCodec: 'AAC',
        description: 'Best compatibility across all browsers and devices',
        browserSupport: 'excellent'
      };
    case 'webm':
      return {
        name: 'WebM (VP9)',
        videoCodec: 'VP9',
        audioCodec: 'Opus',
        description: 'Better compression, supported in modern browsers',
        browserSupport: 'good'
      };
    case 'mkv':
      return {
        name: 'Matroska (H.264)',
        videoCodec: 'H.264',
        audioCodec: 'AAC',
        description: 'Limited browser support, use for download',
        browserSupport: 'limited'
      };
  }
}
