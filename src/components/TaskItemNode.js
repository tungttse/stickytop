import React, { useState, useRef } from 'react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import CountdownDialog from './countdown/CountdownDialog'
import { useCountdown } from '../contexts/CountdownContext'
import StopwatchIcon from '../assets/icons/stopwatch.svg'

export default function TaskItemNode({ node, updateAttributes, editor, getPos }) {
  const [showDialog, setShowDialog] = useState(false)
  const focusTimeoutRef = useRef(null)
  const { activeCountdown, startCountdown, cancelCountdown } = useCountdown()

  // Helper function to extract text from ProseMirror node
  // Only get text from paragraph, excluding nested taskList
  const getNodeText = (node) => {
    if (!node.content) return '';
    
    let text = '';
    // Iterate through content to only get text from paragraph
    for (let i = 0; i < node.content.childCount; i++) {
      const child = node.content.child(i);
      // Only get text from paragraph, skip taskList
      if (child.type.name === 'paragraph') {
        child.descendants((n) => {
          if (n.isText) {
            text += n.text;
          }
          return true;
        });
        // Add space between paragraphs
        if (i < node.content.childCount - 1 && node.content.child(i + 1).type.name === 'paragraph') {
          text += ' ';
        }
      }
    }
    return text.trim();
  }

  // Format calendar event time for display
  const formatCalendarEventTime = (date, time) => {
    if (!date || !time) return '';
    
    try {
      // Parse date (YYYY-MM-DD) and time (HH:mm)
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      
      const eventDate = new Date(year, month - 1, day, hours, minutes);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDay = new Date(year, month - 1, day);
      
      // Calculate days difference
      const daysDiff = Math.floor((eventDay - today) / (1000 * 60 * 60 * 24));
      
      // Format time
      const timeStr = eventDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      if (daysDiff === 0) {
        return `Today ${timeStr}`;
      } else if (daysDiff === 1) {
        return `Tomorrow ${timeStr}`;
      } else if (daysDiff === -1) {
        return `Yesterday ${timeStr}`;
      } else if (daysDiff > 0 && daysDiff <= 7) {
        return `${daysDiff}d ${timeStr}`;
      } else {
        // Show date and time
        return `${day}/${month} ${timeStr}`;
      }
    } catch (err) {
      return `${date} ${time}`;
    }
  }

  // Check if this todo is the one with active countdown
  const taskText = getNodeText(node)
  const isActiveCountdownTodo = activeCountdown &&
    activeCountdown.taskDescription === taskText &&
    activeCountdown.isActive &&
    !activeCountdown.isCompleted &&
    !node.attrs.checked

  // Only display icon when todo has at least 1 character
  const shouldShowTimerIcon = !node.attrs.checked && !isActiveCountdownTodo && taskText.length > 0

  // Check if this task item has nested taskList - if yes then hide controls
  // BUT if all child items are checked then still display controls
  // node.content is Fragment, not array, so need to use forEach or check directly
  const hasNestedTaskList = (() => {
    if (!node.content || node.content.childCount === 0) return false;
    
    // Iterate through child nodes to find taskList
    for (let i = 0; i < node.content.childCount; i++) {
      const child = node.content.child(i);
      if (child.type.name === 'taskList') {
        // If taskList found, check if all child items are checked
        if (!child.content || child.content.childCount === 0) {
          // Empty nested taskList, don't hide controls
          return false;
        }
        
        // Check if all child taskItems are checked
        let allChecked = true;
        for (let j = 0; j < child.content.childCount; j++) {
          const taskItem = child.content.child(j);
          if (taskItem.type.name === 'taskItem' && !taskItem.attrs.checked) {
            allChecked = false;
            break;
          }
        }
        
        // If all are checked, don't hide controls (return false)
        // If there are unchecked items, hide controls (return true)
        return !allChecked;
      }
    }
    return false;
  })()

  // Format time function (same as CountdownTimerNode)
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
  }

  // Get countdown time from activeCountdown if this todo is active
  const countdownSeconds = isActiveCountdownTodo ? (activeCountdown.seconds || activeCountdown.initialSeconds || 0) : null

  const handleTimerClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setShowDialog(true)
  }

  const handleCancelCountdown = (e) => {
    e.stopPropagation()
    e.preventDefault()
    cancelCountdown()
  }

  const handleSelectDuration = (seconds) => {
    if (!editor) return

    setShowDialog(false)

    const taskText = getNodeText(node)
    const pos = getPos()

    // Start new countdown via context (automatically cancels any existing one)
    startCountdown({
      initialSeconds: seconds,
      taskDescription: taskText,
      todoPosition: pos,
      onComplete: () => {
        // Auto-check task item when countdown completes
        if (editor && pos !== undefined) {
          try {
            const { state } = editor
            const taskItemNode = state.doc.nodeAt(pos)
            if (taskItemNode?.type.name === 'taskItem' && !taskItemNode.attrs.checked) {
              const tr = state.tr
              tr.setNodeMarkup(pos, null, {
                ...taskItemNode.attrs,
                checked: true,
              })
              editor.view.dispatch(tr)
            }
          } catch (error) {
            console.warn('Error auto-checking task item:', error)
          }
        }
      },
    })

    // Focus editor again
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current)
    }
    focusTimeoutRef.current = setTimeout(() => {
      editor?.commands.focus()
      focusTimeoutRef.current = null
    }, 0)
  }

  return (
    <NodeViewWrapper
      className={`task-item-with-timer ${isActiveCountdownTodo ? 'countdown-running' : ''}`}
      data-type="taskItem"
      data-checked={node.attrs.checked}
    >
      <label>
        <input
          type="checkbox"
          checked={node.attrs.checked}
          onChange={(e) => {
            updateAttributes({ checked: e.target.checked })
          }}
        />
      </label>
      <div className="task-item-content">
        
          <NodeViewContent className="content" />
          {/* Only display controls if there is NO nested taskList */}
          {!hasNestedTaskList && (
             <span className="countdown-inline-badge">
             {shouldShowTimerIcon && (
               <button
                 className="timer-icon-button"
                 onClick={handleTimerClick}
                 onMouseDown={(e) => e.stopPropagation()}
                 title="Set countdown timer"
                 type="button"
               >
                 <StopwatchIcon className="timer-icon" />
               </button>
             )}
             {isActiveCountdownTodo && countdownSeconds !== null && (
               <span className="countdown-running-status">
                 <StopwatchIcon className="timer-icon" /> Running
                 <button
                   className="countdown-cancel-icon"
                   onClick={handleCancelCountdown}
                   onMouseDown={(e) => e.stopPropagation()}
                   title="Cancel countdown"
                   type="button"
                 >
                   ✕
                 </button>
               </span>
             )}
             {node.attrs.calendarEvent && node.attrs.calendarEvent.date && node.attrs.calendarEvent.time && (
               <span className="calendar-event-badge" title="Scheduled in calendar">
                 📅 {formatCalendarEventTime(node.attrs.calendarEvent.date, node.attrs.calendarEvent.time)}
               </span>
             )}
           </span>
          )}
       
      </div>

      {showDialog && (
        <CountdownDialog
          onSelectDuration={handleSelectDuration}
          onClose={() => setShowDialog(false)}
        />
      )}
    </NodeViewWrapper>
  )
}

