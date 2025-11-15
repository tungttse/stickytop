import React, { useState, useRef, useEffect } from 'react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import CountdownDialog from './countdown/CountdownDialog'
import { useCountdown } from '../contexts/CountdownContext'
import StopwatchIcon from '../assets/icons/stopwatch.svg'

// Module-level variable để lưu source index - shared giữa tất cả TaskItemNode instances
// Đảm bảo source index luôn có, không phụ thuộc vào dataTransfer có thể bị override
let draggedSourceIndex = null

export default function TaskItemNode({ node, updateAttributes, editor, getPos, deleteNode }) {
  const [showDialog, setShowDialog] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOverPosition, setDragOverPosition] = useState(null) // 'before' | 'after' | null
  const [enableDrag, setEnableDrag] = useState(true) // Default to true, will be updated from config
  const hasCountdown = node.attrs.countdownSeconds !== null
  const dragHandleRef = useRef(null)
  const focusTimeoutRef = useRef(null)
  const dragImageTimeoutRef = useRef(null)
  const { activeCountdown } = useCountdown()

  // Helper function để extract text từ ProseMirror node
  // Chỉ lấy text từ paragraph, không bao gồm nested taskList
  const getNodeText = (node) => {
    if (!node.content) return '';
    
    let text = '';
    // Duyệt qua content để chỉ lấy text từ paragraph
    for (let i = 0; i < node.content.childCount; i++) {
      const child = node.content.child(i);
      // Chỉ lấy text từ paragraph, bỏ qua taskList
      if (child.type.name === 'paragraph') {
        child.descendants((n) => {
          if (n.isText) {
            text += n.text;
          }
          return true;
        });
        // Thêm space giữa các paragraph
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

  // Check xem todo này có phải là todo đang có countdown active không
  // Ẩn icon nếu todo này có countdown và đang active
  const taskText = getNodeText(node)
  const isActiveCountdownTodo = activeCountdown &&
    activeCountdown.taskDescription === taskText &&
    hasCountdown

  console.log('isActiveCountdownTodo', isActiveCountdownTodo)
  // Chỉ hiển thị icon khi todo có ít nhất 1 ký tự
  const shouldShowTimerIcon = !node.attrs.checked && !isActiveCountdownTodo && taskText.length > 0

  // Check if this task item has nested taskList - nếu có thì ẩn controls
  // NHƯNG nếu tất cả child items đã checked thì vẫn hiển thị controls
  // node.content là Fragment, không phải array, nên cần dùng forEach hoặc check trực tiếp
  const hasNestedTaskList = (() => {
    if (!node.content || node.content.childCount === 0) return false;
    
    // Duyệt qua các child nodes để tìm taskList
    for (let i = 0; i < node.content.childCount; i++) {
      const child = node.content.child(i);
      if (child.type.name === 'taskList') {
        // Nếu tìm thấy taskList, check xem tất cả child items đã checked chưa
        if (!child.content || child.content.childCount === 0) {
          // Nested taskList rỗng, không ẩn controls
          return false;
        }
        
        // Check xem tất cả child taskItems có checked không
        let allChecked = true;
        for (let j = 0; j < child.content.childCount; j++) {
          const taskItem = child.content.child(j);
          if (taskItem.type.name === 'taskItem' && !taskItem.attrs.checked) {
            allChecked = false;
            break;
          }
        }
        
        // Nếu tất cả đã checked, không ẩn controls (return false)
        // Nếu còn item chưa checked, ẩn controls (return true)
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

  // Load drag config on mount
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getAppConfig) {
      window.electronAPI.getAppConfig().then((result) => {
        if (result.success && result.config) {
          setEnableDrag(result.config.enableDrag || false)
        }
      }).catch((error) => {
        console.error('Error loading app config:', error)
      })
    }

    // Cleanup function to clear timeouts
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
      if (dragImageTimeoutRef.current) {
        clearTimeout(dragImageTimeoutRef.current);
        dragImageTimeoutRef.current = null;
      }
    };
  }, [])

  const handleTimerClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setShowDialog(true)
  }

  const { clearActiveCountdown } = useCountdown()

  const handleSelectDuration = (seconds) => {
    if (!editor) return

    setShowDialog(false)

    // Step 1: Clear active countdown trong context TRƯỚC KHI xóa nodes
    // Điều này đảm bảo top bar ẩn ngay lập tức
    clearActiveCountdown()

    const { state } = editor
    const countdownNodes = []
    const todoNodesToUpdate = []

    // Step 2: Tìm tất cả countdown timer nodes và todos có countdown
    state.doc.descendants((node, nodePos) => {
      if (node.type.name === 'countdownTimer') {
        countdownNodes.push({ node, pos: nodePos })
      }
      if (node.type.name === 'taskItem' && node.attrs.countdownSeconds !== null) {
        todoNodesToUpdate.push({ node, pos: nodePos })
      }
    })

    // Step 3: Tính toán insert position TRƯỚC KHI tạo transaction
    const pos = getPos()
    const currentTodoSize = node.nodeSize

    // Step 4: Tạo MỘT transaction duy nhất cho tất cả thay đổi
    const tr = state.tr

    // 4a: Update countdownSeconds của todo hiện tại
    if (pos !== undefined) {
      tr.setNodeMarkup(pos, null, {
        ...node.attrs,
        countdownSeconds: seconds,
      })
    }

    // 4b: Clear countdownSeconds của todos cũ (trừ todo hiện tại)
    todoNodesToUpdate.forEach(({ node: todoNode, pos: todoPos }) => {
      if (todoPos !== pos) {
        tr.setNodeMarkup(todoPos, null, {
          ...todoNode.attrs,
          countdownSeconds: null,
        })
      }
    })

    // 4c: Xóa tất cả countdown timer nodes (sort descending để xóa từ cuối lên đầu)
    // ProseMirror sẽ tự động adjust positions khi delete, nên delete từ cuối lên đầu
    if (countdownNodes.length > 0) {
      countdownNodes.sort((a, b) => b.pos - a.pos)
      countdownNodes.forEach(({ node: delNode, pos: delPos }) => {
        tr.delete(delPos, delPos + delNode.nodeSize)
      })
    }

    // 4d: Insert countdown timer node mới
    // Tính toán insert position sau khi đã delete (positions đã được adjust trong tr)
    if (pos !== undefined) {
      // Extract text từ todo node - chỉ lấy text từ paragraph, không bao gồm nested taskList
      const taskText = getNodeText(node)

      // Tính toán insertPos ban đầu (trước khi delete)
      let insertPos = pos + currentTodoSize

      // Adjust cho các nodes sẽ bị xóa trước insertPos
      countdownNodes.forEach(({ node: delNode, pos: delPos }) => {
        if (delPos < insertPos) {
          insertPos -= delNode.nodeSize
        }
      })

      // Sau khi đã delete trong transaction, resolve position mới từ tr.doc
      // và insert node mới
      try {
        const $insertPos = tr.doc.resolve(insertPos)
        if ($insertPos.parent && $insertPos.parent.type.name === 'taskList') {
          const countdownTimerNode = editor.schema.nodes.countdownTimer.create({
            initialSeconds: seconds,
            taskDescription: taskText,
            todoPosition: pos,
          })
          tr.insert(insertPos, countdownTimerNode)
        }
      } catch (error) {
        console.warn('Error inserting countdown timer:', error)
      }
    }

    // Step 5: Dispatch TẤT CẢ thay đổi trong MỘT transaction duy nhất
    editor.view.dispatch(tr)

    // Step 6: Focus lại editor
    // Clear previous timeout if exists
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      if (editor) {
        editor.commands.focus();
      }
      focusTimeoutRef.current = null;
    }, 0);
  }

  const handleWrapperDragOver = (e) => {
    // Only allow drop if something is being dragged from our drag handle
    const hasModuleIndex = draggedSourceIndex !== null

    if (hasModuleIndex) {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'

      // Calculate drop position để hiển thị indicator
      if (!editor || !getPos) return

      const { view } = editor
      const coords = { left: e.clientX, top: e.clientY }
      const posAtCoords = view.posAtCoords(coords)

      if (posAtCoords?.pos) {
        const dropPos = posAtCoords.pos
        const pos = getPos()

        if (pos !== undefined) {
          const todoStart = pos
          const todoEnd = pos + node.nodeSize

          // Determine if drop sẽ xảy ra before hay after todo này
          if (dropPos < todoStart) {
            setDragOverPosition('before')
          } else if (dropPos > todoEnd) {
            setDragOverPosition('after')
          } else {
            const relativePos = dropPos - todoStart
            const midPoint = node.nodeSize / 2
            setDragOverPosition(relativePos < midPoint ? 'before' : 'after')
          }
        }
      }
    } else {
      setDragOverPosition(null)
    }
  }

  const handleWrapperDragLeave = (e) => {
    // Clear indicator khi rời khỏi todo item
    // Chỉ clear nếu không có todo item nào khác ở trong
    const relatedTarget = e.relatedTarget
    if (!relatedTarget || !relatedTarget.closest || !relatedTarget.closest('.task-item-with-timer')) {
      setDragOverPosition(null)
    }
  }

  const handleWrapperDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverPosition(null) // Clear indicator

    if (!editor) {
      console.log('Drop: No editor')
      return
    }

    // ƯU TIÊN: Đọc từ module-level variable (đáng tin cậy nhất)
    let sourceIndex = draggedSourceIndex

    // FALLBACK: Nếu module variable null, thử đọc từ dataTransfer
    if (sourceIndex === null) {
      let sourceIndexStr = e.dataTransfer.getData('application/x-todo-index')

      // Nếu custom type không có, thử parse từ text/plain với prefix
      if (!sourceIndexStr || sourceIndexStr === '') {
        const textPlain = e.dataTransfer.getData('text/plain')
        if (textPlain && textPlain.startsWith('TODO_INDEX_')) {
          sourceIndexStr = textPlain.replace('TODO_INDEX_', '')
        }
      }

      if (sourceIndexStr && sourceIndexStr !== '' && !isNaN(parseInt(sourceIndexStr, 10))) {
        sourceIndex = parseInt(sourceIndexStr, 10)
      }
    }

    // Log all available data types for debugging
    console.log('Drop: Available data types', Array.from(e.dataTransfer.types))
    console.log('Drop: Source index from module', draggedSourceIndex)
    console.log('Drop: Final source index', sourceIndex)

    // Validate source index
    if (sourceIndex === null || sourceIndex === undefined) {
      console.log('Drop: No source index data', {
        moduleVar: draggedSourceIndex,
        customType: e.dataTransfer.getData('application/x-todo-index'),
        textPlain: e.dataTransfer.getData('text/plain'),
        types: Array.from(e.dataTransfer.types)
      })
      return
    }

    const { view, state } = editor

    // ✅ Detect drop position từ mouse coordinates thay vì getPos()
    const coords = {
      left: e.clientX,
      top: e.clientY
    }

    const posAtCoords = view.posAtCoords(coords)

    if (!posAtCoords || posAtCoords.pos === null || posAtCoords.pos === undefined) {
      console.log('Drop: Could not determine drop position from coordinates', { coords })
      return
    }

    const dropPos = posAtCoords.pos
    console.log('Drop: Position from coordinates', dropPos)

    // Get all todos and their positions
    const todos = []
    state.doc.descendants((node, nodePos) => {
      if (node.type.name === 'taskItem') {
        todos.push({ node, pos: nodePos })
      }
    })

    console.log('Drop: All todos', todos.map((t, i) => ({ index: i, pos: t.pos, size: t.node.nodeSize })))
    console.log('Drop: Drop position', dropPos)

    // Find the drop index by determining where in the list we're dropping
    let dropIndex = -1

    // Strategy: Find which todo this position belongs to, or which gap it's in
    for (let i = 0; i < todos.length; i++) {
      const todo = todos[i]
      const todoStart = todo.pos
      const todoEnd = todo.pos + todo.node.nodeSize

      // Case 1: Drop position is within this todo
      if (dropPos >= todoStart && dropPos <= todoEnd) {
        // Determine if we want to insert before or after this todo
        // Check the relative position within the todo
        const relativePos = dropPos - todoStart
        const midPoint = todo.node.nodeSize / 2
        dropIndex = relativePos < midPoint ? i : i + 1
        console.log('Drop: Within todo', i, { relativePos, midPoint, dropIndex, todoStart, todoEnd })
        break
      }

      // Case 2: Drop position is before first todo
      if (i === 0 && dropPos < todoStart) {
        dropIndex = 0
        console.log('Drop: Before first todo')
        break
      }

      // Case 3: Drop position is between this todo and next one
      if (i < todos.length - 1) {
        const nextTodo = todos[i + 1]
        if (dropPos > todoEnd && dropPos < nextTodo.pos) {
          dropIndex = i + 1
          console.log('Drop: Between todo', i, 'and', i + 1)
          break
        }
      }
    }

    // Case 4: If not found, drop at the end
    if (dropIndex === -1) {
      dropIndex = todos.length
      console.log('Drop: At the end')
    }

    console.log('Drop: Calculated drop index', dropIndex)

    // Adjust drop index if source is before it (to account for deletion)
    const adjustedDropIndex = sourceIndex < dropIndex ? dropIndex - 1 : dropIndex

    // Don't do anything if dropped on itself
    if (adjustedDropIndex === sourceIndex) {
      console.log('Drop: Dropped on itself')
      return
    }

    if (sourceIndex < 0 || sourceIndex >= todos.length || adjustedDropIndex < 0 || adjustedDropIndex > todos.length) {
      console.log('Drop: Invalid indices', { sourceIndex, adjustedDropIndex, todosLength: todos.length })
      return
    }

    console.log('Drop: Moving from index', sourceIndex, 'to', adjustedDropIndex)

    // Get source node
    const sourceTodo = todos[sourceIndex]
    if (!sourceTodo) {
      console.log('Drop: Could not find source todo')
      return
    }

    const sourceNode = sourceTodo.node
    const sourceNodePos = sourceTodo.pos

    // Calculate insert position based on adjustedDropIndex
    // adjustedDropIndex là index mục tiêu sau khi đã điều chỉnh cho deletion
    let insertPos

    if (adjustedDropIndex >= todos.length) {
      // Insert at the end - find the last todo's end position
      const lastTodo = todos[todos.length - 1]
      insertPos = lastTodo.pos + lastTodo.node.nodeSize
      console.log('Drop: Insert at end, pos', insertPos)
    } else if (adjustedDropIndex === 0) {
      // Insert at the beginning - find first todo's position
      const firstTodo = todos[0]
      insertPos = firstTodo.pos
      console.log('Drop: Insert at beginning, pos', insertPos)
    } else {
      // Insert before the todo at adjustedDropIndex
      // adjustedDropIndex là index mục tiêu trong danh sách sau khi đã xóa source
      // Vậy trong danh sách hiện tại (trước khi xóa), todo tại adjustedDropIndex sẽ là todos[adjustedDropIndex]

      if (adjustedDropIndex >= 0 && adjustedDropIndex < todos.length) {
        const targetTodo = todos[adjustedDropIndex]
        insertPos = targetTodo.pos
        console.log('Drop: Insert before todo at index', adjustedDropIndex, 'pos', insertPos)
      } else {
        console.error('Drop: Invalid adjustedDropIndex', adjustedDropIndex, 'todos length', todos.length)
        return
      }
    }

    // Create transaction
    const tr = state.tr

    // Step 1: Delete source node
    tr.delete(sourceNodePos, sourceNodePos + sourceNode.nodeSize)

    // Step 2: Adjust insert position after deletion
    if (sourceNodePos < insertPos) {
      insertPos -= sourceNode.nodeSize
    }

    // Step 3: Insert at the calculated position
    try {
      const $insertPos = tr.doc.resolve(insertPos)
      // Make sure we can insert here (should be in taskList)
      if ($insertPos.parent && $insertPos.parent.type.name === 'taskList') {
        tr.insert(insertPos, sourceNode)
        view.dispatch(tr)
        console.log('Drop: Transaction dispatched successfully')
      } else {
        console.error('Drop: Cannot insert - parent is not taskList', $insertPos.parent?.type.name)
      }
    } catch (error) {
      console.error('Drop: Error moving node', error, { insertPos, sourceNodePos, sourceIndex, adjustedDropIndex })
    }
  }

  return (
    <NodeViewWrapper
      className={`task-item-with-timer ${isDragging ? 'is-dragging' : ''} ${dragOverPosition ? 'drag-over' : ''} ${dragOverPosition === 'before' ? 'drop-before' : ''} ${dragOverPosition === 'after' ? 'drop-after' : ''}`}
      data-type="taskItem"
      data-checked={node.attrs.checked}
      onDragOver={handleWrapperDragOver}
      onDragLeave={handleWrapperDragLeave}
      onDrop={handleWrapperDrop}
    >
      {/* Drop indicator line - BEFORE */}
      {enableDrag && dragOverPosition === 'before' && draggedSourceIndex !== null && (
        <div className="drop-indicator drop-indicator-before" />
      )}    
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
          {/* Chỉ hiển thị controls nếu KHÔNG có nested taskList */}
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
               <>
                 <StopwatchIcon className="timer-icon" /> {formatTime(countdownSeconds)}
               </>
             )}
             {node.attrs.calendarEvent && node.attrs.calendarEvent.date && node.attrs.calendarEvent.time && (
               <span className="calendar-event-badge" title="Scheduled in calendar">
                 📅 {formatCalendarEventTime(node.attrs.calendarEvent.date, node.attrs.calendarEvent.time)}
               </span>
             )}
           </span>
          )}
       
      </div>
      {/* Drop indicator line - AFTER */}
      {enableDrag && dragOverPosition === 'after' && draggedSourceIndex !== null && (
        <div className="drop-indicator drop-indicator-after" />
      )}

      {showDialog && (
        <CountdownDialog
          onSelectDuration={handleSelectDuration}
          onClose={() => setShowDialog(false)}
        />
      )}
    </NodeViewWrapper>
  )
}

