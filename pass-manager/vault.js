/**
 * ============================================
 * 🗄️ VAULT MANAGER MODULE
 * ============================================
 * Pass Manager - Vault Data Management
 * 
 * Features:
 * - Vault creation and management
 * - Entry CRUD operations
 * - Local storage with encryption
 * - File import/export
 * - Auto-lock on inactivity
 * 
 * Works with CryptoManager for all encryption
 * ============================================
 */

class VaultManager {
    constructor() {
        // Storage key - uses 'passManager' for global config integration
        this.STORAGE_KEY = 'passManager';
        this.SETTINGS_KEY = 'pass-manager-settings';
        
        // State
        this.vault = null;           // Encrypted vault structure
        this.entries = [];           // Decrypted entries (in memory only)
        this.isUnlocked = false;
        this.masterPassword = null;  // Kept in memory while unlocked
        
        // Auto-lock settings
        this.autoLockTimeout = 5 * 60 * 1000; // 5 minutes
        this.autoLockTimer = null;
        this.lastActivity = Date.now();
        
        // Load settings
        this.loadSettings();
        
        // Setup activity tracking
        this.setupActivityTracking();
        
        // Listen for config imports (from settings sync)
        window.addEventListener('configImported', () => {
            this.handleConfigImported();
        });
    }

    /**
     * Handle config imported event from settings sync
     */
    handleConfigImported() {
        // If vault is unlocked, lock it first for security
        if (this.isUnlocked) {
            this.lock();
            this.onAutoLock?.();
        }
        
        // Reload vault from storage
        this.vault = null;
        this.loadVaultFromStorage();
    }

    /**
     * Load user settings from localStorage
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem(this.SETTINGS_KEY);
            if (settings) {
                const parsed = JSON.parse(settings);
                this.autoLockTimeout = parsed.autoLockTimeout || this.autoLockTimeout;
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    }

    /**
     * Save user settings
     * @param {object} settings 
     */
    saveSettings(settings) {
        try {
            const current = this.getSettings();
            const updated = { ...current, ...settings };
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
            
            if (settings.autoLockTimeout !== undefined) {
                this.autoLockTimeout = settings.autoLockTimeout;
            }
        } catch (err) {
            console.error('Failed to save settings:', err);
        }
    }

    /**
     * Get current settings
     * @returns {object}
     */
    getSettings() {
        try {
            const settings = localStorage.getItem(this.SETTINGS_KEY);
            return settings ? JSON.parse(settings) : { autoLockTimeout: this.autoLockTimeout };
        } catch {
            return { autoLockTimeout: this.autoLockTimeout };
        }
    }

    /**
     * Setup activity tracking for auto-lock
     */
    setupActivityTracking() {
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        
        const updateActivity = () => {
            this.lastActivity = Date.now();
            this.resetAutoLockTimer();
        };

        events.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });

        // Check for inactivity periodically
        setInterval(() => {
            if (this.isUnlocked && this.autoLockTimeout > 0) {
                const inactive = Date.now() - this.lastActivity;
                if (inactive >= this.autoLockTimeout) {
                    this.lock();
                    this.onAutoLock?.();
                }
            }
        }, 10000); // Check every 10 seconds
    }

    /**
     * Reset auto-lock timer
     */
    resetAutoLockTimer() {
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
        }
        
        if (this.isUnlocked && this.autoLockTimeout > 0) {
            this.autoLockTimer = setTimeout(() => {
                this.lock();
                this.onAutoLock?.();
            }, this.autoLockTimeout);
        }
    }

    /**
     * Check if vault exists in storage
     * @returns {boolean}
     */
    hasVault() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (!data) return false;
        
        try {
            const parsed = JSON.parse(data);
            return parsed && parsed.vault && parsed.vault.data;
        } catch {
            return false;
        }
    }

    /**
     * Load encrypted vault from storage
     * @returns {object|null}
     */
    loadVaultFromStorage() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed && parsed.vault) {
                    this.vault = parsed.vault;
                    return this.vault;
                }
            }
        } catch (err) {
            console.error('Failed to load vault:', err);
        }
        return null;
    }

    /**
     * Save encrypted vault to storage
     * Uses the global passManager key for integration with settings sync
     */
    saveVaultToStorage() {
        if (this.vault) {
            try {
                const storageData = {
                    vault: this.vault,
                    lastModified: new Date().toISOString()
                };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
            } catch (err) {
                console.error('Failed to save vault:', err);
                throw new Error('Failed to save vault to storage');
            }
        }
    }

    /**
     * Create a new vault
     * @param {string} masterPassword 
     * @returns {Promise<boolean>}
     */
    async createVault(masterPassword) {
        try {
            const emptyData = {
                entries: [],
                createdAt: new Date().toISOString()
            };

            this.vault = await window.cryptoManager.createEncryptedVault(masterPassword, emptyData);
            this.saveVaultToStorage();
            
            // Auto-unlock after creation
            this.entries = [];
            this.masterPassword = masterPassword;
            this.isUnlocked = true;
            this.resetAutoLockTimer();
            
            return true;
        } catch (err) {
            console.error('Failed to create vault:', err);
            throw err;
        }
    }

    /**
     * Unlock vault with master password
     * @param {string} password 
     * @returns {Promise<boolean>}
     */
    async unlock(password) {
        if (!this.vault) {
            this.loadVaultFromStorage();
        }

        if (!this.vault) {
            throw new Error('No vault found');
        }

        try {
            const data = await window.cryptoManager.decryptVault(password, this.vault);
            this.entries = data.entries || [];
            this.masterPassword = password;
            this.isUnlocked = true;
            this.lastActivity = Date.now();
            this.resetAutoLockTimer();
            
            return true;
        } catch (err) {
            throw new Error('Invalid master password');
        }
    }

    /**
     * Lock the vault (clear sensitive data from memory)
     */
    lock() {
        this.entries = [];
        this.masterPassword = null;
        this.isUnlocked = false;
        
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
            this.autoLockTimer = null;
        }
    }

    /**
     * Save current entries to vault
     * @returns {Promise<void>}
     */
    async saveEntries() {
        if (!this.isUnlocked || !this.masterPassword) {
            throw new Error('Vault is locked');
        }

        try {
            const data = {
                entries: this.entries,
                createdAt: this.vault.created,
                modifiedAt: new Date().toISOString()
            };

            this.vault = await window.cryptoManager.updateVault(
                this.masterPassword,
                this.vault,
                data
            );
            
            this.saveVaultToStorage();
        } catch (err) {
            console.error('Failed to save entries:', err);
            throw err;
        }
    }

    /**
     * Add new entry
     * @param {object} entry 
     * @returns {Promise<object>} Created entry
     */
    async addEntry(entry) {
        if (!this.isUnlocked) {
            throw new Error('Vault is locked');
        }

        const newEntry = {
            id: window.cryptoManager.generateUUID(),
            ...entry,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };

        this.entries.push(newEntry);
        await this.saveEntries();
        
        return newEntry;
    }

    /**
     * Update existing entry
     * @param {string} id 
     * @param {object} updates 
     * @returns {Promise<object>} Updated entry
     */
    async updateEntry(id, updates) {
        if (!this.isUnlocked) {
            throw new Error('Vault is locked');
        }

        const index = this.entries.findIndex(e => e.id === id);
        if (index === -1) {
            throw new Error('Entry not found');
        }

        this.entries[index] = {
            ...this.entries[index],
            ...updates,
            modifiedAt: new Date().toISOString()
        };

        await this.saveEntries();
        return this.entries[index];
    }

    /**
     * Delete entry
     * @param {string} id 
     * @returns {Promise<void>}
     */
    async deleteEntry(id) {
        if (!this.isUnlocked) {
            throw new Error('Vault is locked');
        }

        const index = this.entries.findIndex(e => e.id === id);
        if (index === -1) {
            throw new Error('Entry not found');
        }

        this.entries.splice(index, 1);
        await this.saveEntries();
    }

    /**
     * Get entry by ID
     * @param {string} id 
     * @returns {object|null}
     */
    getEntry(id) {
        return this.entries.find(e => e.id === id) || null;
    }

    /**
     * Get all entries
     * @returns {array}
     */
    getAllEntries() {
        return [...this.entries];
    }

    /**
     * Get entries by category/type
     * @param {string} category 
     * @returns {array}
     */
    getEntriesByCategory(category) {
        if (category === 'all') {
            return this.getAllEntries();
        }
        if (category === 'favorites') {
            return this.entries.filter(e => e.favorite);
        }
        return this.entries.filter(e => e.type === category);
    }

    /**
     * Search entries
     * @param {string} query 
     * @returns {array}
     */
    searchEntries(query) {
        if (!query) {
            return this.getAllEntries();
        }

        const lowerQuery = query.toLowerCase();
        return this.entries.filter(entry => {
            const searchFields = [
                entry.title,
                entry.username,
                entry.url,
                entry.notes,
                entry.cardHolder,
                entry.noteContent
            ];

            return searchFields.some(field => 
                field && field.toLowerCase().includes(lowerQuery)
            );
        });
    }

    /**
     * Get entry counts by category
     * @returns {object}
     */
    getCounts() {
        return {
            all: this.entries.length,
            favorites: this.entries.filter(e => e.favorite).length,
            login: this.entries.filter(e => e.type === 'login').length,
            card: this.entries.filter(e => e.type === 'card').length,
            note: this.entries.filter(e => e.type === 'note').length
        };
    }

    /**
     * Export vault to file
     * @returns {string} Vault data as JSON string
     */
    exportVault() {
        if (!this.vault) {
            throw new Error('No vault to export');
        }
        return JSON.stringify(this.vault, null, 2);
    }

    /**
     * Download vault as file
     */
    downloadVault() {
        const data = this.exportVault();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `password-vault-${new Date().toISOString().slice(0,10)}.vault`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Import vault from file content
     * @param {string} fileContent 
     * @returns {object} Parsed vault
     */
    parseVaultFile(fileContent) {
        try {
            const vault = JSON.parse(fileContent);
            
            // Validate vault structure
            if (!vault.format || vault.format !== 'pass-manager-vault') {
                throw new Error('Invalid vault format');
            }
            if (!vault.encryption || !vault.data || !vault.iv) {
                throw new Error('Corrupted vault file');
            }
            
            return vault;
        } catch (err) {
            if (err.message.includes('Invalid') || err.message.includes('Corrupted')) {
                throw err;
            }
            throw new Error('Failed to parse vault file');
        }
    }

    /**
     * Import and unlock vault from file
     * @param {string} fileContent 
     * @param {string} password 
     * @returns {Promise<boolean>}
     */
    async importVault(fileContent, password) {
        const importedVault = this.parseVaultFile(fileContent);
        
        // Verify password works
        const data = await window.cryptoManager.decryptVault(password, importedVault);
        
        // Replace current vault
        this.vault = importedVault;
        this.saveVaultToStorage();
        
        // Unlock
        this.entries = data.entries || [];
        this.masterPassword = password;
        this.isUnlocked = true;
        this.resetAutoLockTimer();
        
        return true;
    }

    /**
     * Clear all data (dangerous!)
     */
    clearAll() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.SETTINGS_KEY);
        this.vault = null;
        this.entries = [];
        this.masterPassword = null;
        this.isUnlocked = false;
    }

    /**
     * Set callback for auto-lock event
     * @param {function} callback 
     */
    setAutoLockCallback(callback) {
        this.onAutoLock = callback;
    }
}

// Export singleton instance
window.vaultManager = new VaultManager();
