"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSelect } from "@/components/language-select";
import { CountrySelect } from "@/components/country-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/lib/notifications";
import { Loader2, Save, Plus, X, RefreshCw, FolderOpen, FolderPlus } from "lucide-react";
import { getApiUrl } from "@/lib/env";
import { isSupportedTmdbLanguage } from "@/lib/tmdb-languages";
import type { GlobalSettings, UpdateGlobalSettingsRequest } from "@/types/global-settings";
import { useBackgroundTasks } from "@/features/background-tasks/hooks/useBackgroundTasks";
import { BackgroundTaskCard } from "@/features/background-tasks/components/background-task-card";
import { useFiles } from "@/features/files";
import FileList from "@/features/files/components/file-list";
import { FileItemType } from "@/types/file";
import { isActiveBackgroundTask } from "@/types";
import MetadataSyncModal from "./metadata-sync-modal";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const { notify } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentSyncTaskId, setCurrentSyncTaskId] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [countryCode, setCountryCode] = useState("US");
  const [movieDirectories, setMovieDirectories] = useState<string[]>([]);
  const [tvShowDirectories, setTvShowDirectories] = useState<string[]>([]);
  const [topCastCount, setTopCastCount] = useState(20);
  const [topCrewCount, setTopCrewCount] = useState(12);
  const [newMovieDir, setNewMovieDir] = useState("");
  const [newTvShowDir, setNewTvShowDir] = useState("");
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [directoryPickerType, setDirectoryPickerType] = useState<"movie" | "tvshow">("movie");
  const [showSyncModal, setShowSyncModal] = useState(false);

  const { files, currentPath, loading: filesLoading, navigateToPath } = useFiles("");
  const { tasks: backgroundTasks, cancelTask } = useBackgroundTasks({ enabled: true });

  const currentSyncTask = useMemo(() => {
    // First check if we have a tracked task ID
    if (currentSyncTaskId) {
      const tracked = backgroundTasks.find((task) => task.id === currentSyncTaskId);
      if (tracked) return tracked;
    }

    // If no tracked task or it's not found, look for any active metadata sync task
    return backgroundTasks.find((task) => task.type === "MetadataSyncTask" && isActiveBackgroundTask(task)) ?? null;
  }, [currentSyncTaskId, backgroundTasks]);

  // Sync the currentSyncTaskId when an active sync task is found
  useEffect(() => {
    if (currentSyncTask && currentSyncTask.id !== currentSyncTaskId) {
      setCurrentSyncTaskId(currentSyncTask.id);
    }
  }, [currentSyncTask, currentSyncTaskId]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`${getApiUrl()}/api/global-settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }

        const settings: GlobalSettings = await response.json();
        const code = settings.preferredMetadataLanguage ?? "en";
        setPreferredLanguage(code && isSupportedTmdbLanguage(code) ? code : "en");
        setCountryCode((settings.countryCode ?? "US").toUpperCase());
        setMovieDirectories(settings.movieDirectories ?? []);
        setTvShowDirectories(settings.tvShowDirectories ?? []);
        setTopCastCount(settings.topCastCount ?? 20);
        setTopCrewCount(settings.topCrewCount ?? 12);
      } catch (error) {
        console.error("Error fetching settings:", error);
        notify({ message: t("failedToLoadSettings"), type: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const payload: UpdateGlobalSettingsRequest = {
        preferredMetadataLanguage: preferredLanguage,
        countryCode: countryCode.toUpperCase(),
        movieDirectories,
        tvShowDirectories,
        topCastCount,
        topCrewCount,
      };

      const response = await fetch(`${getApiUrl()}/api/global-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || t("failedToUpdateSettings"));
      }

      notify({ message: t("settingsUpdatedSuccessfully"), type: "success" });
    } catch (error) {
      console.error("Error updating settings:", error);
      notify({
        message: error instanceof Error ? error.message : t("failedToUpdateSettings"),
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncMetadata = async (refreshExistingData: boolean) => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiUrl()}/api/metadata/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          refreshExistingData,
        }),
      });

      if (!response.ok) {
        throw new Error(t("failedToStartMetadataSync"));
      }

      const data = await response.json();
      setCurrentSyncTaskId(data.operationId);
      setShowSyncModal(false);
      notify({
        message: t("metadataSyncStarted"),
        type: "success",
      });
    } catch (error) {
      console.error("Error syncing metadata:", error);
      notify({
        message: error instanceof Error ? error.message : t("failedToStartMetadataSync"),
        type: "error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const addMovieDirectory = () => {
    if (newMovieDir.trim() && !movieDirectories.includes(newMovieDir.trim())) {
      setMovieDirectories([...movieDirectories, newMovieDir.trim()]);
      setNewMovieDir("");
    }
  };

  const openMovieDirectoryPicker = () => {
    setDirectoryPickerType("movie");
    setShowDirectoryPicker(true);
  };

  const removeMovieDirectory = (index: number) => {
    setMovieDirectories(movieDirectories.filter((_, i) => i !== index));
  };

  const addTvShowDirectory = () => {
    if (newTvShowDir.trim() && !tvShowDirectories.includes(newTvShowDir.trim())) {
      setTvShowDirectories([...tvShowDirectories, newTvShowDir.trim()]);
      setNewTvShowDir("");
    }
  };

  const openTvShowDirectoryPicker = () => {
    setDirectoryPickerType("tvshow");
    setShowDirectoryPicker(true);
  };

  const removeTvShowDirectory = (index: number) => {
    setTvShowDirectories(tvShowDirectories.filter((_, i) => i !== index));
  };

  const handleDirectorySelect = () => {
    if (!currentPath) return;

    if (directoryPickerType === "movie") {
      if (!movieDirectories.includes(currentPath)) {
        setMovieDirectories([...movieDirectories, currentPath]);
      }
    } else {
      if (!tvShowDirectories.includes(currentPath)) {
        setTvShowDirectories([...tvShowDirectories, currentPath]);
      }
    }

    setShowDirectoryPicker(false);
  };

  const isSubmitDisabled = useMemo(() => {
    return !preferredLanguage || !countryCode || isSaving || isLoading;
  }, [preferredLanguage, countryCode, isSaving, isLoading]);

  const disabledDirectoryPaths = useMemo(() => {
    // Combine both movie and TV show directories to prevent mixing
    const allSelectedDirs = [...movieDirectories, ...tvShowDirectories];
    return new Set(allSelectedDirs);
  }, [movieDirectories, tvShowDirectories]);

  const disabledDirectoryMessage = useMemo(() => {
    return t("alreadyUsedForMedia");
  }, [t]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted-foreground">{t("pageDescription")}</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("globalSettings")}</CardTitle>
            <CardDescription>{t("globalSettingsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-lg font-medium">{t("metadataPreferences")}</h3>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="preferredLanguage">{t("preferredTmdbLanguage")}</Label>
                      <LanguageSelect
                        id="preferredLanguage"
                        value={preferredLanguage}
                        onChange={setPreferredLanguage}
                        disabled={isSaving}
                      />
                      <p className="text-sm text-muted-foreground">{t("preferredTmdbLanguageDescription")}</p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="countryCode">{t("preferredCountry")}</Label>
                      <CountrySelect id="countryCode" value={countryCode} onChange={setCountryCode} disabled={isSaving} />
                      <p className="text-sm text-muted-foreground">{t("preferredCountryDescription")}</p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="topCastCount">{t("topCastCountLabel")}</Label>
                      <Input
                        id="topCastCount"
                        type="number"
                        min="1"
                        max="100"
                        value={topCastCount}
                        onChange={(e) => setTopCastCount(parseInt(e.target.value) || 20)}
                        disabled={isSaving}
                      />
                      <p className="text-sm text-muted-foreground">{t("topCastCountDescription")}</p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="topCrewCount">{t("topCrewCountLabel")}</Label>
                      <Input
                        id="topCrewCount"
                        type="number"
                        min="1"
                        max="100"
                        value={topCrewCount}
                        onChange={(e) => setTopCrewCount(parseInt(e.target.value) || 12)}
                        disabled={isSaving}
                      />
                      <p className="text-sm text-muted-foreground">{t("topCrewCountDescription")}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="mb-4 text-lg font-medium">{t("mediaDirectories")}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">{t("mediaDirectoriesDescription")}</p>
                  <div className="grid gap-6">
                    <div className="grid gap-3">
                      <Label>{t("movieDirectoriesLabel")}</Label>
                      <div className="space-y-2">
                        {movieDirectories.map((dir, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input value={dir} disabled className="flex-1" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMovieDirectory(index)}
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            placeholder={t("movieDirectoryPlaceholder")}
                            value={newMovieDir}
                            onChange={(e) => setNewMovieDir(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addMovieDirectory();
                              }
                            }}
                            disabled={isSaving}
                            className="flex-1"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={openMovieDirectoryPicker}
                              disabled={isSaving}
                              className="sm:w-[120px]"
                            >
                              <FolderOpen className="mr-2 h-4 w-4" />
                              {t("browse")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={addMovieDirectory}
                              disabled={isSaving || !newMovieDir.trim()}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{t("movieDirectoriesHelp")}</p>
                    </div>

                    <div className="grid gap-3">
                      <Label>{t("tvShowDirectoriesLabel")}</Label>
                      <div className="space-y-2">
                        {tvShowDirectories.map((dir, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input value={dir} disabled className="flex-1" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTvShowDirectory(index)}
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            placeholder={t("tvShowDirectoryPlaceholder")}
                            value={newTvShowDir}
                            onChange={(e) => setNewTvShowDir(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTvShowDirectory();
                              }
                            }}
                            disabled={isSaving}
                            className="flex-1"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={openTvShowDirectoryPicker}
                              disabled={isSaving}
                              className="sm:w-[120px]"
                            >
                              <FolderOpen className="mr-2 h-4 w-4" />
                              {t("browse")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={addTvShowDirectory}
                              disabled={isSaving || !newTvShowDir.trim()}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{t("tvShowDirectoriesHelp")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t pt-6">
                <Button type="submit" disabled={isSubmitDisabled}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {t("saveSettings")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("metadataSyncTitle")}</CardTitle>
            <CardDescription>{t("metadataSyncDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("metadataSyncInfo")}</p>

              {!currentSyncTask && (
                <Button onClick={() => setShowSyncModal(true)} disabled={isSyncing}>
                  <RefreshCw className="h-4 w-4" />
                  {t("syncMetadata")}
                </Button>
              )}

              {currentSyncTask && <BackgroundTaskCard task={currentSyncTask} onCancel={cancelTask} />}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDirectoryPicker} onOpenChange={setShowDirectoryPicker}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="text-left">
            <DialogTitle>{t("selectDirectoryTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <FileList
              files={files.filter((file) => file.type === FileItemType.Directory)}
              currentPath={currentPath}
              onNavigate={navigateToPath}
              loading={filesLoading}
              disabledPaths={disabledDirectoryPaths}
              disabledMessage={disabledDirectoryMessage}
            />

            <Separator />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderPlus className="h-4 w-4" />
                <span>
                  {t("currentPath")}
                  <span className="ml-1 font-medium text-foreground">{currentPath || t("currentPathRoot")}</span>
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowDirectoryPicker(false)}>
                  {tCommon("cancel")}
                </Button>
                <Button onClick={handleDirectorySelect} disabled={!currentPath}>
                  {t("useThisDirectory")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MetadataSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onConfirm={handleSyncMetadata}
        isSyncing={isSyncing}
      />
    </div>
  );
}
