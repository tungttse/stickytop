import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CountdownTimerNode from './CountdownTimerNode';

export const CountdownTimerExtension = Node.create({
  name: 'countdownTimer',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      initialSeconds: {
        default: 300,
        parseHTML: element => parseInt(element.getAttribute('data-initial-seconds')),
        renderHTML: attributes => ({
          'data-initial-seconds': attributes.initialSeconds,
        }),
      },
      taskDescription: {
        default: '',
        parseHTML: element => element.getAttribute('data-task-description'),
        renderHTML: attributes => ({
          'data-task-description': attributes.taskDescription,
        }),
      },
      shouldRemove: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="countdown-timer"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'countdown-timer' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CountdownTimerNode, {
      contentDOMElementTag: 'span',
    });
  },

  addCommands() {
    return {
      insertCountdownTimer: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});
