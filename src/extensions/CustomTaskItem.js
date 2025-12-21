import TaskItem from '@tiptap/extension-task-item'
import { ReactNodeViewRenderer } from '@tiptap/react'
import TaskItemNode from '../components/TaskItemNode'
import { sinkListItem, liftListItem, splitListItem } from '@tiptap/pm/schema-list'

export const CustomTaskItem = TaskItem.extend({
  draggable: false,
  
  // Override content to only allow 1 level nesting, but allow multiple paragraphs
  content: 'paragraph+ (taskList)?',
  
  addNodeView() {
    return ReactNodeViewRenderer(TaskItemNode, {
      stopEvent: ({ event }) => {
        // const target = event.target
        
        // // If event comes from drag-handle or its child elements, don't stop
        // if (target && (target.closest && target.closest('.drag-handle'))) {
        //   // Allow all events on drag-handle to pass through
        //   return false
        // }
        
        // // Allow all drag events to pass through (don't stop)
        // if (event.type.startsWith('drag')) {
        //   return false
        // }
        
        // Other events keep default ProseMirror behavior
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
      calendarEvent: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute('data-calendar-event')
          return value ? JSON.parse(value) : null
        },
        renderHTML: attributes => {
          if (attributes.calendarEvent !== null) {
            return { 'data-calendar-event': JSON.stringify(attributes.calendarEvent) }
          }
          return {}
        },
      },
    }
  },
  
})

