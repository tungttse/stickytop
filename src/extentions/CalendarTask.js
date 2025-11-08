// import { Node, mergeAttributes } from '@tiptap/core'
// import { ReactNodeViewRenderer } from '@tiptap/react'
// import CalendarTaskComponent from '../components/CalendarTaskComponent'

// export const CalendarTask = Node.create({
//   name: 'calendarTask',
//   group: 'block',
//   atom: true,
//   addAttributes() {
//     return {
//       text: { default: '' },
//       synced: { default: false },
//     }
//   },
//   parseHTML() {
//     return [{ tag: 'div[data-type="calendar-task"]' }]
//   },
//   renderHTML({ HTMLAttributes }) {
//     return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'calendar-task' })]
//   },
//   addNodeView() {
//     return ReactNodeViewRenderer(CalendarTaskComponent)
//   },
// })
