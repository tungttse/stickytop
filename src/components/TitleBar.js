import React from 'react';

const TitleBar = ({ isPinned, onTogglePin, onOpenSettings }) => {
  const minimizeWindow = () => {
    const { remote } = window.require('electron');
    remote.getCurrentWindow().minimize();
  };

  const maximizeWindow = () => {
    const { remote } = window.require('electron');
    const win = remote.getCurrentWindow();
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  };

  const closeWindow = () => {
    const { remote } = window.require('electron');
    remote.getCurrentWindow().close();
  };

  const toggleDevTools = () => {
    const { remote } = window.require('electron');
    const win = remote.getCurrentWindow();
    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools();
    } else {
      win.webContents.openDevTools();
    }
  };

  return (
    <div className="title-bar">
      <div className="title">StickyTop</div>
      <div className="title-bar-actions">
        <button 
          className={`pin-btn ${isPinned ? 'active' : ''}`}
          onClick={onTogglePin}
          title={isPinned ? 'Unpin from top' : 'Pin to top'}
        >
          {isPinned ? '📌' : '📍'}
        </button>
        <button 
          className="settings-btn"
          onClick={onOpenSettings}
          title="Settings"
        >
          ⚙️
        </button>
        <button 
          className="dev-tools-btn"
          onClick={toggleDevTools}
          title="Toggle Dev Tools"
        >
          🔧
        </button>
        <div className="controls">
          <button className="minimize" onClick={minimizeWindow}></button>
          <button className="maximize" onClick={maximizeWindow}></button>
          <button className="close" onClick={closeWindow}></button>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;
