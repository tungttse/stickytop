import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { BulletList, OrderedList, ListItem } from '@tiptap/extension-list';

const TiptapEditor = ({ content, onContentChange }) => {
  const [lineNumbers, setLineNumbers] = useState([1]);
  const editorRef = useRef(null);

  const updateLineNumbers = useCallback(() => {
    if (editor) {
      // Sử dụng editor.getText() thay vì DOM query
      const text = editor.getText();
      let lines = text.split('\n');
      lines = lines.filter(line => line.trim() !== '');

      console.log(lines);
      const lineCount = Math.max(lines.length, 1);
      const numbers = Array.from({ length: lineCount }, (_, i) => i + 1);
      setLineNumbers(numbers);
    }
  }, [editor]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'tiptap-list',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'tiptap-list',
        },
      }),
      ListItem,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange(html);
      // Gọi updateLineNumbers với setTimeout để đảm bảo DOM đã update
      setTimeout(() => {
        updateLineNumbers();
      }, 0);
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      // editor.commands.focus();
      updateLineNumbers();
    }
  }, [editor, updateLineNumbers]);

  useEffect(() => {
    updateLineNumbers();
  }, [content, updateLineNumbers]);

  return (
    <div className="tiptap-container">
      <div className="line-numbers">
        {lineNumbers.map((number) => (
          <div key={number} className="line-number">
            {number}
          </div>
        ))}
      </div>
      <div className="editor-wrapper" ref={editorRef}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default TiptapEditor;
