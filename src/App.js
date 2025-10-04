import React, { useState, useEffect, useRef } from 'react';
import TiptapEditor from './components/TiptapEditor';

function App() {
  const [content, setContent] = useState('Start writing your sticky note...');
  const [isMinimized, setIsMinimized] = useState(false);
  const autoSaveTimeoutRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const clickCountRef = useRef(0);

  useEffect(() => {
    // Load auto-saved content
    const autoSaved = localStorage.getItem('stickytop-autosave');
    if (autoSaved && content === 'Start writing your sticky note...') {
      setContent(autoSaved);
    }
  }, []);

  // Auto-save when content changes
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem('stickytop-autosave', content);
    }, 5000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
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

  return (
    <div className={`app ${isMinimized ? 'minimized' : ''}`}>
      <div className="drag-area"  onClick={handleDragAreaClick}>
       
        {isMinimized && (
          <div className="minimized-preview">
            {getFirstLine(content)}
          </div>
        )}
      </div>
      {!isMinimized && (
        <TiptapEditor 
          // content={content}
          // onContentChange={handleContentChange}
        />
      )}
    </div>
  );
}

export default App;
