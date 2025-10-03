import React from 'react';

const StatusBar = ({ wordCount, charCount, todoCount, status }) => {
  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-item">
          <strong>Words:</strong> {wordCount}
        </span>
        <span className="status-item">
          <strong>Characters:</strong> {charCount}
        </span>
        <span className="status-item">
          <strong>Todos:</strong> {todoCount}
        </span>
      </div>
      <div className="status-right">
        {status && (
          <span className="status-message">{status}</span>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
