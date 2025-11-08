import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSelector = ({ isVisible, onClose }) => {
  const { currentTheme, setTheme, themes } = useTheme();

  if (!isVisible) return null;

  const handleThemeSelect = (themeId) => {
    setTheme(themeId);
    onClose();
  };

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
        <div className="theme-grid">
          {Object.entries(themes).map(([id, theme]) => (
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
    </>
  );
};

export default ThemeSelector;

