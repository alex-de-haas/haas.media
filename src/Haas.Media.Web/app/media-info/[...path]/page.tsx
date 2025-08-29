"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useMediaFiles, useEncodeStreams } from "@/features/media";
import { MediaFilesList } from "@/features/media";
import { LoadingSpinner } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { HardwareAcceleration } from "@/types/encoding";

interface PageProps {
  params: { path: string };
}

export default function MediaInfoPage({ params }: PageProps) {
  const { path } = params;
  const router = useRouter();

  // Join path segments and decode the full path
  const decodedPath = React.useMemo(() => {
    if (!path || path.length === 0) return "";
    return decodeURIComponent(path);
  }, [path]);

  const { mediaFiles, loading, error } = useMediaFiles(decodedPath);
  const [hardwareAccel, setHardwareAccel] = React.useState<HardwareAcceleration>(HardwareAcceleration.None);
  const [selectedStreams, setSelectedStreams] = React.useState<
    Record<string, Set<number>>
  >({});
  const { encodeAll, encoding, encodeError } = useEncodeStreams(
    decodedPath,
    mediaFiles,
    selectedStreams,
    hardwareAccel
  );

  const hasAnySelection = React.useMemo(
    () => Object.values(selectedStreams).some((s) => s && s.size > 0),
    [selectedStreams]
  );

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
    <main className="mx-auto space-y-10">
      <PageHeader
        title="Media Info"
        description="Media file information and encoding options."
        actions={
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-700 dark:text-gray-300">
              HW Accel
            </label>
            <select
              className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              value={String(hardwareAccel)}
              onChange={(e) => setHardwareAccel(Number(e.target.value) as HardwareAcceleration)}
            >
              <option value={String(HardwareAcceleration.None)}>None</option>
              <option value={String(HardwareAcceleration.NVENC)}>NVIDIA (NVENC)</option>
              <option value={String(HardwareAcceleration.QSV)}>Intel (QSV)</option>
              <option value={String(HardwareAcceleration.AMF)}>AMD (AMF)</option>
              <option value={String(HardwareAcceleration.VideoToolbox)}>Apple VideoToolbox</option>
              <option value={String(HardwareAcceleration.VAAPI)}>VA-API (Linux)</option>
              <option value={String(HardwareAcceleration.Auto)}>Auto</option>
            </select>
            <button
              type="button"
              disabled={encoding || !hasAnySelection}
              onClick={handleEncodeAndRedirect}
              className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
