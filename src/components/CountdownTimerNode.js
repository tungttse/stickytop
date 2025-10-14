import React, { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react'

const CountdownTimerNode = ({ node, updateAttributes, deleteNode }) => {
  const [seconds, setSeconds] = useState(node.attrs.initialSeconds || 300);
  const [isActive, setIsActive] = useState(true); // Auto-start
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef(null);
  const taskDescription = node.attrs.taskDescription || '';

  useEffect(() => {
    if (isActive && !isPaused && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prevSeconds => {
          if (prevSeconds <= 1) {
            setIsActive(false);
            setIsCompleted(true);
            
            // Show notification
            if (window.electronAPI && window.electronAPI.showNotification) {
              window.electronAPI.showNotification({
                title: "⏰ StickyTop Timer",
                body: taskDescription ? `Task completed: ${taskDescription}` : "Countdown completed!",
                sound: true
              });
            }
            
            // Play system sound
            if (window.electronAPI && window.electronAPI.playSystemSound) {
              window.electronAPI.playSystemSound('Glass');
              window.electronAPI.playSystemSound('Glass');
              window.electronAPI.playSystemSound('Glass');
            }
            
            return 0;
          }
          return prevSeconds - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, seconds, taskDescription]);

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
    setIsPaused(true);
    setIsActive(false);
  };

  const handleResume = () => {
    setIsPaused(false);
    setIsActive(true);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setIsCompleted(false);
    setSeconds(node.attrs.initialSeconds || 300);
  };

  const handleCancel = () => {
    // Remove the node from the editor
    if (deleteNode) {
      deleteNode();
    }
  };

  const getStatusText = () => {
    if (isCompleted) return 'completed';
    if (isPaused) return 'paused';
    if (isActive) return 'running';
    return 'ready';
  };

  const getStatusClass = () => {
    const status = getStatusText();
    return `countdown-status ${status}`;
  };

  return (
    <NodeViewWrapper className="countdown-timer-container">
      <div className={`countdown-timer ${isCompleted ? 'completed' : ''}`}>
        <div className="countdown-display">
          <div className="countdown-time">{formatTime(seconds)}</div>
          <div className={getStatusClass()}>{getStatusText()}</div>
        </div>
        
        {taskDescription && (
          <div className="countdown-task">📝 {taskDescription}</div>
        )}
        
        <div className="countdown-controls">
          {isActive && !isCompleted && (
            <button className="countdown-btn pause" onClick={handlePause}>
              Pause
            </button>
          )}
          
          {isPaused && !isCompleted && (
            <button className="countdown-btn resume" onClick={handleResume}>
              Resume
            </button>
          )}
          
          {(isPaused || isCompleted) && (
            <button className="countdown-btn reset" onClick={handleReset}>
              Reset
            </button>
          )}
          
          <button className="countdown-btn cancel" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default CountdownTimerNode;
