import React, { useState, useEffect } from 'react';

const GoogleLogin = ({ onLoginSuccess }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getCurrentUser) {
        const result = await window.electronAPI.getCurrentUser();
        if (result.success && result.user) {
          setUser(result.user);
          onLoginSuccess && onLoginSuccess(result.user);
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (window.electronAPI && window.electronAPI.googleLogin) {
        const result = await window.electronAPI.googleLogin();
        if (result.success) {
          setUser(result.user);
          onLoginSuccess && onLoginSuccess(result.user);
        } else {
          setError(result.error || 'Login failed');
        }
      }
    } catch (error) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (window.electronAPI && window.electronAPI.googleLogout) {
        await window.electronAPI.googleLogout();
        setUser(null);
        onLoginSuccess && onLoginSuccess(null);
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (user) {
    return (
      <div className="google-login-status">
        <div className="user-info">
          {user.picture && (
            <img src={user.picture} alt={user.name} className="user-avatar" />
          )}
          <div className="user-details">
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="google-login">
      <button 
        onClick={handleLogin} 
        disabled={loading}
        className="google-login-btn"
      >
        {loading ? 'Logging in...' : 'Login with Google'}
      </button>
      {error && <div className="login-error">{error}</div>}
    </div>
  );
};

export default GoogleLogin;

