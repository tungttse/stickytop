import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CountdownContext = createContext({
  activeCountdown: null,
  setActiveCountdown: () => {},
  clearActiveCountdown: () => {},
});

export const useCountdown = () => {
  const context = useContext(CountdownContext);
  if (!context) {
    throw new Error('useCountdown must be used within CountdownProvider');
  }
  return context;
};

export const CountdownProvider = ({ children }) => {
  const [activeCountdown, setActiveCountdownState] = useState(null);

  const setActiveCountdown = useCallback((countdownData) => {
    // If countdownData is a function (update function), handle it
    if (typeof countdownData === 'function') {
      setActiveCountdownState(countdownData);
    } else {
      setActiveCountdownState(countdownData);
    }
  }, []);

  const clearActiveCountdown = useCallback(() => {
    setActiveCountdownState(null);
  }, []);

  // Initialize CountdownProvider
  useEffect(() => {
    // Clear any active countdown when app loads
    setActiveCountdownState(null);
  }, []);

  return (
    <CountdownContext.Provider
      value={{
        activeCountdown,
        setActiveCountdown,
        clearActiveCountdown,
      }}
    >
      {children}
    </CountdownContext.Provider>
  );
};

