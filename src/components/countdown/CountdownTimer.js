import React, { useState, useEffect, useRef } from 'react';

const CountdownTimer = ({ initialSeconds = 10, onComplete, onCancel }) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef(null);
  const alertTimeoutRef = useRef(null);

  useEffect(() => {
    if (isActive && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(seconds => {
          if (seconds <= 1) {
            setIsActive(false);
            setIsCompleted(true);
            setShowAlert(true);
            
            // Show notification
            if (window.electronAPI && window.electronAPI.showNotification) {
              window.electronAPI.showNotification({
                title: "⏰ StickyTop Timer",
                body: "Countdown completed!",
                sound: true
              });
            }
            
            // Visual alert
            // Clear previous timeout if exists
            if (alertTimeoutRef.current) {
              clearTimeout(alertTimeoutRef.current);
            }
            alertTimeoutRef.current = setTimeout(() => {
              setShowAlert(false);
              alertTimeoutRef.current = null;
            }, 5000);
            
            onComplete && onComplete();
          }
          return seconds - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => {
      clearInterval(intervalRef.current);
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = null;
      }
    };
  }, [isActive, seconds, onComplete]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (isCompleted) return 'Completed!';
    if (!isActive) return 'Ready';
    return 'Running';
  };

  const getStatusClass = () => {
    if (isCompleted) return 'completed';
    if (!isActive) return 'ready';
    return 'running';
  };

  return (
    <div className="countdown-display">
        <span className={`countdown-time ${isCompleted ? 'completed' : ''}`}>
          {formatTime(seconds)}
        </span>
        <span className={`countdown-status ${getStatusClass()}`}>
          {getStatusText()}
        </span>
      </div>
  );
};

export default CountdownTimer;
