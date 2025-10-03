import React, { useRef, useEffect, useState } from 'react';

const Editor = ({ content, onContentChange }) => {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleFocus = () => {
    setIsFocused(true);
    if (editorRef.current && editorRef.current.textContent.trim() === 'Start writing your sticky note...') {
      editorRef.current.textContent = '';
      onContentChange('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (editorRef.current && editorRef.current.textContent.trim() === '') {
      editorRef.current.textContent = 'Start writing your sticky note...';
      onContentChange('Start writing your sticky note...');
    }
  };

  const handleInput = () => {
    const newContent = editorRef.current.innerHTML;
    onContentChange(newContent);
  };

  const handleClick = (event) => {
    const target = event.target;
    
    // Handle checkbox clicks
    if (target.classList.contains('todo-checkbox')) {
      const todoText = target.nextElementSibling;
      if (target.checked) {
        todoText.classList.add('completed');
      } else {
        todoText.classList.remove('completed');
      }
      onContentChange(editorRef.current.innerHTML);
    }
    
    // Handle simple checkbox clicks
    if (target.classList.contains('simple-checkbox')) {
      const checkboxText = target.nextElementSibling;
      if (target.checked) {
        checkboxText.classList.add('completed');
      } else {
        checkboxText.classList.remove('completed');
      }
      onContentChange(editorRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e) => {
    // Handle Tab key for checkbox creation
    if (e.key === 'Tab' || e.key === ' ') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textBeforeCursor = getTextBeforeCursor(range);
        
        // Check if user just typed '[]' and pressed Tab
        if (textBeforeCursor.endsWith('[]')) {
          e.preventDefault();
          convertToSimpleCheckbox(range, textBeforeCursor);
          return;
        }
      }
    }
    
    // Handle Enter key
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        // Check if we're inside a simple checkbox text
        const simpleCheckboxContainer = findParentSimpleCheckbox(container);
        if (simpleCheckboxContainer) {
          e.preventDefault();
          
          // Get the current checkbox text
          const checkboxText = simpleCheckboxContainer.querySelector('.checkbox-text');
          const currentText = checkboxText.textContent.trim();
          
          // Create new simple checkbox after current one
          createNewSimpleCheckboxAfter(simpleCheckboxContainer, currentText);
          return;
        }
        
        // Check if we're inside a todo item
        const todoItem = findParentTodoItem(container);
        if (todoItem) {
          e.preventDefault();
          
          // Get the current todo text
          const todoText = todoItem.querySelector('.todo-text');
          const currentText = todoText.textContent.trim();
          
          // If todo text is empty or placeholder, create new todo
          if (currentText === '' || currentText === 'New todo item') {
            createNewTodoAfter(todoItem);
          } else {
            // Create new todo with current text
            todoText.textContent = currentText;
            createNewTodoAfter(todoItem);
          }
          return;
        }
        
        // Check for markdown syntax []
        const textBeforeCursor = getTextBeforeCursor(range);
        if (textBeforeCursor.endsWith('[]')) {
          e.preventDefault();
          convertMarkdownToTodo(range, textBeforeCursor);
          return;
        }
        
        // If none of the above conditions are met, allow normal Enter behavior
      }
    }
    
    // Handle Backspace key
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        // Check if we're inside a todo item
        const todoItem = findParentTodoItem(container);
        if (todoItem) {
          const todoText = todoItem.querySelector('.todo-text');
          
          if (range.startContainer === todoText && range.startOffset === 0) {
            e.preventDefault();
            // Delete the entire todo item
            deleteTodoItem(todoItem);
            return;
          }
        }
        
        // Check if we're inside a simple checkbox text
        const simpleCheckboxContainer = findParentSimpleCheckbox(container);
        if (simpleCheckboxContainer) {
          const checkboxText = simpleCheckboxContainer.querySelector('.checkbox-text');
          
          if (range.startContainer === checkboxText && range.startOffset === 0) {
            e.preventDefault();
            // Delete the entire simple checkbox
            deleteSimpleCheckbox(simpleCheckboxContainer);
            return;
          }
        }
      }
    }
  };

  // Helper functions (same as before)
  const getTextBeforeCursor = (range) => {
    const container = range.startContainer;
    const offset = range.startOffset;
    
    if (container.nodeType === Node.TEXT_NODE) {
      return container.textContent.substring(0, offset);
    } else {
      let text = '';
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        if (node === container) {
          text += node.textContent.substring(0, offset);
          break;
        } else {
          text += node.textContent;
        }
      }
      return text;
    }
  };

  const findParentTodoItem = (node) => {
    while (node && node !== document) {
      if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('todo-item')) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  };

  const findParentSimpleCheckbox = (node) => {
    while (node && node !== document) {
      if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('simple-checkbox-container')) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  };

  const convertMarkdownToTodo = (range, textBeforeCursor) => {
    const container = range.startContainer;
    const offset = range.startOffset;
    
    // Remove the '[]' from the text
    const newText = textBeforeCursor.slice(0, -2);
    
    // Create todo HTML
    const todoHtml = `
      <div class="todo-item">
        <input type="checkbox" class="todo-checkbox">
        <span class="todo-text">${newText}</span>
      </div>
    `;
    
    // Insert the todo
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = todoHtml;
    const todoElement = tempDiv.firstElementChild;
    
    // Find the start of the line and replace it
    const lineStart = findLineStart(container, offset);
    const lineEnd = findLineEnd(container, offset);
    
    // Create range for the entire line
    const lineRange = document.createRange();
    lineRange.setStart(lineStart.node, lineStart.offset);
    lineRange.setEnd(lineEnd.node, lineEnd.offset);
    
    // Replace the line with todo item
    lineRange.deleteContents();
    lineRange.insertNode(todoElement);
    
    // Focus on the todo text
    const todoText = todoElement.querySelector('.todo-text');
    const newRange = document.createRange();
    newRange.selectNodeContents(todoText);
    newRange.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    onContentChange(editorRef.current.innerHTML);
  };

  const convertToSimpleCheckbox = (range, textBeforeCursor) => {
    const container = range.startContainer;
    const offset = range.startOffset;
    
    // Remove the '[]' from the text
    const newText = textBeforeCursor.slice(0, -2);
    
    // Create simple checkbox HTML (like Mac Notes)
    const checkboxHtml = `
      <span class="simple-checkbox-container" style="display: inline-flex; align-items: center; margin: 2px 0;">
        <input type="checkbox" class="simple-checkbox" style="width: 16px; height: 16px; margin-right: 6px; cursor: pointer; accent-color: #007AFF;">
        <span class="checkbox-text" contenteditable="true" style="outline: none; min-width: 20px;">${newText}</span>
      </span>
    `;
    
    // Insert the checkbox
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = checkboxHtml;
    const checkboxElement = tempDiv.firstElementChild;
    
    // Find the start of the line and replace it
    const lineStart = findLineStart(container, offset);
    const lineEnd = findLineEnd(container, offset);
    
    // Create range for the entire line
    const lineRange = document.createRange();
    lineRange.setStart(lineStart.node, lineStart.offset);
    lineRange.setEnd(lineEnd.node, lineEnd.offset);
    
    // Replace the line with checkbox
    lineRange.deleteContents();
    lineRange.insertNode(checkboxElement);
    
    // Focus on the checkbox text
    const checkboxText = checkboxElement.querySelector('.checkbox-text');
    const newRange = document.createRange();
    newRange.selectNodeContents(checkboxText);
    newRange.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    onContentChange(editorRef.current.innerHTML);
  };

  const createNewTodoAfter = (currentTodoItem) => {
    const todoHtml = `
      <div class="todo-item">
        <input type="checkbox" class="todo-checkbox">
        <span class="todo-text">New todo item</span>
      </div>
    `;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = todoHtml;
    const newTodoItem = tempDiv.firstElementChild;
    
    // Insert after current todo item with proper line break
    const lineBreak = document.createElement('br');
    currentTodoItem.parentNode.insertBefore(lineBreak, currentTodoItem.nextSibling);
    currentTodoItem.parentNode.insertBefore(newTodoItem, lineBreak.nextSibling);
    
    // Focus on the new todo text and select placeholder
    const newTodoText = newTodoItem.querySelector('.todo-text');
    const newRange = document.createRange();
    newRange.selectNodeContents(newTodoText);
    newRange.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    // Select the placeholder text
    const textNode = newTodoText.firstChild;
    if (textNode) {
      const selectRange = document.createRange();
      selectRange.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(selectRange);
    }
    
    onContentChange(editorRef.current.innerHTML);
  };

  const createNewSimpleCheckboxAfter = (currentCheckboxContainer, currentText) => {
    const checkboxHtml = `
      <span class="simple-checkbox-container" style="display: inline-flex; align-items: center; margin: 2px 0;">
        <input type="checkbox" class="simple-checkbox" style="width: 16px; height: 16px; margin-right: 6px; cursor: pointer; accent-color: #007AFF;">
        <span class="checkbox-text" contenteditable="true" style="outline: none; min-width: 20px;">New checkbox item</span>
      </span>
    `;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = checkboxHtml;
    const newCheckboxContainer = tempDiv.firstElementChild;

    // Insert after current checkbox container with proper line break
    const lineBreak = document.createElement('br');
    currentCheckboxContainer.parentNode.insertBefore(lineBreak, currentCheckboxContainer.nextSibling);
    currentCheckboxContainer.parentNode.insertBefore(newCheckboxContainer, lineBreak.nextSibling);
 
    // Focus on the new checkbox text and select placeholder
    const newCheckboxText = newCheckboxContainer.querySelector('.checkbox-text');
    const newRange = document.createRange();
    newRange.selectNodeContents(newCheckboxText);
    newRange.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    // Select the placeholder text
    const textNode = newCheckboxText.firstChild;
    if (textNode) {
      const selectRange = document.createRange();
      selectRange.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(selectRange);
    }
    
    onContentChange(editorRef.current.innerHTML);
  };

  const deleteTodoItem = (todoItem) => {
    const selection = window.getSelection();
    const range = document.createRange();
    
    if (todoItem.previousSibling) {
      range.setStartAfter(todoItem.previousSibling);
    } else if (todoItem.nextSibling) {
      range.setStartBefore(todoItem.nextSibling);
    } else {
      const newP = document.createElement('p');
      newP.innerHTML = '<br>';
      todoItem.parentNode.insertBefore(newP, todoItem);
      range.setStart(newP, 0);
    }
    
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    todoItem.remove();
    onContentChange(editorRef.current.innerHTML);
  };

  const deleteSimpleCheckbox = (checkboxContainer) => {
    const selection = window.getSelection();
    const range = document.createRange();
    
    if (checkboxContainer.previousSibling) {
      range.setStartAfter(checkboxContainer.previousSibling);
    } else if (checkboxContainer.nextSibling) {
      range.setStartBefore(checkboxContainer.nextSibling);
    } else {
      const newP = document.createElement('p');
      newP.innerHTML = '<br>';
      checkboxContainer.parentNode.insertBefore(newP, checkboxContainer);
      range.setStart(newP, 0);
    }
    
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    checkboxContainer.remove();
    onContentChange(editorRef.current.innerHTML);
  };

  const findLineStart = (container, offset) => {
    if (container.nodeType === Node.TEXT_NODE) {
      const text = container.textContent;
      const beforeCursor = text.substring(0, offset);
      const lastNewline = beforeCursor.lastIndexOf('\n');
      
      if (lastNewline === -1) {
        return { node: container, offset: 0 };
      } else {
        return { node: container, offset: lastNewline + 1 };
      }
    }
    return { node: container, offset: 0 };
  };

  const findLineEnd = (container, offset) => {
    if (container.nodeType === Node.TEXT_NODE) {
      const text = container.textContent;
      const afterCursor = text.substring(offset);
      const nextNewline = afterCursor.indexOf('\n');
      
      if (nextNewline === -1) {
        return { node: container, offset: text.length };
      } else {
        return { node: container, offset: offset + nextNewline };
      }
    }
    return { node: container, offset: container.textContent.length };
  };

  return (
    <div className="editor-container">
      <div
        ref={editorRef}
        contentEditable
        className="editor"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={handleInput}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning={true}
      />
    </div>
  );
};

export default Editor;
