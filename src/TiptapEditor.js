import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item'
import { CustomTaskItem } from './extensions/CustomTaskItem';
import { BulletList, OrderedList, ListItem } from '@tiptap/extension-list';
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image';
import CountdownTimer from './components/countdown/CountdownTimer';
// import SystemClock from './components/SystemClock';
import { debounce } from 'lodash';
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { Extension } from '@tiptap/core'
import { SlashCommandsExtension } from './components/SlashCommandsExtension'
import { SlashCommands } from './components/SlashCommands'
import { CountdownTimerExtension } from './components/countdown/CountdownTimerExtension'
import { CalendarTask } from './extentions/CalendarTask'
// import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Paragraph from '@tiptap/extension-paragraph'
import { TimestampExtension } from './extensions/TimestampExtension.bk'
import { TodoDragHandle } from './extensions/TodoDragHandle.bk'
import FilterMenu from './components/FilterMenu.bk'
import MiniMap from './components/MiniMap'
import SearchBar from './components/SearchBar'
import { SearchHighlight } from './extensions/SearchHighlight'
import { useEditorContext } from './contexts/EditorContext'

import UpIcon from './assets/icons/arrow-up-square.svg'


const TiptapEditor = (
  {
    content,
    onContentChange,
    hideOutline = false,
    textAreaWidth = 800,
  }
) => {
  const [lineCount, setLineCount] = useState(0);
  const [todoCount, setTodoCount] = useState(0);
  const [completedTodoCount, setCompletedTodoCount] = useState(0);
  const [lastEditTime, setLastEditTime] = useState(null);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [headingCount, setHeadingCount] = useState(0);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [hasScrollbar, setHasScrollbar] = useState(false);
  
  // Search state
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const { setEditor: setEditorContext, setScrollToTodo: setScrollToTodoContext, isLocked } = useEditorContext();
  
  // Track xem đã clear countdown khi load content lần đầu chưa
  const hasClearedCountdownRef = useRef(false);
  
  // Refs để store timeout IDs cho cleanup
  const clearCountdownTimeoutRef = useRef(null);
  const headingCountTimeoutRef = useRef(null);
  const searchScrollTimeoutRef = useRef(null);
  const navigateScrollTimeoutRef = useRef(null);
  const checkScrollTimeoutRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        taskList: false, // disable default task list
        taskItem: false, // disable default task item
      }),
      // HorizontalRule,
      // Paragraph,
      // CalendarTask,
      BulletList.configure({
        nested: true,
      }),
      OrderedList.configure({
        nested: true,
      }),
      ListItem.configure({
        nested: true,
      }),
      TaskList,
      // TaskItem.configure({
      //   nested: true, // Cho phép nested task lists
      // }),
      CustomTaskItem.configure({
        nested: true, // Cho phép nested task lists
      }),
      // TodoDragHandle,
      CountdownTimerExtension,
      // SlashCommandsExtension,
      // TimestampExtension,
      SearchHighlight,
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'tiptap-image',
        },
      }),
      Placeholder.configure({
        placeholder: 'Type / to see commands (e.g. /countdown 5m, /remind 10m, /use meeting)',
      }),
    ],
    content : content,
    editable: !isLocked,
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
      
      // Count headings - only show minimap if there are at least 2 headings
      const { state } = editor;
      let headingCount = 0;
      state.doc.descendants((node) => {
        if (node.type.name === 'heading' && node.attrs.level) {
          headingCount++;
        }
      });
      setHeadingCount(headingCount);
    },
    autofocus: true,
    editorProps: {
      attributes: { class: 'tiptap-editor' },
      handleDrop: (view, event, slice, moved) => {
        // Chỉ xử lý khi không phải move node (moved = false)
        if (moved) return false;
        
        // Kiểm tra xem có file image không
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) return false;
        
        event.preventDefault();
        
        // Xử lý từng image file
        imageFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const src = e.target.result;
            // Insert image tại vị trí drop
            const { schema } = view.state;
            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            
            if (coordinates) {
              const imageNode = schema.nodes.image.create({ src });
              const transaction = view.state.tr.insert(coordinates.pos, imageNode);
              view.dispatch(transaction);
            }
          };
          reader.readAsDataURL(file);
        });
        
        return true;
      },
      handlePaste: (view, event, slice) => {
        const items = Array.from(event.clipboardData?.items || []);
        
        // 1. Xử lý paste image từ clipboard (ưu tiên cao nhất)
        const imageItems = items.filter(item => item.type.startsWith('image/'));
        if (imageItems.length > 0) {
          event.preventDefault();
          imageItems.forEach((item) => {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const src = e.target.result;
                const { schema } = view.state;
                const { selection } = view.state;
                const imageNode = schema.nodes.image.create({ src });
                const transaction = view.state.tr.replaceSelectionWith(imageNode);
                view.dispatch(transaction);
              };
              reader.readAsDataURL(file);
            }
          });
          return true;
        }
        
        // 2. Xử lý paste code - detect và format thành code block
        const text = event.clipboardData?.getData('text/plain') || '';
        if (text.trim()) {
          const lines = text.split('\n');
          
          // Code detection patterns
          // const codePatterns = [
          //   /^(function|const|let|var|class|import|export|if|for|while|return|async|await|try|catch|finally|switch|case|default)\s/,
          //   /[{}();=]/, // Common code characters
          //   /^\s{2,}/, // Indentation (2+ spaces)
          //   /^\t/, // Tab indentation
          //   /^\s*\/\//, // Comments
          //   /^\s*\/\*/, // Block comments
          //   /=>\s*/, // Arrow functions
          //   /console\.(log|error|warn|info)/, // Console statements
          // ];
          
          // const hasCodePattern = codePatterns.some(pattern => 
          //   lines.some(line => pattern.test(line.trim()))
          // );
          
          // Nếu detect là code, format thành code block
          let hasCodePattern = isProbablyCode(text);
          if (hasCodePattern) {
            event.preventDefault();
            
            const { schema } = view.state;
            const { selection } = view.state;
            
            // Kiểm tra xem có codeBlock node type không
            if (schema.nodes.codeBlock) {
              // Tạo code block node với text content
              // CodeBlock trong Tiptap chứa một text node với toàn bộ code (giữ nguyên newlines)
              const codeText = text.trim();
              const codeBlock = schema.nodes.codeBlock.create({}, schema.text(codeText));
              const transaction = view.state.tr.replaceSelectionWith(codeBlock);
              view.dispatch(transaction);
              return true;
            }
          }
        }
        
        // 3. Không phải image cũng không phải code, để default handler xử lý
        return false;
      },
    },
  });

  function isProbablyCode(text) {
    if (/;|\{|\}|\(|\)|=>|const|let|var|function/.test(text)) return true
    if (/^```/.test(text.trim())) return true
    return false
  }

  // Set editor in context when ready
  useEffect(() => {
    if (editor) {
      setEditorContext(editor);
    }
  }, [editor, setEditorContext]);

  // Update editor editable state when lock state changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isLocked);
    }
  }, [editor, isLocked]);

  useEffect(() => {
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content)
      
      // Clear countdown timers when content is first loaded (app restart)
      // Countdown should not persist across app sessions
      if (!hasClearedCountdownRef.current) {
        hasClearedCountdownRef.current = true;
        
        // Clear previous timeout if exists
        if (clearCountdownTimeoutRef.current) {
          clearTimeout(clearCountdownTimeoutRef.current);
        }
        
        // Use setTimeout to ensure content is set first
        clearCountdownTimeoutRef.current = setTimeout(() => {
          if (!editor) return;
          
          const { state } = editor;
          const tr = state.tr;
          let hasChanges = false;
          
          // Find and delete all countdownTimer nodes
          const countdownNodes = [];
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'countdownTimer') {
              countdownNodes.push({ node, pos });
            }
          });
          
          // Delete countdown nodes (from end to start to maintain positions)
          if (countdownNodes.length > 0) {
            countdownNodes.sort((a, b) => b.pos - a.pos);
            countdownNodes.forEach(({ pos, node }) => {
              tr.delete(pos, pos + node.nodeSize);
              hasChanges = true;
            });
          }
          
          // Clear countdownSeconds from all taskItems
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'taskItem' && node.attrs.countdownSeconds !== null) {
              tr.setNodeMarkup(pos, null, {
                ...node.attrs,
                countdownSeconds: null,
              });
              hasChanges = true;
            }
          });
          
          if (hasChanges) {
            editor.view.dispatch(tr);
            // Update content after clearing countdown
            onContentChange(editor.getHTML());
          }
          
          clearCountdownTimeoutRef.current = null;
        }, 100); // Small delay to ensure content is set first
      }
      
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
      
      // Count headings when content changes - wait for editor to update
      // Clear previous timeout if exists
      if (headingCountTimeoutRef.current) {
        clearTimeout(headingCountTimeoutRef.current);
      }
      
      headingCountTimeoutRef.current = setTimeout(() => {
        if (editor) {
          const { state } = editor;
          let headingCount = 0;
          state.doc.descendants((node) => {
            if (node.type.name === 'heading' && node.attrs.level) {
              headingCount++;
            }
          });
          setHeadingCount(headingCount);
        }
        headingCountTimeoutRef.current = null;
      }, 100);
    }
    
    // Cleanup function
    return () => {
      if (clearCountdownTimeoutRef.current) {
        clearTimeout(clearCountdownTimeoutRef.current);
        clearCountdownTimeoutRef.current = null;
      }
      if (headingCountTimeoutRef.current) {
        clearTimeout(headingCountTimeoutRef.current);
        headingCountTimeoutRef.current = null;
      }
    };
  }, [content, editor, onContentChange])


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
        // Clear previous timeout if exists
        if (searchScrollTimeoutRef.current) {
          clearTimeout(searchScrollTimeoutRef.current);
        }
        
        searchScrollTimeoutRef.current = setTimeout(() => {
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
          searchScrollTimeoutRef.current = null;
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
        // Clear previous timeout if exists
        if (navigateScrollTimeoutRef.current) {
          clearTimeout(navigateScrollTimeoutRef.current);
        }
        
        navigateScrollTimeoutRef.current = setTimeout(() => {
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
          navigateScrollTimeoutRef.current = null;
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

  // Scroll detection for scroll-to-top button
  useEffect(() => {
    if (!editor) return;

    const findScrollableElement = () => {
      // Try to find the element with .tiptap-editor class
      const editorElement = editor.view.dom;
      if (!editorElement) return null;
      
      // Check if the editor element itself is scrollable
      if (editorElement.scrollHeight > editorElement.clientHeight) {
        return editorElement;
      }
      
      // Check parent elements
      let parent = editorElement.parentElement;
      while (parent) {
        if (parent.scrollHeight > parent.clientHeight && 
            (parent.classList.contains('tiptap-editor') || 
             getComputedStyle(parent).overflowY === 'auto' ||
             getComputedStyle(parent).overflowY === 'scroll')) {
          return parent;
        }
        parent = parent.parentElement;
      }
      
      return editorElement;
    };

    const scrollableElement = findScrollableElement();
    if (!scrollableElement) return;

    const checkScroll = () => {
      const scrollTop = scrollableElement.scrollTop;
      const scrollHeight = scrollableElement.scrollHeight;
      const clientHeight = scrollableElement.clientHeight;
      
      // Check if scrollbar exists
      const hasScroll = scrollHeight > clientHeight;
      setHasScrollbar(hasScroll);
      
      // Show button if scrolled down more than 100px and scrollbar exists
      setShowScrollToTop(hasScroll && scrollTop > 100);
    };

    // Check on mount and content changes
    checkScroll();
    
    // Listen to scroll events
    scrollableElement.addEventListener('scroll', checkScroll);
    
    // Also check when content changes
    const handleUpdate = () => {
      // Clear previous timeout if exists
      if (checkScrollTimeoutRef.current) {
        clearTimeout(checkScrollTimeoutRef.current);
      }
      checkScrollTimeoutRef.current = setTimeout(() => {
        checkScroll();
        checkScrollTimeoutRef.current = null;
      }, 100);
    };
    
    editor.on('update', handleUpdate);

    return () => {
      scrollableElement.removeEventListener('scroll', checkScroll);
      editor.off('update', handleUpdate);
      // Clear timeout on cleanup
      if (checkScrollTimeoutRef.current) {
        clearTimeout(checkScrollTimeoutRef.current);
        checkScrollTimeoutRef.current = null;
      }
    };
  }, [editor]);

  // Handle scroll to top
  const handleScrollToTop = () => {
    if (!editor) return;
    
    // Find the scrollable element
    const editorElement = editor.view.dom;
    if (!editorElement) return;
    
    // Check if the editor element itself is scrollable
    let scrollableElement = editorElement;
    if (editorElement.scrollHeight <= editorElement.clientHeight) {
      // Check parent elements
      let parent = editorElement.parentElement;
      while (parent) {
        if (parent.scrollHeight > parent.clientHeight && 
            (parent.classList.contains('tiptap-editor') || 
             getComputedStyle(parent).overflowY === 'auto' ||
             getComputedStyle(parent).overflowY === 'scroll')) {
          scrollableElement = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }
    
    if (scrollableElement) {
      scrollableElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };


  // Function để scroll đến todo item
  const scrollToTodo = useCallback((todoPosition) => {
    if (!editor || todoPosition === null || todoPosition === undefined) {
      return;
    }

    try {
      // Check if position is still valid
      const { state } = editor;
      if (todoPosition < 0 || todoPosition > state.doc.content.size) {
        // Position is out of bounds, use fallback
        throw new Error('Position out of bounds');
      }

      // Try to get DOM node from position
      const domNode = editor.view.nodeDOM(todoPosition);
      
      if (domNode && domNode instanceof HTMLElement) {
        // Scroll to the element
        domNode.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        return;
      }
    } catch (error) {
      // Fallback: Find by countdownSeconds attribute if position doesn't work
      // This can happen if document has changed
      try {
        const { state } = editor;
        let foundTodo = null;
        let foundPos = null;

        state.doc.descendants((node, pos) => {
          if (node.type.name === 'taskItem' && node.attrs.countdownSeconds !== null) {
            // Find the first todo with active countdown
            if (!foundTodo) {
              foundTodo = node;
              foundPos = pos;
            }
          }
          return true;
        });

        if (foundTodo && foundPos !== null) {
          const domNode = editor.view.nodeDOM(foundPos);
          if (domNode && domNode instanceof HTMLElement) {
            domNode.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }
        }
      } catch (fallbackError) {
        console.warn('Error scrolling to todo:', fallbackError);
      }
    }
  }, [editor]);

  // Set scrollToTodo in context when ready
  useEffect(() => {
    setScrollToTodoContext(scrollToTodo);
  }, [scrollToTodo, setScrollToTodoContext]);

  return (
    <div className="editor-container">
      <div 
        style={{ 
          height: '100%', 
          width: '100%', 
          position: 'relative',
          '--text-area-width': `${textAreaWidth}px`
        }}
      >
        <EditorContent editor={editor} style={{ height: '100%', width: '100%' }} />
        {!hideOutline && headingCount >= 2 && (
          <MiniMap
            editor={editor}
            isVisible={showMiniMap}
            onToggle={() => setShowMiniMap(false)}
          />
        )}
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
        {showScrollToTop && hasScrollbar && (
          <button className="scroll-to-top-button" onClick={handleScrollToTop} title="Scroll to top">
            <UpIcon className="scroll-to-top-icon" />
          </button>
        )}
      </div>
    </div>
  );
};

export default TiptapEditor;
