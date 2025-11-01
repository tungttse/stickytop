import TaskItem from '@tiptap/extension-task-item'
import { ReactNodeViewRenderer } from '@tiptap/react'
import TaskItemNode from '../components/TaskItemNode'

export const CustomTaskItem = TaskItem.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TaskItemNode)
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

