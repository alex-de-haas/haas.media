"use client";

import { useEffect, useMemo, useState } from "react";
import { useFiles } from "@/features/files";
import FileList from "@/features/files/components/file-list";
import type { CreateLibraryRequest, Library, UpdateLibraryRequest } from "@/types/library";
import { LibraryType } from "@/types/library";
import { FileItemType } from "@/types/file";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FolderOpen, FolderPlus, Loader2 } from "lucide-react";
import { LanguageSelect } from "@/components/language-select";
import { CountrySelect } from "@/components/country-select";
import { isSupportedTmdbLanguage } from "@/lib/tmdb-languages";

interface LibraryFormProps {
  library?: Library;
  onSubmit: (data: CreateLibraryRequest | UpdateLibraryRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function LibraryForm({ library, onSubmit, onCancel, isLoading }: LibraryFormProps) {
  const [title, setTitle] = useState(library?.title ?? "");
  const [description, setDescription] = useState(library?.description ?? "");
  const [selectedPath, setSelectedPath] = useState(library?.directoryPath ?? "");
  const [libraryType, setLibraryType] = useState<LibraryType>(library?.type ?? LibraryType.Movies);
  const [preferredLanguage, setPreferredLanguage] = useState(() => {
    const code = library?.preferredMetadataLanguage ?? "en";
    return code && isSupportedTmdbLanguage(code) ? code : "en";
  });
  const [countryCode, setCountryCode] = useState(() => (library?.countryCode ?? "US").toUpperCase());
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { files, currentPath, loading: filesLoading, navigateToPath } = useFiles("");

  useEffect(() => {
    if (!library) return;

    setTitle(library.title);
    setDescription(library.description ?? "");
    setSelectedPath(library.directoryPath);
    setLibraryType(library.type);
    
    const code = library.preferredMetadataLanguage ?? "en";
    setPreferredLanguage(code && isSupportedTmdbLanguage(code) ? code : "en");
    setCountryCode((library.countryCode ?? "US").toUpperCase());
  }, [library]);

  const isSubmitDisabled = useMemo(() => {
    return !title.trim() || !selectedPath.trim() || !preferredLanguage || !countryCode || isSubmitting || Boolean(isLoading);
  }, [isLoading, isSubmitting, selectedPath, title, preferredLanguage, countryCode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    setIsSubmitting(true);
    try {
      const payload: CreateLibraryRequest | UpdateLibraryRequest = {
        type: libraryType,
        title: title.trim(),
        directoryPath: selectedPath.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        preferredMetadataLanguage: preferredLanguage,
        countryCode: countryCode.toUpperCase(),
      };

      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter library title"
              autoFocus
              required
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="description">Description</Label>
              <Badge variant="outline">Optional</Badge>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what this library contains"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="directoryPath">Directory Path</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="directoryPath"
                value={selectedPath}
                onChange={(event) => setSelectedPath(event.target.value)}
                placeholder="Enter directory path or browse"
                required
              />
              <Button type="button" variant="outline" className="sm:w-[160px]" onClick={() => setShowDirectoryPicker(true)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="libraryType">Library Type</Label>
            <Select value={libraryType.toString()} onValueChange={(value) => setLibraryType(Number(value) as LibraryType)}>
              <SelectTrigger id="libraryType">
                <SelectValue placeholder="Select a library type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LibraryType.Movies.toString()}>Movies</SelectItem>
                <SelectItem value={LibraryType.TVShows.toString()}>TV Shows</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Metadata Preferences</h4>
              <p className="text-xs text-muted-foreground">
                Configure language and country for metadata fetching in this library.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="preferredLanguage">Preferred TMDB language</Label>
              <LanguageSelect
                id="preferredLanguage"
                value={preferredLanguage}
                onChange={setPreferredLanguage}
                disabled={isSubmitting}
                placeholder="Select language"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="countryCode">Preferred release country (ISO 3166-1 alpha-2)</Label>
              <CountrySelect
                id="countryCode"
                value={countryCode}
                onChange={setCountryCode}
                disabled={isSubmitting}
                placeholder="Select country"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitDisabled}>
            {isSubmitting || isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving
              </span>
            ) : library ? (
              "Update Library"
            ) : (
              "Create Library"
            )}
          </Button>
        </div>
      </form>

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
                  onClick={() => {
                    setSelectedPath(currentPath);
                    setShowDirectoryPicker(false);
                  }}
                  disabled={!currentPath}
                >
                  Use This Directory
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
