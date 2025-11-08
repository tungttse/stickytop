import React, { useState, useEffect, useRef } from 'react';
import TiptapEditor from './TiptapEditor';
import CountdownBar from './components/countdown/CountdownBar';
import ThemeSelector from './components/ThemeSelector';
import { CountdownProvider } from './contexts/CountdownContext';
import { EditorProvider } from './contexts/EditorContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [content, setContent] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAutoMinimized, setIsAutoMinimized] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'
  
  const [isThemeSelectorVisible, setIsThemeSelectorVisible] = useState(false);
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


  // Listen for auto-minimize events
  // useEffect(() => {
  //   if (window.electronAPI && window.electronAPI.onAutoMinimizeActivated) {
  //     const handleAutoMinimizeActivated = () => {
  //       setIsAutoMinimized(true);
  //     };
      
  //     const handleAutoMinimizeDeactivated = () => {
  //       setIsAutoMinimized(false);
  //     };
      
  //     window.electronAPI.onAutoMinimizeActivated(handleAutoMinimizeActivated);
  //     window.electronAPI.onAutoMinimizeDeactivated(handleAutoMinimizeDeactivated);
      
  //     // Cleanup listeners on unmount
  //     return () => {
  //       if (window.electronAPI && window.electronAPI.removeAutoMinimizeListeners) {
  //         window.electronAPI.removeAutoMinimizeListeners();
  //       }
  //     };
  //   }
  // }, []);


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
      
      setIsMinimized(!isMinimized);
      
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
    e.stopPropagation();
    setIsThemeSelectorVisible(true);
  };

  return (
    <ThemeProvider>
      <CountdownProvider>
        <EditorProvider>
          <div className={`app-container ${isAutoMinimized ? 'auto-minimized' : ''}`}>
            <div className="drag-area"  onClick={handleDragAreaClick}>
              <button 
                className="theme-button"
                onClick={handleThemeClick}
                title="Theme"
              >
                🎨
              </button>
              <button 
                className="export-button"
                onClick={handleExportClick}
                title="Export"
              >
                📤
              </button>
            </div>
            <ThemeSelector 
              isVisible={isThemeSelectorVisible}
              onClose={() => setIsThemeSelectorVisible(false)}
            />
            <CountdownBar />
            <TiptapEditor 
                content={content}
                onContentChange={setContent}
                isAutoMinimized={isAutoMinimized}
              />
          </div>
        </EditorProvider>
      </CountdownProvider>
    </ThemeProvider>
  );
}

export default App;
