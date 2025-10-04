"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/ui/video-player";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  title?: string;
  className?: string;
}

export function VideoPlayerDialog({
  open,
  onOpenChange,
  videoUrl,
  title,
  className,
}: VideoPlayerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("max-w-6xl p-0", className)}
        aria-describedby={undefined}
      >
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

          {/* Video Player */}
          <VideoPlayer src={videoUrl} className="aspect-video w-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
