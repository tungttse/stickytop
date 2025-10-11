import React, { useState, useEffect, useRef } from 'react';
import TiptapEditor from './components/TiptapEditor';

function App() {
  const [content, setContent] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'
  const [backgroundColor, setBackgroundColor] = useState('#ffff99'); // Default yellow
  const autoSaveTimeoutRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const clickCountRef = useRef(0);

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

  // Load saved color on startup
  useEffect(() => {
    const loadSavedColor = async () => {
      try {
        if (window.electronAPI && window.electronAPI.loadColor) {
          const result = await window.electronAPI.loadColor();
          if (result.success) {
            setBackgroundColor(result.color);
          }
        }
      } catch (error) {
        console.error('Error loading saved color:', error);
      }
    };
    
    loadSavedColor();
  }, []);

  // Listen for color change from menu
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onColorChange) {
      const handleColorChange = async (event, color) => {
        setBackgroundColor(color);
        // Save the new color
        try {
          if (window.electronAPI && window.electronAPI.saveColor) {
            await window.electronAPI.saveColor(color);
          }
        } catch (error) {
          console.error('Error saving color:', error);
        }
      };
      
      window.electronAPI.onColorChange(handleColorChange);
      
      // Cleanup listener on unmount
      return () => {
        if (window.electronAPI && window.electronAPI.removeColorChangeListener) {
          window.electronAPI.removeColorChangeListener();
        }
      };
    }
  }, []);

  // Auto-save when content changes
  useEffect(() => {
    // if (autoSaveTimeoutRef.current) {
    //   clearTimeout(autoSaveTimeoutRef.current);
    // }

    // autoSaveTimeoutRef.current = setTimeout(async () => {
    //   try {
    //     if (window.electronAPI && window.electronAPI.autoSaveNote) {
    //       console.log('autoSaveNote', content);
    //       await window.electronAPI.autoSaveNote(content);
    //       console.log('autoSaveNote completed');
    //     }
    //   } catch (error) {
    //     console.error('Error auto-saving content:', error);
    //   }
    // }, 5000);

    // return () => {
    //   if (autoSaveTimeoutRef.current) {
    //     clearTimeout(autoSaveTimeoutRef.current);
    //   }
    // };
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
        setTimeout(() => setSaveStatus(''), 2000);
      }
    } catch (error) {
      console.error('Error force saving:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
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

  return (
    <div className="app-container">
      <div className="drag-area"  onClick={handleDragAreaClick}></div>
      <TiptapEditor 
          content={content}
          onContentChange={setContent}
        />
    </div>
  );
}

export default App;
