const { ipcRenderer } = require('electron');

let isPinned = true;


function initEditor() {
    const editor = new EditorJS({
        autofocus: true,
        placeholder: 'Let`s write an awesome story!',
        holder: 'editor',
        defaultBlock: 'paragraph',
        tools: {
            header: Header,
            // inlineCode: {
            //     class: InlineCode,
            //     shortcut: 'CMD+SHIFT+M',
            //   },
            // checklist: {
            //   class: Checklist,
            //   inlineToolbar: true,
            // },
            // ColorPicker: {
            //     class: ColorPicker.default,  // or ColorPicker.ColorPickerWithoutSanitize
            //   },
            // embed: Embed,
            // Marker: {
            //     class: Marker,
            //     shortcut: 'CMD+SHIFT+M',
            //   },
            // quote: {
            //     class: Quote,
            //     inlineToolbar: true,
            //     shortcut: 'CMD+SHIFT+O',
            //     config: {
            //       quotePlaceholder: 'Enter a quote',
            //       captionPlaceholder: 'Quote\'s author',
            //     },
            //   },
            paragraph: {
                class: Paragraph,
                toolbox: {
                  show: false   // trick: không hiện trong menu
                }
              },
            List: {
                class: EditorjsList,
                inlineToolbar: true,
                config: {
                  defaultStyle: 'unordered'
                },
              },
          }
    });
    // editor.focus();
    return;
}


// Update word, character, and todo counts
function updateCounts() {
    const editor = document.getElementById('simple-editor');
    if (!editor) return;
    
    const text = editor.textContent;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const characters = text.length;
    
    // Count todos
    const todos = editor.querySelectorAll('.todo-item');
    const completedTodos = editor.querySelectorAll('.todo-checkbox:checked');
    const todoCount = todos.length;
    const completedCount = completedTodos.length;
    
    // Count simple checkboxes
    const simpleCheckboxes = editor.querySelectorAll('.simple-checkbox');
    const completedSimpleCheckboxes = editor.querySelectorAll('.simple-checkbox:checked');
    const simpleCheckboxCount = simpleCheckboxes.length;
    const completedSimpleCheckboxCount = completedSimpleCheckboxes.length;
    
    // Total counts
    const totalTodoCount = todoCount + simpleCheckboxCount;
    const totalCompletedCount = completedCount + completedSimpleCheckboxCount;
    
    // Update display (if elements exist)
    const wordCountEl = document.getElementById('wordCount');
    const charCountEl = document.getElementById('charCount');
    const todoCountEl = document.getElementById('todoCount');
    
    if (wordCountEl) wordCountEl.textContent = words;
    if (charCountEl) charCountEl.textContent = characters;
    if (todoCountEl) todoCountEl.textContent = `${totalCompletedCount}/${totalTodoCount}`;
}

// Update status message
function updateStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = message;
        setTimeout(() => {
            statusEl.textContent = '';
        }, 3000);
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
    const { remote } = require('electron');
    remote.getCurrentWindow().close();
}

// Toggle developer tools
function toggleDevTools() {
    const { remote } = require('electron');
    const win = remote.getCurrentWindow();
    if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
    } else {
        win.webContents.openDevTools();
    }
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
    const editor = document.getElementById('simple-editor');
    if (!editor) return;
    
    if (editor.textContent.trim()) {
        if (confirm('Create a new note? Current content will be lost.')) {
            editor.textContent = 'Start writing your sticky note...';
 
        }
    } else {
        editor.textContent = 'Start writing your sticky note...';
 
    }
}

// Save note
async function saveNote() {
    const editor = document.getElementById('simple-editor');
    if (!editor) return;
    
    const content = editor.innerHTML;
    
    try {
        const result = await ipcRenderer.invoke('save-file', content);
        if (result.success) {
        } else {
        }
    } catch (error) {
    }
}

// Load note
async function loadNote() {
    const editor = document.getElementById('simple-editor');
    if (!editor) return;
    
    if (editor.textContent.trim()) {
        if (!confirm('Load a new note? Current content will be lost.')) {
            return;
        }
    }
    
    try {
        const result = await ipcRenderer.invoke('load-file');
        if (result.success) {
            editor.innerHTML = result.content;
 
        } else {
        }
    } catch (error) {
    }
}


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

ipcRenderer.on('open-settings', () => {
    openSettings();
});

// Settings functions
function openSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'flex';
        loadCurrentSettings();
    }
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function loadCurrentSettings() {
    try {
        // Load current transparency
        const transparencyResult = await ipcRenderer.invoke('get-transparency');
        if (transparencyResult.success) {
            const slider = document.getElementById('transparencySlider');
            const valueDisplay = document.getElementById('transparencyValue');
            if (slider && valueDisplay) {
                slider.value = transparencyResult.opacity;
                valueDisplay.textContent = Math.round(transparencyResult.opacity * 100) + '%';
            }
        }
        
        // Load current always on top state
        const alwaysOnTopToggle = document.getElementById('alwaysOnTopToggle');
        if (alwaysOnTopToggle) {
            alwaysOnTopToggle.checked = isPinned;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    try {
        const slider = document.getElementById('transparencySlider');
        const alwaysOnTopToggle = document.getElementById('alwaysOnTopToggle');
        
        if (slider) {
            const opacity = parseFloat(slider.value);
            const result = await ipcRenderer.invoke('set-transparency', opacity);
            if (result.success) {
                updateStatus(`Transparency set to ${Math.round(opacity * 100)}%`);
            }
        }
        
        if (alwaysOnTopToggle) {
            const shouldPin = alwaysOnTopToggle.checked;
            if (shouldPin !== isPinned) {
                togglePin();
            }
        }
        
        closeSettings();
    } catch (error) {
        console.error('Error saving settings:', error);
        updateStatus('Error saving settings');
    }
}

// Add transparency slider event listener
document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('transparencySlider');
    const valueDisplay = document.getElementById('transparencyValue');
    
    if (slider && valueDisplay) {
        slider.addEventListener('input', function() {
            const percentage = Math.round(this.value * 100);
            valueDisplay.textContent = percentage + '%';
        });
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing simple editor...');
    // initEditor();
    
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
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        // Auto-save to localStorage
        const editor = document.getElementById('simple-editor');
        if (editor) {
            const content = editor.innerHTML;
            localStorage.setItem('stickytop-autosave', content);
        }
    }, 5000); // Auto-save after 5 seconds of inactivity
}

// Load auto-saved content on startup
function loadAutoSave() {
    const editor = document.getElementById('simple-editor');
    if (!editor) return;
    
    const autoSaved = localStorage.getItem('stickytop-autosave');
    if (autoSaved && !editor.textContent.trim()) {
        editor.innerHTML = autoSaved;
 
        updateStatus('Auto-saved content restored');
    }
}

// Add auto-save listener when editor is ready
setTimeout(() => {
    const editor = document.getElementById('simple-editor');
    if (editor) {
        editor.addEventListener('input', () => {
            scheduleAutoSave();
            updateCounts();
        });
        setTimeout(loadAutoSave, 100);
        updateCounts(); // Initial count
    }
}, 1000);

// Get text before cursor position
function getTextBeforeCursor(range) {
    const container = range.startContainer;
    const offset = range.startOffset;
    
    if (container.nodeType === Node.TEXT_NODE) {
        return container.textContent.substring(0, offset);
    } else {
        // For element nodes, get all text before the cursor
        let text = '';
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            if (node === container) {
                text += node.textContent.substring(0, offset);
                break;
            } else {
                text += node.textContent;
            }
        }
        return text;
    }
}

// Convert markdown syntax to todo item
function convertMarkdownToTodo(range, textBeforeCursor) {
    const container = range.startContainer;
    const offset = range.startOffset;
    
    // Remove the '[]' from the text
    const newText = textBeforeCursor.slice(0, -2);
    
    // Create todo HTML
    const todoHtml = `
        <div class="todo-item">
            <input type="checkbox" class="todo-checkbox">
            <span class="todo-text">${newText}</span>
        </div>
    `;
    
    // Insert the todo
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = todoHtml;
    const todoElement = tempDiv.firstElementChild;
    
    // Find the start of the line and replace it
    const lineStart = findLineStart(container, offset);
    const lineEnd = findLineEnd(container, offset);
    
    // Create range for the entire line
    const lineRange = document.createRange();
    lineRange.setStart(lineStart.node, lineStart.offset);
    lineRange.setEnd(lineEnd.node, lineEnd.offset);
    
    // Replace the line with todo item
    lineRange.deleteContents();
    lineRange.insertNode(todoElement);
    
    // Focus on the todo text
    const todoText = todoElement.querySelector('.todo-text');
    const newRange = document.createRange();
    newRange.selectNodeContents(todoText);
    newRange.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);
}

// Find the start of the current line
function findLineStart(container, offset) {
    if (container.nodeType === Node.TEXT_NODE) {
        const text = container.textContent;
        const beforeCursor = text.substring(0, offset);
        const lastNewline = beforeCursor.lastIndexOf('\n');
        
        if (lastNewline === -1) {
            return { node: container, offset: 0 };
        } else {
            return { node: container, offset: lastNewline + 1 };
        }
    }
    return { node: container, offset: 0 };
}

// Find the end of the current line
function findLineEnd(container, offset) {
    if (container.nodeType === Node.TEXT_NODE) {
        const text = container.textContent;
        const afterCursor = text.substring(offset);
        const nextNewline = afterCursor.indexOf('\n');
        
        if (nextNewline === -1) {
            return { node: container, offset: text.length };
        } else {
            return { node: container, offset: offset + nextNewline };
        }
    }
    return { node: container, offset: container.textContent.length };
}

// Delete a todo item
function deleteTodoItem(todoItem) {
    // Move cursor to the position before the todo item
    const selection = window.getSelection();
    const range = document.createRange();
    
    if (todoItem.previousSibling) {
        range.setStartAfter(todoItem.previousSibling);
    } else if (todoItem.nextSibling) {
        range.setStartBefore(todoItem.nextSibling);
    } else {
        // If it's the only element, create a new paragraph
        const newP = document.createElement('p');
        newP.innerHTML = '<br>';
        todoItem.parentNode.insertBefore(newP, todoItem);
        range.setStart(newP, 0);
    }
    
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Remove the todo item
    todoItem.remove();
}

// Convert markdown syntax to simple checkbox (like Mac Notes)
function convertToSimpleCheckbox(range, textBeforeCursor) {
    const container = range.startContainer;
    const offset = range.startOffset;
    
    // Remove the '[]' from the text
    const newText = textBeforeCursor.slice(0, -2);
    
    // Create simple checkbox HTML (like Mac Notes)
    const checkboxHtml = `
        <span class="simple-checkbox-container" style="display: inline-flex; align-items: center; margin: 2px 0;">
            <input type="checkbox" class="simple-checkbox" style="width: 16px; height: 16px; margin-right: 6px; cursor: pointer; accent-color: #007AFF;">
            <span class="checkbox-text" contenteditable="true" style="outline: none; min-width: 20px;">${newText}</span>
        </span>
    `;
    
    // Insert the checkbox
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = checkboxHtml;
    const checkboxElement = tempDiv.firstElementChild;
    
    // Find the start of the line and replace it
    const lineStart = findLineStart(container, offset);
    const lineEnd = findLineEnd(container, offset);
    
    // Create range for the entire line
    const lineRange = document.createRange();
    lineRange.setStart(lineStart.node, lineStart.offset);
    lineRange.setEnd(lineEnd.node, lineEnd.offset);
    
    // Replace the line with checkbox
    lineRange.deleteContents();
    lineRange.insertNode(checkboxElement);
    
    // Focus on the checkbox text
    const checkboxText = checkboxElement.querySelector('.checkbox-text');
    const newRange = document.createRange();
    newRange.selectNodeContents(checkboxText);
    newRange.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);
}

// Handle clicks on simple checkboxes
function handleSimpleCheckboxClick(event) {
    const target = event.target;
    
    // Handle simple checkbox clicks
    if (target.classList.contains('simple-checkbox')) {
        const checkboxText = target.nextElementSibling;
        if (target.checked) {
            checkboxText.classList.add('completed');
        } else {
            checkboxText.classList.remove('completed');
        }
 
    }
}

// Handle backspace in simple checkbox text
function handleSimpleCheckboxBackspace(event) {
    if (event.key === 'Backspace') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            
            // Check if we're inside a simple checkbox text
            const checkboxContainer = findParentSimpleCheckbox(container);
            if (checkboxContainer) {
                const checkboxText = checkboxContainer.querySelector('.checkbox-text');
                const range = selection.getRangeAt(0);
                
                if (range.startContainer === checkboxText && range.startOffset === 0) {
                    event.preventDefault();
                    // Delete the entire checkbox
                    deleteSimpleCheckbox(checkboxContainer);
                    
                    return;
                }
            }
        }
    }
}

// Find parent simple checkbox container
function findParentSimpleCheckbox(node) {
    while (node && node !== document) {
        if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('simple-checkbox-container')) {
            return node;
        }
        node = node.parentNode;
    }
    return null;
}

// Delete a simple checkbox
function deleteSimpleCheckbox(checkboxContainer) {
    // Move cursor to the position before the checkbox
    const selection = window.getSelection();
    const range = document.createRange();
    
    if (checkboxContainer.previousSibling) {
        range.setStartAfter(checkboxContainer.previousSibling);
    } else if (checkboxContainer.nextSibling) {
        range.setStartBefore(checkboxContainer.nextSibling);
    } else {
        // If it's the only element, create a new paragraph
        const newP = document.createElement('p');
        newP.innerHTML = '<br>';
        checkboxContainer.parentNode.insertBefore(newP, checkboxContainer);
        range.setStart(newP, 0);
    }
    
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Remove the checkbox
    checkboxContainer.remove();
}
