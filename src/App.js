import React, { useState, useEffect, useRef } from 'react';
import TiptapEditor from './TiptapEditor';
import CountdownBar from './components/countdown/CountdownBar';
import ThemeSelector from './components/ThemeSelector';
import GoogleLogin from './components/GoogleLogin';
import FloatingControlBar from './components/FloatingControlBar';
import UserMenu from './components/UserMenu';
import CalendarView from './components/CalendarView';
import { CountdownProvider } from './contexts/CountdownContext';
import { EditorProvider } from './contexts/EditorContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'
  
  const [isThemeSelectorVisible, setIsThemeSelectorVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const autoSaveTimeoutRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const clickCountRef = useRef(0);
  const saveStatusTimeoutRef = useRef(null);

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
  }, []);

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

  return (
    <ThemeProvider>
      <CountdownProvider>
        <EditorProvider>
          <div className="app-container">
            <div className="drag-area"  onClick={handleDragAreaClick}>
              {/* GoogleLogin component is now integrated into UserMenu */}
              <div className="google-login-wrapper" style={{ display: 'none' }}>
                <GoogleLogin onLoginSuccess={setCurrentUser} />
              </div>
            </div>
            <div className="top-right-actions">
              <UserMenu 
                currentUser={currentUser}
                onThemeClick={handleThemeClick}
                onLogin={async () => {
                  // Trigger GoogleLogin component to login
                  // Since GoogleLogin is hidden, we'll call the API directly
                  if (window.electronAPI && window.electronAPI.googleLogin) {
                    const result = await window.electronAPI.googleLogin();
                    if (result.success && result.user) {
                      setCurrentUser(result.user);
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

            <div className="editor-section-container">
              <CountdownBar />
              <TiptapEditor 
                  content={content}
                  onContentChange={setContent}
                />
              <FloatingControlBar 
                currentUser={currentUser}
                showCalendar={showCalendar}
                onToggleCalendar={setShowCalendar}
              />
            </div>
            {showCalendar && currentUser && (
              <div className="calendar-section-container">
                <CalendarView onClose={() => setShowCalendar(false)} />
              </div>
            )}

          </div>
        </EditorProvider>
      </CountdownProvider>
    </ThemeProvider>
  );
}

export default App;
