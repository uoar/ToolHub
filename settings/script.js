// Settings Page Script
class SettingsPage {
  constructor() {
    this.init();
  }

  init() {
    // Load configuration
    this.loadConfig();
    
    // Bind events
    this.bindEvents();
    
    // Update status
    this.updateStatus();
  }

  loadConfig() {
    const config = window.cloudManager.config;
    document.getElementById('cloudBinId').value = config.binId || '';
    document.getElementById('cloudMasterKey').value = config.masterKey || '';
  }

  bindEvents() {
    // Save on blur
    const binIdInput = document.getElementById('cloudBinId');
    const masterKeyInput = document.getElementById('cloudMasterKey');
    
    binIdInput.addEventListener('blur', () => this.saveConfig());
    masterKeyInput.addEventListener('blur', () => this.saveConfig());
    
    // Cloud sync button
    document.getElementById('syncBtn').addEventListener('click', () => this.cloudSync());
    
    // Module sync dialog
    document.getElementById('cancelModuleSyncBtn').addEventListener('click', () => this.hideModuleSyncDialog());
    document.getElementById('confirmModuleSyncBtn').addEventListener('click', () => this.confirmModuleSync());
    document.getElementById('moduleSyncDialog').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        this.hideModuleSyncDialog();
      }
    });
    
    // Local file backup buttons
    document.getElementById('exportBtn').addEventListener('click', () => this.exportConfig());
    document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
    
    // Import modal
    document.getElementById('cancelImportBtn').addEventListener('click', () => this.hideImportModal());
    document.getElementById('confirmImportBtn').addEventListener('click', () => this.processImport());
    document.getElementById('importModal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        this.hideImportModal();
      }
    });
    
    // Listen to config changes
    window.addEventListener('cloudConfigChanged', () => this.updateStatus());
  }

  saveConfig() {
    const binId = document.getElementById('cloudBinId').value.trim();
    const masterKey = document.getElementById('cloudMasterKey').value.trim();
    
    if (binId || masterKey) {
      window.cloudManager.updateConfig(binId, masterKey);
      this.showToast('Configuration saved');
      this.updateStatus();
    }
  }

  updateStatus() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const statusTime = document.getElementById('statusTime');
    
    const isConfigured = window.cloudManager.isConfigured();
    const lastSyncTime = window.cloudManager.config.lastSyncTime;
    
    if (isConfigured) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected';
      
      if (lastSyncTime) {
        const timeStr = window.cloudManager.formatSyncTime(lastSyncTime);
        statusTime.textContent = `Last sync: ${timeStr}`;
        statusTime.style.display = 'inline';
      } else {
        statusTime.textContent = 'Not synced yet';
        statusTime.style.display = 'inline';
      }
    } else {
      statusDot.classList.remove('connected');
      statusText.textContent = 'Local Only';
      statusTime.style.display = 'none';
    }
  }

  async uploadAll() {
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (!window.cloudManager.isConfigured()) {
      this.showToast('Please configure cloud credentials first');
      return;
    }
    
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    
    try {
      await window.cloudManager.uploadAllTools();
      this.showToast('All tools uploaded successfully!');
      this.updateStatus();
    } catch (error) {
      this.showToast('Upload failed: ' + error.message);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 11V3M8 3L5 6M8 3L11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 11V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Upload to Cloud
      `;
    }
  }

  async cloudSync() {
    const syncBtn = document.getElementById('syncBtn');
    
    if (!window.cloudManager.isConfigured()) {
      this.showToast('Please configure cloud credentials first');
      return;
    }
    
    syncBtn.disabled = true;
    syncBtn.textContent = 'Checking...';
    
    try {
      const binId = window.cloudManager.config.binId;
      const masterKey = window.cloudManager.config.masterKey;
      
      // Get local data
      const localData = this.getAllLocalData();
      
      // Try to fetch cloud data
      let cloudData = {};
      let cloudExists = false;
      
      try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
          method: 'GET',
          headers: {
            'X-Master-Key': masterKey
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          cloudData = result.record || {};
          cloudExists = true;
        } else if (response.status !== 404) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        if (!error.message.includes('404')) {
          throw error;
        }
      }
      
      // Check if either side is empty
      const localModules = Object.keys(localData).filter(k => k !== 'cloudConfig');
      const cloudModules = Object.keys(cloudData).filter(k => k !== 'cloudConfig');
      
      if (localModules.length === 0 && cloudModules.length === 0) {
        this.showToast('No data to sync');
        return;
      }
      
      if (cloudModules.length === 0) {
        // Cloud is empty, upload local directly
        await this.uploadToCloud(localData);
        this.showToast('Local data uploaded to cloud');
        this.updateStatus();
        return;
      }
      
      if (localModules.length === 0) {
        // Local is empty, download cloud directly
        this.applyCloudData(cloudData);
        this.applyConfigToAllTools();
        this.showToast('Cloud data downloaded');
        this.updateStatus();
        return;
      }
      
      // Both have data, show module selection dialog
      this.showModuleSyncDialog(localData, cloudData);
      
    } catch (error) {
      this.showToast('Sync failed: ' + error.message);
    } finally {
      syncBtn.disabled = false;
      syncBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13 7C13 4.23858 10.7614 2 8 2C5.58862 2 3.55892 3.71776 3.11622 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M3 9C3 11.7614 5.23858 14 8 14C10.4114 14 12.4411 12.2822 12.8838 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M3 6L3 9L6 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M13 10L13 7L10 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Sync
      `;
    }
  }

  getAllLocalData() {
    const allData = {};
    
    // Collect all tool data from localStorage
    const pickerWheelData = localStorage.getItem('pickerWheel');
    if (pickerWheelData) {
      allData.pickerWheel = JSON.parse(pickerWheelData);
    }
    
    // Add more tools here as they are created
    // const jsonParserData = localStorage.getItem('jsonParser');
    // if (jsonParserData) {
    //   allData.jsonParser = JSON.parse(jsonParserData);
    // }
    
    // Always include cloud config
    allData.cloudConfig = window.cloudManager.config;
    
    return allData;
  }

  showModuleSyncDialog(localData, cloudData) {
    // Store for later use
    this.pendingLocalData = localData;
    this.pendingCloudData = cloudData;
    
    // Get all unique module names
    const allModules = new Set([
      ...Object.keys(localData),
      ...Object.keys(cloudData)
    ]);
    
    // Build module states
    const moduleStates = [];
    for (const moduleName of allModules) {
      const hasLocal = !!localData[moduleName];
      const hasCloud = !!cloudData[moduleName];
      
      moduleStates.push({
        name: moduleName,
        hasLocal,
        hasCloud,
        localData: localData[moduleName],
        cloudData: cloudData[moduleName]
      });
    }
    
    // Render module list
    this.renderModuleList(moduleStates);
    
    // Show dialog
    document.getElementById('moduleSyncDialog').style.display = 'flex';
  }

  hideModuleSyncDialog() {
    document.getElementById('moduleSyncDialog').style.display = 'none';
    this.pendingLocalData = null;
    this.pendingCloudData = null;
  }

  renderModuleList(moduleStates) {
    const moduleList = document.getElementById('moduleList');
    moduleList.innerHTML = '';
    
    moduleStates.forEach(module => {
      const moduleItem = document.createElement('div');
      moduleItem.className = 'module-item';
      
      const localSummary = this.getModuleSummary(module.name, module.localData);
      const cloudSummary = this.getModuleSummary(module.name, module.cloudData);
      const displayName = this.formatModuleName(module.name);
      
      // Determine default selection (prefer local if both exist)
      const defaultLocal = module.hasLocal;
      
      moduleItem.innerHTML = `
        <div class="module-header">
          <span class="module-name">${displayName}</span>
        </div>
        <div class="module-options">
          <label class="radio-option ${!module.hasLocal ? 'disabled' : ''}">
            <input type="radio" 
                   name="${module.name}" 
                   value="local" 
                   ${!module.hasLocal ? 'disabled' : ''}
                   ${defaultLocal ? 'checked' : ''}>
            <span class="radio-label">
              <span class="radio-text">Use Local</span>
              <span class="radio-detail">${localSummary}</span>
            </span>
          </label>
          <label class="radio-option ${!module.hasCloud ? 'disabled' : ''}">
            <input type="radio" 
                   name="${module.name}" 
                   value="cloud"
                   ${!module.hasCloud ? 'disabled' : ''}
                   ${!defaultLocal && module.hasCloud ? 'checked' : ''}>
            <span class="radio-label">
              <span class="radio-text">Use Cloud</span>
              <span class="radio-detail">${cloudSummary}</span>
            </span>
          </label>
        </div>
      `;
      
      moduleList.appendChild(moduleItem);
    });
  }

  getModuleSummary(moduleName, data) {
    if (!data) return 'Not exists';
    
    switch(moduleName) {
      case 'pickerWheel':
        const wheelCount = data.wheels?.length || 0;
        return `${wheelCount} wheel${wheelCount !== 1 ? 's' : ''}`;
      
      case 'jsonParser':
        return data.settings ? 'Has settings' : 'Empty';
      
      case 'cloudConfig':
        return data.binId ? 'Configured' : 'Empty';
      
      default:
        return 'Has data';
    }
  }

  formatModuleName(moduleName) {
    const nameMap = {
      'pickerWheel': 'Picker Wheel',
      'jsonParser': 'JSON Parser',
      'cloudConfig': 'Cloud Config'
    };
    
    return nameMap[moduleName] || moduleName;
  }

  async confirmModuleSync() {
    const confirmBtn = document.getElementById('confirmModuleSyncBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Syncing...';
    
    try {
      // Get all selections
      const moduleList = document.getElementById('moduleList');
      const radioGroups = moduleList.querySelectorAll('.module-item');
      
      const mergedConfig = {};
      
      radioGroups.forEach(item => {
        const moduleName = item.querySelector('input[type="radio"]').name;
        const selectedRadio = item.querySelector('input[type="radio"]:checked');
        
        if (selectedRadio) {
          const useCloud = selectedRadio.value === 'cloud';
          
          if (useCloud && this.pendingCloudData[moduleName]) {
            mergedConfig[moduleName] = this.pendingCloudData[moduleName];
          } else if (!useCloud && this.pendingLocalData[moduleName]) {
            mergedConfig[moduleName] = this.pendingLocalData[moduleName];
          }
        }
      });
      
      // Apply to local
      this.applyConfigToLocal(mergedConfig);
      
      // Upload merged config to cloud
      await this.uploadToCloud(mergedConfig);
      
      // Apply to all tools
      this.applyConfigToAllTools();
      
      // Hide dialog
      this.hideModuleSyncDialog();
      
      this.showToast('Sync completed successfully!');
      this.updateStatus();
      
    } catch (error) {
      this.showToast('Sync failed: ' + error.message);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm Sync';
    }
  }

  applyConfigToLocal(config) {
    Object.keys(config).forEach(key => {
      localStorage.setItem(key, JSON.stringify(config[key]));
    });
    
    window.cloudManager.loadConfig();
    this.loadConfig();
  }

  async uploadToCloud(data) {
    // Upload to cloud
    const response = await fetch(`https://api.jsonbin.io/v3/b/${window.cloudManager.config.binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': window.cloudManager.config.masterKey
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: HTTP ${response.status}`);
    }
    
    // Update last sync time
    window.cloudManager.config.lastSyncTime = Date.now();
    localStorage.setItem('cloudConfig', JSON.stringify(window.cloudManager.config));
  }

  applyCloudData(cloudData) {
    // Overwrite all with cloud data
    Object.keys(cloudData).forEach(key => {
      localStorage.setItem(key, JSON.stringify(cloudData[key]));
    });
    
    window.cloudManager.loadConfig();
    this.loadConfig();
    this.updateStatus();
  }

  applyConfigToAllTools() {
    // Dispatch event for all tools to reload their config
    window.dispatchEvent(new CustomEvent('configImported'));
    
    // If we're on a tool page, trigger reload
    if (window.location.pathname.includes('picker-wheel')) {
      window.location.reload();
    }
  }

  exportConfig() {
    // Get all data from localStorage
    const allData = {};
    
    // Collect all tool data
    const pickerWheelData = localStorage.getItem('pickerWheel');
    if (pickerWheelData) {
      allData.pickerWheel = JSON.parse(pickerWheelData);
    }
    
    // Add cloud config
    allData.cloudConfig = window.cloudManager.config;
    
    // Export as downloadable JSON
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "fe-tools-config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    this.showToast('Configuration downloaded');
  }

  showImportModal() {
    document.getElementById('importModal').style.display = 'flex';
    document.getElementById('importJsonInput').value = '';
    document.getElementById('importJsonInput').focus();
  }

  hideImportModal() {
    document.getElementById('importModal').style.display = 'none';
  }

  processImport() {
    const jsonText = document.getElementById('importJsonInput').value.trim();
    
    if (!jsonText) {
      this.hideImportModal();
      return;
    }
    
    try {
      const config = JSON.parse(jsonText);
      
      // Validate structure
      if (typeof config !== 'object') {
        throw new Error('Invalid configuration format');
      }
      
      // Import each tool's data
      if (config.pickerWheel) {
        localStorage.setItem('pickerWheel', JSON.stringify(config.pickerWheel));
      }
      
      // Import cloud config
      if (config.cloudConfig) {
        localStorage.setItem('cloudConfig', JSON.stringify(config.cloudConfig));
        window.cloudManager.loadConfig();
        this.loadConfig();
        this.updateStatus();
      }
      
      this.hideImportModal();
      this.showToast('Configuration imported successfully!');
      
      // Dispatch event for other tools to reload
      window.dispatchEvent(new CustomEvent('configImported'));
      
    } catch (error) {
      console.error('Import error:', error);
      const textarea = document.getElementById('importJsonInput');
      textarea.style.borderColor = '#FF3B30';
      setTimeout(() => {
        textarea.style.borderColor = '';
      }, 2000);
      this.showToast('Import failed: ' + error.message);
    }
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SettingsPage());
} else {
  new SettingsPage();
}
