import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { BulletList, OrderedList, ListItem } from '@tiptap/extension-list';
import Placeholder from '@tiptap/extension-placeholder'
import CountdownTimer from './CountdownTimer';
import SystemClock from './SystemClock';
import { debounce } from 'lodash';

const TiptapEditor = ({ content = '', onContentChange = () => {} }) => {
  const [lineNumbers, setLineNumbers] = useState([1]);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(10);
  const editorRef = useRef(null);

  // const updateLineNumbers = useCallback(() => {
  //   if (editor) {
  //     // Sử dụng editor.getText() thay vì DOM query
  //     const text = editor.getText();
  //     let lines = text.split('\n');
  //     lines = lines.filter(line => line.trim() !== '') + 1;

  //     const lineCount = Math.max(lines.length, 1);
  //     const numbers = Array.from({ length: lineCount }, (_, i) => i + 1);
  //     setLineNumbers(numbers);
  //   }
  // }, [editor]);

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
      Placeholder.configure({
        placeholder: 'Viết ghi chú của bạn ở đây...', // 👈 text placeholder
        showOnlyWhenEditable: true, // chỉ hiện khi editable
        showOnlyCurrent: false,     // hiện trên tất cả đoạn trống
      }),
    ],
    onFocus: () => {
      console.log('onFocus');
    },
    // placeholder: 'Start writing your sticky note...',
    // content: 'Nathan is cool <3',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();

      onContentChange(html);
      // Gọi updateLineNumbers với setTimeout để đảm bảo DOM đã update
      // setTimeout(() => {
      //   updateLineNumbers();
      // }, 0);

      // const editorView = editor.view.dom;
      // const lineNumbers = document.querySelector('.line-numbers');
      // lineNumbers.innerHTML = '';

      // const nodes = editorView.querySelectorAll('p, li, pre, h1, h2, h3'); 
      // nodes.forEach((node, idx) => {
      //   const rect = node.getBoundingClientRect();
      //   const div = document.createElement('div');
      //   div.textContent = idx + 1;
      //   div.style.height = rect.height + 'px';
      //   console.log(rect.height);
      //   lineNumbers.appendChild(div);
      // });

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
  }, [editor, content]);


  // useEffect(() => {
  //   if (editor) {
  //     updateLineNumbers();
  //   }
  // }, [editor, updateLineNumbers]);

  // useEffect(() => {
  //   updateLineNumbers();
  // }, [content, updateLineNumbers]);

  const handleCountdownComplete = () => {
    console.log('Countdown completed!');
    // Có thể thêm notification hoặc action khác
  };

  const handleCountdownCancel = () => {
    setShowCountdown(false);
  };

  const toggleCountdown = () => {
    setShowCountdown(!showCountdown);
  };

  const testNotification = async () => {
    try {
      if (window.electronAPI && window.electronAPI.showNotification) {
        await window.electronAPI.showNotification({
          title: "🔔 Test Notification",
          body: "This is a test notification from StickyTop!",
          sound: true
        });
      } else {
        console.log('Notification API not available');
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  return (
    <div className="tiptap-container">
      {/* <div className="line-numbers">
        {lineNumbers.map((number) => (
          <div key={number} className="line-number">
            {number}
          </div>
        ))}
      </div> */}
      <div className="editor-wrapper" ref={editorRef}>
        <EditorContent editor={editor} />

        {/* Countdown Timer Section */}
        {/* <div className="countdown-section">
          <button
            onClick={toggleCountdown}
            className="countdown-toggle-btn"
          >
            {showCountdown ? '⏰ Hide Timer' : '⏰ Show Timer'}
          </button>

          {showCountdown && (
            <div className="countdown-input-section">
              <label>
                Set countdown (seconds):
                <input
                  type="number"
                  value={countdownSeconds}
                  onChange={(e) => setCountdownSeconds(parseInt(e.target.value) || 10)}
                  min="1"
                  max="3600"
                  className="countdown-input"
                />
              </label>
            </div>
          )}

          {showCountdown && (
            <CountdownTimer
              initialSeconds={countdownSeconds}
              onComplete={handleCountdownComplete}
              onCancel={handleCountdownCancel}
            />
          )}

          {showCountdown && (
            <button
              onClick={testNotification}
              className="notification-test"
            >
              🔔 Test Notification
            </button>
          )}
        </div> */}

        {/* System Clock Section */}
        {/* <SystemClock /> */}
      </div>
    </div>
  );
};

export default TiptapEditor;
