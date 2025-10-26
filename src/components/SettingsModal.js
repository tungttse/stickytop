import React, { useState, useEffect } from 'react';

// const { ipcRenderer } = window.require('electron');

const SettingsModal = ({ onClose, onUpdateStatus }) => {
  const [transparency, setTransparency] = useState(1.0);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [autoMinimize, setAutoMinimize] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      // Load current transparency
      const transparencyResult = await window.electronAPI.getTransparency();
      if (transparencyResult.success) {
        setTransparency(transparencyResult.opacity);
      }
      
      // Load current always on top state
      setAlwaysOnTop(true); // Default to true
      
      // Load auto-minimize setting
      const autoMinimizeResult = await window.electronAPI.loadAutoMinimizeSetting();
      if (autoMinimizeResult.success) {
        setAutoMinimize(autoMinimizeResult.autoMinimize);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      // Save transparency
      const result = await window.electronAPI.setTransparency(transparency);
      if (result.success) {
        onUpdateStatus(`Transparency set to ${Math.round(transparency * 100)}%`);
      }

      // Save always on top state
      await window.electronAPI.setAlwaysOnTop(alwaysOnTop);
      
      // Save auto-minimize setting
      const autoMinimizeResult = await window.electronAPI.saveAutoMinimizeSetting(autoMinimize);
      if (autoMinimizeResult.success) {
        onUpdateStatus('Settings saved successfully');
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      onUpdateStatus('Error saving settings');
    }
  };

  const handleTransparencyChange = (e) => {
    setTransparency(parseFloat(e.target.value));
  };

  const handleAlwaysOnTopChange = (e) => {
    setAlwaysOnTop(e.target.checked);
  };

  const handleAutoMinimizeChange = (e) => {
    setAutoMinimize(e.target.checked);
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="setting-group">
            <label htmlFor="transparencySlider">Window Transparency:</label>
            <div className="slider-container">
              <input 
                type="range" 
                id="transparencySlider" 
                min="0.3" 
                max="1.0" 
                step="0.1" 
                value={transparency}
                onChange={handleTransparencyChange}
              />
              <span>{Math.round(transparency * 100)}%</span>
            </div>
          </div>
          <div className="setting-group">
            <label htmlFor="alwaysOnTopToggle">Always On Top:</label>
            <input 
              type="checkbox" 
              id="alwaysOnTopToggle" 
              checked={alwaysOnTop}
              onChange={handleAlwaysOnTopChange}
            />
          </div>
          <div className="setting-group">
            <label htmlFor="autoMinimizeToggle">Auto Minimize on Blur:</label>
            <input 
              type="checkbox" 
              id="autoMinimizeToggle" 
              checked={autoMinimize}
              onChange={handleAutoMinimizeChange}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={saveSettings}>Save</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
