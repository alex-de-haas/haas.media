"use client";

import * as React from "react";
import { VideoPlayer } from "./video-player";
import { buildVideoStreamUrl, detectStreamingStrategy, type VideoStreamOptions } from "@/lib/video-stream-utils";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SmartVideoPlayerProps extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "src" | "onTimeUpdate"> {
  /** Relative path to the video file */
  path: string;
  /** Override automatic transcode detection */
  forceTranscode?: boolean;
  /** Output format when transcoding */
  format?: "mp4" | "webm" | "mkv";
  /** Quality preset when transcoding */
  quality?: "low" | "medium" | "high" | "ultra";
  /** Show information about streaming strategy */
  showStreamInfo?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Time update callback */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

/**
 * Smart Video Player Component
 *
 * Automatically detects when transcoding is needed and constructs the appropriate
 * streaming URL. Supports both direct streaming (with seeking) and transcoded
 * streaming (better compatibility).
 *
 * @example
 * ```tsx
 * // Auto-detect (will transcode MKV files automatically)
 * <SmartVideoPlayer path="Movies/example.mkv" />
 *
 * // Force transcoding with specific quality
 * <SmartVideoPlayer
 *   path="Movies/example.mp4"
 *   forceTranscode
 *   quality="high"
 * />
 *
 * // Show streaming info to user
 * <SmartVideoPlayer
 *   path="Movies/example.mkv"
 *   showStreamInfo
 * />
 * ```
 */
export function SmartVideoPlayer({
  path,
  forceTranscode,
  format,
  quality = "medium",
  showStreamInfo = false,
  className,
  onTimeUpdate,
  ...videoProps
}: SmartVideoPlayerProps) {
  // Detect optimal streaming strategy
  const strategy = React.useMemo(() => {
    if (forceTranscode) {
      return {
        transcode: true,
        format: format || "mp4",
        reason: "Transcoding forced by user",
      };
    }
    return detectStreamingStrategy(path);
  }, [path, forceTranscode, format]);

  // Build streaming URL
  const videoUrl = React.useMemo(() => {
    const options: VideoStreamOptions = {
      path,
      forceTranscode: strategy.transcode,
      format: strategy.format,
      quality,
    };
    return buildVideoStreamUrl(options);
  }, [path, strategy, quality]);

  // Determine if seeking is available
  const canSeek = !strategy.transcode;

  return (
    <div className="space-y-2">
      {showStreamInfo && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="text-sm">
              <strong>Streaming Mode:</strong> {strategy.transcode ? "Transcoded" : "Direct"}
              <br />
              <strong>Format:</strong> {strategy.format.toUpperCase()}
              {strategy.transcode && (
                <>
                  <br />
                  <strong>Quality:</strong> {quality}
                </>
              )}
              <br />
              <strong>Seeking:</strong> {canSeek ? "Enabled ✓" : "Disabled (transcoding active)"}
              <br />
              <span className="text-muted-foreground text-xs">{strategy.reason}</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <VideoPlayer src={videoUrl} {...(className && { className })} {...(onTimeUpdate && { onTimeUpdate })} {...videoProps} />

      {strategy.transcode && !showStreamInfo && (
        <p className="text-xs text-muted-foreground">ℹ️ Video is being transcoded for compatibility. Seeking may not be available.</p>
      )}
    </div>
  );
}
