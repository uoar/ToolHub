/**
 * Global Cloud Configuration Manager
 * Manages cloud sync for all tools
 */
class GlobalCloudManager {
  constructor() {
    this.loadConfig();
  }
  
  // Load cloud configuration
  loadConfig() {
    const stored = localStorage.getItem('cloudConfig');
    this.config = stored ? JSON.parse(stored) : {
      binId: '',
      masterKey: '',
      lastSyncTime: null
    };
  }
  
  // Save cloud configuration
  saveConfig() {
    localStorage.setItem('cloudConfig', JSON.stringify(this.config));
    this.notifyConfigChanged();
  }
  
  // Update cloud configuration
  updateConfig(binId, masterKey) {
    this.config.binId = binId;
    this.config.masterKey = masterKey;
    this.saveConfig();
  }
  
  // Check if cloud is configured
  isConfigured() {
    return !!(this.config.binId && this.config.masterKey);
  }
  
  // Upload all tools to cloud
  async uploadAllTools() {
    if (!this.isConfigured()) {
      throw new Error('Cloud not configured');
    }
    
    // Collect all tools data
    const toolsData = {};
    const toolKeys = ['pickerWheel']; // Add more tools as needed
    
    toolKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          toolsData[key] = JSON.parse(data);
        } catch (e) {
          console.error(`Failed to parse ${key} data:`, e);
        }
      }
    });
    
    // Upload to JSONBin
    const response = await fetch(`https://api.jsonbin.io/v3/b/${this.config.binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': this.config.masterKey
      },
      body: JSON.stringify(toolsData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Upload failed');
    }
    
    // Update sync time
    this.config.lastSyncTime = new Date().toISOString();
    this.saveConfig();
    
    return await response.json();
  }
  
  // Download all tools from cloud
  async downloadAllTools() {
    if (!this.isConfigured()) {
      throw new Error('Cloud not configured');
    }
    
    // Fetch from JSONBin
    const response = await fetch(`https://api.jsonbin.io/v3/b/${this.config.binId}/latest`, {
      headers: {
        'X-Master-Key': this.config.masterKey
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Download failed');
    }
    
    const result = await response.json();
    const toolsData = result.record;
    
    // Save to localStorage
    Object.keys(toolsData).forEach(toolKey => {
      localStorage.setItem(toolKey, JSON.stringify(toolsData[toolKey]));
    });
    
    // Update sync time
    this.config.lastSyncTime = new Date().toISOString();
    this.saveConfig();
    
    return toolsData;
  }
  
  // Notify configuration changed
  notifyConfigChanged() {
    window.dispatchEvent(new CustomEvent('cloudConfigChanged', {
      detail: this.config
    }));
  }
  
  // Format sync time
  formatSyncTime() {
    if (!this.config.lastSyncTime) return 'Never';
    
    const syncDate = new Date(this.config.lastSyncTime);
    const now = new Date();
    const diffMs = now - syncDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return syncDate.toLocaleString();
  }
}

// Global singleton
window.cloudManager = new GlobalCloudManager();
