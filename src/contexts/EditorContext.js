import React, { createContext, useContext, useState, useCallback } from 'react';

const EditorContext = createContext({
  editor: null,
  scrollToTodo: () => {},
  setEditor: () => {},
  setScrollToTodo: () => {},
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

  const setEditor = useCallback((editorInstance) => {
    setEditorState(editorInstance);
  }, []);

  const setScrollToTodo = useCallback((scrollFn) => {
    setScrollToTodoState(() => scrollFn);
  }, []);

  return (
    <EditorContext.Provider
      value={{
        editor,
        scrollToTodo,
        setEditor,
        setScrollToTodo,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

