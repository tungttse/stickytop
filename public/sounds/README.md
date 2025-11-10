# Background Sounds Directory

Place your background sound files (`.wav`, `.mp3`, or `.ogg`) in this directory.

## Supported Formats
- `.wav` (recommended for best quality)
- `.mp3` (good compression)
- `.ogg` (open format)

## File Naming
The sound files should match the names configured in `src/constants/sounds.js`:
- `forest.wav`
- `rain.wav`
- `sea.wav`
- `ocean.wav`
- `cafe.wav`

## Adding New Sounds
1. Add your sound file to this directory
2. Update `src/constants/sounds.js` to add a new entry:
   ```javascript
   newSound: {
     name: 'New Sound',
     url: '/public/sounds/new-sound.wav',
   }
   ```

## Recommended Sources
- [Freesound.org](https://freesound.org) - Free sound effects and loops
- [Zapsplat.com](https://www.zapsplat.com) - Free sound library
- [Mixkit.co](https://mixkit.co/free-sound-effects/) - Free audio files

## Notes
- Files should be loopable for best background music experience
- Keep file sizes reasonable (< 5MB recommended)
- After adding files, rebuild the app: `npm run build-react-dev`

