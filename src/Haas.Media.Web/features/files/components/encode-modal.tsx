"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useMediaFiles, useEncodeStreams } from "@/features/media";
import { MediaFilesList } from "@/features/media";
import { Spinner } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { HardwareAcceleration, EncodingResolution } from "@/types/encoding";
import { StreamCodec, StreamType } from "@/types/media-info";
import type { MediaStream as MediaInfoStream } from "@/types/media-info";
import { Loader2, PlayCircle } from "lucide-react";

interface EncodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
}

export default function EncodeModal({ isOpen, onClose, filePath }: EncodeModalProps) {
  const router = useRouter();

  const { mediaFiles, hardwareAccelerations, loading, error } = useMediaFiles(filePath);
  const [hardwareAccel, setHardwareAccel] = React.useState<HardwareAcceleration>(HardwareAcceleration.None);
  const [videoCodec, setVideoCodec] = React.useState<StreamCodec>(StreamCodec.H264);
  const [device, setDevice] = React.useState<string>("");
  const [selectedStreams, setSelectedStreams] = React.useState<Record<string, Set<number>>>({});
  const [qualityMode, setQualityMode] = React.useState<"auto" | "bitrate" | "crf">("auto");
  const [videoBitrate, setVideoBitrate] = React.useState<string>("");
  const [crf, setCrf] = React.useState<string>("23");
  const [resolution, setResolution] = React.useState<EncodingResolution | null>(null);

  const selectedVideoStreams = React.useMemo<MediaInfoStream[]>(() => {
    if (!mediaFiles) return [];
    const videoStreams: MediaInfoStream[] = [];
    for (const file of mediaFiles) {
      const selection = selectedStreams[file.relativePath];
      if (!selection || selection.size === 0) continue;
      const fileStreams = file.mediaInfo?.streams ?? [];
      selection.forEach((index) => {
        const stream = fileStreams.find((s) => s.index === index);
        if (stream && stream.type === StreamType.Video) {
          videoStreams.push(stream);
        }
      });
    }
    return videoStreams;
  }, [mediaFiles, selectedStreams]);

  const selectedHardwareInfo = React.useMemo(() => {
    return hardwareAccelerations?.find((hw) => hw.hardwareAcceleration === hardwareAccel);
  }, [hardwareAccelerations, hardwareAccel]);

  const availableDevices = React.useMemo(() => {
    return selectedHardwareInfo?.devices ?? [];
  }, [selectedHardwareInfo]);

  // Parse quality settings
  const parsedVideoBitrate = qualityMode === "bitrate" && videoBitrate ? parseInt(videoBitrate, 10) : null;
  const parsedCrf = qualityMode === "crf" && crf ? parseFloat(crf) : null;

  const targetOutputHeight = React.useMemo(() => {
    const resolutionHeight = getResolutionHeight(resolution);
    if (resolutionHeight) {
      return resolutionHeight;
    }
    let maxHeight = 0;
    for (const stream of selectedVideoStreams) {
      const inferred = inferHeightFromStream(stream);
      if (inferred && inferred > maxHeight) {
        maxHeight = inferred;
      }
    }
    return maxHeight > 0 ? maxHeight : null;
  }, [resolution, selectedVideoStreams]);

  const autoQuality = React.useMemo(() => {
    if (qualityMode !== "auto") {
      return { videoBitrate: null as number | null, crf: null as number | null };
    }

    const height = targetOutputHeight;
    if (!height) {
      return { videoBitrate: null, crf: null };
    }

    const defaults = getAutoQualityDefaults(height);
    const encoderCrfSupport = selectedHardwareInfo?.encoderCrfSupport?.[videoCodec];
    const canUseCrf = encoderCrfSupport === true || (!selectedHardwareInfo && hardwareAccel === HardwareAcceleration.None);

    if (canUseCrf) {
      return { videoBitrate: null, crf: defaults.crf };
    }

    return { videoBitrate: defaults.bitrate, crf: null };
  }, [qualityMode, targetOutputHeight, selectedHardwareInfo, videoCodec, hardwareAccel]);

  const effectiveVideoBitrate = qualityMode === "bitrate" ? parsedVideoBitrate : autoQuality.videoBitrate;
  const effectiveCrf = qualityMode === "crf" ? parsedCrf : autoQuality.crf;

  const { encodeAll, encoding, encodeError } = useEncodeStreams(
    filePath,
    mediaFiles,
    selectedStreams,
    hardwareAccel,
    videoCodec,
    device,
    availableDevices,
    effectiveVideoBitrate,
    effectiveCrf,
    resolution,
  );

  const availableCodecs = React.useMemo(() => {
    const videoCodecs = [StreamCodec.H264, StreamCodec.HEVC, StreamCodec.AV1, StreamCodec.VP9];
    if (hardwareAccel === HardwareAcceleration.None) {
      return videoCodecs;
    }
    if (selectedHardwareInfo?.encoders) {
      return videoCodecs.filter((codec) => selectedHardwareInfo.encoders.includes(codec));
    }
    return videoCodecs;
  }, [selectedHardwareInfo, hardwareAccel]);

  const availableHardwareAccelerations = React.useMemo(() => {
    const available = [HardwareAcceleration.None];
    if (hardwareAccelerations) {
      hardwareAccelerations.forEach((hw) => {
        if (!available.includes(hw.hardwareAcceleration)) {
          available.push(hw.hardwareAcceleration);
        }
      });
    }
    return available;
  }, [hardwareAccelerations]);

  React.useEffect(() => {
    if (hardwareAccel === HardwareAcceleration.None) {
      setDevice("");
    } else if (availableDevices.length > 0) {
      if (!availableDevices.includes(device)) {
        const firstDevice = availableDevices[0];
        if (firstDevice) {
          setDevice(firstDevice);
        }
      }
    } else {
      setDevice("");
    }
  }, [availableDevices, device, hardwareAccel]);

  React.useEffect(() => {
    if (!availableHardwareAccelerations.includes(hardwareAccel)) {
      setHardwareAccel(HardwareAcceleration.None);
    }
  }, [availableHardwareAccelerations, hardwareAccel]);

  React.useEffect(() => {
    if (availableCodecs.length > 0 && !availableCodecs.includes(videoCodec)) {
      const firstCodec = availableCodecs[0];
      if (firstCodec !== undefined) {
        setVideoCodec(firstCodec);
      }
    }
  }, [availableCodecs, videoCodec]);

  const hasAnySelection = React.useMemo(() => Object.values(selectedStreams).some((set) => set && set.size > 0), [selectedStreams]);

  const canEncode = React.useMemo(() => {
    const hasValidDevice = hardwareAccel === HardwareAcceleration.None || availableDevices.length === 0 || Boolean(device);
    return hasAnySelection && hasValidDevice && videoCodec !== undefined;
  }, [hasAnySelection, device, videoCodec, hardwareAccel, availableDevices]);

  const codecsAvailable = availableCodecs.length > 0;

  const handleEncodeAndRedirect = React.useCallback(async () => {
    try {
      await encodeAll();
      onClose();
      router.push("/encodings");
    } catch (err) {
      console.error("Encoding failed:", err);
    }
  }, [encodeAll, onClose, router]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-3">
            <DialogTitle>Encoding configuration</DialogTitle>
            <Badge variant="outline" className="max-w-full truncate text-xs font-normal uppercase tracking-wide">
              {filePath}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ControlField label="Hardware acceleration">
              <Select value={String(hardwareAccel)} onValueChange={(value) => setHardwareAccel(Number(value) as HardwareAcceleration)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select hardware acceleration" />
                </SelectTrigger>
                <SelectContent>
                  {availableHardwareAccelerations.map((hw) => (
                    <SelectItem key={hw} value={String(hw)}>
                      {getHardwareAccelName(hw)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ControlField>

            <ControlField
              label="Device"
              {...(availableDevices.length === 0 && hardwareAccel !== HardwareAcceleration.None
                ? { helper: "No compatible devices detected for this hardware acceleration." }
                : {})}
            >
              {availableDevices.length > 0 ? (
                <Select value={device} onValueChange={setDevice}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDevices.map((availableDevice) => (
                      <SelectItem key={availableDevice} value={availableDevice}>
                        {availableDevice}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border border-dashed border-muted px-3 py-2 text-sm text-muted-foreground">
                  Device selection not required
                </div>
              )}
            </ControlField>

            <ControlField label="Codec">
              <Select
                {...(codecsAvailable && { value: String(videoCodec) })}
                onValueChange={(value) => setVideoCodec(Number(value) as StreamCodec)}
                disabled={!codecsAvailable}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select codec" />
                </SelectTrigger>
                <SelectContent>
                  {codecsAvailable ? (
                    availableCodecs.map((codec) => (
                      <SelectItem key={codec} value={String(codec)}>
                        {getCodecName(codec)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-codec" disabled>
                      No codecs available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </ControlField>

            <ControlField label="Resolution" helper="Downscale the output video to a target height; source is kept when smaller.">
              <Select
                value={resolution === null ? "source" : String(resolution)}
                onValueChange={(value) => {
                  if (value === "source") {
                    setResolution(null);
                  } else {
                    setResolution(Number(value) as EncodingResolution);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Keep source resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">Source</SelectItem>
                  <SelectItem value={String(EncodingResolution.SD)}>SD (480p)</SelectItem>
                  <SelectItem value={String(EncodingResolution.HD)}>HD (720p)</SelectItem>
                  <SelectItem value={String(EncodingResolution.FHD)}>FHD (1080p)</SelectItem>
                  <SelectItem value={String(EncodingResolution.UHD4K)}>4K (2160p)</SelectItem>
                </SelectContent>
              </Select>
            </ControlField>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ControlField label="Quality mode">
              <Select value={qualityMode} onValueChange={(value) => setQualityMode(value as "auto" | "bitrate" | "crf")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select quality mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (recommended)</SelectItem>
                  <SelectItem value="bitrate">Fixed bitrate</SelectItem>
                  <SelectItem value="crf">Constant quality (CRF)</SelectItem>
                </SelectContent>
              </Select>
            </ControlField>

            {qualityMode === "bitrate" && (
              <ControlField label="Video bitrate (bps)" helper="Target bitrate in bits per second (e.g., 5000000 for 5 Mbps)">
                <Input type="number" value={videoBitrate} onChange={(e) => setVideoBitrate(e.target.value)} placeholder="5000000" min="1" />
              </ControlField>
            )}

            {qualityMode === "crf" && (
              <ControlField label="CRF value" helper="Lower values = higher quality. Range: 0-51, recommended: 18-28">
                <Input type="number" value={crf} onChange={(e) => setCrf(e.target.value)} placeholder="23" min="0" max="51" step="1" />
              </ControlField>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={encoding || !canEncode} onClick={handleEncodeAndRedirect}>
              {encoding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Encoding…
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Encode selected
                </>
              )}
            </Button>
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <Spinner className="size-8" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Failed to load media info</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {encodeError && (
            <Alert variant="destructive">
              <AlertTitle>Failed to start encoding</AlertTitle>
              <AlertDescription>{encodeError}</AlertDescription>
            </Alert>
          )}

          {mediaFiles && (
            <MediaFilesList
              mediaFiles={mediaFiles}
              selectedStreams={selectedStreams}
              setSelectedStreams={setSelectedStreams}
              encoding={encoding}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getCodecName(codec: StreamCodec): string {
  switch (codec) {
    case StreamCodec.H264:
      return "H.264";
    case StreamCodec.HEVC:
      return "HEVC";
    case StreamCodec.AV1:
      return "AV1";
    case StreamCodec.VP9:
      return "VP9";
    case StreamCodec.VP8:
      return "VP8";
    default:
      return "Unknown";
  }
}

function getHardwareAccelName(hwAccel: HardwareAcceleration): string {
  switch (hwAccel) {
    case HardwareAcceleration.None:
      return "None";
    case HardwareAcceleration.NVENC:
      return "NVIDIA (NVENC)";
    case HardwareAcceleration.QSV:
      return "Intel (QSV)";
    case HardwareAcceleration.AMF:
      return "AMD (AMF)";
    case HardwareAcceleration.VideoToolbox:
      return "Apple VideoToolbox";
    case HardwareAcceleration.VAAPI:
      return "VA-API (Linux)";
    case HardwareAcceleration.Auto:
      return "Auto";
    default:
      return "Unknown";
  }
}

function ControlField({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function getResolutionHeight(resolution: EncodingResolution | null): number | null {
  switch (resolution) {
    case EncodingResolution.SD:
      return 480;
    case EncodingResolution.HD:
      return 720;
    case EncodingResolution.FHD:
      return 1080;
    case EncodingResolution.UHD4K:
      return 2160;
    case EncodingResolution.Source:
      return null;
    default:
      return null;
  }
}

function inferHeightFromStream(stream: MediaInfoStream): number | null {
  const { height, width } = stream;
  if (typeof height === "number" && height > 0) {
    return height;
  }
  if (typeof width === "number" && width > 0) {
    if (width >= 3840) return 2160;
    if (width >= 2560) return 1440;
    if (width >= 1920) return 1080;
    if (width >= 1280) return 720;
    if (width >= 854) return 480;
    return 360;
  }
  return null;
}

function getAutoQualityDefaults(height: number): { crf: number; bitrate: number } {
  if (height >= 2160) {
    return { crf: 18, bitrate: 35_000_000 };
  }
  if (height >= 1440) {
    return { crf: 20, bitrate: 16_000_000 };
  }
  if (height >= 1080) {
    return { crf: 22, bitrate: 8_000_000 };
  }
  if (height >= 720) {
    return { crf: 24, bitrate: 5_000_000 };
  }
  if (height >= 480) {
    return { crf: 26, bitrate: 2_500_000 };
  }
  return { crf: 28, bitrate: 1_000_000 };
}
