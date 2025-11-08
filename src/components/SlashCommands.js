// import React, {
//     forwardRef,
//     useEffect,
//     useImperativeHandle,
//     useState,
// } from 'react'

// export const SlashCommands = forwardRef((props, ref) => {
//     const [selectedIndex, setSelectedIndex] = useState(0)
//     console.log(`ttt props,`, props.items);
//     const selectItem = (index) => {
//         console.log('[SlashCommands] Select Item', index);
//         console.log('[SlashCommands] Items', props.items)
//         const item = props.items[index]
//         console.log('[SlashCommands] Select Item', item)
//         if (item && item.command) {
//             // Call the command function from the item with editor and range
//             console.log('[SlashCommands] Calling command with editor and range')
//             item.command({
//                 editor: props.editor,
//                 range: props.range
//             })
//         }
//     }

//     const upHandler = () => {
//         setSelectedIndex(
//             (selectedIndex + props.items.length - 1) % props.items.length
//         )
//     }

//     const downHandler = () => {
//         setSelectedIndex((selectedIndex + 1) % props.items.length)
//     }

//     const enterHandler = () => {
//         console.log('[SlashCommands] Enter Handler', selectedIndex)
//         selectItem(selectedIndex)
//     }

//     useImperativeHandle(ref, () => ({
//         onKeyDown: ({ event }) => {
//             if (event.key === 'ArrowUp') {
//                 upHandler()
//                 return true
//             }

//             if (event.key === 'ArrowDown') {
//                 downHandler()
//                 return true
//             }

//             if (event.key === 'Enter') {
//                 enterHandler()
//                 return true
//             }

//             return false
//         },
//     }))

//     return (
//         <div className="slash-commands-menu">
//             {props.items.length ? (
//                 props.items.map((item, index) => (
//                     <div
//                         key={item.title || index}
//                         className={`slash-command-item ${index === selectedIndex ? 'is-selected' : ''
//                             }`}
//                         onClick={() => selectItem(index)}
//                         onMouseEnter={() => setSelectedIndex(index)}
//                     >
//                         <span className="slash-command-icon">{item.icon}</span>
//                         <div className="slash-command-content">
//                             <div className="slash-command-title">{item.title}</div>
//                             <div className="slash-command-description">{item.description}</div>
//                         </div>
//                     </div>
//                 ))
//             ) : (
//                 <div className="slash-command-item">
//                     <div className="slash-command-content">
//                         <div className="slash-command-title">No result</div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     )
// })
