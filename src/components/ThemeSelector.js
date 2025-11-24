import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserContext } from '../contexts/UserContext';

const ThemeSelector = ({ isVisible, onClose }) => {
  const { currentTheme, setTheme, themes } = useTheme();
  const { isPremium } = useUserContext();

  if (!isVisible) return null;

  const handleThemeSelect = (themeId) => {
    const theme = themes[themeId];
    // Check if theme is premium and user is not premium
    if (theme?.tier === 'premium' && !isPremium()) {
      alert('This theme is available for Premium users only. Please upgrade to unlock all themes.');
      return;
    }
    setTheme(themeId);
    onClose();
  };

  // Separate themes into free and premium
  const freeThemes = Object.entries(themes).filter(([_, theme]) => theme.tier === 'free');
  const premiumThemes = Object.entries(themes).filter(([_, theme]) => theme.tier === 'premium');

  return (
    <>
      <div className="theme-selector-overlay" onClick={onClose} />
      <div className="theme-selector-panel">
        <div className="theme-selector-header">
          <h3>Choose Theme</h3>
          <button className="theme-selector-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <div className="theme-selector-content">
          {/* Free Themes Section */}
          <div className="theme-section">
            <h4 className="theme-section-title">Free Themes</h4>
            <div className="theme-grid">
              {freeThemes.map(([id, theme]) => (
                <div
                  key={id}
                  className={`theme-card ${currentTheme === id ? 'active' : ''}`}
                  onClick={() => handleThemeSelect(id)}
                >
                  <div 
                    className="theme-preview"
                    style={{ 
                      background: theme.colors.background,
                      color: theme.colors.text,
                      fontFamily: theme.typography.fontFamily,
                      fontSize: theme.typography.fontSize,
                      lineHeight: theme.typography.lineHeight,
                    }}
                  >
                    <div className="theme-preview-content">
                      <p style={{ margin: '8px 0', fontWeight: 600 }}>Sample Heading</p>
                      <p style={{ margin: '4px 0' }}>This is sample text in {theme.name} theme.</p>
                      <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                        <li>Bullet point one</li>
                        <li>Bullet point two</li>
                      </ul>
                    </div>
                  </div>
                  <div className="theme-name">{theme.name}</div>
                  {currentTheme === id && (
                    <div className="theme-checkmark">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Premium Themes Section */}
          <div className="theme-section">
            <h4 className="theme-section-title">
              Premium Themes
              {!isPremium() && <span className="theme-premium-badge">Premium</span>}
            </h4>
            <div className="theme-grid">
              {premiumThemes.map(([id, theme]) => {
                const isLocked = !isPremium();
                return (
                  <div
                    key={id}
                    className={`theme-card ${currentTheme === id ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => handleThemeSelect(id)}
                    title={isLocked ? 'Premium theme - Upgrade to unlock' : theme.name}
                  >
                    {isLocked && (
                      <div className="theme-lock-overlay">
                        <div className="theme-lock-icon">🔒</div>
                        <div className="theme-lock-text">Premium</div>
                      </div>
                    )}
                    <div 
                      className="theme-preview"
                      style={{ 
                        background: theme.colors.background,
                        color: theme.colors.text,
                        fontFamily: theme.typography.fontFamily,
                        fontSize: theme.typography.fontSize,
                        lineHeight: theme.typography.lineHeight,
                        opacity: isLocked ? 0.5 : 1,
                      }}
                    >
                      <div className="theme-preview-content">
                        <p style={{ margin: '8px 0', fontWeight: 600 }}>Sample Heading</p>
                        <p style={{ margin: '4px 0' }}>This is sample text in {theme.name} theme.</p>
                        <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                          <li>Bullet point one</li>
                          <li>Bullet point two</li>
                        </ul>
                      </div>
                    </div>
                    <div className="theme-name">{theme.name}</div>
                    {currentTheme === id && (
                      <div className="theme-checkmark">✓</div>
                    )}
                  </div>
                );
              })}
            </div>
            {!isPremium() && (
              <div className="theme-upgrade-hint">
                <div className="upgrade-hint-icon">✨</div>
                <div className="upgrade-hint-text">
                  <strong>Upgrade to Premium</strong>
                  <span>Unlock {premiumThemes.length} premium themes</span>
                </div>
                <button className="upgrade-hint-btn" onClick={() => {
                  alert('Upgrade to Premium to unlock all themes!');
                }}>
                  Upgrade
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ThemeSelector;

