class BoltNewAssistant {
  constructor() {
    this.isBoltNewPage = false;
    this.contentScriptReady = false;
    this.init();
  }
  
  init() {
    console.log('🚀 Popup initialized');
    this.checkBoltNewPage();
    this.bindEvents();
    this.updateUI();
  }
  
  async checkBoltNewPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('📍 Current tab URL:', tab.url);
      this.isBoltNewPage = tab.url && tab.url.includes('bolt.new');
      
      if (this.isBoltNewPage) {
        // Try to ensure content script is loaded
        await this.ensureContentScript(tab.id);
      }
      
      this.updateStatus();
    } catch (error) {
      console.error('❌ Error checking page:', error);
      this.showError('statusText', 'Error checking page: ' + error.message);
    }
  }
  
  async ensureContentScript(tabId) {
    try {
      console.log('🔄 Ensuring content script is loaded...');
      
      // First, try to ping the existing content script
      try {
        const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        if (response && response.success) {
          console.log('✅ Content script already loaded');
          this.contentScriptReady = true;
          return;
        }
      } catch (error) {
        console.log('📡 Content script not responding, injecting...');
      }
      
      // If ping failed, inject the content script
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      // Wait a moment for script to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to ping again
      try {
        const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        if (response && response.success) {
          console.log('✅ Content script injected and ready');
          this.contentScriptReady = true;
        }
      } catch (error) {
        console.log('⚠️ Content script injected but not responding to ping');
        this.contentScriptReady = true; // Assume it's working
      }
      
    } catch (error) {
      console.error('❌ Error ensuring content script:', error);
      this.contentScriptReady = false;
    }
  }
  
  updateStatus() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (this.isBoltNewPage && this.contentScriptReady) {
      statusIndicator.classList.add('active');
      statusIndicator.classList.remove('inactive');
      statusText.textContent = '✅ Connected to bolt.new';
      console.log('✅ Connected to bolt.new');
    } else if (this.isBoltNewPage && !this.contentScriptReady) {
      statusIndicator.classList.add('inactive');
      statusIndicator.classList.remove('active');
      statusText.textContent = '🔄 Loading bolt.new connection...';
      console.log('🔄 Loading connection...');
    } else {
      statusIndicator.classList.add('inactive');
      statusIndicator.classList.remove('active');
      statusText.textContent = '❌ Not on bolt.new (go to bolt.new first)';
      console.log('❌ Not on bolt.new');
    }
  }
  
  bindEvents() {
    document.getElementById('readPlanBtn').addEventListener('click', () => {
      console.log('🔘 Read Plan button clicked');
      this.readLatestPlan();
    });
    
    document.getElementById('sendChatBtn').addEventListener('click', () => {
      console.log('🔘 Send Chat button clicked');
      this.sendChatMessage();
    });
    
    document.getElementById('readCodeBtn').addEventListener('click', () => {
      console.log('🔘 Read Code button clicked');
      this.readProjectCode();
    });
    
    document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
    document.getElementById('helpBtn').addEventListener('click', () => this.openHelp());
  }
  
  async sendMessageToContentScript(message) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!this.contentScriptReady) {
        await this.ensureContentScript(tab.id);
      }
      
      const response = await chrome.tabs.sendMessage(tab.id, message);
      return response;
    } catch (error) {
      console.error('💥 Communication error:', error);
      
      // Try to re-inject content script and retry once
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await this.ensureContentScript(tab.id);
        const response = await chrome.tabs.sendMessage(tab.id, message);
        return response;
      } catch (retryError) {
        throw new Error('Failed to communicate with bolt.new page. Try refreshing the page.');
      }
    }
  }
  
  async readLatestPlan() {
    if (!this.isBoltNewPage) {
      this.showError('readPlanBtn', 'Please navigate to bolt.new first');
      return;
    }
    
    const button = document.getElementById('readPlanBtn');
    const content = document.getElementById('planContent');
    
    button.textContent = 'Reading Plan...';
    button.disabled = true;
    
    try {
      console.log('📋 Sending readLatestPlan message...');
      
      const response = await this.sendMessageToContentScript({ 
        action: 'readLatestPlan' 
      });
      
      console.log('📋 Received response:', response);
      
      if (response && response.success) {
        content.textContent = response.plan || 'No plan found';
        content.classList.add('show');
        this.showSuccess('readPlanBtn', 'Plan read successfully!');
      } else {
        this.showError('readPlanBtn', response?.error || 'Failed to read plan');
      }
    } catch (error) {
      console.error('💥 Error reading plan:', error);
      this.showError('readPlanBtn', error.message);
    } finally {
      button.textContent = 'Read Latest Plan';
      button.disabled = false;
    }
  }
  
  async sendChatMessage() {
    if (!this.isBoltNewPage) {
      this.showError('sendChatBtn', 'Please navigate to bolt.new first');
      return;
    }
    
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) {
      this.showError('sendChatBtn', 'Please enter a message');
      return;
    }
    
    const button = document.getElementById('sendChatBtn');
    button.textContent = 'Sending...';
    button.disabled = true;
    
    try {
      console.log('💬 Sending chat message:', message);
      
      const response = await this.sendMessageToContentScript({ 
        action: 'sendChatMessage',
        message: message
      });
      
      console.log('💬 Received response:', response);
      
      if (response && response.success) {
        chatInput.value = '';
        this.showSuccess('sendChatBtn', 'Message sent successfully!');
      } else {
        this.showError('sendChatBtn', response?.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('💥 Error sending message:', error);
      this.showError('sendChatBtn', error.message);
    } finally {
      button.textContent = 'Send to Chat';
      button.disabled = false;
    }
  }
  
  async readProjectCode() {
    if (!this.isBoltNewPage) {
      this.showError('readCodeBtn', 'Please navigate to bolt.new first');
      return;
    }
    
    const button = document.getElementById('readCodeBtn');
    const content = document.getElementById('codeContent');
    
    button.textContent = 'Reading Code...';
    button.disabled = true;
    
    try {
      console.log('📁 Sending readProjectCode message...');
      
      const response = await this.sendMessageToContentScript({ 
        action: 'readProjectCode' 
      });
      
      console.log('📁 Received response:', response);
      
      if (response && response.success) {
        content.textContent = response.code || 'No code found';
        content.classList.add('show');
        this.showSuccess('readCodeBtn', 'Code read successfully!');
      } else {
        this.showError('readCodeBtn', response?.error || 'Failed to read code');
      }
    } catch (error) {
      console.error('💥 Error reading code:', error);
      this.showError('readCodeBtn', error.message);
    } finally {
      button.textContent = 'Read Project Code';
      button.disabled = false;
    }
  }
  
  showError(buttonId, message) {
    this.showMessage(buttonId, message, 'error');
  }
  
  showSuccess(buttonId, message) {
    this.showMessage(buttonId, message, 'success');
  }
  
  showMessage(buttonId, message, type) {
    const button = document.getElementById(buttonId);
    const existingMessage = button.parentNode.querySelector('.error, .success');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;
    button.parentNode.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }
  
  updateUI() {
    const buttons = ['readPlanBtn', 'sendChatBtn', 'readCodeBtn'];
    buttons.forEach(buttonId => {
      const button = document.getElementById(buttonId);
      if (!this.isBoltNewPage) {
        button.style.opacity = '0.6';
      } else {
        button.style.opacity = '1';
      }
    });
  }
  
  openSettings() {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  }
  
  openHelp() {
    chrome.tabs.create({ url: 'https://github.com/your-username/bolt-new-assistant' });
  }
}

// Initialize the extension when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, initializing popup...');
  new BoltNewAssistant();
});