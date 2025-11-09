import React, { useState } from 'react';
import CalendarIcon from '../assets/icons/calendar.svg';
import CalendarView from './CalendarView';

const FloatingControlBar = ({ currentUser }) => {
  const [activeControl, setActiveControl] = useState(null);

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

  // Get the active control config
  const activeControlConfig = controls.find(c => c.id === activeControl);
  const ActiveComponent = activeControlConfig?.component;

  return (
    <>
      <div className="floating-control-bar">
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
      </div>

      {/* Render active control's modal/sidebar */}
      {activeControlConfig && ActiveComponent && (
        <div className="floating-control-overlay" onClick={handleCloseControl}>
          <div 
            className="floating-control-sidebar"
            onClick={(e) => e.stopPropagation()}
          >
            <ActiveComponent onClose={handleCloseControl} />
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingControlBar;

