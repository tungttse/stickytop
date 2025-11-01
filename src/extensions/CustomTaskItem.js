import TaskItem from '@tiptap/extension-task-item'
import { ReactNodeViewRenderer } from '@tiptap/react'
import TaskItemNode from '../components/TaskItemNode'

export const CustomTaskItem = TaskItem.extend({
  draggable: true,
  
  addNodeView() {
    return ReactNodeViewRenderer(TaskItemNode, {
      stopEvent: ({ event }) => {
        const target = event.target
        
        // Nếu event đến từ drag-handle hoặc các phần tử con của nó, không stop
        if (target && (target.closest && target.closest('.drag-handle'))) {
          // Cho phép tất cả events trên drag-handle đi qua
          return false
        }
        
        // Cho phép tất cả drag events đi qua (không stop)
        if (event.type.startsWith('drag')) {
          return false
        }
        
        // Các events khác giữ nguyên behavior mặc định của ProseMirror
        return false
      },
    })
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      countdownSeconds: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute('data-countdown-seconds')
          return value ? parseInt(value) : null
        },
        renderHTML: attributes => {
          if (attributes.countdownSeconds !== null) {
            return { 'data-countdown-seconds': attributes.countdownSeconds.toString() }
          }
          return {}
        },
      },
    }
  },
})

