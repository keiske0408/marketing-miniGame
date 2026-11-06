# Audio Assets Guide - Perfect Picture Match

The application includes a built-in zero-latency **Web Audio API sound synthesizer** that procedurally produces arcade sound effects and ambient chords out-of-the-box with zero network delay or missing asset errors.

If you wish to override the procedural synth with custom audio files, you can place standard `.mp3` or `.wav` files in this `/public/audio` directory:

| Filename | Purpose | Recommended Duration |
| :--- | :--- | :--- |
| `click.wav` | Button click & slider tick | ~40ms short crisp pop |
| `success.wav` | Puzzle piece matched into gap | ~200ms cheerful chime |
| `fail.wav` | Piece missed gap | ~250ms low thud / buzz |
| `countdown.wav` | 3-2-1 beat pip | ~100ms 880Hz pip |
| `go.wav` | Countdown "GO!" chime | ~300ms 1500Hz ping |
| `levelup.wav` | Level cleared celebration | ~600ms triumphant fanfare |
| `music.mp3` | Background ambient loop | Loopable arcade pulse (120 BPM, gentle) |

### Royalty-Free Sources
- [Freesound.org](https://freesound.org) (Creative Commons 0)
- [Kenney Game Assets](https://kenney.nl/assets) (Audio / UI Audio)
- [OpenGameArt.org](https://opengameart.org)

