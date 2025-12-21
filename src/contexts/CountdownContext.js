import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const CountdownContext = createContext({
  activeCountdown: null,
  startCountdown: () => {},
  cancelCountdown: () => {},
});

export const useCountdown = () => {
  const context = useContext(CountdownContext);
  if (!context) {
    throw new Error('useCountdown must be used within CountdownProvider');
  }
  return context;
};

export const CountdownProvider = ({ children }) => {
  const [activeCountdown, setActiveCountdown] = useState(null);
  const intervalRef = useRef(null);

  // Clear interval helper
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start a new countdown
  const startCountdown = useCallback(({ initialSeconds, taskDescription, todoPosition, onComplete, onCancel }) => {
    // Clear any existing countdown
    clearTimer();

    // Set new countdown state
    setActiveCountdown({
      initialSeconds,
      seconds: initialSeconds,
      taskDescription,
      todoPosition,
      isActive: true,
      isCompleted: false,
      onComplete,
      onCancel,
    });

    // Start interval
    intervalRef.current = setInterval(() => {
      setActiveCountdown(prev => {
        if (!prev || !prev.isActive) {
          clearTimer();
          return prev;
        }

        if (prev.seconds <= 1) {
          // Timer completed
          clearTimer();
          
          // Show notification
          window.electronAPI?.showNotification?.({
            title: "⏰ StickyTop Timer",
            body: prev.taskDescription ? `Task completed: ${prev.taskDescription}` : "Countdown completed!",
            sound: true
          });
          
          // Play system sound (3 times for emphasis)
          if (window.electronAPI?.playSystemSound) {
            window.electronAPI.playSystemSound('Glass');
            window.electronAPI.playSystemSound('Glass');
            window.electronAPI.playSystemSound('Glass');
          }

          // Call onComplete callback if provided
          prev.onComplete?.();

          return {
            ...prev,
            seconds: 0,
            isActive: false,
            isCompleted: true,
          };
        }

        return {
          ...prev,
          seconds: prev.seconds - 1,
        };
      });
    }, 1000);
  }, [clearTimer]);

  // Cancel the current countdown
  const cancelCountdown = useCallback(() => {
    clearTimer();
    
    // Call onCancel callback if provided
    if (activeCountdown?.onCancel) {
      activeCountdown.onCancel();
    }
    
    setActiveCountdown(null);
  }, [clearTimer, activeCountdown]);

  // Clear countdown (without calling onCancel)
  const clearActiveCountdown = useCallback(() => {
    clearTimer();
    setActiveCountdown(null);
  }, [clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return (
    <CountdownContext.Provider
      value={{
        activeCountdown,
        startCountdown,
        cancelCountdown,
        clearActiveCountdown,
      }}
    >
      {children}
    </CountdownContext.Provider>
  );
};

