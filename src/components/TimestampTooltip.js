import React from 'react';

const TimestampTooltip = ({ createdAt, updatedAt, position, visible }) => {
  if (!visible || !createdAt) return null;

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const isRecentlyUpdated = (created, updated) => {
    if (!updated) return false;
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (updated - created) > fiveMinutes;
  };

  const recentlyUpdated = isRecentlyUpdated(createdAt, updatedAt);

  return (
    <div
      className="timestamp-tooltip"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y - 10,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <div className="timestamp-tooltip-content">
        <div className="timestamp-item">
          <span className="timestamp-label">Created:</span>
          <span className="timestamp-value">{formatTimestamp(createdAt)}</span>
        </div>
        {updatedAt && recentlyUpdated && (
          <div className="timestamp-item">
            <span className="timestamp-label">Updated:</span>
            <span className="timestamp-value">{formatTimestamp(updatedAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimestampTooltip;
