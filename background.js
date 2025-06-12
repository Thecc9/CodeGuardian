// Bolt.new Assistant Background Script

class BoltNewBackground {
  constructor() {
    this.init();
  }
  
  init() {
    console.log('🚀 Bolt.new Assistant: Background script loaded');
    
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        console.log('✅ Bolt.new Assistant installed');
      }
    });
    
    // Listen for tab updates to inject content script
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && tab.url.includes('bolt.new')) {
        console.log('🎯 Bolt.new page detected, injecting content script');
        try {
          // Inject content script manually to ensure it loads
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          });
          console.log('✅ Content script injected successfully');
        } catch (error) {
          console.error('❌ Error injecting content script:', error);
        }
      }
    });
    
    // Listen for messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Background received message:', message);
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }
  
  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'getStatus':
        sendResponse({ isActive: true });
        break;
      case 'injectContentScript':
        this.injectContentScript(message.tabId, sendResponse);
        break;
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  }
  
  async injectContentScript(tabId, sendResponse) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      sendResponse({ success: true });
    } catch (error) {
      console.error('❌ Error injecting content script:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Initialize background script
new BoltNewBackground();