import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext({
  currentUser: null,
  userTier: 'free', // 'free' | 'premium'
  isPremium: () => false,
  setUserTier: () => {},
  setCurrentUser: () => {},
});

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    // Fallback nếu chưa có provider (backward compatible)
    return {
      currentUser: null,
      userTier: 'free',
      isPremium: () => false,
      setUserTier: () => {},
      setCurrentUser: () => {},
    };
  }
  return context;
};

export const UserProvider = ({ children, initialUser = null }) => {
  const [currentUser, setCurrentUserState] = useState(initialUser);
  const [userTier, setUserTierState] = useState('free');

  // Load current user from API on mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        if (window.electronAPI && window.electronAPI.getCurrentUser) {
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

  // Load tier từ localStorage khi có user
  useEffect(() => {
    if (currentUser?.email) {
      // Hardcode premium for specific email
      if (currentUser.email === 'truongthanhtungitvn@gmail.com1') {
        setUserTierState('premium');
        return;
      }

      const savedTier = localStorage.getItem(`user-tier-${currentUser.email}`);
      console.log('savedTier', savedTier);
      if (savedTier === 'premium' || savedTier === 'free') {
        setUserTierState(savedTier);
      } else {
        setUserTierState('free'); // Default free
      }
    } else {
      setUserTierState('free'); // Default free
    }
  }, [currentUser]);

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

