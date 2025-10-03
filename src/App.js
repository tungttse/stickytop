import React, { useState, useEffect, useRef } from 'react';
import TiptapEditor from './components/TiptapEditor';

function App() {
  const [content, setContent] = useState('Start writing your sticky note...');
  const autoSaveTimeoutRef = useRef(null);

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

  const handleContentChange = (newContent) => {
    setContent(newContent);
  };

  return (
    <div className="app">
      <div className="drag-area"></div>
      <TiptapEditor 
        content={content}
        onContentChange={handleContentChange}
      />
    </div>
  );
}

export default App;
