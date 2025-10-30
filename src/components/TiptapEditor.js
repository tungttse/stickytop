import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { BulletList, OrderedList, ListItem } from '@tiptap/extension-list';
import Placeholder from '@tiptap/extension-placeholder'
import CountdownTimer from './CountdownTimer';
import SystemClock from './SystemClock';
import { debounce } from 'lodash';
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { Extension } from '@tiptap/core'
import { SlashCommandsExtension } from './SlashCommandsExtension'
import { SlashCommands } from './SlashCommands'
import { CountdownTimerExtension } from './CountdownTimerExtension'
import { CalendarTask } from '../extentions/CalendarTask'
// import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Paragraph from '@tiptap/extension-paragraph'
import { TimestampExtension } from '../extensions/TimestampExtension'
import TimestampTooltip from './TimestampTooltip'
import FilterMenu from './FilterMenu'
import MiniMap from './MiniMap'
import SearchBar from './SearchBar'
import { SearchHighlight } from '../extensions/SearchHighlight'


const TiptapEditor = (
  {
    content,
    onContentChange,
    isAutoMinimized = false,
  }
) => {
  const [tooltip, setTooltip] = useState({ visible: false, position: { x: 0, y: 0 }, timestamps: null });
  const [currentFilter, setCurrentFilter] = useState('all');
  const [lineCount, setLineCount] = useState(0);
  const [todoCount, setTodoCount] = useState(0);
  const [completedTodoCount, setCompletedTodoCount] = useState(0);
  const [lastEditTime, setLastEditTime] = useState(null);
  const [showMiniMap, setShowMiniMap] = useState(true);
  
  // Search state
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);


  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        // horizontalRule: false,
        taskList: false,
        taskItem: false,
      }),
      // HorizontalRule,
      Paragraph,
      CalendarTask,
      TaskList,
      TaskItem,
      CountdownTimerExtension,
      SlashCommandsExtension,
      TimestampExtension,
      SearchHighlight,
     
      Placeholder.configure({
        placeholder: 'Type / to see commands (e.g. /countdown 5m, /remind 10m, /use meeting)',
      }),
    ],
    content : content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML())
      
      // Update line count - only count non-empty lines
      const text = editor.getText();
      const lines = text.split('\n').filter(line => line.trim().length > 0).length;
      setLineCount(lines);
      
      // Update todo count and completed count
      const html = editor.getHTML();
      const todoMatches = html.match(/<li[^>]*data-type="taskItem"[^>]*>/g);
      const todoCount = todoMatches ? todoMatches.length : 0;
      setTodoCount(todoCount);
      
      // Count completed todos (checked) - use DOM parsing for accuracy
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const taskItems = tempDiv.querySelectorAll('li[data-type="taskItem"]');
      const completedTodoCount = Array.from(taskItems).filter(item => 
        item.getAttribute('data-checked') === 'true'
      ).length;
      setCompletedTodoCount(completedTodoCount);
      
      // Update last edit time
      setLastEditTime(new Date());
    },
    autofocus: true,
    editorProps: {
      attributes: { class: 'tiptap-editor' },
    },
  });
  useEffect(() => {
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content)
      
      // Update line count when content changes - only count non-empty lines
      const text = editor.getText();
      const lines = text.split('\n').filter(line => line.trim().length > 0).length;
      setLineCount(lines);
      
      // Update todo count and completed count when content changes
      const todoMatches = content.match(/<li[^>]*data-type="taskItem"[^>]*>/g);
      const todoCount = todoMatches ? todoMatches.length : 0;
      setTodoCount(todoCount);
      
      // Count completed todos (checked) - use DOM parsing for accuracy
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const taskItems = tempDiv.querySelectorAll('li[data-type="taskItem"]');
      const completedTodoCount = Array.from(taskItems).filter(item => 
        item.getAttribute('data-checked') === 'true'
      ).length;
      setCompletedTodoCount(completedTodoCount);
    }
  }, [content])

  // Add timestamps to existing nodes when editor is ready
  useEffect(() => {
    if (editor) {
      // Add timestamps to all existing nodes that don't have them
      setTimeout(() => {
        try {
          editor.commands.addTimestampsToAllNodes();
        } catch (error) {
          console.warn('Error adding timestamps to nodes:', error);
        }
      }, 100);
    }
  }, [editor]);

  // Update timestamps when editor content changes (simplified approach)
  useEffect(() => {
    if (editor) {
      const handleUpdate = () => {
        // Only update timestamps for new nodes, not on every update
        setTimeout(() => {
          try {
            const { state } = editor;
            const now = Date.now();
            const tr = state.tr;
            let hasChanges = false;

            state.doc.descendants((node, pos) => {
              if (node.isBlock && !node.attrs.createdAt) {
                tr.setNodeMarkup(pos, null, {
                  ...node.attrs,
                  createdAt: now,
                  updatedAt: now,
                });
                hasChanges = true;
              }
            });

            if (hasChanges) {
              editor.view.dispatch(tr);
            }
          } catch (error) {
            console.warn('Error updating timestamps:', error);
          }
        }, 100);
      };

      editor.on('update', handleUpdate);
      
      return () => {
        editor.off('update', handleUpdate);
      };
    }
  }, [editor]);

  // Search functionality
  const performSearch = useCallback((query) => {
    if (!editor) return;
    
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      // Clear all highlights
      editor.commands.clearAllSearchHighlights();
      return;
    }

    try {
      const text = editor.getText();
      const matches = [];
      const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let match;

      while ((match = searchRegex.exec(text)) !== null) {
        matches.push({
          from: match.index,
          to: match.index + match[0].length,
          text: match[0]
        });
      }

      setSearchMatches(matches);
      setCurrentMatchIndex(0);

      // Apply highlights
      if (matches.length > 0) {
        // Clear existing highlights first
        editor.commands.clearAllSearchHighlights();
        
        // Apply highlights to all matches
        matches.forEach((match, index) => {
          editor.commands.setTextSelection({ from: match.from, to: match.to });
          editor.commands.setSearchHighlight({
            class: 'search-highlight',
            'data-type': 'searchHighlight'
          });
        });

        // Set active highlight for first match and scroll to it
        const activeMatch = matches[0];
        editor.commands.setTextSelection({ from: activeMatch.from, to: activeMatch.to });
        editor.commands.setSearchHighlight({
          class: 'search-highlight-active',
          'data-type': 'searchHighlightActive'
        });

        // Scroll to first match
        setTimeout(() => {
          const editorElement = editor.view.dom;
          const selection = editor.state.selection;
          const coords = editor.view.coordsAtPos(selection.from);
          
          if (coords) {
            const editorRect = editorElement.getBoundingClientRect();
            const scrollTop = editorElement.scrollTop + coords.top - editorRect.top - 100; // Offset for top bar
            
            editorElement.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    } catch (error) {
      console.warn('Search error:', error);
      setSearchMatches([]);
      setCurrentMatchIndex(0);
    }
  }, [editor]);

  const navigateToMatch = useCallback((direction) => {
    if (searchMatches.length === 0 || !editor) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentMatchIndex + 1) % searchMatches.length;
    } else {
      newIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    }

    setCurrentMatchIndex(newIndex);

    try {
      // Clear all highlights first
      editor.commands.clearAllSearchHighlights();

      // Reapply highlights
      searchMatches.forEach((match, index) => {
        editor.commands.setTextSelection({ from: match.from, to: match.to });
        editor.commands.setSearchHighlight({
          class: index === newIndex ? 'search-highlight-active' : 'search-highlight',
          'data-type': index === newIndex ? 'searchHighlightActive' : 'searchHighlight'
        });
      });

      // Scroll to current match
      const currentMatch = searchMatches[newIndex];
      if (currentMatch) {
        // Set selection first
        editor.commands.setTextSelection({ from: currentMatch.from, to: currentMatch.to });
        
        // Scroll to the match with smooth behavior
        setTimeout(() => {
          const editorElement = editor.view.dom;
          const selection = editor.state.selection;
          const coords = editor.view.coordsAtPos(selection.from);
          
          if (coords) {
            const editorRect = editorElement.getBoundingClientRect();
            const scrollTop = editorElement.scrollTop + coords.top - editorRect.top - 100; // Offset for top bar
            
            editorElement.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
          }
        }, 50);
      }
    } catch (error) {
      console.warn('Navigation error:', error);
    }
  }, [editor, searchMatches, currentMatchIndex]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchMatches([]);
    setCurrentMatchIndex(0);
    setShowSearchBar(false);
    editor?.commands.clearAllSearchHighlights();
  }, [editor]);

  // Filter change handler
  const handleFilterChange = useCallback((filterType) => {
    setCurrentFilter(filterType);
  }, []);

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Command+F or Ctrl+F
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchBar(true);
        setSearchQuery('');
        setSearchMatches([]);
        setCurrentMatchIndex(0);
        return;
      }

      // Command+G or Ctrl+G (next match)
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && !e.shiftKey && showSearchBar) {
        e.preventDefault();
        navigateToMatch('next');
        return;
      }

      // Command+Shift+G or Ctrl+Shift+G (previous match)
      if ((e.metaKey || e.ctrlKey) && e.key === 'G' && e.shiftKey && showSearchBar) {
        e.preventDefault();
        navigateToMatch('previous');
        return;
      }

      // Escape to close search
      if (e.key === 'Escape' && showSearchBar) {
        e.preventDefault();
        clearSearch();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearchBar, navigateToMatch, clearSearch]);

  // Handle mouse hover for timestamp tooltip
  const handleMouseMove = (event) => {
    if (!editor) return;

    const { clientX, clientY } = event;
    const editorElement = editor.view.dom;
    const rect = editorElement.getBoundingClientRect();
    
    // Convert mouse position to editor coordinates
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Find the node at the mouse position
    const pos = editor.view.posAtCoords({ left: clientX, top: clientY });
    if (pos) {
      const node = editor.view.state.doc.nodeAt(pos.pos);
      if (node && node.attrs.createdAt) {
        setTooltip({
          visible: true,
          position: { x: clientX, y: clientY },
          timestamps: {
            createdAt: node.attrs.createdAt,
            updatedAt: node.attrs.updatedAt,
          }
        });
      } else {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };


  // Function to get first todo or first line
  const getFirstTodo = () => {
    if (!editor) return '';
    
    const html = editor.getHTML();
    // Look for first task item or first paragraph
    const taskMatch = html.match(/<li[^>]*data-type="taskItem"[^>]*>.*?<\/li>/);
    if (taskMatch) {
      return taskMatch[0];
    }
    
    // If no task found, get first paragraph
    const paragraphMatch = html.match(/<p[^>]*>.*?<\/p>/);
    if (paragraphMatch) {
      return paragraphMatch[0];
    }
    
    return html;
  };

  return (
    <>
    {!isAutoMinimized && (
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="top-bar-section">
            <h3 className="top-bar-title">StickyTop</h3>
          </div>
        </div>
        <div className="top-bar-center">
          <div className="top-bar-section">
            <FilterMenu onFilterChange={handleFilterChange} currentFilter={currentFilter} />
          </div>
        </div>
        <div className="top-bar-right">
          <div className="top-bar-section">
            <button
              className="top-bar-button"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: 'calendarTask',
                    attrs: { text: '📚 Đọc sách lúc 9h sáng thứ 7' },
                  })
                  .run()
              }}
            >
              + Add Calendar Task
            </button>
          </div>
        </div>
      </div>
    )}
    <div className={`editor-container ${isAutoMinimized ? 'auto-minimized' : ''} filter-${currentFilter}`}>
      {isAutoMinimized ? (
        <div 
          className="first-todo-preview"
          dangerouslySetInnerHTML={{ __html: getFirstTodo() }}
        />
      ) : (
        <div 
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ height: '100%', width: '100%', position: 'relative' }}
        >
          <EditorContent editor={editor} style={{ height: '100%', width: '100%' }} />
          <TimestampTooltip
            createdAt={tooltip.timestamps?.createdAt}
            updatedAt={tooltip.timestamps?.updatedAt}
            position={tooltip.position}
            visible={tooltip.visible}
          />
          <MiniMap
            editor={editor}
            isVisible={showMiniMap}
            onToggle={() => setShowMiniMap(false)}
          />
          <SearchBar
            isVisible={showSearchBar}
            onClose={clearSearch}
            onSearch={performSearch}
            onNext={() => navigateToMatch('next')}
            onPrevious={() => navigateToMatch('previous')}
            currentMatch={currentMatchIndex + 1}
            totalMatches={searchMatches.length}
            searchQuery={searchQuery}
          />
        </div>
      )}
    </div>
    {!isAutoMinimized && (
      <div className="status-bar">
        <div className="status-left">
          <div className="status-item">
            <span className="status-label">Lines:</span>
            <span className="status-value">{lineCount}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Todos:</span>
            <span className="status-value">{todoCount}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Completed:</span>
            <span className="status-value completed">{completedTodoCount}</span>
          </div>
        </div>
        <div className="status-right">
          {lastEditTime && (
            <div className="status-item">
              <span className="status-label">Last edit:</span>
              <span className="status-value">{lastEditTime.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    )}
    </>
    
  );
};

export default TiptapEditor;
