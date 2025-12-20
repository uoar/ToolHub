/**
 * ============================================
 * 🔐 CRYPTOGRAPHY MODULE
 * ============================================
 * Pass Manager - Secure Encryption Engine
 * 
 * Security Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - PBKDF2-SHA256 key derivation (600,000 iterations)
 * - Cryptographically secure random values
 * - Zero-knowledge architecture
 * 
 * Based on Web Crypto API (native browser support)
 * ============================================
 */

class CryptoManager {
    constructor() {
        // Encryption settings (industry standards)
        this.ALGORITHM = 'AES-GCM';
        this.KEY_LENGTH = 256;
        this.IV_LENGTH = 12; // 96 bits for GCM
        this.SALT_LENGTH = 32; // 256 bits
        this.TAG_LENGTH = 128; // GCM auth tag
        this.ITERATIONS = 600000; // OWASP recommended minimum
        this.HASH_ALGORITHM = 'SHA-256';
    }

    /**
     * Generate cryptographically secure random bytes
     * @param {number} length - Number of bytes
     * @returns {Uint8Array} Random bytes
     */
    generateRandomBytes(length) {
        return crypto.getRandomValues(new Uint8Array(length));
    }

    /**
     * Generate a random salt for key derivation
     * @returns {Uint8Array} 32-byte salt
     */
    generateSalt() {
        return this.generateRandomBytes(this.SALT_LENGTH);
    }

    /**
     * Generate a random IV for encryption
     * @returns {Uint8Array} 12-byte IV
     */
    generateIV() {
        return this.generateRandomBytes(this.IV_LENGTH);
    }

    /**
     * Convert ArrayBuffer to Base64 string
     * @param {ArrayBuffer|Uint8Array} buffer 
     * @returns {string} Base64 encoded string
     */
    bufferToBase64(buffer) {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert Base64 string to Uint8Array
     * @param {string} base64 
     * @returns {Uint8Array}
     */
    base64ToBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Derive encryption key from master password using PBKDF2
     * @param {string} password - Master password
     * @param {Uint8Array} salt - Random salt
     * @returns {Promise<CryptoKey>} Derived key for AES-GCM
     */
    async deriveKey(password, salt) {
        // Import password as key material
        const passwordBuffer = new TextEncoder().encode(password);
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        // Derive AES key using PBKDF2
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.ITERATIONS,
                hash: this.HASH_ALGORITHM
            },
            keyMaterial,
            {
                name: this.ALGORITHM,
                length: this.KEY_LENGTH
            },
            false, // Not extractable
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt data using AES-256-GCM
     * @param {string} plaintext - Data to encrypt
     * @param {CryptoKey} key - Encryption key
     * @returns {Promise<{iv: string, ciphertext: string}>} Encrypted data
     */
    async encrypt(plaintext, key) {
        const iv = this.generateIV();
        const encodedData = new TextEncoder().encode(plaintext);

        const ciphertext = await crypto.subtle.encrypt(
            {
                name: this.ALGORITHM,
                iv: iv,
                tagLength: this.TAG_LENGTH
            },
            key,
            encodedData
        );

        return {
            iv: this.bufferToBase64(iv),
            ciphertext: this.bufferToBase64(ciphertext)
        };
    }

    /**
     * Decrypt data using AES-256-GCM
     * @param {string} ciphertextBase64 - Encrypted data (Base64)
     * @param {string} ivBase64 - Initialization vector (Base64)
     * @param {CryptoKey} key - Decryption key
     * @returns {Promise<string>} Decrypted plaintext
     * @throws {Error} If decryption fails (wrong password or tampered data)
     */
    async decrypt(ciphertextBase64, ivBase64, key) {
        const iv = this.base64ToBuffer(ivBase64);
        const ciphertext = this.base64ToBuffer(ciphertextBase64);

        try {
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: this.ALGORITHM,
                    iv: iv,
                    tagLength: this.TAG_LENGTH
                },
                key,
                ciphertext
            );

            return new TextDecoder().decode(decryptedBuffer);
        } catch (error) {
            // GCM authentication failed - wrong password or tampered data
            throw new Error('Decryption failed: Invalid password or corrupted data');
        }
    }

    /**
     * Create encrypted vault file structure
     * @param {string} password - Master password
     * @param {object} data - Vault data to encrypt
     * @returns {Promise<object>} Encrypted vault structure
     */
    async createEncryptedVault(password, data) {
        const salt = this.generateSalt();
        const key = await this.deriveKey(password, salt);
        const plaintext = JSON.stringify(data);
        const encrypted = await this.encrypt(plaintext, key);

        return {
            version: '1.0',
            format: 'pass-manager-vault',
            encryption: {
                algorithm: 'AES-256-GCM',
                kdf: 'PBKDF2-SHA256',
                iterations: this.ITERATIONS,
                salt: this.bufferToBase64(salt)
            },
            iv: encrypted.iv,
            data: encrypted.ciphertext,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
    }

    /**
     * Decrypt vault file
     * @param {string} password - Master password
     * @param {object} vault - Encrypted vault structure
     * @returns {Promise<object>} Decrypted vault data
     * @throws {Error} If password is wrong or data is corrupted
     */
    async decryptVault(password, vault) {
        // Validate vault format
        if (!vault.encryption || !vault.iv || !vault.data) {
            throw new Error('Invalid vault format');
        }

        const salt = this.base64ToBuffer(vault.encryption.salt);
        
        // Use stored iterations if available, otherwise use current default
        const iterations = vault.encryption.iterations || this.ITERATIONS;
        
        // Temporarily set iterations for decryption
        const originalIterations = this.ITERATIONS;
        this.ITERATIONS = iterations;
        
        try {
            const key = await this.deriveKey(password, salt);
            const decryptedJson = await this.decrypt(vault.data, vault.iv, key);
            return JSON.parse(decryptedJson);
        } finally {
            // Restore original iterations
            this.ITERATIONS = originalIterations;
        }
    }

    /**
     * Update encrypted vault with new data
     * @param {string} password - Master password
     * @param {object} existingVault - Existing vault structure (for salt reuse)
     * @param {object} newData - New data to encrypt
     * @returns {Promise<object>} Updated encrypted vault
     */
    async updateVault(password, existingVault, newData) {
        const salt = this.base64ToBuffer(existingVault.encryption.salt);
        const key = await this.deriveKey(password, salt);
        const plaintext = JSON.stringify(newData);
        const encrypted = await this.encrypt(plaintext, key);

        return {
            ...existingVault,
            iv: encrypted.iv,
            data: encrypted.ciphertext,
            modified: new Date().toISOString()
        };
    }

    /**
     * Verify master password without fully decrypting
     * (Attempts decryption - GCM will fail if password is wrong)
     * @param {string} password - Password to verify
     * @param {object} vault - Encrypted vault
     * @returns {Promise<boolean>} True if password is correct
     */
    async verifyPassword(password, vault) {
        try {
            await this.decryptVault(password, vault);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Calculate password strength (0-4 scale)
     * @param {string} password 
     * @returns {{score: number, label: string, color: string}}
     */
    calculatePasswordStrength(password) {
        let score = 0;
        
        if (!password) {
            return { score: 0, label: 'Enter a password', color: '#8E8E93' };
        }

        // Length checks
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (password.length >= 16) score++;

        // Character type checks
        if (/[a-z]/.test(password)) score += 0.5;
        if (/[A-Z]/.test(password)) score += 0.5;
        if (/[0-9]/.test(password)) score += 0.5;
        if (/[^a-zA-Z0-9]/.test(password)) score += 0.5;

        // Variety bonus
        const uniqueChars = new Set(password).size;
        if (uniqueChars >= password.length * 0.7) score += 0.5;

        // Normalize to 0-4 scale
        score = Math.min(4, Math.floor(score));

        const levels = [
            { label: 'Very Weak', color: '#FF3B30' },
            { label: 'Weak', color: '#FF9500' },
            { label: 'Fair', color: '#FFCC00' },
            { label: 'Strong', color: '#30D158' },
            { label: 'Very Strong', color: '#007AFF' }
        ];

        return {
            score,
            label: levels[score].label,
            color: levels[score].color
        };
    }

    /**
     * Generate secure random password
     * @param {object} options - Generation options
     * @returns {string} Generated password
     */
    generatePassword(options = {}) {
        const {
            length = 16,
            uppercase = true,
            lowercase = true,
            numbers = true,
            symbols = true
        } = options;

        const charSets = {
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        };

        let chars = '';
        const requiredChars = [];

        if (uppercase) {
            chars += charSets.uppercase;
            requiredChars.push(this.getRandomChar(charSets.uppercase));
        }
        if (lowercase) {
            chars += charSets.lowercase;
            requiredChars.push(this.getRandomChar(charSets.lowercase));
        }
        if (numbers) {
            chars += charSets.numbers;
            requiredChars.push(this.getRandomChar(charSets.numbers));
        }
        if (symbols) {
            chars += charSets.symbols;
            requiredChars.push(this.getRandomChar(charSets.symbols));
        }

        if (!chars) {
            chars = charSets.lowercase;
        }

        // Generate random password
        const passwordArray = [];
        const randomValues = this.generateRandomBytes(length);

        for (let i = 0; i < length; i++) {
            passwordArray.push(chars[randomValues[i] % chars.length]);
        }

        // Ensure at least one of each required type
        for (let i = 0; i < requiredChars.length && i < length; i++) {
            const pos = randomValues[i] % length;
            passwordArray[pos] = requiredChars[i];
        }

        // Shuffle the array for extra randomness
        for (let i = passwordArray.length - 1; i > 0; i--) {
            const j = randomValues[i] % (i + 1);
            [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
        }

        return passwordArray.join('');
    }

    /**
     * Get random character from string
     * @param {string} str 
     * @returns {string}
     */
    getRandomChar(str) {
        const randomByte = this.generateRandomBytes(1)[0];
        return str[randomByte % str.length];
    }

    /**
     * Generate UUID v4
     * @returns {string}
     */
    generateUUID() {
        const bytes = this.generateRandomBytes(16);
        
        // Set version (4) and variant (RFC4122)
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const hex = Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
}

// Export singleton instance
window.cryptoManager = new CryptoManager();
