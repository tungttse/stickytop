import React, { useState, useEffect, useRef } from 'react';

const UserMenu = ({ currentUser, onThemeClick, onLogout, onLogin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = () => {
    setIsOpen(false);
  };

  const handleMenuClick = () => {
    setIsOpen(!isOpen);
  };

  const handleThemeClick = () => {
    setIsOpen(false);
    onThemeClick && onThemeClick();
  };

  const handleLogout = async () => {
    setIsOpen(false);
    if (onLogout) {
      await onLogout();
    }
  };

  const handleAbout = () => {
    setIsOpen(false);
    // Show about dialog - can be implemented later
    alert('StickyTop\nA sticky note application with calendar integration.');
  };

  const handleLogin = async () => {
    setIsOpen(false);
    if (onLogin) {
      await onLogin();
    }
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button 
        className="user-menu-trigger"
        onClick={handleMenuClick}
        title={currentUser ? currentUser.name : 'User Menu'}
      >
        {currentUser && currentUser.picture ? (
          <img 
            src={currentUser.picture} 
            alt={currentUser.name || 'User'} 
            className="user-avatar-circle"
          />
        ) : (
          <div className="user-icon-default">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div className="user-menu-overlay" onClick={handleOverlayClick} />
          <div className="user-menu-dropdown">
          {currentUser && (
            <div className="user-menu-header">
              <div className="user-menu-avatar">
                {currentUser.picture ? (
                  <img src={currentUser.picture} alt={currentUser.name} />
                ) : (
                  <div className="user-icon-default-small">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="user-menu-info">
                <div className="user-menu-name">{currentUser.name || 'User'}</div>
                <div className="user-menu-email">{currentUser.email || ''}</div>
              </div>
            </div>
          )}
          
          <div className="user-menu-items">
            {!currentUser && (
              <button className="user-menu-item" onClick={handleLogin}>
                <span className="user-menu-icon">🔐</span>
                <span>Login with Google</span>
              </button>
            )}
            <button className="user-menu-item" onClick={handleThemeClick}>
              <span className="user-menu-icon">🎨</span>
              <span>Theme</span>
            </button>
            <button className="user-menu-item" onClick={handleAbout}>
              <span className="user-menu-icon">ℹ️</span>
              <span>About</span>
            </button>
            {currentUser && (
              <button className="user-menu-item user-menu-item-logout" onClick={handleLogout}>
                <span className="user-menu-icon">🚪</span>
                <span>Logout</span>
              </button>
            )}
          </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;

