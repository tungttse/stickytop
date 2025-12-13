import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const EditorContext = createContext({
  editor: null,
  scrollToTodo: () => {},
  setEditor: () => {},
  setScrollToTodo: () => {},
  isLocked: false,
  lockEditor: () => {},
  unlockEditor: () => {},
});

export const useEditorContext = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within EditorProvider');
  }
  return context;
};

export const EditorProvider = ({ children }) => {
  const [editor, setEditorState] = useState(null);
  const [scrollToTodo, setScrollToTodoState] = useState(() => () => {});
  const [isLocked, setIsLockedState] = useState(() => {
    // Load lock state from localStorage on initialization
    try {
      const saved = localStorage.getItem('editor-locked');
      return saved === 'true';
    } catch (error) {
      return false;
    }
  });

  // Persist lock state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('editor-locked', isLocked.toString());
    } catch (error) {
      console.error('Error saving lock state:', error);
    }
  }, [isLocked]);

  const setEditor = useCallback((editorInstance) => {
    setEditorState(editorInstance);
  }, []);

  const setScrollToTodo = useCallback((scrollFn) => {
    setScrollToTodoState(() => scrollFn);
  }, []);

  const lockEditor = useCallback(() => {
    setIsLockedState(true);
  }, []);

  const unlockEditor = useCallback(() => {
    setIsLockedState(false);
  }, []);

  return (
    <EditorContext.Provider
      value={{
        editor,
        scrollToTodo,
        setEditor,
        setScrollToTodo,
        isLocked,
        lockEditor,
        unlockEditor,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

