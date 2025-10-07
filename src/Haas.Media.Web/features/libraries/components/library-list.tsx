"use client";

import { useRouter } from "next/navigation";
import type { Library } from "@/types/library";
import { LibraryType } from "@/types/library";
import { formatDate } from "@/lib/utils/format";
import { Spinner } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { CalendarClock, Eye, Film, LibraryBig, MoreVertical, PencilLine, Trash2, TvMinimal, FolderOpen } from "lucide-react";

interface LibraryListProps {
  libraries: Library[];
  onEdit: (library: Library) => void;
  onDelete: (library: Library) => void;
  onView?: (library: Library) => void;
  loading?: boolean;
}

function LibraryActions({ onEdit, onDelete, onView }: { onEdit: () => void; onDelete: () => void; onView?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open library actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        {onView && (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onView();
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Content
          </DropdownMenuItem>
        )}
        {onView && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onEdit();
          }}
        >
          <PencilLine className="mr-2 h-4 w-4" />
          Edit Library
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onDelete();
          }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Library
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LibraryTypeBadge({ type }: { type: LibraryType }) {
  return type === LibraryType.Movies ? <Film className="h-5 w-5" /> : <TvMinimal className="h-5 w-5" />;
}

export default function LibraryList({ libraries, onEdit, onDelete, onView, loading }: LibraryListProps) {
  const router = useRouter();

  const handleViewLibrary = (library: Library) => {
    if (onView) {
      onView(library);
      return;
    }

    const route = library.type === LibraryType.Movies ? "/movies" : "/tvshows";
    router.push(`${route}?libraryId=${library.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {libraries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted-foreground">
            <LibraryBig className="h-12 w-12 text-muted-foreground/30" />
            <div>No libraries found yet.</div>
            <div className="text-xs">Start by creating a library to organize your media.</div>
          </div>
        ) : (
          <div className="divide-y">
            {libraries.map((library) => (
              <div key={library.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex flex-1 items-start gap-3 sm:items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/60 text-muted-foreground">
                    <LibraryTypeBadge type={library.type} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-foreground">{library.title}</p>
                    </div>
                    {library.description && <p className="text-sm text-muted-foreground">{library.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span className="break-all">{library.directoryPath}</span>
                      </span>
                      <Separator orientation="vertical" className="hidden h-4 sm:block" />
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Created {formatDate(library.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <LibraryActions
                    onEdit={() => onEdit(library)}
                    onDelete={() => onDelete(library)}
                    onView={() => handleViewLibrary(library)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
