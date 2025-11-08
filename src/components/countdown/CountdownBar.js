import React from 'react';
import { useCountdown } from '../../contexts/CountdownContext';
import { useEditorContext } from '../../contexts/EditorContext';

const CountdownBar = () => {
  const { activeCountdown } = useCountdown();
  const { scrollToTodo } = useEditorContext();

  // Get current state from activeCountdown (source of truth là CountdownTimerNode)
  const seconds = activeCountdown?.seconds || activeCountdown?.initialSeconds || 0;

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const handleCancel = () => {
    if (activeCountdown?.onCancel) {
      activeCountdown.onCancel();
    }
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (activeCountdown?.todoPosition !== null && activeCountdown?.todoPosition !== undefined && scrollToTodo) {
      scrollToTodo(activeCountdown.todoPosition);
    }
  };

  if (!activeCountdown) {
    return null;
  }

  return (
    <div className="countdown-bar">
      <div className="countdown-bar-content">
        <div 
          className="countdown-bar-info"
          onDoubleClick={handleDoubleClick}
          style={{ cursor: 'pointer' }}
        >
          <span className="countdown-bar-icon">⏱️</span>
          <div className="countdown-bar-text">
            <div className="countdown-bar-task">
              {activeCountdown.taskDescription}
            </div>
            <div className="countdown-bar-time">{formatTime(seconds)}</div>
          </div>
        </div>
        
        <div className="countdown-bar-controls">
          <button 
            className="countdown-bar-btn cancel" 
            onClick={handleCancel}
            title="Cancel"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default CountdownBar;

