import { contextBridge } from 'electron'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'

contextBridge.exposeInMainWorld('Tiptap', {
  Editor,
  StarterKit,
  TaskList,
  TaskItem
})