// JSON Parser - Apple Design
// Core functionality for JSON formatting, validation, and visualization

// DOM Elements
const jsonInput = document.getElementById('jsonInput');
const treeView = document.getElementById('treeView');
const codeView = document.getElementById('codeView');
const errorMessage = document.getElementById('errorMessage');

const clearBtn = document.getElementById('clearBtn');
const pasteBtn = document.getElementById('pasteBtn');
const copyBtn = document.getElementById('copyBtn');
const toggleViewBtn = document.getElementById('toggleViewBtn');

const formatBtn = document.getElementById('formatBtn');
const compressBtn = document.getElementById('compressBtn');
const validateBtn = document.getElementById('validateBtn');

const lineCountEl = document.getElementById('lineCount');
const charCountEl = document.getElementById('charCount');
const sizeCountEl = document.getElementById('sizeCount');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

const toast = document.getElementById('toast');

// State
let currentView = 'tree'; // 'tree' or 'code'
let parsedJSON = null;
let isValid = false;

// LocalStorage key
const STORAGE_KEY = 'json-parser-content';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadFromStorage();
    updateStats();
});

// Load from localStorage
function loadFromStorage() {
    try {
        const savedContent = localStorage.getItem(STORAGE_KEY);
        if (savedContent) {
            jsonInput.value = savedContent;
            handleInputChange();
        }
    } catch (err) {
        console.error('Failed to load from storage:', err);
    }
}

// Save to localStorage
function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, jsonInput.value);
    } catch (err) {
        console.error('Failed to save to storage:', err);
    }
}

// Event Listeners
function initializeEventListeners() {
    // Input actions
    jsonInput.addEventListener('input', handleInputChange);
    clearBtn.addEventListener('click', handleClear);
    pasteBtn.addEventListener('click', handlePaste);
    
    // Output actions
    copyBtn.addEventListener('click', handleCopy);
    toggleViewBtn.addEventListener('click', handleToggleView);
    
    // Action buttons
    formatBtn.addEventListener('click', handleFormat);
    compressBtn.addEventListener('click', handleCompress);
    validateBtn.addEventListener('click', handleValidate);
}

// Input Handlers
function handleInputChange() {
    updateStats();
    tryParseJSON();
    saveToStorage();
}

function handleClear() {
    jsonInput.value = '';
    treeView.innerHTML = '';
    codeView.textContent = '';
    errorMessage.classList.remove('show');
    parsedJSON = null;
    isValid = false;
    updateStats();
    saveToStorage();
    showToast('Cleared');
}

async function handlePaste() {
    try {
        const text = await navigator.clipboard.readText();
        jsonInput.value = text;
        handleInputChange();
        showToast('Pasted from clipboard');
    } catch (err) {
        showToast('Failed to paste');
    }
}

// Output Handlers
async function handleCopy() {
    const content = currentView === 'tree' ? codeView.textContent : codeView.textContent;
    if (!content) {
        showToast('Nothing to copy');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(content);
        showToast('Copied to clipboard');
    } catch (err) {
        showToast('Failed to copy');
    }
}

function handleToggleView() {
    currentView = currentView === 'tree' ? 'code' : 'tree';
    
    if (currentView === 'tree') {
        treeView.style.display = 'block';
        codeView.style.display = 'none';
    } else {
        treeView.style.display = 'none';
        codeView.style.display = 'block';
    }
    
    showToast(`Switched to ${currentView} view`);
}

// Action Handlers
function handleFormat() {
    if (!parsedJSON) {
        showToast('Invalid JSON');
        return;
    }
    
    const formatted = JSON.stringify(parsedJSON, null, 2);
    jsonInput.value = formatted;
    updateStats();
    renderOutput();
    saveToStorage();
    showToast('Formatted');
}

function handleCompress() {
    if (!parsedJSON) {
        showToast('Invalid JSON');
        return;
    }
    
    const compressed = JSON.stringify(parsedJSON);
    jsonInput.value = compressed;
    updateStats();
    renderOutput();
    saveToStorage();
    showToast('Compressed');
}

function handleValidate() {
    const result = tryParseJSON();
    if (result) {
        showToast('✓ Valid JSON');
    } else {
        showToast('✗ Invalid JSON');
    }
}

// JSON Parsing
function tryParseJSON() {
    const input = jsonInput.value.trim();
    
    if (!input) {
        errorMessage.classList.remove('show');
        statusDot.className = 'status-dot';
        statusText.textContent = 'Empty';
        isValid = false;
        treeView.innerHTML = '';
        codeView.textContent = '';
        return false;
    }
    
    try {
        parsedJSON = JSON.parse(input);
        errorMessage.classList.remove('show');
        statusDot.className = 'status-dot valid';
        statusText.textContent = 'Valid';
        isValid = true;
        renderOutput();
        return true;
    } catch (err) {
        parsedJSON = null;
        errorMessage.textContent = `Error: ${err.message}`;
        errorMessage.classList.add('show');
        statusDot.className = 'status-dot error';
        statusText.textContent = 'Invalid';
        isValid = false;
        treeView.innerHTML = '';
        codeView.textContent = '';
        return false;
    }
}

// Render Output
function renderOutput() {
    if (!parsedJSON) return;
    
    // Code view
    codeView.textContent = JSON.stringify(parsedJSON, null, 2);
    
    // Tree view
    treeView.innerHTML = '';
    renderTreeNode(parsedJSON, treeView, '', true);
}

// Render Tree Node (simplified structure)
function renderTreeNode(value, container, key = '', isRoot = false) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Object
        const wrapper = document.createElement('div');
        wrapper.className = 'tree-item';
        
        const header = document.createElement('div');
        header.className = 'tree-line';
        
        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle';
        toggle.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        header.appendChild(toggle);
        
        if (!isRoot && key) {
            const keyEl = document.createElement('span');
            keyEl.className = 'tree-key';
            keyEl.textContent = `"${key}": `;
            header.appendChild(keyEl);
        }
        
        const openBracket = document.createElement('span');
        openBracket.className = 'tree-bracket';
        openBracket.textContent = '{';
        header.appendChild(openBracket);
        
        // 折叠预览
        const preview = document.createElement('span');
        preview.className = 'tree-preview';
        const itemCount = Object.keys(value).length;
        preview.textContent = ` ${itemCount} ${itemCount === 1 ? 'item' : 'items'} `;
        header.appendChild(preview);
        
        const closeBracketInline = document.createElement('span');
        closeBracketInline.className = 'tree-bracket tree-bracket-inline';
        closeBracketInline.textContent = '}';
        header.appendChild(closeBracketInline);
        
        wrapper.appendChild(header);
        
        const children = document.createElement('div');
        children.className = 'tree-children';
        
        const entries = Object.entries(value);
        entries.forEach(([k, v]) => {
            renderTreeNode(v, children, k, false);
        });
        
        const closeLine = document.createElement('div');
        closeLine.className = 'tree-line closing-bracket';
        
        // 添加占位符使闭合括号对齐
        const spacer = document.createElement('span');
        spacer.className = 'tree-spacer';
        closeLine.appendChild(spacer);
        
        const closeBracket = document.createElement('span');
        closeBracket.className = 'tree-bracket';
        closeBracket.textContent = '}';
        closeLine.appendChild(closeBracket);
        
        children.appendChild(closeLine);
        
        wrapper.appendChild(children);
        container.appendChild(wrapper);
        
        // Toggle function
        const toggleExpand = () => {
            const isCollapsed = children.classList.toggle('collapsed');
            toggle.classList.toggle('collapsed');
            preview.style.display = isCollapsed ? 'inline' : 'none';
            closeBracketInline.style.display = isCollapsed ? 'inline' : 'none';
        };
        
        // Toggle event on icon
        toggle.addEventListener('click', toggleExpand);
        
        // Toggle event on preview (点击预览也可以展开)
        preview.addEventListener('click', toggleExpand);
        closeBracketInline.addEventListener('click', toggleExpand);
        
        // 默认展开
        preview.style.display = 'none';
        closeBracketInline.style.display = 'none';
        
    } else if (Array.isArray(value)) {
        // Array
        const wrapper = document.createElement('div');
        wrapper.className = 'tree-item';
        
        const header = document.createElement('div');
        header.className = 'tree-line';
        
        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle';
        toggle.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        header.appendChild(toggle);
        
        if (!isRoot && key) {
            const keyEl = document.createElement('span');
            keyEl.className = 'tree-key';
            keyEl.textContent = `"${key}": `;
            header.appendChild(keyEl);
        }
        
        const openBracket = document.createElement('span');
        openBracket.className = 'tree-bracket';
        openBracket.textContent = '[';
        header.appendChild(openBracket);
        
        // 折叠预览
        const preview = document.createElement('span');
        preview.className = 'tree-preview';
        const itemCount = value.length;
        preview.textContent = ` ${itemCount} ${itemCount === 1 ? 'item' : 'items'} `;
        header.appendChild(preview);
        
        const closeBracketInline = document.createElement('span');
        closeBracketInline.className = 'tree-bracket tree-bracket-inline';
        closeBracketInline.textContent = ']';
        header.appendChild(closeBracketInline);
        
        wrapper.appendChild(header);
        
        const children = document.createElement('div');
        children.className = 'tree-children';
        
        value.forEach((item, index) => {
            renderTreeNode(item, children, index.toString(), false);
        });
        
        const closeLine = document.createElement('div');
        closeLine.className = 'tree-line closing-bracket';
        
        // 添加占位符使闭合括号对齐
        const spacer = document.createElement('span');
        spacer.className = 'tree-spacer';
        closeLine.appendChild(spacer);
        
        const closeBracket = document.createElement('span');
        closeBracket.className = 'tree-bracket';
        closeBracket.textContent = ']';
        closeLine.appendChild(closeBracket);
        
        children.appendChild(closeLine);
        
        wrapper.appendChild(children);
        container.appendChild(wrapper);
        
        // Toggle function
        const toggleExpand = () => {
            const isCollapsed = children.classList.toggle('collapsed');
            toggle.classList.toggle('collapsed');
            preview.style.display = isCollapsed ? 'inline' : 'none';
            closeBracketInline.style.display = isCollapsed ? 'inline' : 'none';
        };
        
        // Toggle event on icon
        toggle.addEventListener('click', toggleExpand);
        
        // Toggle event on preview (点击预览也可以展开)
        preview.addEventListener('click', toggleExpand);
        closeBracketInline.addEventListener('click', toggleExpand);
        
        // 默认展开
        preview.style.display = 'none';
        closeBracketInline.style.display = 'none';
        
    } else {
        // Primitive value
        const line = document.createElement('div');
        line.className = 'tree-line';
        
        // 添加占位符使基本值对齐
        const spacer = document.createElement('span');
        spacer.className = 'tree-spacer';
        line.appendChild(spacer);
        
        if (key !== '') {
            const keyEl = document.createElement('span');
            keyEl.className = 'tree-key';
            keyEl.textContent = `"${key}": `;
            line.appendChild(keyEl);
        }
        
        const valueEl = document.createElement('span');
        const type = typeof value;
        valueEl.className = `tree-value ${type}`;
        
        if (type === 'string') {
            valueEl.textContent = `"${value}"`;
        } else if (value === null) {
            valueEl.className = 'tree-value null';
            valueEl.textContent = 'null';
        } else {
            valueEl.textContent = String(value);
        }
        
        line.appendChild(valueEl);
        container.appendChild(line);
    }
}

// Update Stats
function updateStats() {
    const content = jsonInput.value;
    
    // Line count
    const lines = content.split('\n').length;
    lineCountEl.textContent = lines;
    
    // Character count
    charCountEl.textContent = content.length;
    
    // Size in bytes
    const bytes = new Blob([content]).size;
    let sizeText = bytes + ' B';
    if (bytes > 1024) {
        sizeText = (bytes / 1024).toFixed(1) + ' KB';
    }
    if (bytes > 1024 * 1024) {
        sizeText = (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    sizeCountEl.textContent = sizeText;
}

// Toast Notification
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}
