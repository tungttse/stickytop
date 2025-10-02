const { ipcRenderer } = require('electron');

let isPinned = true;

// Initialize simple editor
function initEditor() {
    console.log('Initializing simple editor...');
    
    const editorElement = document.querySelector('#editor');
    if (!editorElement) {
        console.error('Editor element not found');
        return;
    }

    // Create a simple contenteditable div
    editorElement.innerHTML = '<div contenteditable="true" id="simple-editor" style="width: 100%; height: 100%; border: none; outline: none; font-family: inherit; font-size: 14px; padding: 0; overflow-y: auto; line-height: 1.5;">Start writing your sticky note...</div>';
    
    const editor = document.getElementById('simple-editor');
    editor.focus();
    
    // Add event listeners
    editor.addEventListener('focus', handleEditorFocus);
    editor.addEventListener('blur', handleEditorBlur);
    editor.addEventListener('click', handleEditorClick);
}

// Handle clicks in the editor
function handleEditorClick(event) {
    const target = event.target;
    
    // Handle checkbox clicks
    if (target.classList.contains('todo-checkbox')) {
        const todoText = target.nextElementSibling;
        if (target.checked) {
            todoText.classList.add('completed');
        } else {
            todoText.classList.remove('completed');
        }
        updateCounts();
    }
    
    // Handle simple checkbox clicks
    if (target.classList.contains('simple-checkbox')) {
        const checkboxText = target.nextElementSibling;
        if (target.checked) {
            checkboxText.classList.add('completed');
        } else {
            checkboxText.classList.remove('completed');
        }
        updateCounts();
    }
}

// Handle editor focus
function handleEditorFocus(event) {
    const editor = document.getElementById('simple-editor');
    if (editor && editor.textContent.trim() === 'Start writing your sticky note...') {
        editor.textContent = '';
    }
}

// Handle editor blur
function handleEditorBlur(event) {
    const editor = document.getElementById('simple-editor');
    if (editor && editor.textContent.trim() === '') {
        editor.textContent = 'Start writing your sticky note...';
    }
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

// Insert todo checkbox
function insertTodo() {
    const editor = document.getElementById('simple-editor');
    if (!editor) return;
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Create todo HTML
        const todoHtml = `
            <div class="todo-item">
                <input type="checkbox" class="todo-checkbox">
                <span class="todo-text">New todo item</span>
            </div>
        `;
        
        // Insert the todo
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = todoHtml;
        const todoElement = tempDiv.firstElementChild;
        
        range.deleteContents();
        range.insertNode(todoElement);
        
        // Move cursor to the end of the todo text
        const todoText = todoElement.querySelector('.todo-text');
        const newRange = document.createRange();
        newRange.selectNodeContents(todoText);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        // Select the placeholder text for easy editing
        const textNode = todoText.firstChild;
        if (textNode) {
            const selectRange = document.createRange();
            selectRange.selectNodeContents(textNode);
            selection.removeAllRanges();
            selection.addRange(selectRange);
        }
        
    }
}

// Helper function to find parent todo item
function findParentTodoItem(node) {
    while (node && node !== document) {
        if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('todo-item')) {
            return node;
        }
        node = node.parentNode;
    }
    return null;
}

// Create a new todo item after the current one
function createNewTodoAfter(currentTodoItem) {
    const todoHtml = `
        <div class="todo-item">
            <input type="checkbox" class="todo-checkbox">
            <span class="todo-text">New todo item</span>
        </div>
    `;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = todoHtml;
    const newTodoItem = tempDiv.firstElementChild;
    
    // Insert after current todo item with proper line break
    // Create a line break element first
    const lineBreak = document.createElement('br');
    
    // Insert line break after current todo item
    currentTodoItem.parentNode.insertBefore(lineBreak, currentTodoItem.nextSibling);
    
    // Insert new todo item after the line break
    currentTodoItem.parentNode.insertBefore(newTodoItem, lineBreak.nextSibling);
 
    
    // Focus on the new todo text and select placeholder
    const newTodoText = newTodoItem.querySelector('.todo-text');
    const newRange = document.createRange();
    newRange.selectNodeContents(newTodoText);
    newRange.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    // Select the placeholder text
    const textNode = newTodoText.firstChild;
    if (textNode) {
        const selectRange = document.createRange();
        selectRange.selectNodeContents(textNode);
        selection.removeAllRanges();
        selection.addRange(selectRange);
    }
}

// Create a new simple checkbox after the current one
function createNewSimpleCheckboxAfter(currentCheckboxContainer, currentText) {
    // Create simple checkbox HTML (like Mac Notes)
    const checkboxHtml = `
        <span class="simple-checkbox-container" style="display: inline-flex; align-items: center; margin: 2px 0;">
            <input type="checkbox" class="simple-checkbox" style="width: 16px; height: 16px; margin-right: 6px; cursor: pointer; accent-color: #007AFF;">
            <span class="checkbox-text" contenteditable="true" style="outline: none; min-width: 20px;">New checkbox item</span>
        </span>
    `;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = checkboxHtml;
    const newCheckboxContainer = tempDiv.firstElementChild;


    // Insert after current checkbox container with proper line break
    // Create a line break element first
    const lineBreak = document.createElement('br');
    
    // Insert line break after current checkbox
    currentCheckboxContainer.parentNode.insertBefore(lineBreak, currentCheckboxContainer.nextSibling);
    
    // Insert new checkbox after the line break
    currentCheckboxContainer.parentNode.insertBefore(newCheckboxContainer, lineBreak.nextSibling);
 
    // Focus on the new checkbox text and select placeholder
    const newCheckboxText = newCheckboxContainer.querySelector('.checkbox-text');
    const newRange = document.createRange();
    newRange.selectNodeContents(newCheckboxText);
    newRange.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    // Select the placeholder text
    const textNode = newCheckboxText.firstChild;
    if (textNode) {
        const selectRange = document.createRange();
        selectRange.selectNodeContents(textNode);
        selection.removeAllRanges();
        selection.addRange(selectRange);
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

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Handle Ctrl/Cmd combinations
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
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
                e.preventDefault();
                togglePin();
                break;
            case 'F12':
                e.preventDefault();
                toggleDevTools();
                break;
            case ',':
                e.preventDefault();
                openSettings();
                break;
        }
    }
    
    // Handle Tab key for checkbox creation
    if (e.key === 'Tab' || e.key === ' ') {
        const editor = document.getElementById('simple-editor');
        if (editor && editor.contains(document.activeElement)) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const textBeforeCursor = getTextBeforeCursor(range);
                
                // Check if user just typed '[]' and pressed Tab
                if (textBeforeCursor.endsWith('[]')) {
                    e.preventDefault();
                    convertToSimpleCheckbox(range, textBeforeCursor);
                    updateCounts();
                    return;
                }
            }
        }
    }
    
    // Handle Enter key
    if (e.key === 'Enter') {
        const editor = document.getElementById('simple-editor');
        if (editor && editor.contains(document.activeElement)) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.commonAncestorContainer;
                
                // Check if we're inside a simple checkbox text
                const simpleCheckboxContainer = findParentSimpleCheckbox(container);
                if (simpleCheckboxContainer) {
                    e.preventDefault();
                    
                    // Get the current checkbox text
                    const checkboxText = simpleCheckboxContainer.querySelector('.checkbox-text');
                    const currentText = checkboxText.textContent.trim();
                    
                    // Create new simple checkbox after current one
                    createNewSimpleCheckboxAfter(simpleCheckboxContainer, currentText);
                    updateCounts();
                    return;
                }
                
                // Check if we're inside a todo item
                const todoItem = findParentTodoItem(container);
                if (todoItem) {
                    e.preventDefault();
                    
                    // Get the current todo text
                    const todoText = todoItem.querySelector('.todo-text');
                    const currentText = todoText.textContent.trim();
                    
                    // If todo text is empty or placeholder, create new todo
                    if (currentText === '' || currentText === 'New todo item') {
                        createNewTodoAfter(todoItem);
                    } else {
                        // Create new todo with current text
                        todoText.textContent = currentText;
                        createNewTodoAfter(todoItem);
                    }
                    updateCounts();
                    return;
                }
                
                // Check for markdown syntax []
                const textBeforeCursor = getTextBeforeCursor(range);
                if (textBeforeCursor.endsWith('[]')) {
                    e.preventDefault();
                    convertMarkdownToTodo(range, textBeforeCursor);
                    updateCounts();
                    return;
                }
            }
        }
    }
    
    // Handle Backspace key
    if (e.key === 'Backspace') {
        const editor = document.getElementById('simple-editor');
        if (editor && editor.contains(document.activeElement)) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.commonAncestorContainer;
                
                // Check if we're inside a todo item
                const todoItem = findParentTodoItem(container);
                if (todoItem) {
                    const todoText = todoItem.querySelector('.todo-text');
                    const range = selection.getRangeAt(0);
                    
                    if (range.startContainer === todoText && range.startOffset === 0) {
                        e.preventDefault();
                        // Delete the entire todo item
                        deleteTodoItem(todoItem);
                        return;
                    }
                }
                
                // Check if we're inside a simple checkbox text
                const simpleCheckboxContainer = findParentSimpleCheckbox(container);
                if (simpleCheckboxContainer) {
                    const checkboxText = simpleCheckboxContainer.querySelector('.checkbox-text');
                    const range = selection.getRangeAt(0);
                    
                    if (range.startContainer === checkboxText && range.startOffset === 0) {
                        e.preventDefault();
                        // Delete the entire simple checkbox
                        deleteSimpleCheckbox(simpleCheckboxContainer);
                        return;
                    }
                }
            }
        }
    }    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key) {
            case 'C':
                e.preventDefault();
                insertTodo();
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
