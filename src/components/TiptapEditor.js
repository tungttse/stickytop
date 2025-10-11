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



const TiptapEditor = () => {

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TaskList,
      TaskItem,
      CountdownTimerExtension,
      SlashCommandsExtension,
      Placeholder.configure({
        placeholder: 'Type / to see commands (e.g. /countdown 5m, /remind 10m, /use meeting)',
      }),
    ],
    editorProps: {
      attributes: { class: 'tiptap-editor' },
    },
  });

  return (
    <EditorContent editor={editor} style={{ height: '100%', width: '100%' }} />
  );
};

export default TiptapEditor;
