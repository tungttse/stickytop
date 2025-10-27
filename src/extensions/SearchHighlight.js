import { Mark } from '@tiptap/core';

export const SearchHighlight = Mark.create({
  name: 'searchHighlight',

  addOptions() {
    return {
      HTMLAttributes: {},
      types: ['searchHighlight', 'searchHighlightActive'],
    };
  },

  addAttributes() {
    return {
      class: {
        default: 'search-highlight',
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) {
            return {};
          }
          return {
            class: attributes.class,
          };
        },
      },
      'data-type': {
        default: 'searchHighlight',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => {
          if (!attributes['data-type']) {
            return {};
          }
          return {
            'data-type': attributes['data-type'],
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-type="searchHighlight"]',
      },
      {
        tag: 'mark[data-type="searchHighlightActive"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', HTMLAttributes, 0];
  },

  addCommands() {
    return {
      setSearchHighlight: (attributes) => ({ tr, state, dispatch }) => {
        const { selection } = state;
        const { from, to } = selection;

        if (from === to) return false;

        try {
          const mark = this.type.create(attributes);
          tr.addMark(from, to, mark);

          if (dispatch) {
            dispatch(tr);
          }
          return true;
        } catch (error) {
          console.warn('Error setting search highlight:', error);
          return false;
        }
      },
      unsetSearchHighlight: () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        const { from, to } = selection;

        if (from === to) return false;

        try {
          tr.removeMark(from, to, this.type);

          if (dispatch) {
            dispatch(tr);
          }
          return true;
        } catch (error) {
          console.warn('Error unsetting search highlight:', error);
          return false;
        }
      },
      clearAllSearchHighlights: () => ({ tr, state, dispatch }) => {
        try {
          const { doc } = state;
          const newTr = tr;

          // Remove all search highlight marks
          doc.descendants((node, pos) => {
            if (node.marks) {
              node.marks.forEach(mark => {
                if (mark.type.name === 'searchHighlight') {
                  newTr.removeMark(pos, pos + node.nodeSize, mark);
                }
              });
            }
          });

          if (dispatch) {
            dispatch(newTr);
          }
          return true;
        } catch (error) {
          console.warn('Error clearing search highlights:', error);
          return false;
        }
      },
    };
  },
});
