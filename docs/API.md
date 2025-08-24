# API

## Torrent Feature

### Endpoints

- GET `api/torrents` - returns list of uploaded torrents
- POST `api/torrents` - upload new torrent files for download
- PUT `api/torrents/{hash}/start` - start torrent download
- PUT `api/torrents/{hash}/stop` - stop torrent download
- DELETE `api/torrents/{hash}` - delete torrent file

### SignalR

- `hub/torrents` - SignalR hub for torrents updates

## Encoding Feature

### Endpoints

- GET `api/encodings` - returns list of active encodings
- GET `api/encodings/{hash}` - returns list of media files with media info
- POST `api/encodings/{hash}` - start new encoding
- DELETE `api/encodings/{hash}` - stop and delete encoding

### SignalR

- `hub/encodings` - SignalR hub for encoding updates

## Files Management Feature

