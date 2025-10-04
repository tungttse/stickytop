import React, { useState, useEffect } from 'react';


const SystemClock = () => {
  const [currentTime, setCurrentTime] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedSound, setSelectedSound] = useState('Glass');

  const soundOptions = [
    { value: 'Glass', label: '🔔 Glass' },
    { value: 'Basso', label: '🔊 Basso' },
    { value: 'Blow', label: '💨 Blow' },
    { value: 'Bottle', label: '🍾 Bottle' },
    { value: 'Frog', label: '🐸 Frog' },
    { value: 'Funk', label: '🎵 Funk' },
    { value: 'Hero', label: '🦸 Hero' },
    { value: 'Morse', label: '📡 Morse' },
    { value: 'Ping', label: '📡 Ping' },
    { value: 'Pop', label: '💥 Pop' },
    { value: 'Purr', label: '😸 Purr' },
    { value: 'Sosumi', label: '🎶 Sosumi' },
    { value: 'Submarine', label: '🚢 Submarine' },
    { value: 'Tink', label: '✨ Tink' }
  ];

  useEffect(() => {
    const updateTime = async () => {
      console.log('Updating time...');
      try {
        if (window.electronAPI && window.electronAPI.getSystemTime) {
          console.log('Getting system time...');
          const result = await window.electronAPI.getSystemTime();
          console.log('System time:', result);
          if (result.success) {
            setCurrentTime(result.time);
          }
        }
      } catch (error) {
        console.error('Error getting system time:', error);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const playSound = async (soundName = selectedSound) => {
    try {
      if (window.electronAPI && window.electronAPI.playSystemSound) {
        await window.electronAPI.playSystemSound(soundName);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const speakTime = async () => {
    if (!currentTime) return;
    
    try {
      if (window.electronAPI && window.electronAPI.speakText) {
        const timeText = `The time is ${currentTime.hours} ${currentTime.minutes}`;
        await window.electronAPI.speakText(timeText);
      }
    } catch (error) {
      console.error('Error speaking time:', error);
    }
  };

  const formatTime = (time) => {
    if (!time) return '--:--:--';
    return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}:${time.seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="system-clock">
      <button 
        onClick={() => setIsVisible(!isVisible)}
        className="clock-toggle-btn"
      >
        {isVisible ? '🕐 Hide Clock' : '🕐 Show Clock'}
      </button>
      
      {isVisible && currentTime && (
        <div className="clock-display">
          <div className="time-display">
            <span className="time-text">{formatTime(currentTime)}</span>
            <span className="date-text">{currentTime.date}</span>
          </div>
          
          <div className="clock-controls">
            <button 
              onClick={() => playSound()}
              className="clock-btn sound"
            >
              🔊 Play Sound
            </button>
            
            <button 
              onClick={speakTime}
              className="clock-btn speak"
            >
              🗣️ Speak Time
            </button>
          </div>
          
          <div className="sound-selector">
            <label>
              Sound:
              <select 
                value={selectedSound} 
                onChange={(e) => setSelectedSound(e.target.value)}
                className="sound-select"
              >
                {soundOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            
            <button 
              onClick={() => playSound(selectedSound)}
              className="clock-btn test"
            >
              ▶️ Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemClock;
