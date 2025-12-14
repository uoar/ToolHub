// ============================================
// Data Management Layer
// ============================================
class WheelDataManager {
    constructor() {
        this.wheels = [
            {
                id: 1,
                name: "Wheel 1",
                resultTitle: "Winner",
                inputs: [
                    { id: 1, text: "Yes", visible: true },
                    { id: 2, text: "No", visible: true },
                    { id: 3, text: "Maybe", visible: true }
                ],
                currentCycle: 1
            }
        ];
        this.currentWheelId = 1;
        this.settings = {
            duration: 3,
            sound: true,
            soundType: 'default',
            theme: 'default'
        };
    }
    
    // Get current wheel object
    getCurrentWheel() {
        return this.wheels.find(w => w.id === this.currentWheelId);
    }
    
    // Get current inputs (always return array)
    getInputs() {
        const wheel = this.getCurrentWheel();
        return wheel ? wheel.inputs : [];
    }
    
    // Get current cycle number
    // Update inputs
    setInputs(inputs) {
        const wheel = this.getCurrentWheel();
        if (wheel) {
            wheel.inputs = inputs;
        }
    }
    
    // Switch wheel
    switchWheel(wheelId) {
        const wheel = this.wheels.find(w => w.id === wheelId);
        if (wheel) {
            this.currentWheelId = wheelId;
            return true;
        }
        return false;
    }
    
    // Create new wheel
    createWheel(name, resultTitle = "Winner") {
        const newId = this.wheels.length > 0 ? Math.max(...this.wheels.map(w => w.id)) + 1 : 1;
        const newWheel = {
            id: newId,
            name: name,
            resultTitle: resultTitle,
            inputs: []
        };
        this.wheels.push(newWheel);
        return newId;
    }
    
    // Rename wheel
    renameWheel(wheelId, newName) {
        const wheel = this.wheels.find(w => w.id === wheelId);
        if (wheel) {
            wheel.name = newName;
            return true;
        }
        return false;
    }
    
    // Update wheel config (name and resultTitle)
    updateWheelConfig(wheelId, config) {
        const wheel = this.wheels.find(w => w.id === wheelId);
        if (wheel) {
            if (config.name !== undefined) wheel.name = config.name;
            if (config.resultTitle !== undefined) wheel.resultTitle = config.resultTitle;
            return true;
        }
        return false;
    }
    
    // Delete wheel
    deleteWheel(wheelId) {
        if (this.wheels.length <= 1) return false;
        
        this.wheels = this.wheels.filter(w => w.id !== wheelId);
        
        // If deleted current wheel, switch to first
        if (this.currentWheelId === wheelId) {
            this.currentWheelId = this.wheels[0].id;
        }
        return true;
    }
    
    // Export all data
    export() {
        // Only export useful settings
        const exportSettings = {
            duration: this.settings.duration,
            sound: this.settings.sound,
            soundType: this.settings.soundType,
            theme: this.settings.theme
        };
        
        return {
            wheels: this.wheels,
            currentWheelId: this.currentWheelId,
            settings: exportSettings
        };
    }
    
    // Import data (with validation)
    import(config) {
        try {
            // Support both old and new format
            if (config.wheels && Array.isArray(config.wheels) && config.wheels.length > 0) {
                this.wheels = config.wheels;
                this.currentWheelId = config.currentWheelId || this.wheels[0].id;
            } else if (config.inputs && Array.isArray(config.inputs)) {
                // Old format - convert
                this.wheels = [{
                    id: 1,
                    name: "Imported Wheel",
                    inputs: config.inputs,
                    currentCycle: config.currentCycle || 1
                }];
                this.currentWheelId = 1;
            } else {
                throw new Error('Invalid config format');
            }
            
            if (config.settings) {
                this.settings = { ...this.settings, ...config.settings };
            }
            
            // Validate current wheel exists
            if (!this.getCurrentWheel()) {
                this.currentWheelId = this.wheels[0].id;
            }
            
            return true;
        } catch (err) {
            console.error('Import failed:', err);
            return false;
        }
    }
}

// ============================================
// Legacy Global Variables (for gradual migration)
// ============================================
let dataManager = new WheelDataManager();

// Backward compatibility - these will be phased out
let wheels = dataManager.wheels;
let currentWheelId = dataManager.currentWheelId;
let inputs = dataManager.getInputs();
let settings = dataManager.settings;

let AUTO_SAVE_KEY = 'pickerWheel';
let DEBUG_LOG_KEY = 'pickerWheel_debugLog';
let lastWinnerId = null;
let isImporting = false; // Flag to prevent event loops during import

// Debug logging system - persists to localStorage
function debugLog(message) {
    const timestamp = performance.now().toFixed(0);
    const logEntry = `[${timestamp}ms] ${message}`;
    console.log(logEntry);
    
    try {
        let logs = JSON.parse(localStorage.getItem(DEBUG_LOG_KEY) || '[]');
        logs.push(logEntry);
        if (logs.length > 100) logs = logs.slice(-100);
        localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(logs));
    } catch (e) {
        // Silent fail
    }
}

// Call this after page reload to see logs from crashed session
function showDebugLogs() {
    const logs = JSON.parse(localStorage.getItem(DEBUG_LOG_KEY) || '[]');
    console.log('=== CRASH DEBUG LOGS ===');
    logs.forEach(log => console.log(log));
    console.log('=== END ===');
    return logs;
}

function clearDebugLogs() {
    localStorage.removeItem(DEBUG_LOG_KEY);
}




// Constants & Variables
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
let currentAngle = 0;
let isSpinning = false;
let spinVelocity = 0;
let spinDeceleration = 0;
let animationId = null;
let lastTickAngle = 0;

// Audio Context
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
let lastSoundTime = 0;

// DOM Elements
const inputListEl = document.getElementById('inputList');
const newItemInput = document.getElementById('newItemInput');
const addBtn = document.getElementById('addBtn');
const spinBtn = document.getElementById('spinBtn');
const resultModal = document.getElementById('resultModal');
const winnerResult = document.getElementById('winnerResult');
const closeResultBtn = document.getElementById('closeResultBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const wheelSelect = document.getElementById('wheelSelect');
const renameWheelBtn = document.getElementById('renameWheelBtn');
const newWheelBtn = document.getElementById('newWheelBtn');
const deleteWheelBtn = document.getElementById('deleteWheelBtn');

// Theme - Mac渐变系配色，类似macOS Big Sur壁纸
const themes = {
    default: [
        '#FFB4C8',  // 粉红
        '#C4B5FF',  // 淡紫
        '#B4E1FF',  // 浅蓝
        '#B4FFE1',  // 青绿
        '#FFDAB4'   // 暖杏色
    ]
};

// Initialization
function init() {
    loadAutoSave();
    resizeCanvas();
    renderWheelSelector();
    renderList();
    drawWheel();
    setupEventListeners();
    loadSettingsUI(); // Load settings to UI
    
    // Cloud status click handler
    const cloudStatus = document.querySelector('.header-status');
    if (cloudStatus) {
        cloudStatus.addEventListener('click', () => {
            if (cloudStatus.classList.contains('clickable')) {
                navigateToCloudSettings();
            }
        });
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        resizeCanvas();
        drawWheel();
    });
    
    // Auto-save to localStorage every 10 seconds
    setInterval(() => {
        const data = dataManager.export();
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
    }, 10000);
    
    // Save data when page is closing
    window.addEventListener('beforeunload', () => {
        const data = dataManager.export();
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
    });
}

// Wheel Management Functions
function loadWheel(wheelId) {
    if (isImporting) return; // Don't process during import
    
    // Switch wheel using dataManager
    const success = dataManager.switchWheel(wheelId);
    if (!success) return;
    
    // Update legacy globals
    currentWheelId = dataManager.currentWheelId;
    inputs = dataManager.getInputs();
    
    // Update UI
    renderWheelSelector(); // Update selector display
    renderList();  // renderList calls drawWheel internally
    
}

function renderWheelSelector() {
    if (!wheelSelect) return;
    
    try {
        const selectText = wheelSelect.querySelector('.select-text');
        const selectOptions = wheelSelect.querySelector('.select-options');
        
        if (!selectText || !selectOptions) return;
        
        // Clear options
        selectOptions.innerHTML = '';
        
        // Update display text
        const currentWheel = wheels.find(w => w.id === currentWheelId);
        if (currentWheel) {
            selectText.textContent = currentWheel.name || `Wheel ${currentWheel.id}`;
        }
        
        // Populate dropdown options
        wheels.forEach(wheel => {
            const option = document.createElement('div');
            option.className = 'select-option';
            option.setAttribute('data-value', wheel.id);
            option.textContent = wheel.name || `Wheel ${wheel.id}`;
            
            if (wheel.id === currentWheelId) {
                option.classList.add('selected');
            }
            
            option.addEventListener('click', () => {
                if (isImporting) return; // Skip during import
                loadWheel(wheel.id);
                closeCustomSelect();
            });
            
            selectOptions.appendChild(option);
        });
    } catch (err) {
        console.error('renderWheelSelector failed:', err);
    }
}

function closeCustomSelect() {
    if (wheelSelect) {
        wheelSelect.classList.remove('open');
    }
}

function createNewWheel() {
    // Show modal
    document.getElementById('newWheelModal').style.display = 'flex';
    const nameInput = document.getElementById('newWheelInput');
    const titleInput = document.getElementById('newWheelResultTitleInput');
    
    // Generate name based on max ID + 1
    const nextNumber = dataManager.wheels.length > 0 
        ? Math.max(...dataManager.wheels.map(w => w.id)) + 1 
        : 1;
    nameInput.value = `Wheel ${nextNumber}`;
    titleInput.value = "Winner";
    nameInput.focus();
    nameInput.select();
}

function editCurrentWheel() {
    const wheel = dataManager.getCurrentWheel();
    if (!wheel) return;
    
    // Show modal
    document.getElementById('editWheelModal').style.display = 'flex';
    const nameInput = document.getElementById('editWheelNameInput');
    const titleInput = document.getElementById('editResultTitleInput');
    nameInput.value = wheel.name;
    titleInput.value = wheel.resultTitle || "";
    nameInput.focus();
    nameInput.select();
}

function deleteCurrentWheel() {
    if (dataManager.wheels.length <= 1) {
        showToast('Cannot delete the last wheel');
        return;
    }
    
    const wheel = dataManager.getCurrentWheel();
    if (!wheel) return;
    
    // Show delete confirmation modal
    document.getElementById('deleteWheelName').textContent = wheel.name;
    document.getElementById('deleteWheelModal').style.display = 'flex';
}

function loadSettingsUI() {
    // Load all settings to UI
    try {
        document.getElementById('durationRange').value = settings.duration;
        document.getElementById('durationValue').textContent = settings.duration + 's';
        document.getElementById('soundToggle').checked = settings.sound;
    } catch (err) {
        console.error('Failed to load settings UI:', err);
    }
}

function loadAutoSave() {
    try {
        const saved = localStorage.getItem(AUTO_SAVE_KEY);
        if (!saved) return;
        
        const data = JSON.parse(saved);
        
        // Use dataManager to import
        const success = dataManager.import(data);
        
        if (success) {
            // Sync legacy globals
            wheels = dataManager.wheels;
            currentWheelId = dataManager.currentWheelId;
            inputs = dataManager.getInputs();
            settings = dataManager.settings;
        }
    } catch (err) {
        console.error('Failed to load auto-save:', err);
        localStorage.removeItem(AUTO_SAVE_KEY);
    }
}

function resizeCanvas() {
    // Make canvas high resolution
    const container = document.querySelector('.wheel-container');
    const size = container.clientWidth;
    canvas.width = size * 2; // Retina support
    canvas.height = size * 2;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(2, 2);
}

// Core Logic: Draw Wheel
function drawWheel() {
    const size = canvas.width / 2; // Actual size in context (since we scaled by 2)
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10; // Padding

    ctx.clearRect(0, 0, size, size);

    const visibleInputs = inputs.filter(i => i.visible);
    const totalSegments = visibleInputs.length;

    if (totalSegments === 0) {
        // Draw empty state
        ctx.fillStyle = '#f5f5f7';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#d2d2d7';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
    }

    const arcSize = (2 * Math.PI) / totalSegments;

    visibleInputs.forEach((item, index) => {
        // Offset by -PI/2 to start from top (12 o'clock position)
        const angle = currentAngle + (index * arcSize) - Math.PI / 2;
        
        // Draw segment
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
        
        const segmentColor = getColor(index);
        ctx.fillStyle = segmentColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.save();

        // Draw text
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + arcSize / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#1C1C1E"; // 深灰色文字，保证对比度
        
        // Adjust font size based on text length
        const maxLength = 15;
        let fontSize = 16;
        if (item.text.length > maxLength) {
            fontSize = Math.max(12, 16 - (item.text.length - maxLength) * 0.5);
        }
        
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 4;
        
        // Truncate text if too long
        let displayText = item.text;
        if (item.text.length > 20) {
            displayText = item.text.substring(0, 17) + '...';
        }
        
        ctx.fillText(displayText, radius - 25, 5);
        ctx.restore();
    });
}

function getColor(index) {
    const palette = themes[settings.theme] || themes.default;
    const paletteSize = palette.length; // 5 colors (prime number)
    
    // Use step 2 with 5 colors: 0,2,4,1,3,0,2,4,1,3...
    // Guarantees no adjacent colors are ever the same
    const step = 2;
    return palette[(index * step) % paletteSize];
}

// Core Logic: Spin
function spin() {
    console.log('Spin function called');
    console.log('isSpinning:', isSpinning);
    console.log('inputs:', inputs);
    
    if (isSpinning) return;
    
    // Get visible items - these are the items that can be picked
    const availableInputs = inputs.filter(i => i.visible);
    
    if (availableInputs.length === 0) {
        return; // Silently return if no visible items
    }

    isSpinning = true;
    spinBtn.disabled = true;
    
    // Calculate random stop angle
    const minRotations = 5 * 2; // settings.speed fixed at 2
    const randomOffset = Math.random() * 2 * Math.PI;
    const totalRotation = (minRotations * 2 * Math.PI) + randomOffset;
    
    // We want to cover 'totalRotation' in 'settings.duration' seconds with ease-out.
    // EaseOutCubic: pos = end * (1 - (1-t)^3)
    
    let startTime = null;
    const startAngle = currentAngle;
    const numSegments = availableInputs.length;

    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = (timestamp - startTime) / 1000; // seconds
        
        if (elapsed < settings.duration) {
            // Ease out cubic
            const t = elapsed / settings.duration;
            const ease = 1 - Math.pow(1 - t, 3);
            
            const newAngle = startAngle + (totalRotation * ease);
            
            // Sound check
            // Check if we crossed a segment boundary
            const segmentAngle = (2 * Math.PI) / numSegments;
            // Normalize angles for tick check is hard with absolute increasing angle.
            // Just check if Math.floor(newAngle / segmentAngle) > Math.floor(currentAngle / segmentAngle)
            // But we need to account for the pointer position.
            // Actually, just playing a sound every X radians is good enough for "ticking".
            if (settings.sound) {
                const tickInterval = segmentAngle;
                if (Math.floor(newAngle / tickInterval) > Math.floor(currentAngle / tickInterval)) {
                    playSound();
                }
            }

            currentAngle = newAngle;
            drawWheel();
            animationId = requestAnimationFrame(animate);
        } else {
            // Stop
            currentAngle = startAngle + totalRotation;
            drawWheel();
            isSpinning = false;
            spinBtn.disabled = false;
            determineWinner();
        }
    }
    
    requestAnimationFrame(animate);
}

function determineWinner() {
    const availableInputs = inputs.filter(i => i.visible);
    const totalSegments = availableInputs.length;
    const arcSize = (2 * Math.PI) / totalSegments;
    
    // Normalize current angle to 0-2PI
    let normalizedAngle = currentAngle % (2 * Math.PI);
    if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
    
    // Pointer is at TOP (-PI/2 position)
    // Index 0 starts at currentAngle - PI/2
    // We need to find which index's arc contains the -PI/2 position
    // The arc for index i goes from: (currentAngle + i*arcSize - PI/2) to (currentAngle + (i+1)*arcSize - PI/2)
    // We want to find i where: currentAngle + i*arcSize - PI/2 <= -PI/2 (mod 2PI)
    // This simplifies to: i*arcSize <= 0 (mod 2PI), meaning we look at currentAngle
    
    // The segment at the pointer position (top) is determined by:
    const winningIndex = totalSegments - Math.floor(normalizedAngle / arcSize) - 1;
    const adjustedIndex = (winningIndex % totalSegments + totalSegments) % totalSegments;
    
    const winner = availableInputs[adjustedIndex];
    
    showResult(winner);
}

function showResult(winner) {
    lastWinnerId = winner.id;
    
    // Update result title from current wheel config
    const wheel = dataManager.getCurrentWheel();
    const modalTitle = document.querySelector('#resultModal .modal-title');
    if (modalTitle && wheel) {
        modalTitle.textContent = wheel.resultTitle || "Winner";
    }
    
    winnerResult.textContent = winner.text;
    resultModal.style.display = 'flex';
    
    // Show/hide remove button based on selection status
    const removeBtn = document.getElementById('removeWinnerBtn');
    if (removeBtn) {
        removeBtn.style.display = 'block';
    }
}

function playSound() {
    // Throttle: prevent triggering within 10ms
    const now = Date.now();
    if (now - lastSoundTime < 10) return;
    lastSoundTime = now;
    
    // Resume AudioContext if suspended and wait for it to complete
    const resumeAndPlay = async () => {
        try {
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            
            // Create a more elegant iOS-style tick sound
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();
            
            // Use sine wave for cleaner sound
            oscillator.type = 'sine';
            
            // Higher, more pleasant frequency (like iOS keyboard click)
            oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.02);
            
            // Soft, quick envelope
            gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.03);
            
            // Low-pass filter for warmth
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, audioCtx.currentTime);
            filter.Q.setValueAtTime(1, audioCtx.currentTime);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.03);
        } catch (error) {
            console.error('playSound error:', error);
        }
    };
    
    resumeAndPlay();
}

// Input Management
function renderList() {
    inputListEl.innerHTML = '';
    
    if (inputs.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.style.padding = '40px 20px';
        emptyState.style.textAlign = 'center';
        emptyState.style.color = 'var(--text-secondary)';
        emptyState.innerHTML = 'No choices yet. Add some above!';
        inputListEl.appendChild(emptyState);
        drawWheel();
        return;
    }
    
    inputs.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <label class="item-checkbox-label">
                <input type="checkbox" class="item-checkbox" data-id="${item.id}" ${item.visible ? 'checked' : ''}>
                <span class="item-checkbox-custom"></span>
            </label>
            <span class="item-text">${escapeHtml(item.text)}</span>
            <div class="item-actions">
                <span class="remove-item" data-id="${item.id}">&times;</span>
            </div>
        `;
        inputListEl.appendChild(li);
    });
    
    drawWheel();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function addInput() {
    const text = newItemInput.value.trim();
    if (!text) {
        newItemInput.focus();
        return;
    }
    
    // Check for duplicates
    if (inputs.some(item => item.text.toLowerCase() === text.toLowerCase())) {
        return; // Silently ignore duplicates
    }
    
    const newId = inputs.length > 0 ? Math.max(...inputs.map(i => i.id)) + 1 : 1;
    const colorIndex = inputs.length;
    
    inputs.push({
        id: newId,
        text: text,
        visible: true
    });
    
    newItemInput.value = '';
    newItemInput.focus();
    
    renderList();
}

function removeInput(id) {
    inputs = inputs.filter(i => i.id !== id);
    const wheel = wheels.find(w => w.id === currentWheelId);
    if (wheel) wheel.inputs = inputs;
    
    renderList();
}

// Event Listeners
function setupEventListeners() {
    // Custom Select - Toggle dropdown
    const selectTrigger = wheelSelect.querySelector('.select-trigger');
    if (selectTrigger) {
        selectTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            wheelSelect.classList.toggle('open');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!wheelSelect.contains(e.target)) {
            closeCustomSelect();
        }
    });
    
    renameWheelBtn.addEventListener('click', editCurrentWheel);
    newWheelBtn.addEventListener('click', createNewWheel);
    deleteWheelBtn.addEventListener('click', deleteCurrentWheel);
    
    // Spin
    spinBtn.addEventListener('click', spin);
    
    // Inputs
    addBtn.addEventListener('click', addInput);
    newItemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addInput();
    });
    
    inputListEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            removeInput(id);
        }
    });
    
    inputListEl.addEventListener('change', (e) => {
        if (isImporting) return; // Skip during import
        if (e.target.classList.contains('item-checkbox')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            const item = inputs.find(i => i.id === id);
            if (item) {
                item.visible = e.target.checked;
                
                drawWheel();
            }
        }
    });
    
    // Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
        });
    });
    
    // Settings
    document.getElementById('durationRange').addEventListener('input', (e) => {
        if (isImporting) return; // Skip during import
        settings.duration = parseInt(e.target.value);
        document.getElementById('durationValue').textContent = settings.duration + 's';
        
    });
    
    document.getElementById('soundToggle').addEventListener('change', (e) => {
        if (isImporting) return; // Skip during import
        settings.sound = e.target.checked;
        
    });
    
    // Modal
    closeResultBtn.addEventListener('click', () => {
        resultModal.style.display = 'none';
        lastWinnerId = null;
    });
    
    const removeWinnerBtn = document.getElementById('removeWinnerBtn');
    if (removeWinnerBtn) {
        removeWinnerBtn.addEventListener('click', () => {
            if (lastWinnerId !== null) {
                // Uncheck the checkbox to remove from wheel
                const item = inputs.find(i => i.id === lastWinnerId);
                if (item) {
                    item.visible = false;
                    
                    renderList();
                    drawWheel();
                }
            }
            resultModal.style.display = 'none';
            lastWinnerId = null;
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            resultModal.style.display = 'none';
            lastWinnerId = null;
        }
    });
    
    // Edit Wheel Modal
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        document.getElementById('editWheelModal').style.display = 'none';
    });
    
    document.getElementById('confirmEditBtn').addEventListener('click', () => {
        const newName = document.getElementById('editWheelNameInput').value.trim();
        const newTitle = document.getElementById('editResultTitleInput').value.trim();
        
        if (!newName) {
            document.getElementById('editWheelModal').style.display = 'none';
            return;
        }
        
        dataManager.updateWheelConfig(dataManager.currentWheelId, {
            name: newName,
            resultTitle: newTitle || "Winner"
        });
        renderWheelSelector();
        document.getElementById('editWheelModal').style.display = 'none';
    });
    
    document.getElementById('editWheelModal').addEventListener('click', (e) => {
        if (e.target.id === 'editWheelModal') {
            document.getElementById('editWheelModal').style.display = 'none';
        }
    });
    
    // New Wheel Modal
    document.getElementById('cancelNewWheelBtn').addEventListener('click', () => {
        document.getElementById('newWheelModal').style.display = 'none';
    });
    
    document.getElementById('confirmNewWheelBtn').addEventListener('click', () => {
        const name = document.getElementById('newWheelInput').value.trim();
        const resultTitle = document.getElementById('newWheelResultTitleInput').value.trim();
        if (!name) {
            document.getElementById('newWheelModal').style.display = 'none';
            return;
        }
        
        const newId = dataManager.createWheel(name, resultTitle || "Winner");
        wheels = dataManager.wheels;
        renderWheelSelector();
        wheelSelect.value = newId;
        loadWheel(newId);
        document.getElementById('newWheelModal').style.display = 'none';
    });
    
    document.getElementById('newWheelModal').addEventListener('click', (e) => {
        if (e.target.id === 'newWheelModal') {
            document.getElementById('newWheelModal').style.display = 'none';
        }
    });
    
    // Enter key support for modals
    document.getElementById('editWheelNameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('confirmEditBtn').click();
        }
    });
    
    document.getElementById('editResultTitleInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('confirmEditBtn').click();
        }
    });
    
    document.getElementById('newWheelInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('confirmNewWheelBtn').click();
        }
    });
    
    document.getElementById('newWheelResultTitleInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('confirmNewWheelBtn').click();
        }
    });
    
    // Keyboard shortcut: Ctrl+S / Cmd+S (removed manual save, now does nothing)
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            // Manual save removed, shortcut disabled
        }
    });
}

// ============================================
// File Reading Utility
// ============================================
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // DataURL format: data:application/json;base64,xxxxx
                const dataUrl = e.target.result;
                const base64 = dataUrl.split(',')[1];
                const jsonText = atob(base64);
                resolve(jsonText);
            } catch (err) {
                reject(new Error('Failed to decode file: ' + err.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
}

function exportConfig() {
    // Export from client-side
    const config = dataManager.export();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    console.log('✅ Configuration exported');
}

function importConfig(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📁 File selected:', file.name, file.size, 'bytes');
    
    // ALTERNATIVE APPROACH: Read as ArrayBuffer, decode manually
    const reader = new FileReader();
    
    reader.onload = function(e) {
        console.log('📥 FileReader onload triggered');
        
        let jsonText;
        try {
            // Read as ArrayBuffer
            const arrayBuffer = e.target.result;
            
            // Decode UTF-8 manually using TextDecoder (more stable than atob)
            const decoder = new TextDecoder('utf-8');
            jsonText = decoder.decode(arrayBuffer);
            
            console.log('📥 File decoded using TextDecoder, length:', jsonText.length);
        } catch (decodeErr) {
            console.error('❌ Decode failed:', decodeErr);
            event.target.value = '';
            return;
        }
        
        // Process import
        try {
            processImport(jsonText);
            event.target.value = '';
        } catch (importErr) {
            console.error('❌ Import failed:', importErr);
            event.target.value = '';
        }
    };
    
    reader.onerror = function(err) {
        console.error('❌ FileReader error:', err);
        event.target.value = '';
    };
    
    console.log('📥 Starting FileReader.readAsArrayBuffer...');
    // Use readAsArrayBuffer instead of readAsDataURL
    reader.readAsArrayBuffer(file);
}

function processImport(jsonText) {
    try {
        console.log('📥 Processing import, text length:', jsonText.length);
        
        const config = JSON.parse(jsonText);
        console.log('✅ JSON parsed successfully');
        
        // Cancel animations
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        isSpinning = false;
        spinBtn.disabled = false;
        
        // Import data
        isImporting = true;
        const success = dataManager.import(config);
        
        if (!success) {
            throw new Error('Import validation failed');
        }
        
        console.log('✅ Data imported to dataManager');
        
        // Sync globals
        wheels = dataManager.wheels;
        currentWheelId = dataManager.currentWheelId;
        inputs = dataManager.getInputs();
        currentCycle = dataManager.getCurrentCycle();
        settings = dataManager.settings;
        
        console.log('✅ Globals synced, wheels:', wheels.length, 'inputs:', inputs.length);
        
        // Update settings UI directly (no delay)
        try {
            document.getElementById('durationRange').value = settings.duration;
            document.getElementById('durationValue').textContent = settings.duration + 's';
            document.getElementById('soundToggle').checked = settings.sound;
            console.log('✅ Settings UI updated');
        } catch (err) {
            console.error('Settings UI error:', err);
        }
        
        // Update wheel selector
        try {
            renderWheelSelector();
            console.log('✅ Wheel selector rendered');
        } catch (err) {
            console.error('Wheel selector error:', err);
        }
        
        // Update input list
        try {
            renderList();
            console.log('✅ Input list rendered');
        } catch (err) {
            console.error('Input list error:', err);
        }
        
        // Update cycle info
        try {
            console.log('✅ Cycle info updated (removed)');
        } catch (err) {
            console.error('Cycle info error:', err);
        }
        
        // Save to localStorage directly (don't use autoSave to avoid crashes)
        try {
            const data = dataManager.export();
            localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
            console.log('✅ Saved to localStorage');
        } catch (err) {
            console.error('Save error:', err);
        }
        
        console.log('✅ Import complete!');
        
        // Clear flag immediately - same as Paste Import behavior
        isImporting = false;
        console.log('✅ isImporting flag cleared');
        
    } catch (err) {
        console.error('❌ Import error:', err);
        isImporting = false;
    }
}

// Start
init();

// Toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Delete Wheel Confirmation
document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    document.getElementById('deleteWheelModal').style.display = 'none';
});

document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    document.getElementById('deleteWheelModal').style.display = 'none';
    
    // Actually delete the wheel
    const deleted = dataManager.deleteWheel(dataManager.currentWheelId);
    
    if (deleted) {
        // Update legacy globals from dataManager
        wheels = dataManager.wheels;
        currentWheelId = dataManager.currentWheelId;
        inputs = dataManager.getInputs();
        
        // Refresh all UI
        renderWheelSelector();
        renderList();  // This will also call drawWheel
        
        // Save to localStorage
        const data = dataManager.export();
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
    }
});
