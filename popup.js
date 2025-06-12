class CodeGuardian {
  constructor() {
    this.isProtectionActive = false;
    this.threatsBlocked = 0;
    this.codeReviews = 0;
    
    this.init();
  }
  
  init() {
    this.loadData();
    this.bindEvents();
    this.updateUI();
  }
  
  bindEvents() {
    const toggleBtn = document.getElementById('toggleProtection');
    const settingsBtn = document.getElementById('settingsBtn');
    const helpBtn = document.getElementById('helpBtn');
    
    toggleBtn.addEventListener('click', () => this.toggleProtection());
    settingsBtn.addEventListener('click', () => this.openSettings());
    helpBtn.addEventListener('click', () => this.openHelp());
  }
  
  async loadData() {
    try {
      const data = await chrome.storage.local.get(['isActive', 'threatsBlocked', 'codeReviews']);
      this.isProtectionActive = data.isActive || false;
      this.threatsBlocked = data.threatsBlocked || 0;
      this.codeReviews = data.codeReviews || 0;
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }
  
  async saveData() {
    try {
      await chrome.storage.local.set({
        isActive: this.isProtectionActive,
        threatsBlocked: this.threatsBlocked,
        codeReviews: this.codeReviews
      });
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }
  
  async toggleProtection() {
    this.isProtectionActive = !this.isProtectionActive;
    await this.saveData();
    this.updateUI();
    
    // Send message to background script
    try {
      await chrome.runtime.sendMessage({
        action: 'toggleProtection',
        isActive: this.isProtectionActive
      });
    } catch (error) {
      console.error('Error sending message to background:', error);
    }
  }
  
  updateUI() {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    const toggleBtn = document.getElementById('toggleProtection');
    const threatsBlocked = document.getElementById('threatsBlocked');
    const codeReviews = document.getElementById('codeReviews');
    
    if (this.isProtectionActive) {
      statusIndicator.classList.remove('inactive');
      statusIndicator.classList.add('active');
      statusText.textContent = 'Protection Active';
      toggleBtn.textContent = 'Disable Protection';
      toggleBtn.classList.add('active');
    } else {
      statusIndicator.classList.remove('active');
      statusIndicator.classList.add('inactive');
      statusText.textContent = 'Protection Inactive';
      toggleBtn.textContent = 'Enable Protection';
      toggleBtn.classList.remove('active');
    }
    
    threatsBlocked.textContent = this.threatsBlocked;
    codeReviews.textContent = this.codeReviews;
  }
  
  openSettings() {
    // Open settings page
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  }
  
  openHelp() {
    // Open help page
    chrome.tabs.create({ url: 'https://github.com/your-username/codeguardian' });
  }
}

// Initialize the extension when popup opens
document.addEventListener('DOMContentLoaded', () => {
  new CodeGuardian();
});