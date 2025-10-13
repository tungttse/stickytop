import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { BulletList, OrderedList, ListItem } from '@tiptap/extension-list';
import Placeholder from '@tiptap/extension-placeholder'
import CountdownTimer from './CountdownTimer';
import SystemClock from './SystemClock';
import { debounce } from 'lodash';
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { Extension } from '@tiptap/core'
import { SlashCommandsExtension } from './SlashCommandsExtension'
import { SlashCommands } from './SlashCommands'
import { CountdownTimerExtension } from './CountdownTimerExtension'
import { CalendarTask } from '../extentions/CalendarTask'



const TiptapEditor = (
  {
    content,
    onContentChange,
  }
) => {

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      CalendarTask,
      TaskList,
      TaskItem,
      CountdownTimerExtension,
      SlashCommandsExtension,
      Placeholder.configure({
        placeholder: 'Type / to see commands (e.g. /countdown 5m, /remind 10m, /use meeting)',
      }),
    ],
    content : content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML())
    },
    autofocus: true,
    editorProps: {
      attributes: { class: 'tiptap-editor' },
    },
  });
  useEffect(() => {
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content])

  console.log('content', content, editor.getHTML());

  return (
    <>
    <EditorContent editor={editor} style={{ height: '100%', width: '100%' }} />
     <div style={{ marginTop: 10 }}>
        <button
          onClick={() => {
            editor
              .chain()
              .focus()
              .insertContent({
                type: 'calendarTask',
                attrs: { text: '📚 Đọc sách lúc 9h sáng thứ 7' },
              })
              .run()
          }}
        >
          + Add Calendar Task
        </button>
      </div>
    </>
    
  );
};

export default TiptapEditor;
