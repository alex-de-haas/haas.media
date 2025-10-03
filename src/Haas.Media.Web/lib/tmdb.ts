/**
 * Utility functions for working with TMDB images
 */

/**
 * Gets the full URL for a TMDB poster image (w500 size)
 * @param posterPath The relative poster path from TMDB
 * @returns Full image URL or null if path is null/empty
 */
export function getPosterUrl(posterPath?: string | null): string | null {
  if (!posterPath) return null;
  return `https://image.tmdb.org/t/p/w500${posterPath}`;
}

/**
 * Gets the full URL for a TMDB backdrop image (w1280 size)
 * @param backdropPath The relative backdrop path from TMDB
 * @returns Full image URL or null if path is null/empty
 */
export function getBackdropUrl(backdropPath?: string | null): string | null {
  if (!backdropPath) return null;
  return `https://image.tmdb.org/t/p/w1280${backdropPath}`;
}

/**
 * Gets the full URL for a TMDB poster image with a specific size
 * @param posterPath The relative poster path from TMDB
 * @param size The image size (e.g., 'w185', 'w342', 'w500', 'w780', 'original')
 * @returns Full image URL or null if path is null/empty
 */
export function getPosterUrlWithSize(posterPath?: string | null, size: string = "w500"): string | null {
  if (!posterPath) return null;
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

/**
 * Gets the full URL for a TMDB backdrop image with a specific size
 * @param backdropPath The relative backdrop path from TMDB
 * @param size The image size (e.g., 'w300', 'w780', 'w1280', 'original')
 * @returns Full image URL or null if path is null/empty
 */
export function getBackdropUrlWithSize(backdropPath?: string | null, size: string = "w1280"): string | null {
  if (!backdropPath) return null;
  return `https://image.tmdb.org/t/p/${size}${backdropPath}`;
}
