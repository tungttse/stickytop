import React, { createContext, useContext, useState, useCallback } from 'react';

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
    setActiveCountdownState(countdownData);
  }, []);

  const clearActiveCountdown = useCallback(() => {
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

