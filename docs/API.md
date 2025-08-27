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
- GET `api/encodings/info?path={path}` - returns list of media files with media info by {path} (path to directory or file)
- POST `api/encodings` - start new encoding
- DELETE `api/encodings/{id}` - stop and delete encoding

### SignalR

- `hub/encodings` - SignalR hub for encoding updates