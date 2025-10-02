const { ipcRenderer } = require('electron');

let editor;
let isPinned = true;
let isTiptapLoaded = false;

// Initialize Tiptap editor with dynamic imports
async function initEditor() {
    try {
        console.log('Starting Tiptap initialization...');
        
        // Dynamic imports for ES modules
        const { Editor } = await import('@tiptap/core');
        const StarterKit = (await import('@tiptap/starter-kit')).default;
        const TaskList = (await import('@tiptap/extension-task-list')).default;
        const TaskItem = (await import('@tiptap/extension-task-item')).default;

        console.log('Tiptap modules loaded successfully');

        const editorElement = document.querySelector('#editor');
        if (!editorElement) {
            throw new Error('Editor element not found');
        }

        editor = new Editor({
            element: editorElement,
            extensions: [
                StarterKit.configure({
                    // Disable the default bullet list and ordered list
                    bulletList: false,
                    orderedList: false,
                }),
                TaskList,
                TaskItem.configure({
                    nested: true,
                }),
            ],
            content: '<p>Start writing your sticky note...</p>',
            onUpdate: ({ editor }) => {
                updateCounts();
            },
            onSelectionUpdate: ({ editor }) => {
                updateToolbarState();
            },
            onCreate: ({ editor }) => {
                console.log('Tiptap editor created successfully');
                isTiptapLoaded = true;
                // Focus the editor after creation
                setTimeout(() => {
                    editor.commands.focus();
                }, 100);
            },
        });

        // Initial count update
        updateCounts();
        updateStatus('StickyTop ready with Tiptap');
        
        // Ensure editor is focused
        setTimeout(() => {
            if (editor) {
                editor.commands.focus();
            }
        }, 500);
        
    } catch (error) {
        console.error('Failed to initialize Tiptap:', error);
        updateStatus('Failed to load Tiptap editor: ' + error.message);
        
        // Fallback: create a simple contenteditable div
        // initFallbackEditor();
    }
}

// Fallback editor using contenteditable
function initFallbackEditor() {
    console.log('Initializing fallback editor...');
    const editorElement = document.querySelector('#editor');
    if (editorElement) {
        editorElement.innerHTML = '<div contenteditable="true" style="width: 100%; height: 100%; border: none; outline: none; font-family: inherit; font-size: 14px; padding: 0; overflow-y: auto;">Start writing your sticky note...</div>';
        
        const editableDiv = editorElement.querySelector('div[contenteditable]');
        editableDiv.focus();
        
        // Create a simple editor object for compatibility
        editor = {
            getText: () => editableDiv.textContent || editableDiv.innerText,
            getHTML: () => editableDiv.innerHTML,
            commands: {
                focus: () => editableDiv.focus(),
                clearContent: () => { editableDiv.innerHTML = ''; },
                insertContent: (content) => { editableDiv.innerHTML = content; },
                setContent: (content) => { editableDiv.innerHTML = content; },
            },
            isActive: () => false,
            chain: () => ({
                focus: () => ({ toggleBold: () => ({ run: () => {} }), toggleItalic: () => ({ run: () => {} }), toggleUnderline: () => ({ run: () => {} }), toggleStrike: () => ({ run: () => {} }), toggleBulletList: () => ({ run: () => {} }), toggleOrderedList: () => ({ run: () => {} }), toggleTaskList: () => ({ run: () => {} }), clearNodes: () => ({ unsetAllMarks: () => ({ run: () => {} }) }) })
            }),
            on: () => {}
        };
        
        // Add event listeners for the fallback editor
        editableDiv.addEventListener('input', updateCounts);
        editableDiv.addEventListener('keyup', updateCounts);
        
        updateStatus('Fallback editor loaded');
    }
}

// Update word, character, and todo counts
function updateCounts() {
    if (!editor) return;
    
    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    
    // Count todos (only for Tiptap)
    let todoCount = 0;
    let completedCount = 0;
    
    if (isTiptapLoaded) {
        const taskItems = document.querySelectorAll('[data-type="taskItem"]');
        const completedTodos = document.querySelectorAll('[data-type="taskItem"][data-checked="true"]');
        todoCount = taskItems.length;
        completedCount = completedTodos.length;
    }
    
    document.getElementById('wordCount').textContent = `${words} words`;
    document.getElementById('charCount').textContent = `${chars} characters`;
    document.getElementById('todoCount').textContent = `${completedCount}/${todoCount} todos`;
}

// Update toolbar button states
function updateToolbarState() {
    if (!editor || !isTiptapLoaded) return;
    
    document.getElementById('boldBtn').classList.toggle('active', editor.isActive('bold'));
    document.getElementById('italicBtn').classList.toggle('active', editor.isActive('italic'));
    document.getElementById('underlineBtn').classList.toggle('active', editor.isActive('underline'));
}

// Toggle text formatting
function toggleBold() {
    if (editor) {
        if (isTiptapLoaded) {
            editor.chain().focus().toggleBold().run();
        } else {
            // Fallback: use document.execCommand
            document.execCommand('bold');
        }
    }
}

function toggleItalic() {
    if (editor) {
        if (isTiptapLoaded) {
            editor.chain().focus().toggleItalic().run();
        } else {
            document.execCommand('italic');
        }
    }
}

function toggleUnderline() {
    if (editor) {
        if (isTiptapLoaded) {
            editor.chain().focus().toggleUnderline().run();
        } else {
            document.execCommand('underline');
        }
    }
}

function toggleStrike() {
    if (editor) {
        if (isTiptapLoaded) {
            editor.chain().focus().toggleStrike().run();
        } else {
            document.execCommand('strikeThrough');
        }
    }
}

// Toggle lists
function toggleBulletList() {
    if (editor && isTiptapLoaded) {
        editor.chain().focus().toggleBulletList().run();
    }
}

function toggleOrderedList() {
    if (editor && isTiptapLoaded) {
        editor.chain().focus().toggleOrderedList().run();
    }
}

function toggleTaskList() {
    if (editor && isTiptapLoaded) {
        editor.chain().focus().toggleTaskList().run();
    }
}

// Clear all formatting
function clearFormat() {
    if (editor) {
        if (isTiptapLoaded) {
            editor.chain().focus().clearNodes().unsetAllMarks().run();
        } else {
            document.execCommand('removeFormat');
        }
    }
}

// Window controls
function minimizeWindow() {
    const { remote } = require('electron');
    remote.getCurrentWindow().minimize();
}

function maximizeWindow() {
    const { remote } = require('electron');
    const win = remote.getCurrentWindow();
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
}

function closeWindow() {

// Toggle developer tools
function toggleDevTools() {
    const { remote } = require('electron');
    const win = remote.getCurrentWindow();
    if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
    } else {
        win.webContents.openDevTools();
    }
}    const { remote } = require('electron');
    remote.getCurrentWindow().close();
}

// Toggle always on top
function togglePin() {
    const { remote } = require('electron');
    const win = remote.getCurrentWindow();
    isPinned = !isPinned;
    win.setAlwaysOnTop(isPinned);
    
    const pinBtn = document.getElementById('pinBtn');
    pinBtn.classList.toggle('active', isPinned);
    pinBtn.textContent = isPinned ? '📌' : '📍';
    
    updateStatus(isPinned ? 'Pinned to top' : 'Unpinned');
}

// Create new note
function newNote() {
    if (!editor) return;
    
    if (editor.getText().trim()) {
        if (confirm('Create a new note? Current content will be lost.')) {
            editor.commands.clearContent();
            if (isTiptapLoaded) {
                editor.commands.insertContent('<p>Start writing your sticky note...</p>');
            } else {
                editor.commands.insertContent('Start writing your sticky note...');
            }
            updateCounts();
            updateStatus('New note created');
        }
    } else {
        editor.commands.clearContent();
        if (isTiptapLoaded) {
            editor.commands.insertContent('<p>Start writing your sticky note...</p>');
        } else {
            editor.commands.insertContent('Start writing your sticky note...');
        }
        updateCounts();
        updateStatus('New note created');
    }
}

// Save note
async function saveNote() {
    if (!editor) return;
    
    const content = editor.getHTML();
    
    try {
        const result = await ipcRenderer.invoke('save-file', content);
        if (result.success) {
            updateStatus(`Saved to ${result.path}`);
        } else {
            updateStatus(`Save failed: ${result.error}`);
        }
    } catch (error) {
        updateStatus(`Save error: ${error.message}`);
    }
}

// Load note
async function loadNote() {
    if (!editor) return;
    
    if (editor.getText().trim()) {
        if (!confirm('Load a new note? Current content will be lost.')) {
            return;
        }
    }
    
    try {
        const result = await ipcRenderer.invoke('load-file');
        if (result.success) {
            editor.commands.setContent(result.content);
            updateCounts();
            updateStatus(`Loaded from ${result.path}`);
        } else {
            updateStatus(`Load failed: ${result.error}`);
        }
    } catch (error) {
        updateStatus(`Load error: ${error.message}`);
    }
}

// Update status message
function updateStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = message;
        
        // Clear status after 3 seconds
        setTimeout(() => {
            statusEl.textContent = 'Ready';
        }, 3000);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Handle Ctrl/Cmd combinations
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'b':
                e.preventDefault();
                toggleBold();
                break;
            case 'i':
                e.preventDefault();
                toggleItalic();
                break;
            case 'u':
                e.preventDefault();
                toggleUnderline();
                break;
            case 'n':
                e.preventDefault();
                newNote();
                break;
            case 's':
                e.preventDefault();
                saveNote();
                break;
            case 'o':
                e.preventDefault();
                loadNote();
                break;
            case 't':
            case 'F12':
                e.preventDefault();
                toggleDevTools();
                break;                e.preventDefault();
                togglePin();
                break;
        }
    }
    
    // Handle Ctrl+Shift combinations
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key) {
            case 'C':
                e.preventDefault();
                toggleTaskList();
                break;
        }
    }
});

// IPC message handlers
ipcRenderer.on('new-note', () => {
    newNote();
});

ipcRenderer.on('save-note', () => {
    saveNote();
});

ipcRenderer.on('load-note', () => {
    loadNote();
});

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing editor...');
    initEditor();
    
    // Set initial pin state
    const pinBtn = document.getElementById('pinBtn');
    if (pinBtn) {
        pinBtn.classList.add('active');
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    // Editor will automatically adjust
});

// Auto-save functionality
let autoSaveTimeout;
function scheduleAutoSave() {
    if (!editor) return;
    
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        // Auto-save to localStorage
        const content = editor.getHTML();
        localStorage.setItem('stickytop-autosave', content);
    }, 5000); // Auto-save after 5 seconds of inactivity
}

// Load auto-saved content on startup
function loadAutoSave() {
    if (!editor) return;
    
    const autoSaved = localStorage.getItem('stickytop-autosave');
    if (autoSaved && !editor.getText().trim()) {
        editor.commands.setContent(autoSaved);
        updateCounts();
        updateStatus('Auto-saved content restored');
    }
}

// Add auto-save listener when editor is ready
setTimeout(() => {
    if (editor) {
        if (isTiptapLoaded) {
            console.log('Tiptap editor ready, setting up auto-save...');
            editor.on('update', scheduleAutoSave);
        } else {
            // For fallback editor, use input events
            const editableDiv = document.querySelector('#editor div[contenteditable]');
            if (editableDiv) {
                editableDiv.addEventListener('input', scheduleAutoSave);
            }
        }
        setTimeout(loadAutoSave, 100);
    }
}, 1000);
