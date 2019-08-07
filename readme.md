# Stream

An extensible video streaming service with client-side stitching for playlist capabilities.

## Usage

@NOTE: Requires ytdl - `choco install youtube-dl`

`ytdl <url>` will download a video to the current path, usually an `assets` or `stream` folder.

`ytaudio <url>` will download just the audio of a video url.

`ytwatch` will watch the clipboard for new video urls and ytdl new entries allowing you to browse Youtube (or ytdl supported site) and copy the "share" link for videos you want to download.

`stream <path>` will host a server that streams content from `<path>`

`stream` will look for an `assets` or `stream` subfolder and stream from there.

`stream open 8080` will host the service on port 8080 and open a browser to the stream.
