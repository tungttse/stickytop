import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';

const MiniMap = ({ editor, isVisible, onToggle }) => {
  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState(null);
  const [isHovered, setIsHovered] = useState(false);

  // Generate slug from heading text
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  };

  // Extract headings from editor content
  const extractHeadings = useCallback(() => {
    if (!editor) return [];

    const headingsList = [];
    const { state } = editor;
    let idCounter = 1;

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && node.attrs.level) {
        const text = node.textContent;
        const level = node.attrs.level;
        const slug = generateSlug(text);
        const uniqueId = `${slug}-${idCounter++}`;

        headingsList.push({
          id: uniqueId,
          level: level,
          text: text,
          position: pos,
          element: null // Will be set when we find the DOM element
        });
      }
    });

    return headingsList;
  }, [editor]);

  // Update headings when editor content changes
  useEffect(() => {
    if (!editor) return;

    const updateHeadings = () => {
      const newHeadings = extractHeadings();
      setHeadings(newHeadings);

      // Add IDs to heading elements in the DOM
      setTimeout(() => {
        const editorElement = editor.view.dom;
        newHeadings.forEach((heading, index) => {
          const headingElements = editorElement.querySelectorAll(`h${heading.level}`);
          const headingElement = Array.from(headingElements).find(el => 
            el.textContent.trim() === heading.text.trim() && !el.id
          );
          
          if (headingElement) {
            headingElement.id = heading.id;
            console.log('Added ID to heading:', heading.id, heading.text);
          }
        });
      }, 200);
    };

    // Initial update
    updateHeadings();

    // Listen for content changes
    const handleUpdate = debounce(updateHeadings, 300);
    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, extractHeadings]);

  // Scroll spy to highlight current heading
  useEffect(() => {
    if (!editor || headings.length === 0) return;

    const editorElement = editor.view.dom;
    const headingElements = headings.map(h => document.getElementById(h.id)).filter(Boolean);

    if (headingElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const headingId = entry.target.id;
            setActiveHeadingId(headingId);
          }
        });
      },
      {
        root: editorElement,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
      }
    );

    headingElements.forEach(element => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [editor, headings]);

  // Handle click to scroll to heading
  const handleHeadingClick = useCallback((headingId) => {
    console.log('Clicking heading:', headingId);
    
    // Try multiple methods to find the element
    let element = document.getElementById(headingId);
    
    if (!element) {
      // Fallback: find by heading text
      const heading = headings.find(h => h.id === headingId);
      if (heading) {
        const editorElement = editor.view.dom;
        const headingElements = editorElement.querySelectorAll(`h${heading.level}`);
        element = Array.from(headingElements).find(el => 
          el.textContent.trim() === heading.text.trim()
        );
      }
    }
    
    if (element) {
      console.log('Found element, scrolling to:', element);
      // Scroll the editor container, not the element itself
      const editorContainer = editor.view.dom;
      const elementRect = element.getBoundingClientRect();
      const containerRect = editorContainer.getBoundingClientRect();
      
      const scrollTop = editorContainer.scrollTop + elementRect.top - containerRect.top - 20;
      
      editorContainer.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    } else {
      console.log('Element not found for heading:', headingId);
    }
  }, [editor, headings]);

  // Get color for heading level
  const getHeadingColor = (level) => {
    const colors = {
      1: '#1a73e8', // blue
      2: '#34a853', // green
      3: '#ea4335', // red
      4: '#fbbc04', // yellow
      5: '#9334e6', // purple
      6: '#666666'  // gray
    };
    return colors[level] || '#666666';
  };

  // Get indentation for heading level
  const getIndentation = (level) => {
    return (level - 1) * 16; // 16px per level
  };

  // Memoize heading list to avoid unnecessary re-renders
  const headingList = useMemo(() => {
    if (headings.length === 0) return null;

    return (
      <div className="minimap-headings">
        {headings.map((heading) => (
          <div
            key={heading.id}
            className={`minimap-heading minimap-heading-level-${heading.level} ${
              activeHeadingId === heading.id ? 'active' : ''
            }`}
            style={{
              paddingLeft: `${getIndentation(heading.level)}px`,
              color: getHeadingColor(heading.level)
            }}
            onClick={() => handleHeadingClick(heading.id)}
          >
            <span className="minimap-heading-bullet">•</span>
            <span className="minimap-heading-text" title={heading.text}>
              {heading.text.length > 30 
                ? `${heading.text.substring(0, 30)}...` 
                : heading.text
              }
            </span>
          </div>
        ))}
      </div>
    );
  }, [headings, activeHeadingId, handleHeadingClick]);

  if (!isVisible) return null;

  return (
    <div 
      className="minimap-trigger"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Trigger Button */}
      <div className="minimap-trigger-button">
        <span className="minimap-trigger-icon">📋</span>
      </div>
      
      {/* Mini Map Panel */}
      {isHovered && (
        <div className="minimap-panel">
          <div className="minimap-content">
            {headingList}
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniMap;
