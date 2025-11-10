// Sound sources configuration
// For local files, place them in public/sounds/ directory
// Supported formats: .wav, .mp3, .ogg
// Recommended sources: freesound.org, zapsplat.com, or create your own loops

export const SOUND_SOURCES = {
  forest: {
    name: 'Forest',
    // Local file: place forest.wav in public/sounds/ directory
    // Use relative path from index.html (which is in dist/)
    url: './public/sounds/forestbirds.mp3',
    // Online URL example: url: 'https://example.com/sounds/forest.mp3'
  },
  rain: {
    name: 'Rain',
    url: './public/sounds/rain.mp3',
  },

  ocean: {
    name: 'Ocean',
    url: './public/sounds/ocean-waves.mp3',
  },
  guitar: {
    name: 'Guitar',
    url: './public/sounds/guitar.mp3',
  },
};

// Default audio settings
export const AUDIO_DEFAULT_CONFIG = {
  volume: 0.5, // Default volume 50% (0.0 to 1.0)
  loop: true,  // Loop audio by default
};

