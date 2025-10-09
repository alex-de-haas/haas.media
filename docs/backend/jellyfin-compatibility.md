# Jellyfin Compatibility Layer

The downloader API ships with a lightweight Jellyfin-compatible surface so sidecar media apps (Infuse, Kodi, etc.) can browse Haas.Media libraries, request metadata, and stream content without a dedicated Jellyfin server.

## Supported Surface Area

- `POST /jellyfin/Users/AuthenticateByName` — reuses the local authentication store and issues the standard JWT access token. `Username` and either `Pw` or `Password` are required.
- `GET /jellyfin/System/Info/Public` — exposes server, version, and OS metadata expected by Jellyfin discovery flows.
- `GET /jellyfin/Users`, `/jellyfin/Users/Me`, `/jellyfin/Users/{id}` — user lookups for session handshakes.
- `GET /jellyfin/Users/{id}/Views` — returns available libraries for the authenticated user (mirrors `MediaFolders`).
- `GET /jellyfin/Sessions` — advertises the current session for clients that validate presence after login.
- `GET /jellyfin/Library/MediaFolders` — lists configured libraries, mapped to Jellyfin collection ids.
- `GET /jellyfin/Users/{userId}/Items` and `GET /jellyfin/Items` — browse collections, series, seasons, and episodes with Jellyfin-style ids. Supports `IncludeItemTypes`, `ParentId`, `Recursive`, and `SearchTerm` filters.
- `GET /jellyfin/Items/{id}` — retrieve a single item including generated `MediaSources` for playback.
- `GET /jellyfin/Items/{id}/Images/{type}` — proxies TMDb artwork (primary or backdrop) via HTTP redirects.
- `GET /jellyfin/Videos/{id}/stream` — direct or transcoded playback powered by the existing `VideoStreamingService`.
- `POST /jellyfin/Items/{id}/PlaybackInfo` — returns the `MediaSources` payload used by Infuse before playback.

All IDs are stable and encode the entity type:

| Kind    | Format                                  | Example                       |
| ------- | --------------------------------------- | ----------------------------- |
| Library | `library-{liteDbId}`                    | `library-6623f1fbe6d...`      |
| Movie   | `movie-{tmdbId}`                        | `movie-603`                  |
| Series  | `series-{tmdbId}`                       | `series-1399`                |
| Season  | `season-{tmdbId}-{seasonNumber}`        | `season-1399-1`              |
| Episode | `episode-{tmdbId}-{season}-{episode}`   | `episode-1399-1-1`           |

## Token Handling

Clients can authenticate with the same JWT that backs the REST API. Tokens are accepted through:

- `X-Emby-Token` or `X-MediaBrowser-Token`
- `X-Emby-Authorization: MediaBrowser ... Token="<jwt>"`
- Query parameter `api_key`
- Standard `Authorization: Bearer <jwt>` header

`AuthenticateByName` emits the JWT alongside a `SessionInfo` payload that mirrors Jellyfin's response. Tokens are validated with the configured `JWT_SECRET`, issuer, and audience. If JWT auth is disabled the Jellyfin endpoints reject authenticated operations.

After authentication most clients call `/jellyfin/Users/Me`, `/jellyfin/Users/{userId}/Views`, and `/jellyfin/Sessions`. These routes now project the local LiteDB user and active libraries so apps such as Infuse can finish their connection wizard.

## Streaming Behaviour

`/jellyfin/Videos/{id}/stream` resolves the media path relative to `DATA_DIRECTORY` and hands it to the shared `VideoStreamingService`. Requests default to direct play; set `transcode=true` (plus optional `format`/`quality`) to force on-the-fly transcoding. Infuse typically requests direct play while falling back to transcoding when codecs mismatch.

## Image Proxying

TMDb poster/backdrop paths stored in LiteDB are transformed into public URLs using `https://image.tmdb.org/t/p/`. Clients can request `Primary` or `Backdrop` images; optional `maxWidth` or `quality=original` parameters change the size segment.

## Limitations & Next Steps

- `MediaStreams` are generated with placeholder codec details because ffprobe metadata is not yet captured during scans.
- Resume/played progress is not persisted; `JellyfinUserData` currently defaults to `Played = false`.
- Live search forwards to LiteDB only; direct TMDb proxy endpoints are unchanged.

These gaps are tracked so the compatibility surface can grow as media scanning and playback telemetry are enhanced.
