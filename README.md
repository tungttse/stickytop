# StickyTop - Rich Sticky Notes

A beautiful Electron application for creating rich text sticky notes that stay on top of other windows.

## Features

- **Rich Text Editor**: Full-featured text editor with formatting options (bold, italic, underline, lists)
- **Always On Top**: Sticky notes stay on top of all other windows
- **Modern UI**: Beautiful, modern interface with glassmorphism effects
- **Keyboard Shortcuts**: Full keyboard support for all operations
- **Save/Load**: Save notes as HTML or text files
- **Auto-save**: Automatic saving to localStorage
- **Resizable**: Adjustable window size
- **Frameless Design**: Clean, distraction-free interface

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Starting the Application

```bash
npm start
```

### Keyboard Shortcuts

- `Ctrl/Cmd + N` - New note
- `Ctrl/Cmd + S` - Save note
- `Ctrl/Cmd + O` - Load note
- `Ctrl/Cmd + T` - Toggle always on top
- `Ctrl/Cmd + B` - Bold text
- `Ctrl/Cmd + I` - Italic text
- `Ctrl/Cmd + U` - Underline text

### Features

1. **Rich Text Editing**: Use the toolbar buttons or keyboard shortcuts to format text
2. **Always On Top**: Click the pin button (📌) to toggle staying on top
3. **Save/Load**: Use the floating action buttons to save and load notes
4. **Auto-save**: Your content is automatically saved to localStorage
5. **Window Controls**: Minimize, maximize, or close using the title bar controls

## Building for Distribution

```bash
npm run build
```

This will create distributable packages for your platform.

## File Structure

```
stickytop/
├── main.js          # Main Electron process
├── index.html       # Main window HTML
├── renderer.js      # Renderer process script
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

## Technologies Used

- **Electron**: Cross-platform desktop app framework
- **Quill.js**: Rich text editor
- **HTML5/CSS3**: Modern web technologies
- **Node.js**: Backend runtime

## License

MIT License - feel free to use and modify as needed.
