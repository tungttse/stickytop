import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion' // ✅ default import
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { SlashCommands } from '../components/SlashCommands'

// Helper: parse duration like "5m", "2h", "30s"
const parseDuration = (str) => {
  const match = str.match(/(\d+)([smh])/)
  if (!match) return 60
  const value = parseInt(match[1])
  const unit = match[2]
  if (unit === 's') return value
  if (unit === 'm') return value * 60
  if (unit === 'h') return value * 3600
  return 60
}

// Helper: format seconds to MM:SS or HH:MM:SS
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
}

export const SlashCommandsExtension = Extension.create({
  name: 'slash-commands',


  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: true,
        startOfLine: false,
        // ✅ CHỖ NÀY chính là nơi bạn thêm matcher()
        matcher: (char, textBefore) => {
          const regex = new RegExp(`\\${char}([^\\n]*)$`)
          const match = textBefore.match(regex)
          console.log('[SlashCommandsExtension] matcher', match)
          if (!match) return null
          return {
            range: {
              from: textBefore.length - match[0].length + 1,
              to: textBefore.length,
            },
            query: match[1],
          }
        },
        items: ({ query }) => {
          if (!query) return []
          const q = query.trim().toLowerCase()
          // lấy từ đầu tiên trong query (vd: "remind" của "remind 3m")
          const [cmd] = q.split(/\s+/)
          console.log('[SlashCommandsExtension] cmd', cmd)
          const commands = [
            {
              key: 'cd',
              title: 'Countdown Timer',
              description: 'Start a countdown timer (e.g. /countdown 5m task description)',
              icon: '⏱',
              command: ({ editor, range }) => {
                console.log('[SlashCommandsExtension] Countdown', range)
                const text = editor.state.doc.textBetween(range.from, range.to)
                
                // Parse countdown command: /countdown 5m task description
                const match = text.match(/countdown\s+(\d+[smh]?)\s*(.*)/)
                const duration = match ? match[1] : '5m'
                const taskDescription = match ? match[2].trim() : ''
                const seconds = parseDuration(duration)
                console.log('[SlashCommandsExtension] Countdown', seconds, taskDescription)

                // Insert countdown timer using JSX component
                editor.chain().focus().deleteRange(range)
                  .insertCountdownTimer({
                    initialSeconds: seconds,
                    taskDescription: taskDescription,
                  })
                  .run()
              },
            },
            {
              key: 'remind',
              title: 'Remind',
              description: 'Send a reminder (e.g. /remind 10m Take a break)',
              icon: '🔔',
              command: ({ editor, range }) => {
                console.log('Triggered /remind', range)

                const { $from } = editor.state.selection
                const node = $from.parent
                const textBefore = node.textContent.slice(0, $from.parentOffset)

                // Lấy message + thời gian
                const match = textBefore.match(/(.*)\s+\/remind\s+(\d+)([smh]?)/i)
                if (!match) return

                const [, message, val, unit] = match
                const ms =
                  unit === 'h' ? val * 3600000 :
                    unit === 's' ? val * 1000 :
                      val * 60000

                // Xóa phần "/remind..." và chèn lại message
                editor.chain().focus().deleteRange(range)
                  .insertContent(`${message.trim()} 🔔 (${val}${unit || 'm'})`).run()

                // Tạo thông báo
                setTimeout(() => {
                  if (window.electronAPI?.showNotification) {
                    window.electronAPI.showNotification({
                      title: '⏰ Reminder',
                      body: message.trim(),
                    })
                  } else {
                    new Notification('⏰ Reminder', { body: message.trim() })
                  }
                }, ms)
              },
            },
            {
              key: 'use',
              title: 'Use Template',
              description: 'Insert a predefined template (e.g. /use meeting)',
              icon: '📄',
              command: ({ editor, range }) => {
                const text = editor.state.doc.textBetween(range.from, range.to)
                const match = text.match(/use\s+([a-zA-Z0-9_-]+)/)
                if (match) {
                  const name = match[1].toLowerCase()
                  const template = templatesData[name]
                  if (template) {
                    editor.chain().focus().deleteRange(range)
                      .insertContent(template.join('\n'))
                      .run()
                  } else {
                    editor.chain().focus().deleteRange(range)
                      .insertContent(`⚠️ Template "${name}" not found.`)
                      .run()
                  }
                } else {
                  editor.chain().focus().deleteRange(range)
                    .insertContent('📋 Please type /use [template_name]')
                    .run()
                }
              },
            },
          ]

          const filteredCommands = commands.filter(cmdItem => cmdItem.key.startsWith(cmd))
          console.log('[SlashCommandsExtension] filteredCommands', filteredCommands)
          return filteredCommands
        },
        render: () => {
          let reactRenderer
          let popup

          return {
            onStart: props => {
              if (!props?.editor) return
              reactRenderer = new ReactRenderer(SlashCommands, { props, editor: props.editor })
              console.log('[SlashCommandsExtension] onStart', props)
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: reactRenderer.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })
            },
            onUpdate(props) {
              if (!props?.editor) return
              reactRenderer.updateProps(props)
              popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect })
            },
            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide?.()
                return true
              }
              // 👇 Gọi lại onKeyDown của component React
              const handled = reactRenderer.ref?.onKeyDown?.(props)
              if (handled) return true

              // Nếu nhấn Enter mà popup đang mở, hãy trigger command thủ công
              if (props.event.key === 'Enter' && props.items?.length > 0) {
                const selected = props.items[reactRenderer.ref?.selectedIndex ?? 0]
                if (selected) selected.command({ editor: props.editor, range: props.range })
                popup[0].hide()
                return true
              }

              return false;
            },
            onExit() {
              popup?.[0]?.destroy?.()
              reactRenderer?.destroy?.()
            },
          }
        },
      },
    }
  },

  // addProseMirrorPlugins() {
  //   return [Suggestion(this.options.suggestion)] // ✅ v3 vẫn dùng như v2
  // },

  addProseMirrorPlugins() {
    console.log('[SlashCommandsExtension] Plugin initialized with editor:', this.editor)
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ];
  }

})
