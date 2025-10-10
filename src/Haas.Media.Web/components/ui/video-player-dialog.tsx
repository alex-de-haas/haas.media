"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SmartVideoPlayer } from "@/components/ui/smart-video-player";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Relative path to the video file */
  videoPath: string;
  title?: string;
  className?: string;
  /** Enable transcoding for better compatibility */
  transcode?: boolean;
  /** Quality preset for transcoding */
  quality?: "low" | "medium" | "high" | "ultra";
  /** Show streaming information */
  showStreamInfo?: boolean;
}

export function VideoPlayerDialog({
  open,
  onOpenChange,
  videoPath,
  title,
  className,
  transcode = false,
  quality = "medium",
  showStreamInfo = false,
}: VideoPlayerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-6xl p-0", className)} aria-describedby={undefined}>
        <div className="relative">
          {/* Close button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Hidden title for accessibility */}
          <DialogTitle className="sr-only">{title || "Video Player"}</DialogTitle>

          {/* Smart Video Player */}
          <SmartVideoPlayer
            path={videoPath}
            className="aspect-video w-full"
            forceTranscode={transcode}
            quality={quality}
            showStreamInfo={showStreamInfo}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
