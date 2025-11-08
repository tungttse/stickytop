import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes } from '../themes/themes';

const ThemeContext = createContext({
  currentTheme: 'default',
  setTheme: () => {},
  themes: themes,
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentThemeState] = useState('default');

  const applyTheme = (themeId) => {
    const theme = themes[themeId] || themes['default'];
    const root = document.documentElement;
    
    // Apply CSS variables
    root.style.setProperty('--theme-app-bg', theme.colors.appBackground);
    root.style.setProperty('--theme-bg', theme.colors.background);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--theme-border', theme.colors.border);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-drag-area-hover', theme.colors.dragAreaHover);
    root.style.setProperty('--theme-export-button-hover', theme.colors.exportButtonHover);
    root.style.setProperty('--theme-export-button-active', theme.colors.exportButtonActive);
    root.style.setProperty('--theme-status-bar-bg', theme.colors.statusBarBg);
    root.style.setProperty('--theme-status-bar-border', theme.colors.statusBarBorder);
    root.style.setProperty('--theme-status-bar-text', theme.colors.statusBarText);
    root.style.setProperty('--theme-bullet-color', theme.colors.bulletColor);
    root.style.setProperty('--theme-checkbox-accent', theme.colors.checkboxAccent);
    root.style.setProperty('--theme-countdown-bar-bg', theme.colors.countdownBarBg);
    root.style.setProperty('--theme-countdown-bar-text', theme.colors.countdownBarText);
    root.style.setProperty('--theme-countdown-badge-bg', theme.colors.countdownBadgeBg);
    root.style.setProperty('--theme-countdown-badge-border', theme.colors.countdownBadgeBorder);
    root.style.setProperty('--theme-font-family', theme.typography.fontFamily);
    root.style.setProperty('--theme-font-size', theme.typography.fontSize);
    root.style.setProperty('--theme-line-height', theme.typography.lineHeight);
  };

  const setTheme = (themeId) => {
    setCurrentThemeState(themeId);
    applyTheme(themeId);
    // Save to file
    if (window.electronAPI && window.electronAPI.saveTheme) {
      window.electronAPI.saveTheme(themeId);
    }
  };

  // Load theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        if (window.electronAPI && window.electronAPI.loadTheme) {
          const result = await window.electronAPI.loadTheme();
          if (result.success && result.theme) {
            setCurrentThemeState(result.theme);
            applyTheme(result.theme);
          } else {
            // Apply default theme if no saved theme
            applyTheme('default');
          }
        } else {
          // Apply default theme if no API
          applyTheme('default');
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        applyTheme('default');
      }
    };
    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        themes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

