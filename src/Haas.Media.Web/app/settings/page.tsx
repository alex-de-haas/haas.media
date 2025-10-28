"use client";

import { useState, useEffect, useMemo } from "react";
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

export default function SettingsPage() {
  const { notify } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentSyncTaskId, setCurrentSyncTaskId] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [countryCode, setCountryCode] = useState("US");
  const [movieDirectories, setMovieDirectories] = useState<string[]>([]);
  const [tvShowDirectories, setTvShowDirectories] = useState<string[]>([]);
  const [newMovieDir, setNewMovieDir] = useState("");
  const [newTvShowDir, setNewTvShowDir] = useState("");
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [directoryPickerType, setDirectoryPickerType] = useState<"movie" | "tvshow">("movie");

  const { files, currentPath, loading: filesLoading, navigateToPath } = useFiles("");
  const { tasks: backgroundTasks, cancelTask } = useBackgroundTasks({ enabled: true });

  const currentSyncTask = useMemo(() => {
    if (!currentSyncTaskId) return null;
    return backgroundTasks.find((task) => task.id === currentSyncTaskId) ?? null;
  }, [currentSyncTaskId, backgroundTasks]);

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
      } catch (error) {
        console.error("Error fetching settings:", error);
        notify({ message: "Failed to load settings", type: "error" });
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
        throw new Error(errorData?.error || "Failed to update settings");
      }

      notify({ message: "Settings updated successfully", type: "success" });
    } catch (error) {
      console.error("Error updating settings:", error);
      notify({
        message: error instanceof Error ? error.message : "Failed to update settings",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncMetadata = async () => {
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
          refreshMovies: true,
          refreshTvShows: true,
          refreshPeople: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start metadata sync");
      }

      const data = await response.json();
      setCurrentSyncTaskId(data.operationId);
      notify({ 
        message: "Metadata sync started", 
        type: "success" 
      });
    } catch (error) {
      console.error("Error syncing metadata:", error);
      notify({
        message: error instanceof Error ? error.message : "Failed to sync metadata",
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
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage global application settings</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Global Settings</CardTitle>
            <CardDescription>
              Configure metadata preferences and media directories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-lg font-medium">Metadata Preferences</h3>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="preferredLanguage">Preferred TMDB Language</Label>
                      <LanguageSelect id="preferredLanguage" value={preferredLanguage} onChange={setPreferredLanguage} disabled={isSaving} />
                      <p className="text-sm text-muted-foreground">Default language for fetching movie and TV show metadata from TMDB</p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="countryCode">Preferred Country (ISO 3166-1 alpha-2)</Label>
                      <CountrySelect id="countryCode" value={countryCode} onChange={setCountryCode} disabled={isSaving} />
                      <p className="text-sm text-muted-foreground">Default country for release dates and regional content</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="mb-4 text-lg font-medium">Media Directories</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Configure directories to scan for movies and TV shows. Paths are relative to the DATA_DIRECTORY.
                  </p>
                  <div className="grid gap-6">
                    <div className="grid gap-3">
                      <Label>Movie Directories</Label>
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
                            placeholder="Movies"
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
                              Browse
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
                      <p className="text-sm text-muted-foreground">
                        Directories to scan for movie files (e.g., &quot;Movies&quot;, &quot;Films&quot;)
                      </p>
                    </div>

                    <div className="grid gap-3">
                      <Label>TV Show Directories</Label>
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
                            placeholder="Shows"
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
                              Browse
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
                      <p className="text-sm text-muted-foreground">
                        Directories to scan for TV show files (e.g., &quot;Shows&quot;, &quot;TV&quot;)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t pt-6">
                <Button type="submit" disabled={isSubmitDisabled}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata Sync</CardTitle>
            <CardDescription>
              Scan configured directories for new media files and refresh metadata from TMDB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will scan all configured movie and TV show directories for new files and update metadata for existing media.
              </p>

              {!currentSyncTask && (
                <Button onClick={handleSyncMetadata} disabled={isSyncing}>
                  <RefreshCw className="h-4 w-4" />
                  Sync Metadata
                </Button>
              )}

              {currentSyncTask && (
                <BackgroundTaskCard task={currentSyncTask} onCancel={cancelTask} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDirectoryPicker} onOpenChange={setShowDirectoryPicker}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="text-left">
            <DialogTitle>Select Directory</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <FileList
              files={files.filter((file) => file.type === FileItemType.Directory)}
              currentPath={currentPath}
              onNavigate={navigateToPath}
              loading={filesLoading}
            />

            <Separator />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderPlus className="h-4 w-4" />
                <span>
                  Current path:
                  <span className="ml-1 font-medium text-foreground">{currentPath || "Root"}</span>
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowDirectoryPicker(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDirectorySelect}
                  disabled={!currentPath}
                >
                  Use This Directory
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
