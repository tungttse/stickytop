import React, { useState, useEffect, useRef, useCallback } from 'react';
import CalendarIcon from '../assets/icons/calendar.svg';
import CalendarView from './CalendarView';
import MusicControl from './MusicControl';
import { useEditorContext } from '../contexts/EditorContext';

const FloatingControlBar = ({ currentUser }) => {
  const [activeControl, setActiveControl] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const hideTimeoutRef = useRef(null);
  const [todoStats, setTodoStats] = useState({ total: 0, completed: 0 });
  const { editor } = useEditorContext();

  // Define controls - extensible structure
  const controls = [
    {
      id: 'calendar',
      icon: CalendarIcon,
      component: CalendarView,
      enabled: !!currentUser, // Only show if user is logged in
      title: 'Calendar',
    },
    // Future controls can be added here
    // {
    //   id: 'settings',
    //   icon: SettingsIcon,
    //   component: SettingsView,
    //   enabled: true,
    //   title: 'Settings',
    // },
  ];

  const handleControlClick = (controlId) => {
    if (activeControl === controlId) {
      // If clicking the same control, close it
      setActiveControl(null);
    } else {
      // Open the clicked control
      setActiveControl(controlId);
    }
  };

  const handleCloseControl = () => {
    setActiveControl(null);
  };

  // Auto hide/show logic
  const showBar = useCallback(() => {
    setIsVisible(true);
    // Clear existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    // Don't hide if sidebar is open
    if (activeControl) {
      return;
    }
    // Hide after 3 seconds of inactivity
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 3000);
  }, [activeControl]);

  const handleMouseEnter = () => {
    showBar();
  };

  const handleMouseLeave = () => {
    // Start hide timer when mouse leaves
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 3000);
  };

  // Keep bar visible when sidebar is open
  useEffect(() => {
    if (activeControl) {
      setIsVisible(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    }
  }, [activeControl]);

  // Count todo items from editor
  useEffect(() => {
    if (!editor) return;

    const updateTodoStats = () => {
      const { state } = editor;
      let total = 0;
      let completed = 0;

      state.doc.descendants((node) => {
        if (node.type.name === 'taskItem') {
          total++;
          if (node.attrs.checked) {
            completed++;
          }
        }
        return true;
      });

      setTodoStats({ total, completed });
    };

    // Initial count
    updateTodoStats();

    // Listen to editor updates
    editor.on('update', updateTodoStats);

    return () => {
      editor.off('update', updateTodoStats);
    };
  }, [editor]);

  // Detect mouse movement in bottom area (hover zone)
  useEffect(() => {
    const handleMouseMove = (e) => {
      const windowHeight = window.innerHeight;
      const mouseY = e.clientY;
      const hoverZoneHeight = 100; // Show bar when mouse is within 100px from bottom

      if (windowHeight - mouseY <= hoverZoneHeight) {
        showBar();
      }
    };

    // Show bar initially
    showBar();

    // Add mouse move listener
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [showBar]);

  // Get the active control config
  const activeControlConfig = controls.find(c => c.id === activeControl);
  const ActiveComponent = activeControlConfig?.component;

  return (
    <>
      <div 
        className={`floating-control-bar ${isVisible ? 'visible' : 'hidden'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Todo Stats - Left side */}
        {todoStats.total > 0 && (
          <div className="floating-control-stats">
            <span className="floating-control-stats-text">
              Completed: {todoStats.completed}/{todoStats.total} Tasks
            </span>
          </div>
        )}

        {controls.map((control) => {
          if (!control.enabled) return null;
          
          const IconComponent = control.icon;
          const isActive = activeControl === control.id;
          
          return (
            <button
              key={control.id}
              className={`floating-control-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleControlClick(control.id)}
              title={control.title}
            >
              <IconComponent className="floating-control-icon" />
            </button>
          );
        })}
        
        {/* Music Control - always visible, not in controls array */}
        <MusicControl />
      </div>

      {/* Render active control's modal/sidebar */}
      {activeControlConfig && ActiveComponent && (
        <>
          <div 
            className="floating-control-sidebar"
            onClick={(e) => e.stopPropagation()}
          >
            <ActiveComponent onClose={handleCloseControl} />
          </div>
          {/* Invisible overlay - không che phủ events, chỉ để layout */}
          <div className="floating-control-overlay" />
        </>
      )}
    </>
  );
};

export default FloatingControlBar;

