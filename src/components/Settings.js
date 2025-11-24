import React, { useState, useEffect } from 'react';

const Settings = ({ isVisible, onClose, onSettingChange }) => {
  const [hideOutline, setHideOutline] = useState(false);
  const [hideFloatingBar, setHideFloatingBar] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [textAreaWidth, setTextAreaWidth] = useState(800);
  const [fontName, setFontName] = useState('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
  const [fontSize, setFontSize] = useState(14);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(50);
  const [backgroundPosition, setBackgroundPosition] = useState('cover');

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

      // Load font settings
      const savedFontName = localStorage.getItem('settings-font-name');
      if (savedFontName) {
        setFontName(savedFontName);
      } else {
        setFontName('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
      }

      const savedFontSize = localStorage.getItem('settings-font-size');
      if (savedFontSize) {
        setFontSize(parseInt(savedFontSize, 10));
      } else {
        setFontSize(14);
      }

      // Load background settings
      const savedBackgroundOpacity = localStorage.getItem('settings-background-opacity');
      if (savedBackgroundOpacity) {
        setBackgroundOpacity(parseInt(savedBackgroundOpacity, 10));
      } else {
        setBackgroundOpacity(50);
      }

      const savedBackgroundPosition = localStorage.getItem('settings-background-position');
      if (savedBackgroundPosition) {
        setBackgroundPosition(savedBackgroundPosition);
      } else {
        setBackgroundPosition('cover');
      }

      // Load background image
      loadBackgroundImage();
    }
  }, [isVisible]);

  const loadBackgroundImage = async () => {
    try {
      if (window.electronAPI && window.electronAPI.loadBackgroundImage) {
        const result = await window.electronAPI.loadBackgroundImage();
        if (result.success && result.exists) {
          setBackgroundImage(result.path);
        } else {
          setBackgroundImage(null);
        }
      }
    } catch (error) {
      console.error('Error loading background image:', error);
      setBackgroundImage(null);
    }
  };

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

  const handleFontNameChange = (value) => {
    setFontName(value);
    localStorage.setItem('settings-font-name', value);
    // Apply to CSS variable
    document.documentElement.style.setProperty('--theme-font-family', value);
    if (onSettingChange) {
      onSettingChange('fontName', value);
    }
  };

  const handleFontSizeChange = (value) => {
    const size = parseInt(value, 10);
    setFontSize(size);
    localStorage.setItem('settings-font-size', size.toString());
    // Apply to CSS variable
    document.documentElement.style.setProperty('--theme-font-size', `${size}px`);
    if (onSettingChange) {
      onSettingChange('fontSize', size);
    }
  };

  const handleUploadBackground = async () => {
    try {
      if (window.electronAPI && window.electronAPI.saveBackgroundImage) {
        const result = await window.electronAPI.saveBackgroundImage();
        console.log('Upload result:', result);
        if (result.success) {
          setBackgroundImage(result.path);
          // Apply background immediately
          applyBackground(result.path, backgroundOpacity, backgroundPosition);
          if (onSettingChange) {
            onSettingChange('backgroundImage', result.path);
          }
        } else {
          alert(`Failed to upload background: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error uploading background:', error);
      alert('Failed to upload background image');
    }
  };

  const handleRemoveBackground = async () => {
    try {
      if (window.electronAPI && window.electronAPI.removeBackgroundImage) {
        const result = await window.electronAPI.removeBackgroundImage();
        if (result.success) {
          setBackgroundImage(null);
          // Remove background
          document.documentElement.style.removeProperty('--app-background-image');
          if (onSettingChange) {
            onSettingChange('backgroundImage', null);
          }
        }
      }
    } catch (error) {
      console.error('Error removing background:', error);
      alert('Failed to remove background image');
    }
  };

  const handleBackgroundOpacityChange = (value) => {
    const opacity = parseInt(value, 10);
    setBackgroundOpacity(opacity);
    localStorage.setItem('settings-background-opacity', opacity.toString());
    if (backgroundImage) {
      applyBackground(backgroundImage, opacity, backgroundPosition);
    }
    if (onSettingChange) {
      onSettingChange('backgroundOpacity', opacity);
    }
  };

  const handleBackgroundPositionChange = (value) => {
    setBackgroundPosition(value);
    localStorage.setItem('settings-background-position', value);
    if (backgroundImage) {
      applyBackground(backgroundImage, backgroundOpacity, value);
    }
    if (onSettingChange) {
      onSettingChange('backgroundPosition', value);
    }
  };

  const applyBackground = (imagePath, opacity, position) => {
    if (imagePath) {
      // Encode path for file:// protocol in Electron
      const encodedPath = imagePath.replace(/\\/g, '/');
      const backgroundUrl = `url("${encodedPath}")`;
      
      console.log('Applying background:', {
        originalPath: imagePath,
        encodedPath: encodedPath,
        backgroundUrl: backgroundUrl,
        opacity: opacity,
        position: position
      });
      
      document.documentElement.style.setProperty('--app-background-image', backgroundUrl);
      document.documentElement.style.setProperty('--app-background-opacity', opacity / 100);
      document.documentElement.style.setProperty('--app-background-size', position === 'cover' ? 'cover' : position === 'contain' ? 'contain' : 'auto');
      document.documentElement.style.setProperty('--app-background-repeat', position === 'repeat' ? 'repeat' : 'no-repeat');
      
      // Force reflow to ensure CSS is applied
      document.documentElement.offsetHeight;
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

          <div className="settings-item">
            <div className="settings-item-info">
              <div className="settings-item-label">Font family</div>
              <div className="settings-item-description">Choose the font family for the editor</div>
            </div>
            <select
              className="settings-select"
              value={fontName}
              onChange={(e) => handleFontNameChange(e.target.value)}
            >
              <option value='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'>System Default</option>
              <option value='"Helvetica Neue", Helvetica, Arial, sans-serif'>Helvetica Neue</option>
              <option value='Georgia, "Times New Roman", serif'>Georgia</option>
              <option value='"Times New Roman", Times, serif'>Times New Roman</option>
              <option value='"Courier New", Courier, monospace'>Courier New</option>
              <option value='Verdana, Geneva, sans-serif'>Verdana</option>
              <option value='Arial, sans-serif'>Arial</option>
              <option value='"Comic Sans MS", cursive'>Comic Sans MS</option>
              <option value='Impact, Charcoal, sans-serif'>Impact</option>
              <option value='Tahoma, Geneva, sans-serif'>Tahoma</option>
            </select>
          </div>

          <div className="settings-item settings-item-range">
            <div className="settings-item-info">
              <div className="settings-item-label">Font size</div>
              <div className="settings-item-description">Adjust the font size for the editor (10px - 24px)</div>
            </div>
            <div className="settings-range-container">
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                value={fontSize}
                onChange={(e) => handleFontSizeChange(e.target.value)}
                className="settings-range-input"
              />
              <div className="settings-range-value">{fontSize}px</div>
            </div>
          </div>

          <div className="settings-item settings-item-background">
            <div className="settings-item-info">
              <div className="settings-item-label">Background</div>
              <div className="settings-item-description">Upload a custom background image for the app</div>
            </div>
            <div className="settings-background-container">
              <div className="settings-background-preview">
                {backgroundImage ? (
                  <img 
                    src={backgroundImage} 
                    alt="Background preview" 
                    className="settings-background-preview-image"
                  />
                ) : (
                  <div className="settings-background-preview-placeholder">
                    <span>No background</span>
                  </div>
                )}
              </div>
              <div className="settings-background-controls">
                <button 
                  className="settings-background-btn settings-background-btn-upload"
                  onClick={handleUploadBackground}
                >
                  Upload Image
                </button>
                {backgroundImage && (
                  <button 
                    className="settings-background-btn settings-background-btn-remove"
                    onClick={handleRemoveBackground}
                  >
                    Remove
                  </button>
                )}
              </div>
              {backgroundImage && (
                <>
                  <div className="settings-item settings-item-range" style={{ marginTop: '16px', padding: '12px' }}>
                    <div className="settings-item-info">
                      <div className="settings-item-label">Opacity</div>
                      <div className="settings-item-description">Adjust background opacity (0% - 100%)</div>
                    </div>
                    <div className="settings-range-container">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={backgroundOpacity}
                        onChange={(e) => handleBackgroundOpacityChange(e.target.value)}
                        className="settings-range-input"
                      />
                      <div className="settings-range-value">{backgroundOpacity}%</div>
                    </div>
                  </div>
                  <div className="settings-item" style={{ marginTop: '12px', padding: '12px' }}>
                    <div className="settings-item-info">
                      <div className="settings-item-label">Position</div>
                      <div className="settings-item-description">How the background image is displayed</div>
                    </div>
                    <select
                      className="settings-select"
                      value={backgroundPosition}
                      onChange={(e) => handleBackgroundPositionChange(e.target.value)}
                    >
                      <option value="cover">Cover (fill entire area)</option>
                      <option value="contain">Contain (fit within area)</option>
                      <option value="repeat">Repeat (tile)</option>
                      <option value="no-repeat">No Repeat (single image)</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;

