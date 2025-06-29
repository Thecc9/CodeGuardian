class BoltNewAssistant {
  constructor() {
    this.isBoltNewPage = false;
    this.contentScriptReady = false;
    this.sessionState = {
      planContent: '',
      codeContent: '',
      chatInput: '',
      isReading: false,
      lastOperation: null,
      timestamp: Date.now()
    };
    this.init();
  }
  
  async init() {
    console.log('🚀 Popup initialized');
    await this.loadSessionState();
    this.checkBoltNewPage();
    this.bindEvents();
    this.restoreUIState();
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
    
    // Save chat input as user types
    document.getElementById('chatInput').addEventListener('input', (e) => {
      this.sessionState.chatInput = e.target.value;
      this.saveSessionState();
    });
    
    // Save state before popup closes
    window.addEventListener('beforeunload', () => {
      this.saveSessionState();
    });
  }
  
  // Session State Management
  async loadSessionState() {
    try {
      const stored = await chrome.storage.local.get('boltAssistantSession');
      if (stored.boltAssistantSession) {
        const storedState = stored.boltAssistantSession;
        // Only restore if session is less than 1 hour old
        if (Date.now() - storedState.timestamp < 60 * 60 * 1000) {
          this.sessionState = { ...this.sessionState, ...storedState };
          console.log('✅ Session state restored:', this.sessionState);
        } else {
          console.log('⏰ Session expired, starting fresh');
        }
      }
    } catch (error) {
      console.error('❌ Error loading session state:', error);
    }
  }
  
  async saveSessionState() {
    try {
      this.sessionState.timestamp = Date.now();
      await chrome.storage.local.set({ boltAssistantSession: this.sessionState });
      console.log('💾 Session state saved');
    } catch (error) {
      console.error('❌ Error saving session state:', error);
    }
  }
  
  restoreUIState() {
    try {
      // Restore chat input
      const chatInput = document.getElementById('chatInput');
      if (this.sessionState.chatInput) {
        chatInput.value = this.sessionState.chatInput;
      }
      
      // Restore plan content
      const planContent = document.getElementById('planContent');
      if (this.sessionState.planContent) {
        planContent.textContent = this.sessionState.planContent;
        planContent.classList.add('show');
      }
      
      // Restore code content
      const codeContent = document.getElementById('codeContent');
      if (this.sessionState.codeContent) {
        codeContent.textContent = this.sessionState.codeContent;
        codeContent.classList.add('show');
      }
      
      // Check if there's an ongoing operation
      if (this.sessionState.isReading) {
        this.checkOngoingOperations();
      }
      
      console.log('🔄 UI state restored');
    } catch (error) {
      console.error('❌ Error restoring UI state:', error);
    }
  }
  
  async checkOngoingOperations() {
    if (!this.isBoltNewPage) return;
    
    try {
      // Check if content script has ongoing operations
      const response = await this.sendMessageToContentScript({ action: 'getStatus' });
      
      if (response && response.isReading) {
        // Restore reading state
        const button = document.getElementById('readCodeBtn');
        button.textContent = 'Reading Code...';
        button.disabled = true;
        
        this.showSuccess('readCodeBtn', 'Code reading resumed from previous session');
        
        // Poll for completion
        this.pollForCompletion();
      }
    } catch (error) {
      console.log('⚠️ Could not check ongoing operations:', error.message);
      // Reset reading state if we can't check
      this.sessionState.isReading = false;
      this.saveSessionState();
    }
  }
  
  async pollForCompletion() {
    const maxPolls = 60; // 5 minutes max
    let polls = 0;
    
    const poll = async () => {
      if (polls >= maxPolls) {
        this.resetReadingState();
        return;
      }
      
      try {
        const response = await this.sendMessageToContentScript({ action: 'getStatus' });
        
        if (!response || !response.isReading) {
          // Operation completed, try to get results
          this.resetReadingState();
          this.showSuccess('readCodeBtn', 'Previous operation completed');
        } else {
          polls++;
          setTimeout(poll, 5000); // Poll every 5 seconds
        }
      } catch (error) {
        this.resetReadingState();
      }
    };
    
    poll();
  }
  
  resetReadingState() {
    this.sessionState.isReading = false;
    this.saveSessionState();
    
    const button = document.getElementById('readCodeBtn');
    button.textContent = 'Read Project Code';
    button.disabled = false;
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
      console.log('📋 Sending readLatestPlan message (latest AI plan)...');
      
      const response = await this.sendMessageToContentScript({ 
        action: 'readLatestPlan' 
      });
      
      console.log('📋 Received response:', response);
      
      if (response && response.success) {
        const planText = response.plan || 'No plan found';
        content.textContent = planText;
        content.classList.add('show');
        
        // Save to session state
        this.sessionState.planContent = planText;
        this.sessionState.lastOperation = 'readPlan';
        this.saveSessionState();
        
        this.showSuccess('readPlanBtn', 'Latest plan read successfully!');
      } else {
        this.showError('readPlanBtn', response?.error || 'Failed to read latest plan');
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
    button.textContent = 'Placing...';
    button.disabled = true;
    
    try {
      console.log('💬 Placing chat message:', message);
      
      const response = await this.sendMessageToContentScript({ 
        action: 'sendChatMessage',
        message: message
      });
      
      console.log('💬 Received response:', response);
      
      if (response && response.success) {
        chatInput.value = '';
        
        // Clear chat input from session state
        this.sessionState.chatInput = '';
        this.sessionState.lastOperation = 'sendChat';
        this.saveSessionState();
        
        this.showSuccess('sendChatBtn', 'Message placed in chat input! Review and send when ready.');
      } else {
        this.showError('sendChatBtn', response?.error || 'Failed to place message');
      }
    } catch (error) {
      console.error('💥 Error placing message:', error);
      this.showError('sendChatBtn', error.message);
    } finally {
      button.textContent = 'Place in Chat';
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
    
    // Mark as reading in session state
    this.sessionState.isReading = true;
    this.sessionState.lastOperation = 'readCode';
    this.saveSessionState();
    
    try {
      console.log('📁 Sending readProjectCode message...');
      
      const response = await this.sendMessageToContentScript({ 
        action: 'readProjectCode' 
      });
      
      console.log('📁 Received response:', response);
      
      if (response && response.success) {
        const codeText = response.code || 'No code found';
        content.textContent = codeText;
        content.classList.add('show');
        
        // Save code content to session state
        this.sessionState.codeContent = codeText;
        this.sessionState.isReading = false;
        this.saveSessionState();
        
        this.showSuccess('readCodeBtn', 'Code read successfully!');
      } else {
        this.sessionState.isReading = false;
        this.saveSessionState();
        this.showError('readCodeBtn', response?.error || 'Failed to read code');
      }
    } catch (error) {
      console.error('💥 Error reading code:', error);
      this.sessionState.isReading = false;
      this.saveSessionState();
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