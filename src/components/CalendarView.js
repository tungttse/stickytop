import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useEditorContext } from '../contexts/EditorContext';

const CalendarView = ({ onClose }) => {
  const { currentTheme } = useTheme();
  const { editor } = useEditorContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOverTimeSlot, setDragOverTimeSlot] = useState(null); // { hour, minutes }
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const timeSlotsContainerRef = useRef(null);

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

  // Auto-scroll to current time when viewing today (only when date changes or after loading)
  useEffect(() => {
    let scrollTimeout = null;
    
    if (isToday(selectedDate) && timeSlotsContainerRef.current && !loading) {
      // Calculate current time position directly using current time
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTimePos = (hours * 60) + (minutes / 60 * 60);
      
      // Account for all-day section height if present
      const allDaySection = timeSlotsContainerRef.current?.querySelector('.calendar-all-day-section');
      const allDayHeight = allDaySection ? allDaySection.offsetHeight : 0;
      
      // Scroll to current time position, with some offset to center it better
      const scrollPosition = currentTimePos + allDayHeight - 100; // Offset 100px from top for better visibility
      
      // Use setTimeout to ensure DOM is ready
      scrollTimeout = setTimeout(() => {
        if (timeSlotsContainerRef.current) {
          timeSlotsContainerRef.current.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: 'smooth'
          });
        }
      }, 100);
    }
    
    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [selectedDate, loading]); // Only scroll when date changes or loading completes, not every minute

  // Update current time every minute
  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(new Date());
    };

    // Update immediately
    updateCurrentTime();

    // Update every minute
    const interval = setInterval(updateCurrentTime, 60000);

    return () => clearInterval(interval);
  }, []);

  // Calculate current time line position
  const getCurrentTimePosition = useCallback(() => {
    if (!isToday(selectedDate)) {
      return null; // Only show for today
    }

    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    
    // Calculate position: hour * 60px + (minutes / 60) * 60px
    const position = (hours * 60) + (minutes / 60 * 60);
    
    return position;
  }, [selectedDate, currentTime]);

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

  // Calculate time from Y position in time slots container
  const calculateTimeFromPosition = useCallback((clientY) => {
    if (!timeSlotsContainerRef.current) return null;
    
    const container = timeSlotsContainerRef.current;
    const rect = container.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    
    // Account for all-day section if present
    const allDaySection = container.querySelector('.calendar-all-day-section');
    const allDayHeight = allDaySection ? allDaySection.offsetHeight : 0;
    const adjustedY = relativeY - allDayHeight;
    
    if (adjustedY < 0) return null;
    
    // Each hour slot is 60px, calculate which hour and minute
    const hours = adjustedY / 60; // Convert pixels to hours (decimal)
    const hour = Math.floor(hours);
    const minutesDecimal = (hours - hour) * 60; // Get minutes from decimal part
    const minutes = Math.floor(minutesDecimal);
    
    // Clamp to valid range
    if (hour < 0 || hour >= 24) return null;
    
    // Round to nearest 15 minutes
    const roundedMinutes = Math.floor(minutes / 15) * 15;
    
    return { hour, minutes: roundedMinutes };
  }, []);

  // Handle drag over time slots
  const handleTimeSlotsDragOver = useCallback((e) => {
    // Check if dragging a todo item
    const hasTodoData = e.dataTransfer.types.includes('application/x-todo-text') || 
                        e.dataTransfer.types.includes('application/x-todo-index');
    
    if (hasTodoData) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      
      const time = calculateTimeFromPosition(e.clientY);
      if (time) {
        setDragOverTimeSlot(time);
      }
    }
  }, [calculateTimeFromPosition]);

  // Handle drag leave
  const handleTimeSlotsDragLeave = useCallback((e) => {
    // Only clear if we're actually leaving the container
    const relatedTarget = e.relatedTarget;
    if (!relatedTarget || !timeSlotsContainerRef.current?.contains(relatedTarget)) {
      setDragOverTimeSlot(null);
    }
  }, []);

  // Handle drop on time slots
  const handleTimeSlotsDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragOverTimeSlot(null);
    
    // Get todo text from dataTransfer
    const todoText = e.dataTransfer.getData('application/x-todo-text');
    
    if (!todoText || !todoText.trim()) {
      console.log('Drop: No todo text found');
      return;
    }

    // Calculate time from drop position
    const time = calculateTimeFromPosition(e.clientY);
    if (!time) {
      console.log('Drop: Could not calculate time from position');
      return;
    }

    // Check if user is logged in
    if (!window.electronAPI || !window.electronAPI.syncCalendarEvent) {
      setError('Calendar API not available. Please login with Google first.');
      return;
    }

    // Format date and time
    const dateString = formatDateString(selectedDate);
    const timeString = `${String(time.hour).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`;

    setIsCreatingEvent(true);
    setError(null);

    try {
      const result = await window.electronAPI.syncCalendarEvent({
        text: todoText.trim(),
        date: dateString,
        time: timeString,
      });

      if (result.success) {
        // Update todo item with calendar event info
        if (editor && result.eventId) {
          const { state } = editor;
          const { doc } = state;
          
          // Find todo item with matching text
          doc.descendants((node, pos) => {
            if (node.type.name === 'taskItem' && !node.attrs.checked) {
              // Get text content of the todo item
              let nodeText = '';
              node.descendants((n) => {
                if (n.isText) {
                  nodeText += n.text;
                }
                return true;
              });
              
              if (nodeText.trim() === todoText.trim()) {
                // Update the todo item with calendar event info
                const tr = state.tr;
                tr.setNodeMarkup(pos, null, {
                  ...node.attrs,
                  calendarEvent: {
                    eventId: result.eventId,
                    date: result.eventDate,
                    time: result.eventTime,
                  }
                });
                editor.view.dispatch(tr);
                return false; // Stop searching
              }
            }
            return true;
          });
        }
        
        // Refresh events after creating
        await fetchEvents(selectedDate);
      } else {
        setError(result.error || 'Failed to create calendar event');
      }
    } catch (err) {
      setError(err.message || 'Error creating calendar event');
    } finally {
      setIsCreatingEvent(false);
    }
  }, [selectedDate, calculateTimeFromPosition, fetchEvents]);

  // Handle delete event
  const handleDeleteEvent = useCallback(async (eventId, eventSummary) => {
    // Confirm before deleting
    const confirmed = window.confirm(`Are you sure you want to delete "${eventSummary}"?`);
    
    if (!confirmed) {
      return;
    }

    if (!window.electronAPI || !window.electronAPI.deleteCalendarEvent) {
      setError('Calendar API not available. Please login with Google first.');
      return;
    }

    setError(null);

    try {
      const result = await window.electronAPI.deleteCalendarEvent(eventId);

      if (result.success) {
        // Refresh events after deleting
        await fetchEvents(selectedDate);
      } else {
        setError(result.error || 'Failed to delete calendar event');
      }
    } catch (err) {
      setError(err.message || 'Error deleting calendar event');
    }
  }, [selectedDate, fetchEvents]);

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
          <div 
            className="calendar-time-slots"
            ref={timeSlotsContainerRef}
            onDragOver={handleTimeSlotsDragOver}
            onDragLeave={handleTimeSlotsDragLeave}
            onDrop={handleTimeSlotsDrop}
          >
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
                      <button
                        className="calendar-event-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id, event.summary);
                        }}
                        title="Delete event"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Time slots */}
            {timeSlots.map((time, index) => {
              const hour = index;
              const isDragOver = dragOverTimeSlot && dragOverTimeSlot.hour === hour;
              
              return (
                <div 
                  key={index} 
                  className={`calendar-time-slot ${isDragOver ? 'drag-over' : ''}`}
                >
                  <div className="calendar-time-label">{time}</div>
                  <div className="calendar-time-line"></div>
                </div>
              );
            })}
            
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
                  <button
                    className="calendar-event-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(event.id, event.summary);
                    }}
                    title="Delete event"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {/* Current time indicator - only show for today */}
              {isToday(selectedDate) && (() => {
                const currentTimePos = getCurrentTimePosition();
                if (currentTimePos === null) return null;
                
                return (
                  <div 
                    className="calendar-current-time-line"
                    style={{
                      top: `${currentTimePos}px`,
                    }}
                  >
                    <div className="calendar-current-time-dot" />
                  </div>
                );
              })()}
              
              {/* Drop indicator - positioned absolutely based on drag position */}
              {dragOverTimeSlot && (() => {
                // Calculate top position: hour * 60px + minutes in pixels
                // Note: all-day section is handled separately in the container
                const topPosition = (dragOverTimeSlot.hour * 60) + (dragOverTimeSlot.minutes / 60 * 60);
                return (
                  <div 
                    className="calendar-drop-indicator"
                    style={{
                      top: `${topPosition}px`,
                    }}
                    data-time={`${String(dragOverTimeSlot.hour).padStart(2, '0')}:${String(dragOverTimeSlot.minutes).padStart(2, '0')}`}
                  />
                );
              })()}
            </div>
            
            {/* Creating event overlay */}
            {isCreatingEvent && (
              <div className="calendar-creating-overlay">
                <div className="calendar-creating-message">Creating event...</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;

