/**
 * ============================================
 * 🔐 PASS MANAGER - MAIN SCRIPT
 * ============================================
 * 密码管理器主控制逻辑
 * 
 * 功能:
 * - 界面状态管理
 * - 用户交互处理
 * - 模态框控制
 * - 密码条目CRUD
 * ============================================
 */

// ============================================
// DOM Elements
// ============================================

// Screens
const lockScreen = document.getElementById('lockScreen');
const mainApp = document.getElementById('mainApp');

// Lock Screen Elements
const masterPasswordInput = document.getElementById('masterPasswordInput');
const togglePasswordVisibility = document.getElementById('togglePasswordVisibility');
const unlockBtn = document.getElementById('unlockBtn');
const passwordError = document.getElementById('passwordError');
const createVaultBtn = document.getElementById('createVaultBtn');

// Main App Elements
const searchInput = document.getElementById('searchInput');
const addEntryBtn = document.getElementById('addEntryBtn');
const passwordList = document.getElementById('passwordList');
const emptyState = document.getElementById('emptyState');
const lockVaultBtn = document.getElementById('lockVaultBtn');

// Category Elements
const categoryItems = document.querySelectorAll('.category-item');

// Stats Elements
const statTotal = document.getElementById('statTotal');

// Modals
const createVaultModal = document.getElementById('createVaultModal');
const entryModal = document.getElementById('entryModal');
const generatorModal = document.getElementById('generatorModal');
const viewEntryModal = document.getElementById('viewEntryModal');
const confirmDeleteModal = document.getElementById('confirmDeleteModal');

// Toast
const toast = document.getElementById('toast');

// ============================================
// State
// ============================================
let currentCategory = 'all';
let currentSearch = '';
let currentEntryId = null;
let currentEntryType = 'login';

/**
 * Trigger cloud auto-sync after important operations
 * Only syncs if cloud is configured and initial sync is done
 */
function triggerAutoSync() {
    if (window.cloudManager && 
        window.cloudManager.isConfigured() && 
        window.cloudManager.hasCompletedInitialSync()) {
        // Debounce: wait 1 second before syncing
        if (window._autoSyncTimeout) {
            clearTimeout(window._autoSyncTimeout);
        }
        window._autoSyncTimeout = setTimeout(() => {
            window.cloudManager.autoSync();
        }, 1000);
    }
}

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    initializeEventListeners();
});

function initializeApp() {
    // Check if vault exists
    if (window.vaultManager.hasVault()) {
        window.vaultManager.loadVaultFromStorage();
        showLockScreen();
    } else {
        showLockScreen();
    }
    
    // Set auto-lock callback
    window.vaultManager.setAutoLockCallback(() => {
        showLockScreen();
        showToast('Vault locked due to inactivity');
    });
}

function initializeEventListeners() {
    // Lock Screen
    unlockBtn.addEventListener('click', handleUnlock);
    masterPasswordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleUnlock();
    });
    togglePasswordVisibility.addEventListener('click', () => {
        togglePasswordField(masterPasswordInput, togglePasswordVisibility);
    });
    createVaultBtn.addEventListener('click', openCreateVaultModal);

    // Main App
    lockVaultBtn.addEventListener('click', handleLock);
    addEntryBtn.addEventListener('click', () => openEntryModal());
    searchInput.addEventListener('input', handleSearch);

    // Categories
    categoryItems.forEach(item => {
        item.addEventListener('click', () => {
            categoryItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentCategory = item.dataset.category;
            renderPasswordList();
        });
    });

    // Create Vault Modal
    document.getElementById('cancelCreateBtn').addEventListener('click', closeCreateVaultModal);
    document.getElementById('confirmCreateBtn').addEventListener('click', handleCreateVault);
    document.getElementById('newMasterPassword').addEventListener('input', updatePasswordStrength);
    
    // Entry Modal
    document.getElementById('cancelEntryBtn').addEventListener('click', closeEntryModal);
    document.getElementById('saveEntryBtn').addEventListener('click', handleSaveEntry);
    document.getElementById('deleteEntryBtn').addEventListener('click', openDeleteConfirmModal);
    document.getElementById('generatePasswordBtn').addEventListener('click', openGeneratorModal);
    
    // Entry Type Tabs
    document.querySelectorAll('.type-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentEntryType = tab.dataset.type;
            updateEntryFields();
        });
    });

    // Generator Modal
    document.getElementById('cancelGeneratorBtn').addEventListener('click', closeGeneratorModal);
    document.getElementById('usePasswordBtn').addEventListener('click', handleUseGeneratedPassword);
    document.getElementById('regenerateBtn').addEventListener('click', generateNewPassword);
    document.getElementById('copyGeneratedBtn').addEventListener('click', copyGeneratedPassword);
    document.getElementById('passwordLength').addEventListener('input', updatePasswordLength);
    
    ['includeUppercase', 'includeLowercase', 'includeNumbers', 'includeSymbols'].forEach(id => {
        document.getElementById(id).addEventListener('change', generateNewPassword);
    });

    // View Entry Modal
    document.getElementById('closeViewBtn').addEventListener('click', closeViewEntryModal);
    document.getElementById('editEntryFromViewBtn').addEventListener('click', () => {
        closeViewEntryModal();
        openEntryModal(currentEntryId);
    });

    // Confirm Delete Modal
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteConfirmModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleDeleteEntry);

    // Modal Overlays (close on click)
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            closeAllModals();
        });
    });

    // Toggle password visibility in modals
    document.querySelectorAll('.modal-toggle').forEach(btn => {
        btn.addEventListener('click', function() {
            const wrapper = this.closest('.password-input-wrapper');
            const input = wrapper.querySelector('input');
            togglePasswordField(input, this);
        });
    });
}

// ============================================
// Screen Management
// ============================================
function showLockScreen() {
    lockScreen.style.display = 'flex';
    mainApp.style.display = 'none';
    masterPasswordInput.value = '';
    passwordError.textContent = '';
    masterPasswordInput.focus();
}

function showMainApp() {
    lockScreen.style.display = 'none';
    mainApp.style.display = 'block';
    updateCounts();
    renderPasswordList();
}

// ============================================
// Unlock/Lock Handlers
// ============================================
async function handleUnlock() {
    const password = masterPasswordInput.value;
    
    if (!password) {
        passwordError.textContent = 'Please enter your master password';
        return;
    }

    // Normal unlock
    if (!window.vaultManager.hasVault()) {
        passwordError.textContent = 'No vault found. Please create one first.';
        return;
    }

    try {
        unlockBtn.disabled = true;
        unlockBtn.innerHTML = '<span class="spinner"></span> Decrypting...';
        
        await window.vaultManager.unlock(password);
        showMainApp();
        showToast('Vault unlocked');
    } catch (err) {
        passwordError.textContent = 'Invalid master password';
    } finally {
        unlockBtn.disabled = false;
        unlockBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M12 7V5.5C12 3.567 10.433 2 8.5 2H8C6.067 2 4.5 3.567 4.5 5.5V7M4 7H14C15.105 7 16 7.895 16 9V14C16 15.105 15.105 16 14 16H4C2.895 16 2 15.105 2 14V9C2 7.895 2.895 7 4 7Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Unlock Vault
        `;
    }
}

function handleLock() {
    window.vaultManager.lock();
    showLockScreen();
    showToast('Vault locked');
}

// ============================================
// Create Vault
// ============================================
function openCreateVaultModal() {
    createVaultModal.classList.add('active');
    document.getElementById('newMasterPassword').value = '';
    document.getElementById('confirmMasterPassword').value = '';
    updatePasswordStrength();
    document.getElementById('newMasterPassword').focus();
}

function closeCreateVaultModal() {
    createVaultModal.classList.remove('active');
}

function updatePasswordStrength() {
    const password = document.getElementById('newMasterPassword').value;
    const strength = window.cryptoManager.calculatePasswordStrength(password);
    
    const indicator = document.getElementById('strengthIndicator');
    const text = document.getElementById('strengthText');
    
    indicator.style.width = `${(strength.score / 4) * 100}%`;
    indicator.style.background = strength.color;
    text.textContent = strength.label;
    text.style.color = strength.color;
}

async function handleCreateVault() {
    const password = document.getElementById('newMasterPassword').value;
    const confirm = document.getElementById('confirmMasterPassword').value;

    if (!password) {
        showToast('Please enter a password');
        return;
    }

    if (password !== confirm) {
        showToast('Passwords do not match');
        return;
    }

    const strength = window.cryptoManager.calculatePasswordStrength(password);
    if (strength.score < 2) {
        showToast('Please choose a stronger password');
        return;
    }

    try {
        const btn = document.getElementById('confirmCreateBtn');
        btn.disabled = true;
        btn.textContent = 'Creating...';

        await window.vaultManager.createVault(password);
        closeCreateVaultModal();
        showMainApp();
        showToast('Vault created successfully');
    } catch (err) {
        showToast('Failed to create vault');
    } finally {
        const btn = document.getElementById('confirmCreateBtn');
        btn.disabled = false;
        btn.textContent = 'Create Vault';
    }
}

// ============================================
// Search
// ============================================
function handleSearch() {
    currentSearch = searchInput.value;
    renderPasswordList();
}

// ============================================
// Password List Rendering
// ============================================
function renderPasswordList() {
    let entries = window.vaultManager.getEntriesByCategory(currentCategory);
    
    if (currentSearch) {
        entries = entries.filter(entry => {
            const searchFields = [
                entry.title,
                entry.username,
                entry.url,
                entry.notes,
                entry.cardHolder,
                entry.noteContent
            ];
            return searchFields.some(field => 
                field && field.toLowerCase().includes(currentSearch.toLowerCase())
            );
        });
    }

    // Sort by modified date (newest first)
    entries.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    if (entries.length === 0) {
        passwordList.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    passwordList.innerHTML = entries.map(entry => renderPasswordItem(entry)).join('');

    // Add click handlers
    passwordList.querySelectorAll('.password-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.item-action-btn')) {
                openViewEntryModal(item.dataset.id);
            }
        });
    });

    // Add copy handlers
    passwordList.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('.password-item').dataset.id;
            copyPasswordToClipboard(id);
        });
    });

    // Add edit handlers
    passwordList.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('.password-item').dataset.id;
            openEntryModal(id);
        });
    });
}

function renderPasswordItem(entry) {
    const icons = {
        login: '🔑',
        card: '💳',
        note: '📝'
    };

    const subtitles = {
        login: entry.username || entry.url || 'No details',
        card: entry.cardHolder || 'No cardholder',
        note: entry.noteContent ? entry.noteContent.substring(0, 50) + '...' : 'No content'
    };

    return `
        <div class="password-item" data-id="${entry.id}">
            <div class="password-item-icon">${icons[entry.type] || '🔑'}</div>
            <div class="password-item-info">
                <div class="password-item-title">
                    ${escapeHtml(entry.title || 'Untitled')}
                    ${entry.favorite ? '<span class="favorite-star">★</span>' : ''}
                </div>
                <div class="password-item-subtitle">${escapeHtml(subtitles[entry.type])}</div>
            </div>
            <div class="password-item-actions">
                ${entry.type === 'login' ? `
                    <button class="item-action-btn copy-btn" title="Copy password">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M10 2H14V12H10M2 4H10V14H2V4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                ` : ''}
                <button class="item-action-btn edit-btn" title="Edit">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11 2L14 5L5 14H2V11L11 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

async function copyPasswordToClipboard(id) {
    const entry = window.vaultManager.getEntry(id);
    if (!entry || !entry.password) {
        showToast('No password to copy');
        return;
    }

    try {
        await navigator.clipboard.writeText(entry.password);
        showToast('Password copied to clipboard');
    } catch (err) {
        showToast('Failed to copy password');
    }
}

// ============================================
// Entry Modal
// ============================================
function openEntryModal(id = null) {
    currentEntryId = id;
    const entry = id ? window.vaultManager.getEntry(id) : null;

    // Reset form
    document.getElementById('entryTitle').value = '';
    document.getElementById('entryUrl').value = '';
    document.getElementById('entryUsername').value = '';
    document.getElementById('entryPassword').value = '';
    document.getElementById('entryNotes').value = '';
    document.getElementById('cardTitle').value = '';
    document.getElementById('cardHolder').value = '';
    document.getElementById('cardNumber').value = '';
    document.getElementById('cardExpiry').value = '';
    document.getElementById('cardCvv').value = '';
    document.getElementById('cardNotes').value = '';
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('entryFavorite').checked = false;
    document.getElementById('entryId').value = '';

    // Set modal title and buttons
    document.getElementById('entryModalTitle').textContent = id ? 'Edit Entry' : 'Add New Entry';
    document.getElementById('deleteEntryBtn').style.display = id ? 'flex' : 'none';
    document.getElementById('saveEntryBtn').textContent = id ? 'Save Changes' : 'Save Entry';

    if (entry) {
        // Fill form with entry data
        currentEntryType = entry.type;
        document.getElementById('entryId').value = entry.id;
        document.getElementById('entryFavorite').checked = entry.favorite || false;

        // Set active tab
        document.querySelectorAll('.type-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === entry.type);
        });

        if (entry.type === 'login') {
            document.getElementById('entryTitle').value = entry.title || '';
            document.getElementById('entryUrl').value = entry.url || '';
            document.getElementById('entryUsername').value = entry.username || '';
            document.getElementById('entryPassword').value = entry.password || '';
            document.getElementById('entryNotes').value = entry.notes || '';
        } else if (entry.type === 'card') {
            document.getElementById('cardTitle').value = entry.title || '';
            document.getElementById('cardHolder').value = entry.cardHolder || '';
            document.getElementById('cardNumber').value = entry.cardNumber || '';
            document.getElementById('cardExpiry').value = entry.cardExpiry || '';
            document.getElementById('cardCvv').value = entry.cardCvv || '';
            document.getElementById('cardNotes').value = entry.notes || '';
        } else if (entry.type === 'note') {
            document.getElementById('noteTitle').value = entry.title || '';
            document.getElementById('noteContent').value = entry.noteContent || '';
        }
    } else {
        // New entry - reset to login type
        currentEntryType = 'login';
        document.querySelectorAll('.type-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === 'login');
        });
    }

    updateEntryFields();
    entryModal.classList.add('active');
}

function closeEntryModal() {
    entryModal.classList.remove('active');
    currentEntryId = null;
}

function updateEntryFields() {
    document.getElementById('loginFields').style.display = currentEntryType === 'login' ? 'block' : 'none';
    document.getElementById('cardFields').style.display = currentEntryType === 'card' ? 'block' : 'none';
    document.getElementById('noteFields').style.display = currentEntryType === 'note' ? 'block' : 'none';
}

async function handleSaveEntry() {
    let entryData = {
        type: currentEntryType,
        favorite: document.getElementById('entryFavorite').checked
    };

    if (currentEntryType === 'login') {
        entryData.title = document.getElementById('entryTitle').value.trim();
        entryData.url = document.getElementById('entryUrl').value.trim();
        entryData.username = document.getElementById('entryUsername').value.trim();
        entryData.password = document.getElementById('entryPassword').value;
        entryData.notes = document.getElementById('entryNotes').value.trim();

        if (!entryData.title) {
            showToast('Please enter a title');
            return;
        }
    } else if (currentEntryType === 'card') {
        entryData.title = document.getElementById('cardTitle').value.trim();
        entryData.cardHolder = document.getElementById('cardHolder').value.trim();
        entryData.cardNumber = document.getElementById('cardNumber').value.trim();
        entryData.cardExpiry = document.getElementById('cardExpiry').value.trim();
        entryData.cardCvv = document.getElementById('cardCvv').value;
        entryData.notes = document.getElementById('cardNotes').value.trim();

        if (!entryData.title) {
            showToast('Please enter a card name');
            return;
        }
    } else if (currentEntryType === 'note') {
        entryData.title = document.getElementById('noteTitle').value.trim();
        entryData.noteContent = document.getElementById('noteContent').value;

        if (!entryData.title) {
            showToast('Please enter a title');
            return;
        }
    }

    try {
        if (currentEntryId) {
            await window.vaultManager.updateEntry(currentEntryId, entryData);
            showToast('Entry updated');
        } else {
            await window.vaultManager.addEntry(entryData);
            showToast('Entry added');
        }

        closeEntryModal();
        updateCounts();
        renderPasswordList();
        
        // Trigger cloud auto-sync
        triggerAutoSync();
    } catch (err) {
        showToast('Failed to save entry');
    }
}

// ============================================
// Delete Entry
// ============================================
function openDeleteConfirmModal() {
    confirmDeleteModal.classList.add('active');
}

function closeDeleteConfirmModal() {
    confirmDeleteModal.classList.remove('active');
}

async function handleDeleteEntry() {
    if (!currentEntryId) return;

    try {
        await window.vaultManager.deleteEntry(currentEntryId);
        closeDeleteConfirmModal();
        closeEntryModal();
        updateCounts();
        renderPasswordList();
        showToast('Entry deleted');
        
        // Trigger cloud auto-sync
        triggerAutoSync();
    } catch (err) {
        showToast('Failed to delete entry');
    }
}

// ============================================
// View Entry Modal
// ============================================
function openViewEntryModal(id) {
    currentEntryId = id;
    const entry = window.vaultManager.getEntry(id);
    if (!entry) return;

    const icons = { login: '🔑', card: '💳', note: '📝' };
    const types = { login: 'Login', card: 'Credit Card', note: 'Secure Note' };

    document.getElementById('viewEntryIcon').textContent = icons[entry.type] || '🔑';
    document.getElementById('viewEntryTitle').textContent = entry.title || 'Untitled';
    document.getElementById('viewEntryType').textContent = types[entry.type] || 'Item';

    let contentHtml = '';

    if (entry.type === 'login') {
        if (entry.url) {
            contentHtml += renderViewField('Website', entry.url, true);
        }
        if (entry.username) {
            contentHtml += renderViewField('Username', entry.username, true);
        }
        if (entry.password) {
            contentHtml += renderViewField('Password', '••••••••••••', true, true, entry.password);
        }
        if (entry.notes) {
            contentHtml += renderViewField('Notes', entry.notes);
        }
    } else if (entry.type === 'card') {
        if (entry.cardHolder) {
            contentHtml += renderViewField('Cardholder', entry.cardHolder, true);
        }
        if (entry.cardNumber) {
            const masked = '•••• •••• •••• ' + entry.cardNumber.slice(-4);
            contentHtml += renderViewField('Card Number', masked, true, true, entry.cardNumber);
        }
        if (entry.cardExpiry) {
            contentHtml += renderViewField('Expiry', entry.cardExpiry, true);
        }
        if (entry.cardCvv) {
            contentHtml += renderViewField('CVV', '•••', true, true, entry.cardCvv);
        }
        if (entry.notes) {
            contentHtml += renderViewField('Notes', entry.notes);
        }
    } else if (entry.type === 'note') {
        if (entry.noteContent) {
            contentHtml += renderViewField('Note', entry.noteContent);
        }
    }

    document.getElementById('viewEntryContent').innerHTML = contentHtml;

    // Add copy handlers
    viewEntryModal.querySelectorAll('.copy-field-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const value = btn.dataset.value;
            try {
                await navigator.clipboard.writeText(value);
                showToast('Copied to clipboard');
            } catch {
                showToast('Failed to copy');
            }
        });
    });

    // Add reveal handlers
    viewEntryModal.querySelectorAll('.reveal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const valueEl = btn.closest('.view-field-value');
            const textEl = valueEl.querySelector('.field-text');
            const realValue = btn.dataset.value;
            
            if (btn.classList.contains('revealed')) {
                textEl.textContent = btn.dataset.masked;
                btn.classList.remove('revealed');
            } else {
                textEl.textContent = realValue;
                btn.classList.add('revealed');
            }
        });
    });

    viewEntryModal.classList.add('active');
}

function renderViewField(label, value, copyable = false, secret = false, realValue = null) {
    const displayValue = secret ? value : escapeHtml(value);
    const copyValue = realValue || value;
    
    return `
        <div class="view-field">
            <span class="view-field-label">${label}</span>
            <div class="view-field-value ${secret ? 'password' : ''}">
                <span class="field-text">${displayValue}</span>
                <div class="view-field-actions">
                    ${secret ? `
                        <button class="icon-btn reveal-btn" data-value="${escapeHtml(copyValue)}" data-masked="${displayValue}" title="Reveal">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 4C4 4 1.5 8 1.5 8C1.5 8 4 12 8 12C12 12 14.5 8 14.5 8C14.5 8 12 4 8 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                        </button>
                    ` : ''}
                    ${copyable ? `
                        <button class="icon-btn copy-field-btn" data-value="${escapeHtml(copyValue)}" title="Copy">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M10 2H14V12H10M2 4H10V14H2V4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function closeViewEntryModal() {
    viewEntryModal.classList.remove('active');
}

// ============================================
// Password Generator Modal
// ============================================
function openGeneratorModal() {
    generatorModal.classList.add('active');
    generateNewPassword();
}

function closeGeneratorModal() {
    generatorModal.classList.remove('active');
}

function generateNewPassword() {
    const options = {
        length: parseInt(document.getElementById('passwordLength').value),
        uppercase: document.getElementById('includeUppercase').checked,
        lowercase: document.getElementById('includeLowercase').checked,
        numbers: document.getElementById('includeNumbers').checked,
        symbols: document.getElementById('includeSymbols').checked
    };

    const password = window.cryptoManager.generatePassword(options);
    document.getElementById('generatedPassword').value = password;
}

function updatePasswordLength() {
    const length = document.getElementById('passwordLength').value;
    document.getElementById('lengthValue').textContent = length;
    generateNewPassword();
}

async function copyGeneratedPassword() {
    const password = document.getElementById('generatedPassword').value;
    try {
        await navigator.clipboard.writeText(password);
        showToast('Password copied');
    } catch {
        showToast('Failed to copy');
    }
}

function handleUseGeneratedPassword() {
    const password = document.getElementById('generatedPassword').value;
    document.getElementById('entryPassword').value = password;
    closeGeneratorModal();
    showToast('Password applied');
}

// ============================================
// Utility Functions
// ============================================
function togglePasswordField(input, button) {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    
    const eyeOpen = button.querySelector('.eye-open');
    const eyeClosed = button.querySelector('.eye-closed');
    
    if (eyeOpen && eyeClosed) {
        eyeOpen.style.display = isPassword ? 'none' : 'block';
        eyeClosed.style.display = isPassword ? 'block' : 'none';
    }
}

function updateCounts() {
    const counts = window.vaultManager.getCounts();
    
    document.getElementById('countAll').textContent = counts.all;
    document.getElementById('countFavorites').textContent = counts.favorites;
    document.getElementById('countLogin').textContent = counts.login;
    document.getElementById('countCard').textContent = counts.card;
    document.getElementById('countNote').textContent = counts.note;
    statTotal.textContent = counts.all;
}

function closeAllModals() {
    createVaultModal.classList.remove('active');
    entryModal.classList.remove('active');
    generatorModal.classList.remove('active');
    viewEntryModal.classList.remove('active');
    confirmDeleteModal.classList.remove('active');
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Card number formatting
document.getElementById('cardNumber')?.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(.{4})/g, '$1 ').trim();
    e.target.value = value.substring(0, 19);
});

// Expiry date formatting
document.getElementById('cardExpiry')?.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
});
