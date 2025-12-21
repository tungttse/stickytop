import React, { useEffect, useRef } from 'react';
import { useCountdown } from '../../contexts/CountdownContext';
import { useEditorContext } from '../../contexts/EditorContext';
import StopwatchIcon from '../../assets/icons/stopwatch.svg';

const CountdownBar = () => {
  const { activeCountdown, clearActiveCountdown } = useCountdown();
  const { scrollToTodo } = useEditorContext();
  const autoHideTimeoutRef = useRef(null);

  // Get current state from activeCountdown (source of truth is CountdownTimerNode)
  // Use seconds directly if available, otherwise fallback to initialSeconds
  const seconds = activeCountdown?.seconds !== undefined && activeCountdown?.seconds !== null
    ? activeCountdown.seconds
    : (activeCountdown?.initialSeconds || 0);
  const initialSeconds = activeCountdown?.initialSeconds || 0;

  // Calculate progress percentage (0 = start, 100 = completed)
  const progress = initialSeconds > 0 
    ? Math.max(0, Math.min(100, ((initialSeconds - seconds) / initialSeconds) * 100))
    : 0;

  // Convert hex color to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Convert RGB to hex
  const rgbToHex = (r, g, b) => {
    return "#" + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  };

  // Interpolate between two colors
  const interpolateColor = (color1, color2, progress) => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    if (!rgb1 || !rgb2) return color1;

    const r = rgb1.r + (rgb2.r - rgb1.r) * (progress / 100);
    const g = rgb1.g + (rgb2.g - rgb1.g) * (progress / 100);
    const b = rgb1.b + (rgb2.b - rgb1.b) * (progress / 100);

    return rgbToHex(r, g, b);
  };

  // Interpolate gradient from purple to light red
  const interpolateGradient = (progress) => {
    // Start gradient: #667eea → #764ba2 (purple)
    // End gradient: #FF4D4D → #DC2626 (light red)
    const startColor1 = "#667eea";
    const startColor2 = "#764ba2";
    const endColor1 = "#FF4D4D";
    const endColor2 = "#DC2626";

    const color1 = interpolateColor(startColor1, endColor1, progress);
    const color2 = interpolateColor(startColor2, endColor2, progress);

    return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
  };

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

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (activeCountdown?.todoPosition !== null && activeCountdown?.todoPosition !== undefined && scrollToTodo) {
      scrollToTodo(activeCountdown.todoPosition);
    }
  };

  // Check completed state: either seconds is 0 OR isCompleted flag is true
  const isCompleted = activeCountdown ? (seconds === 0 || activeCountdown.isCompleted === true) : false;
  
  // Auto-hide countdown bar after 1 minute when completed
  useEffect(() => {
    if (isCompleted && activeCountdown) {
      // Clear any existing timeout
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
      
      // Set timeout to clear countdown after 1 minute (60 seconds)
      autoHideTimeoutRef.current = setTimeout(() => {
        clearActiveCountdown();
      }, 10000); // 30 seconds = 0.5 minute
    }
    
    // Cleanup timeout on unmount or when countdown changes
    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
        autoHideTimeoutRef.current = null;
      }
    };
  }, [isCompleted, activeCountdown, clearActiveCountdown]);

  if (!activeCountdown || !activeCountdown.isActive) {
    return null;
  }
  
  const gradientStyle = {
    background: interpolateGradient(progress)
  };

  return (
    <div className={`countdown-bar ${isCompleted ? 'countdown-bar-completed' : ''}`} style={gradientStyle}>
      <div className="countdown-bar-content">
        <div 
          className="countdown-bar-info"
          onDoubleClick={handleDoubleClick}
          style={{ cursor: 'pointer' }}
        >
          <StopwatchIcon width={50} height={50} className="countdown-bar-icon" />
          <div className="countdown-bar-text">
            <div className="countdown-bar-task">
              {activeCountdown.taskDescription}
            </div>
            <div className="countdown-bar-time">{formatTime(seconds)}</div>
            {isCompleted && (
              <div className="countdown-bar-completed-text">Time's up</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownBar;

