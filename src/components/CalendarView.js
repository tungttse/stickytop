import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const CalendarView = ({ onClose }) => {
  const { currentTheme } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Format date to YYYY-MM-DD
  const formatDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch events for selected date
  const fetchEvents = useCallback(async (date) => {
    if (!window.electronAPI || !window.electronAPI.getCalendarEvents) {
      setError('Calendar API not available');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const dateString = formatDateString(date);
      const result = await window.electronAPI.getCalendarEvents(dateString);
      
      if (result.success) {
        setEvents(result.events || []);
      } else {
        setError(result.error || 'Failed to fetch events');
        setEvents([]);
      }
    } catch (err) {
      setError(err.message || 'Error fetching events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch events when selectedDate changes
  useEffect(() => {
    fetchEvents(selectedDate);
  }, [selectedDate, fetchEvents]);

  // Navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Format date for display
  const formatDateDisplay = (date) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Get time from datetime string
  const getTimeFromDateTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Calculate event position and height (only for timed events)
  const getEventStyle = (event) => {
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);
    
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    const duration = endMinutes - startMinutes;
    
    const top = (startMinutes / 60) * 60; // 60px per hour
    const height = (duration / 60) * 60; // 60px per hour
    
    return {
      position: 'absolute',
      top: `${top}px`,
      left: '60px',
      right: '8px',
      height: `${Math.max(height, 20)}px`,
    };
  };

  // Generate time slots (00:00 to 23:59)
  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
  }

  return (
    <div className="calendar-view">
      <div className="calendar-view-header">
        <div className="calendar-view-nav">
          <button 
            className="calendar-nav-btn" 
            onClick={goToPreviousDay}
            title="Previous day"
          >
            ‹
          </button>
          <button 
            className="calendar-date-btn"
            onClick={goToToday}
            title="Go to today"
          >
            {formatDateDisplay(selectedDate)}
            {isToday(selectedDate) && <span className="today-badge">Today</span>}
          </button>
          <button 
            className="calendar-nav-btn" 
            onClick={goToNextDay}
            title="Next day"
          >
            ›
          </button>
        </div>
        <button 
          className="calendar-close-btn" 
          onClick={onClose}
          title="Close"
        >
          ✕
        </button>
      </div>

      <div className="calendar-view-content">
        {loading && (
          <div className="calendar-loading">
            Loading events...
          </div>
        )}

        {error && (
          <div className="calendar-error">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="calendar-time-slots">
            {/* All-day events section */}
            {events.some(e => e.allDay) && (
              <div className="calendar-all-day-section">
                <div className="calendar-all-day-label">All Day</div>
                <div className="calendar-all-day-events">
                  {events.filter(e => e.allDay).map((event) => (
                    <div
                      key={event.id}
                      className="calendar-event all-day"
                      title={event.summary}
                    >
                      <div className="calendar-event-title">{event.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Time slots */}
            {timeSlots.map((time, index) => (
              <div key={index} className="calendar-time-slot">
                <div className="calendar-time-label">{time}</div>
                <div className="calendar-time-line"></div>
              </div>
            ))}
            
            {/* Render timed events */}
            <div className="calendar-events-container">
              {events.filter(e => !e.allDay).map((event) => (
                <div
                  key={event.id}
                  className="calendar-event"
                  style={getEventStyle(event)}
                  title={`${event.summary}\n${getTimeFromDateTime(event.start)} - ${getTimeFromDateTime(event.end)}`}
                >
                  <div className="calendar-event-title">{event.summary}</div>
                  <div className="calendar-event-time">
                    {getTimeFromDateTime(event.start)} - {getTimeFromDateTime(event.end)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;

