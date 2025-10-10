"use client";

import { useState, useCallback } from "react";

interface UseVideoPlayerOptions {
  /** Enable transcoding by default */
  transcode?: boolean;
  /** Default quality preset */
  quality?: "low" | "medium" | "high" | "ultra";
  /** Show streaming info by default */
  showStreamInfo?: boolean;
}

export function useVideoPlayer(options: UseVideoPlayerOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [videoPath, setVideoPath] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  const openVideo = useCallback((path: string, title?: string) => {
    setVideoPath(path);
    setVideoTitle(title || path);
    setIsOpen(true);
  }, []);

  const closeVideo = useCallback(() => {
    setIsOpen(false);
    // Clear after animation completes
    setTimeout(() => {
      setVideoPath("");
      setVideoTitle("");
    }, 300);
  }, []);

  return {
    isOpen,
    videoPath,
    videoTitle,
    openVideo,
    closeVideo,
    setIsOpen,
    // Expose options for VideoPlayerDialog
    transcode: options.transcode,
    quality: options.quality,
    showStreamInfo: options.showStreamInfo,
  };
}
