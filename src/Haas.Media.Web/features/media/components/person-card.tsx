"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent } from "@/components/ui/card";

type TmdbImageSize =
  | "w45"
  | "w92"
  | "w154"
  | "w185"
  | "w300"
  | "w342"
  | "w500"
  | "h632"
  | "original";

export interface PersonCardProps {
  name: string;
  description?: string;
  meta?: string;
  profilePath?: string | null;
  imageSize?: TmdbImageSize;
  className?: string;
}

const DEFAULT_IMAGE_SIZE: TmdbImageSize = "w300";

function getInitials(name?: string) {
  if (!name) {
    return "?";
  }

  const parts = name.trim().split(/\s+/);
  const [first = "", second = ""] = parts;

  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

export function PersonCard({
  name,
  description,
  meta,
  profilePath,
  imageSize = DEFAULT_IMAGE_SIZE,
  className,
}: PersonCardProps) {
  const imageSrc = profilePath
    ? `https://image.tmdb.org/t/p/${imageSize}${profilePath}`
    : null;

  return (
    <Card
      className={cn(
        "group w-full max-w-[12rem] overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl",
        className,
      )}
    >
      <div className="bg-muted">
        <AspectRatio ratio={3 / 4} className="overflow-hidden">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={name}
              fill
              sizes="(min-width: 1280px) 12rem, (min-width: 1024px) 11rem, (min-width: 640px) 10rem, 9rem"
              className="object-cover transition duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-muted/70 to-muted text-lg font-semibold text-muted-foreground">
              {getInitials(name)}
            </div>
          )}
        </AspectRatio>
      </div>
      <CardContent className="space-y-1 p-4">
        <p className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
          {name}
        </p>
        {description ? (
          <p className="line-clamp-1 text-sm leading-tight text-muted-foreground">
            {description}
          </p>
        ) : null}
        {meta ? (
          <p className="line-clamp-1 text-xs leading-tight text-muted-foreground/80">
            {meta}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
