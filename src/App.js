import React, { useState, useEffect, useRef } from 'react';
import TiptapEditor from './TiptapEditor';
import CountdownBar from './components/countdown/CountdownBar';
import ThemeSelector from './components/ThemeSelector';
import Settings from './components/Settings';
import GoogleLogin from './components/GoogleLogin';
import FloatingControlBar from './components/FloatingControlBar';
import UserMenu from './components/UserMenu';
import CalendarView from './components/CalendarView';
import { CountdownProvider } from './contexts/CountdownContext';
import { EditorProvider, useEditorContext } from './contexts/EditorContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUserContext } from './contexts/UserContext';
import TurndownService from 'turndown';

function AppContent() {
  const { editor, isLocked, lockEditor, unlockEditor } = useEditorContext();
  const { currentUser, setCurrentUser, isPremium, userTier } = useUserContext();
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'
  
  const [isThemeSelectorVisible, setIsThemeSelectorVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hideOutline, setHideOutline] = useState(false);
  const [hideFloatingBar, setHideFloatingBar] = useState(false);
  const [textAreaWidth, setTextAreaWidth] = useState(800);
  const autoSaveTimeoutRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const clickCountRef = useRef(0);
  const saveStatusTimeoutRef = useRef(null);
  const loadBackgroundTimeoutRef = useRef(null);

  useEffect(() => {
    // Load auto-saved content
    const loadAutoSaved = async () => {
      try {
        if (window.electronAPI && window.electronAPI.loadAutoSaveNote) {
          const result = await window.electronAPI.loadAutoSaveNote();
          // console.log('result', result);
          if (result.success) {
            setContent(result.content);
          }
        }
      } catch (error) {
        console.error('Error loading auto-saved content:', error);
      }
    };
    
    loadAutoSaved();

    // Load settings from localStorage
    const savedHideOutline = localStorage.getItem('settings-hide-outline') === 'true';
    const savedHideFloatingBar = localStorage.getItem('settings-hide-floating-bar') === 'true';
    const savedAlwaysOnTop = localStorage.getItem('settings-always-on-top');
    const savedTextAreaWidth = localStorage.getItem('settings-text-area-width');
    const savedFontName = localStorage.getItem('settings-font-name');
    const savedFontSize = localStorage.getItem('settings-font-size');
    
    setHideOutline(savedHideOutline);
    setHideFloatingBar(savedHideFloatingBar);
    
    // Load text area width (default 800px)
    if (savedTextAreaWidth) {
      setTextAreaWidth(parseInt(savedTextAreaWidth, 10));
    }
    
    // Load and apply font settings
    if (savedFontName) {
      document.documentElement.style.setProperty('--theme-font-family', savedFontName);
    }
    if (savedFontSize) {
      document.documentElement.style.setProperty('--theme-font-size', `${savedFontSize}px`);
    }
    
    // Apply always-on-top setting
    if (window.electronAPI && window.electronAPI.setAlwaysOnTop) {
      const alwaysOnTopValue = savedAlwaysOnTop === null ? true : savedAlwaysOnTop === 'true';
      window.electronAPI.setAlwaysOnTop(alwaysOnTopValue);
    }
    
    // Load and apply background image (with small delay to ensure electronAPI is ready)
    // Only load if premium user
    loadBackgroundTimeoutRef.current = setTimeout(() => {
      loadBackgroundImage();
    }, 100);

    return () => {
      if (loadBackgroundTimeoutRef.current) {
        clearTimeout(loadBackgroundTimeoutRef.current);
        loadBackgroundTimeoutRef.current = null;
      }
    };
  }, [userTier]);

  const loadBackgroundImage = async () => {
    // Only load background for premium users
    if (!isPremium()) {
      // Remove any existing background for free users
      document.documentElement.style.removeProperty('--app-background-image');
      document.documentElement.style.removeProperty('--app-background-opacity');
      document.documentElement.style.removeProperty('--app-background-size');
      document.documentElement.style.removeProperty('--app-background-repeat');
      return;
    }

    try {
      if (window.electronAPI && window.electronAPI.loadBackgroundImage) {
        const result = await window.electronAPI.loadBackgroundImage();
        console.log('App: Load background result:', result);
        if (result.success && result.exists) {
          const savedOpacity = localStorage.getItem('settings-background-opacity');
          const savedPosition = localStorage.getItem('settings-background-position');
          const opacity = savedOpacity ? parseInt(savedOpacity, 10) : 50;
          const position = savedPosition || 'cover';
          applyBackground(result.path, opacity, position);
        } else {
          console.log('App: No background image found or failed to load');
        }
      }
    } catch (error) {
      console.error('Error loading background image:', error);
    }
  };

  const applyBackground = (imagePath, opacity, position) => {
    if (imagePath) {
      // Encode path for file:// protocol in Electron
      const encodedPath = imagePath.replace(/\\/g, '/');
      const backgroundUrl = `url("${encodedPath}")`;
      
      console.log('App: Applying background:', {
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
    } else {
      document.documentElement.style.removeProperty('--app-background-image');
      document.documentElement.style.removeProperty('--app-background-opacity');
      document.documentElement.style.removeProperty('--app-background-size');
      document.documentElement.style.removeProperty('--app-background-repeat');
    }
  };

  // Auto-save when content changes
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        if (window.electronAPI && window.electronAPI.autoSaveNote) {
          await window.electronAPI.autoSaveNote(content);
        }
      } catch (error) {
        console.error('Error auto-saving content:', error);
      }
    }, 5000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content]);

  // Force save function
  const forceSave = async () => {
    if (!content.trim()) return;
    
    setSaveStatus('saving');
    try {
      if (window.electronAPI && window.electronAPI.autoSaveNote) {
        await window.electronAPI.autoSaveNote(content);
        setSaveStatus('saved');
        // Clear status after 2 seconds
        // Clear previous timeout if exists
        if (saveStatusTimeoutRef.current) {
          clearTimeout(saveStatusTimeoutRef.current);
        }
        saveStatusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('');
          saveStatusTimeoutRef.current = null;
        }, 2000);
      }
    } catch (error) {
      console.error('Error force saving:', error);
      setSaveStatus('error');
      // Clear previous timeout if exists
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
      saveStatusTimeoutRef.current = setTimeout(() => {
        setSaveStatus('');
        saveStatusTimeoutRef.current = null;
      }, 3000);
    }
  };

  // Keyboard event listener for Command+S
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for Command+S (Mac) or Ctrl+S (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        forceSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Clear save status timeout on unmount
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
        saveStatusTimeoutRef.current = null;
      }
    };
  }, [content]);

  // const handleContentChange = (newContent) => {
  //   setContent(newContent);
  // };

  const handleDragAreaClick = async (e) => {
    console.log('Drag area clicked!');
    e.preventDefault();
    e.stopPropagation();
    
    clickCountRef.current++;
    console.log('Click count:', clickCountRef.current);
    
    if (clickCountRef.current === 1) {
      clickTimeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0;
        console.log('Single click timeout');
      }, 300);
    } else if (clickCountRef.current === 2) {
      clearTimeout(clickTimeoutRef.current);
      clickCountRef.current = 0;
      console.log('Double click detected!');
      
      // Send IPC message to main process to resize window
      try {
        if (window.electronAPI && window.electronAPI.toggleMinimize) {
          console.log('Calling toggleMinimize...');
          await window.electronAPI.toggleMinimize();
          console.log('toggleMinimize completed');
        } else {
          console.log('electronAPI not available');
        }
      } catch (error) {
        console.error('Error toggling minimize:', error);
      }
    }
  };

  // Extract first line from content
  const getFirstLine = (htmlContent) => {
    // Remove HTML tags and get first line
    const textContent = htmlContent.replace(/<[^>]*>/g, '');
    const firstLine = textContent.split('\n')[0];
    return firstLine || 'Start writing your sticky note...';
  };

  const handleExportClick = (e) => {
    e.stopPropagation();
    alert('export');
  };

  const handleThemeClick = (e) => {
    if (e) {
      e.stopPropagation();
    }
    setIsThemeSelectorVisible(true);
  };

  const handleSettingsClick = (e) => {
    if (e) {
      e.stopPropagation();
    }
    setIsSettingsVisible(true);
  };

  const handleSettingChange = (settingName, value) => {
    if (settingName === 'hideOutline') {
      setHideOutline(value);
    } else if (settingName === 'hideFloatingBar') {
      setHideFloatingBar(value);
    } else if (settingName === 'textAreaWidth') {
      setTextAreaWidth(value);
    } else if (settingName === 'backgroundImage') {
      // Background image change is handled in Settings component
      // Just reload to ensure consistency (only for premium users)
      if (isPremium()) {
        loadBackgroundImage();
      } else {
        // Remove background if user is not premium
        document.documentElement.style.removeProperty('--app-background-image');
        document.documentElement.style.removeProperty('--app-background-opacity');
        document.documentElement.style.removeProperty('--app-background-size');
        document.documentElement.style.removeProperty('--app-background-repeat');
      }
    } else if (settingName === 'backgroundOpacity' || settingName === 'backgroundPosition') {
      // These are handled directly in Settings component via CSS variables
      // Only apply if premium user
      if (!isPremium()) {
        // Remove background if user is not premium
        document.documentElement.style.removeProperty('--app-background-image');
        document.documentElement.style.removeProperty('--app-background-opacity');
        document.documentElement.style.removeProperty('--app-background-size');
        document.documentElement.style.removeProperty('--app-background-repeat');
      }
    }
    // alwaysOnTop is handled directly in Settings component
  };

  // Export handlers
  const handleExport = async (format) => {
    if (!editor) {
      alert('Editor is not ready. Please try again.');
      return;
    }

    const htmlContent = editor.getHTML();
    if (!htmlContent || htmlContent.trim() === '' || htmlContent === '<p></p>') {
      alert('No content to export.');
      return;
    }

    try {
      if (format === 'html') {
        await handleExportHTML(htmlContent);
      } else if (format === 'markdown') {
        await handleExportMarkdown(htmlContent);
      } else if (format === 'pdf') {
        await handleExportPDF(htmlContent);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export: ${error.message}`);
    }
  };

  const handleExportHTML = async (htmlContent) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const defaultFilename = `sticky-note-${timestamp}.html`;
    
    if (window.electronAPI && window.electronAPI.exportFile) {
      const result = await window.electronAPI.exportFile(htmlContent, 'html', defaultFilename);
      if (result.success) {
        // Success - could show a toast notification here
        console.log('File exported successfully:', result.path);
      } else if (result.error !== 'Save cancelled') {
        alert(`Failed to export: ${result.error}`);
      }
    } else {
      alert('Export functionality is not available.');
    }
  };

  const handleExportMarkdown = async (htmlContent) => {
    const turndownService = new TurndownService();
    const markdownContent = turndownService.turndown(htmlContent);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const defaultFilename = `sticky-note-${timestamp}.md`;
    
    if (window.electronAPI && window.electronAPI.exportFile) {
      const result = await window.electronAPI.exportFile(markdownContent, 'markdown', defaultFilename);
      if (result.success) {
        console.log('File exported successfully:', result.path);
      } else if (result.error !== 'Save cancelled') {
        alert(`Failed to export: ${result.error}`);
      }
    } else {
      alert('Export functionality is not available.');
    }
  };

  const handleExportPDF = async (htmlContent) => {
    if (window.electronAPI && window.electronAPI.exportToPDF) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const defaultFilename = `sticky-note-${timestamp}.pdf`;
      
      const result = await window.electronAPI.exportToPDF(htmlContent, defaultFilename);
      if (result.success) {
        console.log('PDF exported successfully:', result.path);
      } else if (result.error !== 'Save cancelled') {
        alert(`Failed to export PDF: ${result.error}`);
      }
    } else {
      alert('PDF export functionality is not available.');
    }
  };

  return (
    <div className="app-container">
      <div className="drag-area" onClick={handleDragAreaClick}>
        {/* GoogleLogin component is now integrated into UserMenu */}
        <div className="google-login-wrapper" style={{ display: 'none' }}>
          <GoogleLogin onLoginSuccess={setCurrentUser} />
        </div>
      </div>
            <div className="top-right-actions">
              <UserMenu 
                currentUser={currentUser}
                onThemeClick={handleThemeClick}
                onSettingsClick={handleSettingsClick}
                onExport={handleExport}
                onLockToggle={() => {
                  if (isLocked) {
                    unlockEditor();
                  } else {
                    lockEditor();
                  }
                }}
                isLocked={isLocked}
                onLogin={async () => {
                  // Trigger GoogleLogin component to login
                  // Since GoogleLogin is hidden, we'll call the API directly
                  if (window.electronAPI && window.electronAPI.googleLogin) {
                    console.log('[App] Calling googleLogin...');
                    try {
                      const result = await window.electronAPI.googleLogin();
                      console.log('[App] googleLogin result:', result);
                      if (result && result.success && result.user) {
                        console.log('[App] Login successful, setting user:', result.user.email);
                        setCurrentUser(result.user);
                      } else {
                        console.error('[App] Login failed:', result?.error || 'Unknown error');
                      }
                    } catch (error) {
                      console.error('[App] Error calling googleLogin:', error);
                    }
                  }
                }}
                onLogout={async () => {
                  if (window.electronAPI && window.electronAPI.googleLogout) {
                    await window.electronAPI.googleLogout();
                    setCurrentUser(null);
                  }
                }}
              />
            </div>

            <ThemeSelector 
              isVisible={isThemeSelectorVisible}
              onClose={() => setIsThemeSelectorVisible(false)}
            />

            <Settings 
              isVisible={isSettingsVisible}
              onClose={() => setIsSettingsVisible(false)}
              onSettingChange={handleSettingChange}
            />

            <div className="editor-section-container">
              <CountdownBar />
              <TiptapEditor 
                content={content}
                onContentChange={setContent}
                hideOutline={hideOutline}
                textAreaWidth={textAreaWidth}
              />
              {!hideFloatingBar && (
                <FloatingControlBar 
                  currentUser={currentUser}
                  showCalendar={showCalendar}
                  onToggleCalendar={setShowCalendar}
                />
              )}
            </div>
      {showCalendar && currentUser && (
        <div className="calendar-section-container">
          <CalendarView onClose={() => setShowCalendar(false)} />
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <CountdownProvider>
        <EditorProvider>
          <UserProvider>
            <AppContent />
          </UserProvider>
        </EditorProvider>
      </CountdownProvider>
    </ThemeProvider>
  );
}

export default App;
