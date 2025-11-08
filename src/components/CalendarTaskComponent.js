// // CalendarTaskComponent.jsx
// import React, { useState, useEffect, useRef } from 'react';
// import { NodeViewWrapper } from '@tiptap/react'

// export default function CalendarTaskComponent({ node, updateAttributes }) {
//   const { text, synced } = node.attrs

//   const handleSync = async () => {
//     // const res = await window.electronAPI.syncCalendarEvent({
//     //   text,
//     //   date: 'next-saturday',
//     //   time: '09:00',
//     // })
//     const res = { success: true }; // TODO: remove this
//     if (res.success) {
//       updateAttributes({ synced: true })
//       alert('✅ Đã thêm vào Google Calendar!')
//     }
//   }

//   return (
//     <NodeViewWrapper className="calendar-task">
//       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//         <span>{text}</span>
//         <button
//           onClick={handleSync}
//           style={{
//             fontSize: '12px',
//             padding: '2px 6px',
//             borderRadius: '4px',
//             background: synced ? '#4caf50' : '#2196f3',
//             color: 'white',
//             border: 'none',
//             cursor: 'pointer',
//           }}
//         >
//           {synced ? '✓ Synced' : 'Sync Calendar'}
//         </button>
//       </div>
//     </NodeViewWrapper>
//   )
// }
