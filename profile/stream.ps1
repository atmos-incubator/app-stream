function stream($arg1, $arg2, $arg3) {
  return Invoke-Command -ScriptBlock {
    node.exe "$PSScriptRoot\..\server.js" $arg1 $arg2 $arg3
  }
}

function ytdl($video, $encoding) {
  # Download the best mp4 we can get, and merge with best audio
  if ($null -ne $encoding) {
    youtube-dl -f $encoding --write-info-json --id --write-thumbnail $video
  }

  youtube-dl -f 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best' --write-info-json --id --write-thumbnail $video
}

function ytaudio($video) {
  # Download just the audio for a music video
  youtube-dl -f 'bestaudio[ext=m4a]' --write-info-json --id --write-thumbnail $video
}

function ytlist($video) {
  # Report the encoding formats available for this video
  youtube-dl -F $video
}

function ytwatch() {
  # watch the clipboard and download copied urls to the pwd
  $lastClip = Get-Clipboard

  "Ready for next video..."

  while ($true) {
    $clip = Get-Clipboard -Raw

    # Don't grab a bunch of videos if we copy a list of urls from a file
    $lineCount = Measure-Object -InputObject $clip -Line
    $lineCount = $lineCount.Lines

    # Make sure this is a url
    if (($lineCount -eq 1) -and ($clip.startsWith("http") -eq $true) -and ($clip -ne $lastClip)) {

      # Prevent re-download
      $lastClip = $clip

      # Notify user that we grabbed the url
      [System.Media.SystemSounds]::Hand.Play()

      # Download video in new window to asyncly process and not miss a new clipboard entry
      Start-Process powershell -ArgumentList "ytdl $clip" -WindowStyle Minimized

      "Ready for next video..."
    }

    # easy cpu
    Start-Sleep -Seconds 3
  }
}
