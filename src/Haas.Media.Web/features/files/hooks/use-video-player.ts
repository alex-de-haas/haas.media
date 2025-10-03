"use client";

import { useState, useCallback } from "react";

interface UseVideoPlayerOptions {
  baseUrl?: string;
}

export function useVideoPlayer(options: UseVideoPlayerOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  const openVideo = useCallback(
    (path: string, title?: string) => {
      const { baseUrl = "/api/video-stream" } = options;
      const url = `${baseUrl}?path=${encodeURIComponent(path)}`;
      setVideoUrl(url);
      setVideoTitle(title || path);
      setIsOpen(true);
    },
    [options],
  );

  const closeVideo = useCallback(() => {
    setIsOpen(false);
    // Clear after animation completes
    setTimeout(() => {
      setVideoUrl("");
      setVideoTitle("");
    }, 300);
  }, []);

  return {
    isOpen,
    videoUrl,
    videoTitle,
    openVideo,
    closeVideo,
    setIsOpen,
  };
}
