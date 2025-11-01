import React, { useState, useRef } from 'react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import CountdownDialog from './CountdownDialog'

// Module-level variable để lưu source index - shared giữa tất cả TaskItemNode instances
// Đảm bảo source index luôn có, không phụ thuộc vào dataTransfer có thể bị override
let draggedSourceIndex = null

export default function TaskItemNode({ node, updateAttributes, editor, getPos, deleteNode }) {
  const [showDialog, setShowDialog] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const hasCountdown = node.attrs.countdownSeconds !== null
  const dragHandleRef = useRef(null)

  const handleTimerClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setShowDialog(true)
  }

  const handleSelectDuration = (seconds) => {
    updateAttributes({ countdownSeconds: seconds })
    setShowDialog(false)
    
    // Insert countdown timer node right after this task item
    const pos = getPos()
    if (pos !== undefined && editor) {
      const taskText = node.content.textContent
      
      // Find the position right after this task item
      const nodeSize = node.nodeSize
      const insertPos = pos + nodeSize
      
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        editor.chain()
          .focus()
          .insertContentAt(insertPos, {
            type: 'countdownTimer',
            attrs: {
              initialSeconds: seconds,
              taskDescription: taskText,
            }
          })
          .run()
      }, 0)
    }
  }

  const handleWrapperDragOver = (e) => {
    // Only allow drop if something is being dragged from our drag handle
    // CHÚ Ý: KHÔNG được gọi getData() trong dragover event - chỉ có thể đọc trong drop event
    // Chỉ check types array hoặc module variable
    const hasCustomType = e.dataTransfer.types.includes('application/x-todo-index')
    const hasTextPlain = e.dataTransfer.types.includes('text/plain')
    const hasModuleIndex = draggedSourceIndex !== null
    
    if (hasCustomType || hasTextPlain || hasModuleIndex) {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
    }
  }

  const handleWrapperDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
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
      className={`task-item-with-timer ${isDragging ? 'is-dragging' : ''}`}
      data-type="taskItem" 
      data-checked={node.attrs.checked}
      onDragOver={handleWrapperDragOver}
      onDrop={handleWrapperDrop}
    >
      <div 
        ref={dragHandleRef}
        className="drag-handle"
        draggable={true}
        onMouseDown={(e) => {
          // Ngăn ProseMirror intercept mousedown event
          e.stopPropagation()
          // Cho phép drag bắt đầu
        }}
        onDragStart={(e) => {
          // Ngăn event bubble lên ProseMirror để tránh conflict
          e.stopPropagation()
          
          console.log('Drag start')
          if (!editor || !getPos) {
            e.preventDefault()
            return
          }
          
          setIsDragging(true)
          const pos = getPos()
          if (pos === undefined) {
            e.preventDefault()
            return
          }
          
          // Find index of this todo item in all todos
          const { state } = editor
          const todos = []
          state.doc.descendants((node, nodePos) => {
            if (node.type.name === 'taskItem') {
              todos.push({ node, pos: nodePos })
            }
          })
          
          // Find the index of current todo
          const currentIndex = todos.findIndex(t => t.pos === pos)
          
          if (currentIndex === -1) {
            console.error('Drag: Could not find todo index')
            e.preventDefault()
            return
          }
          
          console.log('Drag: Todo index', currentIndex, 'of', todos.length)
          
          // LƯU VÀO MODULE-LEVEL VARIABLE (primary method - đáng tin cậy nhất)
          draggedSourceIndex = currentIndex
          
          // Set drag image and data
          if (e.dataTransfer) {
            const dragImage = document.createElement('div')
            dragImage.textContent = node.content.textContent || 'Todo item'
            dragImage.style.position = 'absolute'
            dragImage.style.top = '-1000px'
            dragImage.style.padding = '4px 8px'
            dragImage.style.background = 'white'
            dragImage.style.border = '1px solid #ccc'
            dragImage.style.borderRadius = '4px'
            document.body.appendChild(dragImage)
            e.dataTransfer.setDragImage(dragImage, 0, 0)
            setTimeout(() => document.body.removeChild(dragImage), 0)
            e.dataTransfer.effectAllowed = 'move'
            
            // Store the index using custom data type to avoid conflict with text/plain
            e.dataTransfer.setData('application/x-todo-index', currentIndex.toString())
            // Also set with prefix in text/plain as fallback
            e.dataTransfer.setData('text/plain', `TODO_INDEX_${currentIndex}`)
            
            // VERIFY: Log để check data đã được set chưa (chỉ có thể đọc trong cùng event handler)
            console.log('Drag: Set data', {
              index: currentIndex,
              moduleVar: draggedSourceIndex,
              customType: e.dataTransfer.getData('application/x-todo-index'),
              textPlain: e.dataTransfer.getData('text/plain'),
              types: Array.from(e.dataTransfer.types)
            })
          }
        }}
        onDragEnd={(e) => {
          setIsDragging(false)
          // CLEAR module-level variable khi drag kết thúc
          draggedSourceIndex = null
        }}
        title="Drag to reorder"
      >
        <span className="drag-handle-icon">⋮⋮</span>
      </div>
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
        <button
          className={`timer-icon ${hasCountdown ? 'active' : ''}`}
          onClick={handleTimerClick}
          onMouseDown={(e) => e.stopPropagation()}
          title="Set countdown timer"
          type="button"
        >
          ⏱️
        </button>
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

