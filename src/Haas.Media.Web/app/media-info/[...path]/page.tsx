"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useMediaFiles, useEncodeStreams } from "@/features/media";
import { MediaFilesList } from "@/features/media";
import { LoadingSpinner } from "@/components/ui";
import { usePageTitle, usePageActions } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HardwareAcceleration } from "@/types/encoding";
import { StreamCodec } from "@/types/media-info";
import { Loader2, PlayCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ path: string }>;
}

export default function MediaInfoPage({ params }: PageProps) {
  const { path } = React.use(params);
  const router = useRouter();

  const decodedPath = React.useMemo(() => {
    if (!path || path.length === 0) return "";
    return decodeURIComponent(path);
  }, [path]);

  const { mediaFiles, hardwareAccelerations, loading, error } = useMediaFiles(decodedPath);
  const [hardwareAccel, setHardwareAccel] = React.useState<HardwareAcceleration>(HardwareAcceleration.None);
  const [videoCodec, setVideoCodec] = React.useState<StreamCodec>(StreamCodec.H264);
  const [device, setDevice] = React.useState<string>("");
  const [selectedStreams, setSelectedStreams] = React.useState<Record<string, Set<number>>>({});

  const selectedHardwareInfo = React.useMemo(() => {
    return hardwareAccelerations?.find((hw) => hw.hardwareAcceleration === hardwareAccel);
  }, [hardwareAccelerations, hardwareAccel]);

  const availableDevices = React.useMemo(() => {
    return selectedHardwareInfo?.devices ?? [];
  }, [selectedHardwareInfo]);

  const { encodeAll, encoding, encodeError } = useEncodeStreams(
    decodedPath,
    mediaFiles,
    selectedStreams,
    hardwareAccel,
    videoCodec,
    device,
    availableDevices
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

  const hasAnySelection = React.useMemo(
    () => Object.values(selectedStreams).some((set) => set && set.size > 0),
    [selectedStreams]
  );

  const canEncode = React.useMemo(() => {
    const hasValidDevice =
      hardwareAccel === HardwareAcceleration.None || availableDevices.length === 0 || Boolean(device);
    return hasAnySelection && hasValidDevice && videoCodec !== undefined;
  }, [hasAnySelection, device, videoCodec, hardwareAccel, availableDevices]);

  const codecsAvailable = availableCodecs.length > 0;

  const handleEncodeAndRedirect = React.useCallback(async () => {
    try {
      await encodeAll();
      router.push("/encodings");
    } catch (err) {
      console.error("Encoding failed:", err);
    }
  }, [encodeAll, router]);

  usePageTitle("Media Info");
  usePageActions(null);

  const pageIntro = (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Media Info</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Media file information and encoding options.
        </p>
      </div>
      <Separator />
    </div>
  );

  if (!decodedPath) {
    return (
      <main className="container space-y-6 px-4 py-8">
        {pageIntro}
        <Alert variant="destructive">
          <AlertTitle>No file path provided</AlertTitle>
          <AlertDescription>
            Provide a valid media path to inspect encoded streams.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="container space-y-6 px-4 py-8">
      {pageIntro}

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-xl">Encoding configuration</CardTitle>
            <Badge variant="outline" className="text-xs font-normal uppercase tracking-wide max-w-full truncate">
              {decodedPath}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ControlField label="Hardware acceleration">
              <Select
                value={String(hardwareAccel)}
                onValueChange={(value) =>
                  setHardwareAccel(Number(value) as HardwareAcceleration)
                }
              >
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
              helper={
                availableDevices.length === 0 && hardwareAccel !== HardwareAcceleration.None
                  ? "No compatible devices detected for this hardware acceleration."
                  : undefined
              }
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
                value={codecsAvailable ? String(videoCodec) : undefined}
                onValueChange={(value) =>
                  setVideoCodec(Number(value) as StreamCodec)
                }
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

            <ControlField
              label="Selection summary"
              helper="Choose the streams below to enable encoding."
            >
              <div className="rounded-md border border-dashed border-muted px-3 py-2 text-sm text-muted-foreground">
                {hasAnySelection ? "Streams selected" : "Awaiting stream selection"}
              </div>
            </ControlField>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              disabled={encoding || !canEncode}
              onClick={handleEncodeAndRedirect}
            >
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
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </CardContent>
        </Card>
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
    </main>
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

function ControlField({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
