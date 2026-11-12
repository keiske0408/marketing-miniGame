# Audio assets

The background track is [`../Gvi Avp 2026 (Final) 2.mp3`](<../Gvi Avp 2026 (Final) 2.mp3>).
It loops after the first user interaction. Master volume, Music volume, mute, and result ducking are applied through Web Audio. Background music pauses while AVP plays and resumes on pause, end, or leaving the video screen.

To replace the track, replace that MP3 while retaining its filename, or update the URL in [`services/audio.ts`](../../services/audio.ts). Confirm you have permission to distribute the audio.

Click, success, failure, countdown, and level-up effects remain procedural Web Audio sounds. SFX volume controls them independently. Files added to this directory do not automatically override these effects; custom effects require wiring their playback in the audio service.

AVP video lives at [`../gvi-avp-2026.mp4`](../gvi-avp-2026.mp4). See the main [README](../../README.md#avp-video-and-background-music) for bundled video, optional online hosting, and SharePoint export instructions.
