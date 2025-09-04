"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useMediaFiles, useEncodeStreams } from "@/features/media";
import { MediaFilesList } from "@/features/media";
import { LoadingSpinner } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { HardwareAcceleration } from "@/types/encoding";
import { StreamCodec } from "@/types/media-info";

interface PageProps {
  // In Next.js 15, `params` is a Promise and should be unwrapped with React.use()
  params: Promise<{ path: string }>;
}

export default function MediaInfoPage({ params }: PageProps) {
  // Unwrap params Promise per Next.js guidance
  const { path } = React.use(params);
  const router = useRouter();

  // Join path segments and decode the full path
  const decodedPath = React.useMemo(() => {
    if (!path || path.length === 0) return "";
    return decodeURIComponent(path);
  }, [path]);

  const { mediaFiles, hardwareAccelerations, loading, error } = useMediaFiles(decodedPath);
  const [hardwareAccel, setHardwareAccel] = React.useState<HardwareAcceleration>(HardwareAcceleration.None);
  const [videoCodec, setVideoCodec] = React.useState<StreamCodec>(StreamCodec.H264);
  const [device, setDevice] = React.useState<string>("");
  const [selectedStreams, setSelectedStreams] = React.useState<
    Record<string, Set<number>>
  >({});

  // Get available devices and codecs based on selected hardware acceleration
  const selectedHardwareInfo = React.useMemo(() => {
    return hardwareAccelerations?.find(hw => hw.hardwareAcceleration === hardwareAccel);
  }, [hardwareAccelerations, hardwareAccel]);

  const availableDevices = React.useMemo(() => {
    return selectedHardwareInfo?.devices || [];
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
      // For None acceleration, allow all video codecs
      return videoCodecs;
    }
    if (selectedHardwareInfo?.encoders) {
      return videoCodecs.filter(codec => selectedHardwareInfo.encoders.includes(codec));
    }
    return videoCodecs;
  }, [selectedHardwareInfo, hardwareAccel]);

  // Get available hardware accelerations (None is always available)
  const availableHardwareAccelerations = React.useMemo(() => {
    const available = [HardwareAcceleration.None];
    if (hardwareAccelerations) {
      // Add hardware accelerations that are actually available in the system
      hardwareAccelerations.forEach(hw => {
        if (!available.includes(hw.hardwareAcceleration)) {
          available.push(hw.hardwareAcceleration);
        }
      });
    }
    return available;
  }, [hardwareAccelerations]);

  // Auto-select first available device when hardware acceleration changes
  React.useEffect(() => {
    if (hardwareAccel === HardwareAcceleration.None) {
      // For None acceleration, use empty device
      setDevice("");
    } else if (availableDevices.length > 0) {
      if (!availableDevices.includes(device)) {
        const firstDevice = availableDevices[0];
        if (firstDevice) {
          setDevice(firstDevice);
        }
      }
    } else {
      // No devices available for selected hardware acceleration
      setDevice("");
    }
  }, [availableDevices, device, hardwareAccel]);

  // Auto-select valid hardware acceleration if current selection is not available
  React.useEffect(() => {
    if (!availableHardwareAccelerations.includes(hardwareAccel)) {
      // Fall back to None if current selection is not available
      setHardwareAccel(HardwareAcceleration.None);
    }
  }, [availableHardwareAccelerations, hardwareAccel]);

  // Auto-select first available codec when hardware acceleration changes
  React.useEffect(() => {
    if (availableCodecs.length > 0 && !availableCodecs.includes(videoCodec)) {
      const firstCodec = availableCodecs[0];
      if (firstCodec !== undefined) {
        setVideoCodec(firstCodec);
      }
    }
  }, [availableCodecs, videoCodec]);

  const hasAnySelection = React.useMemo(
    () => Object.values(selectedStreams).some((s) => s && s.size > 0),
    [selectedStreams]
  );

  const canEncode = React.useMemo(() => {
    // Device is not required for None hardware acceleration or when no devices are available
    const hasValidDevice = hardwareAccel === HardwareAcceleration.None || 
                           availableDevices.length === 0 || 
                           device;
    return hasAnySelection && hasValidDevice && videoCodec !== undefined;
  }, [hasAnySelection, device, videoCodec, hardwareAccel, availableDevices]);

  // Helper function to get codec display name
  const getCodecName = React.useCallback((codec: StreamCodec): string => {
    switch (codec) {
      case StreamCodec.H264: return "H.264";
      case StreamCodec.HEVC: return "HEVC (H.265)";
      case StreamCodec.AV1: return "AV1";
      case StreamCodec.VP9: return "VP9";
      case StreamCodec.VP8: return "VP8";
      default: return "Unknown";
    }
  }, []);

  // Helper function to get hardware acceleration display name
  const getHardwareAccelName = React.useCallback((hwAccel: HardwareAcceleration): string => {
    switch (hwAccel) {
      case HardwareAcceleration.None: return "None";
      case HardwareAcceleration.NVENC: return "NVIDIA (NVENC)";
      case HardwareAcceleration.QSV: return "Intel (QSV)";
      case HardwareAcceleration.AMF: return "AMD (AMF)";
      case HardwareAcceleration.VideoToolbox: return "Apple VideoToolbox";
      case HardwareAcceleration.VAAPI: return "VA-API (Linux)";
      case HardwareAcceleration.Auto: return "Auto";
      default: return "Unknown";
    }
  }, []);

  const handleEncodeAndRedirect = React.useCallback(async () => {
    try {
      await encodeAll();
      // Redirect to encodings page after successful encoding start
      router.push("/encodings");
    } catch (error) {
      // Error is already handled by the hook, just stay on current page
      console.error("Encoding failed:", error);
    }
  }, [encodeAll, router]);

  if (!decodedPath) return <div className="p-6">No file path provided.</div>;

  return (
    <main className="container mx-auto px-4 py-8">
      <PageHeader
        title="Media Info"
        description="Media file information and encoding options."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                HW Accel
              </label>
              <select
                className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none min-w-[140px]"
                value={String(hardwareAccel)}
                onChange={(e) => setHardwareAccel(Number(e.target.value) as HardwareAcceleration)}
              >
                {availableHardwareAccelerations.map((hwAccel) => (
                  <option key={hwAccel} value={String(hwAccel)}>
                    {getHardwareAccelName(hwAccel)}
                  </option>
                ))}
              </select>
            </div>

            {/* Only show device selector when devices are available */}
            {availableDevices.length > 0 && (
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Device
                </label>
                <select
                  className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none min-w-[120px]"
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                >
                  {availableDevices.map((dev) => (
                    <option key={dev} value={dev}>{dev}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Codec
              </label>
              <select
                className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none min-w-[120px]"
                value={String(videoCodec)}
                onChange={(e) => setVideoCodec(Number(e.target.value) as StreamCodec)}
                disabled={availableCodecs.length === 0}
              >
                {availableCodecs.length === 0 ? (
                  <option value="">No codecs available</option>
                ) : (
                  availableCodecs.map((codec) => (
                    <option key={codec} value={String(codec)}>{getCodecName(codec)}</option>
                  ))
                )}
              </select>
            </div>
            
            <button
              type="button"
              disabled={encoding || !canEncode}
              onClick={handleEncodeAndRedirect}
              className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {encoding ? "Encoding..." : "Encode Selected"}
            </button>
          </div>
        }
      />

      {loading && <LoadingSpinner size="lg" />}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {encodeError && <div className="text-red-500 text-sm">{encodeError}</div>}

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
