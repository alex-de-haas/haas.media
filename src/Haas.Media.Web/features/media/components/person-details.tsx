"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Star, Film, Tv } from "lucide-react";

import { usePerson, usePersonCredits } from "@/features/media/hooks";
import { getProfileUrl, getPosterUrlWithSize } from "@/lib/tmdb";
import { Spinner } from "@/components/ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonGender, type MovieMetadata, type TVShowMetadata } from "@/types/metadata";

interface PersonDetailsProps {
  personId: number;
}

function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date);
}

function calculateAge(birthday?: string | null, deathday?: string | null) {
  if (!birthday) {
    return null;
  }

  const birthDate = new Date(birthday);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const endDate = deathday ? new Date(deathday) : new Date();
  if (Number.isNaN(endDate.getTime())) {
    return null;
  }

  let age = endDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = endDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}

function getGenderLabel(gender: PersonGender) {
  switch (gender) {
    case PersonGender.Female:
      return "Female";
    case PersonGender.Male:
      return "Male";
    case PersonGender.NonBinary:
      return "Non-binary";
    default:
      return "Unknown";
  }
}

function buildRolesSummary(personId: number, entry: MovieMetadata | TVShowMetadata) {
  const crewRoles = entry.crew.filter((member) => member.id === personId).map((member) => member.job);
  const castRoles =
    "cast" in entry ? entry.cast.filter((member) => member.id === personId).map((member) => member.character?.trim() || "Cast") : [];
  const uniqueRoles = Array.from(new Set([...crewRoles, ...castRoles]));
  return uniqueRoles.length > 0 ? uniqueRoles.join(" • ") : null;
}

export default function PersonDetails({ personId }: PersonDetailsProps) {
  const router = useRouter();
  const { person, loading, error } = usePerson(personId);
  const { movies, tvShows, loading: creditsLoading, error: creditsError } = usePersonCredits(personId);

  const movieCredits = movies;
  const tvCredits = tvShows;

  const biographyParagraphs = useMemo(() => {
    if (!person?.biography) {
      return [];
    }

    return person.biography
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [person?.biography]);

  const profileUrl = getProfileUrl(person?.profilePath);
  const formattedBirthday = formatDate(person?.birthday);
  const formattedDeathday = formatDate(person?.deathday);
  const age = calculateAge(person?.birthday, person?.deathday);
  const genderLabel = person ? getGenderLabel(person.gender) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load person details</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!person) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Person not found</AlertTitle>
        <AlertDescription>The person you are looking for could not be located.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
      <div>
        <Button variant="outline" size="sm" className="inline-flex items-center gap-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="mx-auto w-full max-w-xs lg:mx-0">
          <Card className="overflow-hidden border-border/60 shadow-lg">
            <div className="relative aspect-[2/3] bg-muted">
              {profileUrl ? (
                <Image src={profileUrl} alt={person.name ?? "Person profile"} fill className="object-cover" priority />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <span className="text-4xl font-semibold text-muted-foreground">{person.name?.charAt(0) ?? "?"}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{person.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {genderLabel ? (
                <Badge variant="secondary" className="gap-1">
                  {genderLabel}
                </Badge>
              ) : null}
              {typeof person.popularity === "number" && person.popularity > 0 ? (
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3.5 w-3.5" />
                  Popularity {person.popularity.toFixed(1)}
                </Badge>
              ) : null}
              {formattedBirthday ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Born {formattedBirthday}
                  {age ? ` (${age} years${person.deathday ? "" : " old"})` : null}
                </span>
              ) : null}
              {formattedDeathday ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Died {formattedDeathday}
                </span>
              ) : null}
              {person.placeOfBirth ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {person.placeOfBirth}
                </span>
              ) : null}
            </div>
          </div>

          {biographyParagraphs.length > 0 ? (
            <Card className="border-border/60 bg-card/70">
              <CardHeader className="pb-3">
                <CardTitle>Biography</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                {biographyParagraphs.map((paragraph, index) => (
                  <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-border/60 bg-muted/40">
              <CardContent className="py-6 text-sm text-muted-foreground">
                No biography is available for {person.name ?? "this person"} yet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Featured Credits</h2>
          {creditsError ? (
            <Badge variant="destructive" className="gap-1">
              {creditsError}
            </Badge>
          ) : null}
        </div>

        {creditsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : movieCredits.length === 0 && tvCredits.length === 0 ? (
          <Card className="border-border/60 bg-muted/40">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
              <Film className="h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm">No associated credits were found in your libraries.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {movieCredits.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Film className="h-5 w-5" />
                  Movies
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {movieCredits.slice(0, 12).map((movie) => {
                    const posterUrl = getPosterUrlWithSize(movie.posterPath, "w342");
                    const rolesSummary = buildRolesSummary(personId, movie);
                    const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;

                    return (
                      <Link key={movie.id} href={`/movies/${movie.id}`} className="group block">
                        <Card className="h-full overflow-hidden border-border/60 transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                          <div className="relative aspect-[2/3] bg-muted">
                            {posterUrl ? (
                              <Image
                                src={posterUrl}
                                alt={`${movie.title} poster`}
                                fill
                                className="object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center bg-card">
                                <Film className="h-10 w-10 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <CardContent className="space-y-2 p-4">
                            <div className="space-y-1">
                              <h3 className="line-clamp-2 text-base font-semibold leading-tight text-foreground">
                                {movie.title}
                              </h3>
                              {releaseYear ? <p className="text-xs text-muted-foreground">Released {releaseYear}</p> : null}
                            </div>
                            {rolesSummary ? <p className="text-xs text-muted-foreground/90">{rolesSummary}</p> : null}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {tvCredits.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Tv className="h-5 w-5" />
                  TV Shows
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {tvCredits.slice(0, 12).map((show) => {
                    const posterUrl = getPosterUrlWithSize(show.posterPath, "w342");
                    const rolesSummary = buildRolesSummary(personId, show);

                    return (
                      <Link key={show.id} href={`/tvshows/${show.id}`} className="group block">
                        <Card className="h-full overflow-hidden border-border/60 transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                          <div className="relative aspect-[2/3] bg-muted">
                            {posterUrl ? (
                              <Image
                                src={posterUrl}
                                alt={`${show.title} poster`}
                                fill
                                className="object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center bg-card">
                                <Tv className="h-10 w-10 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <CardContent className="space-y-2 p-4">
                            <h3 className="line-clamp-2 text-base font-semibold leading-tight text-foreground">
                              {show.title}
                            </h3>
                            {rolesSummary ? <p className="text-xs text-muted-foreground/90">{rolesSummary}</p> : null}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
