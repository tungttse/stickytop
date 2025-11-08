// import { Extension } from '@tiptap/core';

// export const TimestampExtension = Extension.create({
//   name: 'timestamp',

//   addGlobalAttributes() {
//     return [
//       {
//         types: ['paragraph', 'heading', 'listItem', 'taskItem', 'bulletList', 'orderedList', 'taskList'],
//         attributes: {
//           createdAt: {
//             default: null,
//             parseHTML: element => {
//               const timestamp = element.getAttribute('data-created-at');
//               return timestamp ? parseInt(timestamp) : null;
//             },
//             renderHTML: attributes => {
//               if (attributes.createdAt) {
//                 return {
//                   'data-created-at': attributes.createdAt.toString(),
//                 };
//               }
//               return {};
//             },
//           },
//           updatedAt: {
//             default: null,
//             parseHTML: element => {
//               const timestamp = element.getAttribute('data-updated-at');
//               return timestamp ? parseInt(timestamp) : null;
//             },
//             renderHTML: attributes => {
//               if (attributes.updatedAt) {
//                 return {
//                   'data-updated-at': attributes.updatedAt.toString(),
//                 };
//               }
//               return {};
//             },
//           },
//         },
//       },
//     ];
//   },

//   addCommands() {
//     return {
//       setNodeTimestamp: (nodePos, timestamp) => ({ tr, state }) => {
//         const node = state.doc.nodeAt(nodePos);
//         if (node) {
//           tr.setNodeMarkup(nodePos, null, {
//             ...node.attrs,
//             ...timestamp,
//           });
//           return true;
//         }
//         return false;
//       },
//       addTimestampsToAllNodes: () => ({ tr, state, dispatch }) => {
//         const now = Date.now();
//         const newTr = tr;

//         state.doc.descendants((node, pos) => {
//           if (node.isBlock && !node.attrs.createdAt) {
//             newTr.setNodeMarkup(pos, null, {
//               ...node.attrs,
//               createdAt: now,
//               updatedAt: now,
//             });
//           }
//         });

//         if (dispatch) {
//           dispatch(newTr);
//         }
//         return true;
//       },
//     };
//   },
// });
