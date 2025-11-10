import React, { useState, useRef, useEffect } from 'react';
import { SOUND_SOURCES, AUDIO_DEFAULT_CONFIG } from '../constants/sounds';

const MusicControl = () => {
  const [selectedSound, setSelectedSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const audioRef = useRef(null);
  const menuRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = AUDIO_DEFAULT_CONFIG.loop;
      audioRef.current.volume = AUDIO_DEFAULT_CONFIG.volume;
      
      // Handle audio events
      audioRef.current.addEventListener('play', () => setIsPlaying(true));
      audioRef.current.addEventListener('pause', () => setIsPlaying(false));
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setIsPlaying(false);
      });
    }

    return () => {
      // Cleanup
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          !event.target.closest('.music-control-btn')) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  const handleSoundSelect = (soundKey) => {
    setShowMenu(false);
    
    if (audioRef.current) {
      // Nếu chọn lại cùng sound đang pause, chỉ cần play lại
      if (selectedSound === soundKey && !isPlaying) {
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
          setIsPlaying(false);
        });
        return;
      }
      
      // Chọn sound mới hoặc sound khác
      setSelectedSound(soundKey);
      audioRef.current.src = SOUND_SOURCES[soundKey].url;
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
        setIsPlaying(false);
      });
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      // Đang playing -> pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      // Không playing -> show menu để chọn nhạc (dù đã có selectedSound hay chưa)
      setShowMenu(true);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSelectedSound(null);
    setIsPlaying(false);
  };

  return (
    <div className="music-control">
      <button
        className={`music-control-btn ${isPlaying ? 'playing' : ''}`}
        onClick={handlePlayPause}
        title={selectedSound ? (isPlaying ? 'Pause' : 'Play') : 'Select Music'}
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="music-icon">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="music-icon">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        )}
      </button>

      {/* Sound selection menu */}
      {showMenu && (
        <div className="music-menu" ref={menuRef}>
          <div className="music-menu-header">
            <span>Select Background Sound</span>
            <button 
              className="music-menu-close"
              onClick={() => setShowMenu(false)}
              title="Close"
            >
              ✕
            </button>
          </div>
          <div className="music-menu-list">
            {Object.entries(SOUND_SOURCES).map(([key, sound]) => (
              <button
                key={key}
                className={`music-menu-item ${selectedSound === key ? 'selected' : ''}`}
                onClick={() => handleSoundSelect(key)}
              >
                <span className="music-menu-item-name">{sound.name}</span>
                {selectedSound === key && isPlaying && (
                  <span className="music-menu-item-playing">●</span>
                )}
              </button>
            ))}
          </div>
          {selectedSound && (
            <div className="music-menu-footer">
              <button
                className="music-stop-btn"
                onClick={handleStop}
              >
                Stop
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MusicControl;

