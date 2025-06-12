// CodeGuardian Background Service Worker

class CodeGuardianBackground {
  constructor() {
    this.isProtectionActive = false;
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadSettings();
  }
  
  setupEventListeners() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });
    
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.onTabUpdated(tabId, tab);
      }
    });
    
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.onInstalled(details);
    });
  }
  
  async loadSettings() {
    try {
      const data = await chrome.storage.local.get(['isActive']);
      this.isProtectionActive = data.isActive || false;
      console.log('CodeGuardian protection status:', this.isProtectionActive);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  async handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'toggleProtection':
        this.isProtectionActive = message.isActive;
        console.log('Protection toggled:', this.isProtectionActive);
        sendResponse({ success: true });
        break;
        
      case 'getStatus':
        sendResponse({ isActive: this.isProtectionActive });
        break;
        
      default:
        console.warn('Unknown message action:', message.action);
        sendResponse({ error: 'Unknown action' });
    }
  }
  
  onTabUpdated(tabId, tab) {
    if (!this.isProtectionActive) return;
    
    // Check if the tab contains code-related content
    if (this.isCodeSite(tab.url)) {
      console.log('Code site detected:', tab.url);
      // Future: Implement code protection logic here
    }
  }
  
  isCodeSite(url) {
    const codeSites = [
      'github.com',
      'gitlab.com',
      'bitbucket.org',
      'codepen.io',
      'jsfiddle.net',
      'codesandbox.io',
      'repl.it',
      'stackblitz.com'
    ];
    
    return codeSites.some(site => url.includes(site));
  }
  
  onInstalled(details) {
    if (details.reason === 'install') {
      console.log('CodeGuardian installed successfully');
      // Set default settings
      chrome.storage.local.set({
        isActive: false,
        threatsBlocked: 0,
        codeReviews: 0
      });
    }
  }
}

// Initialize the background service worker
new CodeGuardianBackground();