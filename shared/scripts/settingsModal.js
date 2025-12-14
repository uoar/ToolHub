/**
 * Global Settings Modal Manager
 */
class SettingsModal {
  constructor() {
    this.modal = null;
    this.init();
  }
  
  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindOpenButton());
    } else {
      this.bindOpenButton();
    }
    
    // Listen to cloud config changes
    window.addEventListener('cloudConfigChanged', () => this.updateStatus());
  }
  
  bindOpenButton() {
    const openBtn = document.getElementById('openSettingsBtn');
    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    }
  }
  
  open() {
    const modal = document.getElementById('globalSettingsModal');
    if (!modal) return;
    
    this.modal = modal;
    
    // Load current configuration
    const config = window.cloudManager.config;
    document.getElementById('globalBinId').value = config.binId || '';
    document.getElementById('globalMasterKey').value = config.masterKey || '';
    
    // Update status display
    this.updateStatus();
    
    // Bind events
    this.bindEvents();
    
    // Show modal
    modal.style.display = 'flex';
  }
  
  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }
  
  bindEvents() {
    // Close button
    const closeBtn = this.modal.querySelector('.modal-close');
    const overlay = this.modal.querySelector('.modal-overlay');
    
    if (closeBtn) {
      closeBtn.onclick = () => this.close();
    }
    if (overlay) {
      overlay.onclick = () => this.close();
    }
    
    // Save configuration on blur
    const binIdInput = document.getElementById('globalBinId');
    const masterKeyInput = document.getElementById('globalMasterKey');
    
    if (binIdInput) {
      binIdInput.onblur = () => this.saveConfig();
    }
    if (masterKeyInput) {
      masterKeyInput.onblur = () => this.saveConfig();
    }
    
    // Sync buttons
    const uploadBtn = document.getElementById('syncAllToCloudBtn');
    const downloadBtn = document.getElementById('syncAllFromCloudBtn');
    
    if (uploadBtn) {
      uploadBtn.onclick = () => this.uploadAll();
    }
    if (downloadBtn) {
      downloadBtn.onclick = () => this.downloadAll();
    }
  }
  
  saveConfig() {
    const binId = document.getElementById('globalBinId').value.trim();
    const masterKey = document.getElementById('globalMasterKey').value.trim();
    
    if (binId || masterKey) {
      window.cloudManager.updateConfig(binId, masterKey);
      this.showToast('Configuration saved');
    }
  }
  
  updateStatus() {
    if (!this.modal) return;
    
    const statusDot = this.modal.querySelector('.status-dot');
    const statusText = this.modal.querySelector('.status-text');
    const statusTime = this.modal.querySelector('.status-time');
    const lastSyncTimeText = document.getElementById('lastSyncTimeText');
    
    if (!statusDot || !statusText) return;
    
    const isConfigured = window.cloudManager.isConfigured();
    
    if (isConfigured) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected';
      if (statusTime) {
        statusTime.style.display = 'inline';
      }
      if (lastSyncTimeText) {
        lastSyncTimeText.textContent = window.cloudManager.formatSyncTime();
      }
    } else {
      statusDot.classList.remove('connected');
      statusText.textContent = 'Local Only';
      if (statusTime) {
        statusTime.style.display = 'none';
      }
    }
  }
  
  async uploadAll() {
    try {
      this.setButtonsLoading(true, 'Uploading...');
      await window.cloudManager.uploadAllTools();
      this.updateStatus();
      this.showToast('All tools uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      this.showToast('Upload failed: ' + error.message, true);
    } finally {
      this.setButtonsLoading(false);
    }
  }
  
  async downloadAll() {
    const confirmed = confirm('This will replace all local data. Continue?');
    if (!confirmed) return;
    
    try {
      this.setButtonsLoading(true, 'Downloading...');
      await window.cloudManager.downloadAllTools();
      this.updateStatus();
      this.showToast('All tools downloaded. Refreshing page...');
      
      // Reload page after 1.5s
      setTimeout(() => location.reload(), 1500);
    } catch (error) {
      console.error('Download error:', error);
      this.showToast('Download failed: ' + error.message, true);
      this.setButtonsLoading(false);
    }
  }
  
  setButtonsLoading(loading, message = '') {
    const uploadBtn = document.getElementById('syncAllToCloudBtn');
    const downloadBtn = document.getElementById('syncAllFromCloudBtn');
    
    if (uploadBtn && downloadBtn) {
      uploadBtn.disabled = loading;
      downloadBtn.disabled = loading;
      
      if (loading) {
        uploadBtn.textContent = message || 'Loading...';
      } else {
        uploadBtn.textContent = 'Upload All Tools';
        downloadBtn.textContent = 'Download All Tools';
      }
    }
  }
  
  showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.className = 'toast show' + (isError ? ' error' : '');
      setTimeout(() => toast.classList.remove('show'), 3000);
    } else {
      // Fallback to alert if toast doesn't exist
      alert(message);
    }
  }
}

// Initialize when script loads
new SettingsModal();
