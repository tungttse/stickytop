import React from 'react';
import { useCountdown } from '../contexts/CountdownContext';

const CountdownBar = () => {
  const { activeCountdown } = useCountdown();

  // Get current state from activeCountdown (source of truth là CountdownTimerNode)
  const seconds = activeCountdown?.seconds || activeCountdown?.initialSeconds || 0;
  const isActive = activeCountdown?.isActive !== false;
  const isPaused = activeCountdown?.isPaused || false;
  const isCompleted = activeCountdown?.isCompleted || false;

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const handlePause = () => {
    if (activeCountdown?.onPause) {
      activeCountdown.onPause();
    }
  };

  const handleResume = () => {
    if (activeCountdown?.onResume) {
      activeCountdown.onResume();
    }
  };

  const handleReset = () => {
    if (activeCountdown?.onReset) {
      activeCountdown.onReset();
    }
  };

  const handleCancel = () => {
    if (activeCountdown?.onCancel) {
      activeCountdown.onCancel();
    }
  };

  if (!activeCountdown) {
    return null;
  }

  return (
    <div className="countdown-bar">
      <div className="countdown-bar-content">
        <div className="countdown-bar-info">
          <span className="countdown-bar-icon">⏱️</span>
          <div className="countdown-bar-text">
            <div className="countdown-bar-task">
              {activeCountdown.taskDescription}
            </div>
            <div className="countdown-bar-time">{formatTime(seconds)}</div>
          </div>
        </div>
        
        <div className="countdown-bar-controls">
          {isActive && !isCompleted && (
            <button 
              className="countdown-bar-btn pause" 
              onClick={handlePause}
              title="Pause"
            >
              ⏸
            </button>
          )}
          
          {isPaused && !isCompleted && (
            <button 
              className="countdown-bar-btn resume" 
              onClick={handleResume}
              title="Resume"
            >
              ▶
            </button>
          )}
          
          {(isPaused || isCompleted) && (
            <button 
              className="countdown-bar-btn reset" 
              onClick={handleReset}
              title="Reset"
            >
              ↻
            </button>
          )}
          
          <button 
            className="countdown-bar-btn cancel" 
            onClick={handleCancel}
            title="Cancel"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default CountdownBar;

