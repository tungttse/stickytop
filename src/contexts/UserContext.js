import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext({
  currentUser: null,
  userTier: 'premium', // 'free' | 'premium'
  isPremium: () => true,
  setUserTier: () => {},
  setCurrentUser: () => {},
});

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    // Fallback if provider doesn't exist yet (backward compatible)
    return {
      currentUser: null,
      userTier: 'premium',
      isPremium: () => true,
      setUserTier: () => {},
      setCurrentUser: () => {},
    };
  }
  return context;
};

export const UserProvider = ({ children, initialUser = null }) => {
  const [currentUser, setCurrentUserState] = useState(initialUser);
  const [userTier, setUserTierState] = useState('premium');
  const [defaultTier, setDefaultTier] = useState('premium');

  // Load app config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        if (window.electronAPI?.getAppConfig) {
          const result = await window.electronAPI.getAppConfig();
          if (result.success && result.config?.defaultTier) {
            setDefaultTier(result.config.defaultTier);
          }
        }
      } catch (error) {
        console.error('Error loading app config:', error);
      }
    };
    loadConfig();
  }, []);

  // Load current user from API on mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        if (window.electronAPI?.getCurrentUser) {
          const result = await window.electronAPI.getCurrentUser();
          if (result.success && result.user) {
            setCurrentUserState(result.user);
          }
        }
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };
    
    if (!initialUser) {
      loadCurrentUser();
    }
  }, []);

  // Load tier from localStorage when user exists, fallback to defaultTier from config
  useEffect(() => {
    if (currentUser?.email) {
      const savedTier = localStorage.getItem(`user-tier-${currentUser.email}`);
      if (savedTier === 'premium' || savedTier === 'free') {
        setUserTierState(savedTier);
      } else {
        setUserTierState(defaultTier);
      }
    } else {
      setUserTierState(defaultTier);
    }
  }, [currentUser, defaultTier]);

  const isPremium = () => userTier === 'premium';

  const updateUserTier = (tier) => {
    setUserTierState(tier);
    if (currentUser?.email) {
      localStorage.setItem(`user-tier-${currentUser.email}`, tier);
    }
  };

  const setCurrentUser = (user) => {
    setCurrentUserState(user);
  };

  return (
    <UserContext.Provider value={{
      currentUser,
      setCurrentUser,
      userTier,
      setUserTier: updateUserTier,
      isPremium,
    }}>
      {children}
    </UserContext.Provider>
  );
};

