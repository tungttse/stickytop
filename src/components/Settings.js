import React, { useState, useEffect } from 'react';

const Settings = ({ isVisible, onClose, onSettingChange }) => {
  const [hideOutline, setHideOutline] = useState(false);
  const [hideFloatingBar, setHideFloatingBar] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [textAreaWidth, setTextAreaWidth] = useState(800);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (isVisible) {
      const savedHideOutline = localStorage.getItem('settings-hide-outline') === 'true';
      const savedHideFloatingBar = localStorage.getItem('settings-hide-floating-bar') === 'true';
      const savedAlwaysOnTop = localStorage.getItem('settings-always-on-top');
      
      setHideOutline(savedHideOutline);
      setHideFloatingBar(savedHideFloatingBar);
      
      // Default to true if not set
      if (savedAlwaysOnTop === null) {
        setAlwaysOnTop(true);
      } else {
        setAlwaysOnTop(savedAlwaysOnTop === 'true');
      }

      // Load text area width (default 800px)
      const savedTextAreaWidth = localStorage.getItem('settings-text-area-width');
      if (savedTextAreaWidth) {
        setTextAreaWidth(parseInt(savedTextAreaWidth, 10));
      } else {
        setTextAreaWidth(800);
      }
    }
  }, [isVisible]);

  const handleHideOutlineToggle = (value) => {
    setHideOutline(value);
    localStorage.setItem('settings-hide-outline', value.toString());
    if (onSettingChange) {
      onSettingChange('hideOutline', value);
    }
  };

  const handleHideFloatingBarToggle = (value) => {
    setHideFloatingBar(value);
    localStorage.setItem('settings-hide-floating-bar', value.toString());
    if (onSettingChange) {
      onSettingChange('hideFloatingBar', value);
    }
  };

  const handleAlwaysOnTopToggle = async (value) => {
    setAlwaysOnTop(value);
    localStorage.setItem('settings-always-on-top', value.toString());
    
    // Apply to window via IPC
    if (window.electronAPI && window.electronAPI.setAlwaysOnTop) {
      await window.electronAPI.setAlwaysOnTop(value);
    }
    
    if (onSettingChange) {
      onSettingChange('alwaysOnTop', value);
    }
  };

  const handleTextAreaWidthChange = (value) => {
    const width = parseInt(value, 10);
    setTextAreaWidth(width);
    localStorage.setItem('settings-text-area-width', width.toString());
    if (onSettingChange) {
      onSettingChange('textAreaWidth', width);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-panel">
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="settings-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <div className="settings-content">
          <div className="settings-item">
            <div className="settings-item-info">
              <div className="settings-item-label">Hide outline</div>
              <div className="settings-item-description">Hide the document outline (MiniMap) on the right side</div>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={hideOutline}
                onChange={(e) => handleHideOutlineToggle(e.target.checked)}
              />
              <span className="settings-toggle-slider"></span>
            </label>
          </div>

          <div className="settings-item">
            <div className="settings-item-info">
              <div className="settings-item-label">Hide floating bar</div>
              <div className="settings-item-description">Hide the floating control bar with calendar and other controls</div>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={hideFloatingBar}
                onChange={(e) => handleHideFloatingBarToggle(e.target.checked)}
              />
              <span className="settings-toggle-slider"></span>
            </label>
          </div>

          <div className="settings-item">
            <div className="settings-item-info">
              <div className="settings-item-label">Always on top</div>
              <div className="settings-item-description">Keep the window always on top of other windows</div>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={alwaysOnTop}
                onChange={(e) => handleAlwaysOnTopToggle(e.target.checked)}
              />
              <span className="settings-toggle-slider"></span>
            </label>
          </div>

          <div className="settings-item settings-item-range">
            <div className="settings-item-info">
              <div className="settings-item-label">Text area width</div>
              <div className="settings-item-description">Adjust the maximum width of the text area (400px - 1200px)</div>
            </div>
            <div className="settings-range-container">
              <input
                type="range"
                min="400"
                max="1200"
                step="50"
                value={textAreaWidth}
                onChange={(e) => handleTextAreaWidthChange(e.target.value)}
                className="settings-range-input"
              />
              <div className="settings-range-value">{textAreaWidth}px</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;

