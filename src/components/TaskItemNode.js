import React, { useState } from 'react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import CountdownDialog from './CountdownDialog'

export default function TaskItemNode({ node, updateAttributes, editor, getPos, deleteNode }) {
  const [showDialog, setShowDialog] = useState(false)
  const hasCountdown = node.attrs.countdownSeconds !== null

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

  return (
    <NodeViewWrapper className="task-item-with-timer" data-type="taskItem" data-checked={node.attrs.checked}>
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

