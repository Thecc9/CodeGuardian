class CodeGuardianAssistant {
  constructor() {
    this.isBoltNewPage = false;
    this.contentScriptReady = false;
    this.geminiApiKey = '';
    this.sessionState = {
      planContent: '',
      codeContent: '',
      chatInput: '',
      isReviewing: false,
      lastReview: null,
      timestamp: Date.now()
    };
    this.init();
  }
  
  async init() {
    console.log('🚀 CodeGuardian initialized');
    await this.loadSessionState();
    await this.loadApiKey();
    this.checkBoltNewPage();
    this.bindEvents();
    this.restoreUIState();
    this.updateUI();
  }
  
  async loadApiKey() {
    try {
      const stored = await chrome.storage.local.get('geminiApiKey');
      if (stored.geminiApiKey) {
        this.geminiApiKey = stored.geminiApiKey;
        document.getElementById('geminiApiKey').value = '••••••••••••••••';
      }
    } catch (error) {
      console.error('❌ Error loading API key:', error);
    }
  }
  
  async saveApiKey() {
    const apiKeyInput = document.getElementById('geminiApiKey');
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey || apiKey === '••••••••••••••••') {
      this.showError('saveApiKey', 'Please enter a valid API key');
      return;
    }
    
    try {
      await chrome.storage.local.set({ geminiApiKey: apiKey });
      this.geminiApiKey = apiKey;
      apiKeyInput.value = '••••••••••••••••';
      this.showSuccess('saveApiKey', 'API key saved successfully!');
    } catch (error) {
      console.error('❌ Error saving API key:', error);
      this.showError('saveApiKey', 'Failed to save API key');
    }
  }
  
  async checkBoltNewPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('📍 Current tab URL:', tab.url);
      this.isBoltNewPage = tab.url && tab.url.includes('bolt.new');
      
      if (this.isBoltNewPage) {
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
      
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        if (response && response.success) {
          console.log('✅ Content script injected and ready');
          this.contentScriptReady = true;
        }
      } catch (error) {
        console.log('⚠️ Content script injected but not responding to ping');
        this.contentScriptReady = true;
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
    } else if (this.isBoltNewPage && !this.contentScriptReady) {
      statusIndicator.classList.add('inactive');
      statusIndicator.classList.remove('active');
      statusText.textContent = '🔄 Loading bolt.new connection...';
    } else {
      statusIndicator.classList.add('inactive');
      statusIndicator.classList.remove('active');
      statusText.textContent = '❌ Not on bolt.new (navigate to bolt.new first)';
    }
  }
  
  bindEvents() {
    // Main review button
    document.getElementById('reviewBtn').addEventListener('click', () => {
      console.log('🔘 Security Review button clicked');
      this.performSecurityReview();
    });
    
    // API key management
    document.getElementById('saveApiKey').addEventListener('click', () => {
      this.saveApiKey();
    });
    
    // Quick actions
    document.getElementById('readPlanBtn').addEventListener('click', () => {
      this.readLatestPlan();
    });
    
    document.getElementById('readCodeBtn').addEventListener('click', () => {
      this.readProjectCode();
    });
    
    document.getElementById('sendChatBtn').addEventListener('click', () => {
      this.sendChatMessage();
    });
    
    // Footer buttons
    document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
    document.getElementById('helpBtn').addEventListener('click', () => this.openHelp());
    
    // Auto-save chat input
    document.getElementById('chatInput').addEventListener('input', (e) => {
      this.sessionState.chatInput = e.target.value;
      this.saveSessionState();
    });
    
    // Save state before popup closes
    window.addEventListener('beforeunload', () => {
      this.saveSessionState();
    });
  }
  
  async performSecurityReview() {
    if (!this.isBoltNewPage) {
      this.showError('reviewBtn', 'Please navigate to bolt.new first');
      return;
    }
    
    if (!this.geminiApiKey) {
      this.showError('reviewBtn', 'Please configure your Gemini API key first');
      return;
    }
    
    const reviewBtn = document.getElementById('reviewBtn');
    const reviewStatus = document.getElementById('reviewStatus');
    
    // Update button state
    reviewBtn.disabled = true;
    reviewBtn.querySelector('.btn-text').textContent = 'Analyzing...';
    reviewBtn.querySelector('.btn-icon').textContent = '⏳';
    
    // Show progress
    this.showReviewProgress();
    
    try {
      // Step 1: Read latest plan
      this.updateReviewStep('read', 'active');
      const planResponse = await this.sendMessageToContentScript({ 
        action: 'readLatestPlan' 
      });
      
      if (!planResponse || !planResponse.success) {
        throw new Error('Failed to read latest plan: ' + (planResponse?.error || 'Unknown error'));
      }
      
      this.updateReviewStep('read', 'complete');
      
      // Step 2: Analyze with Gemini
      this.updateReviewStep('analyze', 'active');
      const analysis = await this.analyzeWithGemini(planResponse.plan);
      this.updateReviewStep('analyze', 'complete');
      
      // Step 3: Generate security prompt
      this.updateReviewStep('generate', 'active');
      const securityPrompt = this.generateSecurityPrompt(analysis);
      this.updateReviewStep('generate', 'complete');
      
      // Step 4: Insert into chat
      this.updateReviewStep('insert', 'active');
      const insertResponse = await this.sendMessageToContentScript({
        action: 'sendChatMessage',
        message: securityPrompt
      });
      
      if (!insertResponse || !insertResponse.success) {
        throw new Error('Failed to insert prompt: ' + (insertResponse?.error || 'Unknown error'));
      }
      
      this.updateReviewStep('insert', 'complete');
      
      // Save to session
      this.sessionState.lastReview = {
        analysis: analysis,
        prompt: securityPrompt,
        timestamp: Date.now()
      };
      this.saveSessionState();
      
      this.showReviewSuccess('Security review completed! Prompt inserted into chat. Review and send when ready.');
      
    } catch (error) {
      console.error('💥 Error during security review:', error);
      this.updateReviewStep('current', 'error');
      this.showReviewError(error.message);
    } finally {
      // Reset button state
      reviewBtn.disabled = false;
      reviewBtn.querySelector('.btn-text').textContent = 'Review Latest Plan';
      reviewBtn.querySelector('.btn-icon').textContent = '🔍';
      
      // Hide progress after delay
      setTimeout(() => {
        this.hideReviewProgress();
      }, 3000);
    }
  }
  
  async analyzeWithGemini(planContent) {
    const prompt = `You are CodeGuardian, an AI security expert that reviews code implementation plans for security vulnerabilities and best practices.

Analyze the following Bolt AI implementation plan and provide a comprehensive security assessment:

PLAN TO ANALYZE:
${planContent}

Please provide your analysis in the following JSON format:
{
  "securityScore": 1-10,
  "criticalIssues": ["list of critical security issues"],
  "recommendations": ["list of security recommendations"],
  "bestPractices": ["list of missing security best practices"],
  "overallAssessment": "brief overall security assessment",
  "shouldImplement": true/false
}

Focus on:
- Authentication and authorization vulnerabilities
- Data validation and sanitization
- SQL injection and XSS prevention
- Secure API design
- Proper error handling
- Secrets management
- HTTPS and encryption
- Input validation
- Rate limiting and DoS protection
- Secure coding practices

Be thorough but concise. Only flag real security concerns, not minor style issues.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const analysisText = data.candidates[0].content.parts[0].text;
      
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured response from text
        return {
          securityScore: 7,
          criticalIssues: [],
          recommendations: [analysisText],
          bestPractices: [],
          overallAssessment: "Analysis completed",
          shouldImplement: true
        };
      }
    } catch (error) {
      console.error('❌ Gemini API error:', error);
      throw new Error('Failed to analyze with Gemini AI: ' + error.message);
    }
  }
  
  generateSecurityPrompt(analysis) {
    const { securityScore, criticalIssues, recommendations, bestPractices, overallAssessment, shouldImplement } = analysis;
    
    let prompt = `🛡️ **CodeGuardian Security Review**\n\n`;
    
    prompt += `**Security Score: ${securityScore}/10**\n\n`;
    
    if (shouldImplement && criticalIssues.length === 0) {
      prompt += `✅ **APPROVED FOR IMPLEMENTATION**\n\n`;
      prompt += `${overallAssessment}\n\n`;
      prompt += `The implementation plan looks secure. Please proceed with implementation while considering these enhancements:\n\n`;
    } else {
      prompt += `⚠️ **SECURITY CONCERNS IDENTIFIED**\n\n`;
      prompt += `${overallAssessment}\n\n`;
      prompt += `Please address the following security issues before implementation:\n\n`;
    }
    
    if (criticalIssues.length > 0) {
      prompt += `🚨 **Critical Security Issues:**\n`;
      criticalIssues.forEach((issue, index) => {
        prompt += `${index + 1}. ${issue}\n`;
      });
      prompt += `\n`;
    }
    
    if (recommendations.length > 0) {
      prompt += `🔧 **Security Recommendations:**\n`;
      recommendations.forEach((rec, index) => {
        prompt += `${index + 1}. ${rec}\n`;
      });
      prompt += `\n`;
    }
    
    if (bestPractices.length > 0) {
      prompt += `📋 **Missing Security Best Practices:**\n`;
      bestPractices.forEach((practice, index) => {
        prompt += `${index + 1}. ${practice}\n`;
      });
      prompt += `\n`;
    }
    
    if (shouldImplement) {
      prompt += `Please update your implementation plan to include these security measures and then proceed with implementation.`;
    } else {
      prompt += `Please revise your implementation plan to address these critical security concerns before proceeding.`;
    }
    
    return prompt;
  }
  
  showReviewProgress() {
    const reviewStatus = document.getElementById('reviewStatus');
    reviewStatus.className = 'review-status show';
    reviewStatus.innerHTML = `
      <div class="review-progress">
        <div class="progress-step">
          <div class="progress-icon pending" id="step-read">1</div>
          <span>Reading latest Bolt AI plan...</span>
        </div>
        <div class="progress-step">
          <div class="progress-icon pending" id="step-analyze">2</div>
          <span>Analyzing with Gemini AI...</span>
        </div>
        <div class="progress-step">
          <div class="progress-icon pending" id="step-generate">3</div>
          <span>Generating security prompt...</span>
        </div>
        <div class="progress-step">
          <div class="progress-icon pending" id="step-insert">4</div>
          <span>Inserting into chat input...</span>
        </div>
      </div>
    `;
  }
  
  updateReviewStep(step, status) {
    const stepElement = document.getElementById(`step-${step}`);
    if (stepElement) {
      stepElement.className = `progress-icon ${status}`;
      if (status === 'complete') {
        stepElement.textContent = '✓';
      } else if (status === 'error') {
        stepElement.textContent = '✗';
      } else if (status === 'active') {
        stepElement.textContent = '⟳';
      }
    }
  }
  
  showReviewSuccess(message) {
    const reviewStatus = document.getElementById('reviewStatus');
    reviewStatus.className = 'review-status show success';
    reviewStatus.textContent = message;
  }
  
  showReviewError(message) {
    const reviewStatus = document.getElementById('reviewStatus');
    reviewStatus.className = 'review-status show error';
    reviewStatus.textContent = `Error: ${message}`;
  }
  
  hideReviewProgress() {
    const reviewStatus = document.getElementById('reviewStatus');
    reviewStatus.classList.remove('show');
  }
  
  // Session State Management
  async loadSessionState() {
    try {
      const stored = await chrome.storage.local.get('codeGuardianSession');
      if (stored.codeGuardianSession) {
        const storedState = stored.codeGuardianSession;
        if (Date.now() - storedState.timestamp < 60 * 60 * 1000) {
          this.sessionState = { ...this.sessionState, ...storedState };
          console.log('✅ Session state restored');
        }
      }
    } catch (error) {
      console.error('❌ Error loading session state:', error);
    }
  }
  
  async saveSessionState() {
    try {
      this.sessionState.timestamp = Date.now();
      await chrome.storage.local.set({ codeGuardianSession: this.sessionState });
    } catch (error) {
      console.error('❌ Error saving session state:', error);
    }
  }
  
  restoreUIState() {
    try {
      const chatInput = document.getElementById('chatInput');
      if (this.sessionState.chatInput) {
        chatInput.value = this.sessionState.chatInput;
      }
    } catch (error) {
      console.error('❌ Error restoring UI state:', error);
    }
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
  
  // Quick action methods (simplified versions of original functions)
  async readLatestPlan() {
    if (!this.isBoltNewPage) {
      this.showError('readPlanBtn', 'Please navigate to bolt.new first');
      return;
    }
    
    const button = document.getElementById('readPlanBtn');
    const content = document.getElementById('planContent');
    
    button.textContent = 'Reading...';
    button.disabled = true;
    
    try {
      const response = await this.sendMessageToContentScript({ 
        action: 'readLatestPlan' 
      });
      
      if (response && response.success) {
        content.textContent = response.plan || 'No plan found';
        content.classList.add('show');
        this.sessionState.planContent = response.plan;
        this.saveSessionState();
        this.showSuccess('readPlanBtn', 'Plan read successfully!');
      } else {
        this.showError('readPlanBtn', response?.error || 'Failed to read plan');
      }
    } catch (error) {
      this.showError('readPlanBtn', error.message);
    } finally {
      button.textContent = 'Read Latest Plan';
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
    
    button.textContent = 'Reading...';
    button.disabled = true;
    
    try {
      const response = await this.sendMessageToContentScript({ 
        action: 'readProjectCode' 
      });
      
      if (response && response.success) {
        content.textContent = response.code || 'No code found';
        content.classList.add('show');
        this.sessionState.codeContent = response.code;
        this.saveSessionState();
        this.showSuccess('readCodeBtn', 'Code read successfully!');
      } else {
        this.showError('readCodeBtn', response?.error || 'Failed to read code');
      }
    } catch (error) {
      this.showError('readCodeBtn', error.message);
    } finally {
      button.textContent = 'Read Project Code';
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
      const response = await this.sendMessageToContentScript({ 
        action: 'sendChatMessage',
        message: message
      });
      
      if (response && response.success) {
        chatInput.value = '';
        this.sessionState.chatInput = '';
        this.saveSessionState();
        this.showSuccess('sendChatBtn', 'Message placed in chat!');
      } else {
        this.showError('sendChatBtn', response?.error || 'Failed to place message');
      }
    } catch (error) {
      this.showError('sendChatBtn', error.message);
    } finally {
      button.textContent = 'Place in Chat';
      button.disabled = false;
    }
  }
  
  showError(elementId, message) {
    this.showMessage(elementId, message, 'error');
  }
  
  showSuccess(elementId, message) {
    this.showMessage(elementId, message, 'success');
  }
  
  showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    const existingMessage = element.parentNode.querySelector('.error, .success');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;
    element.parentNode.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }
  
  updateUI() {
    const buttons = ['reviewBtn', 'readPlanBtn', 'sendChatBtn', 'readCodeBtn'];
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
    chrome.tabs.create({ url: 'https://github.com/your-username/codeguardian-extension' });
  }
}

// Initialize the extension when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, initializing CodeGuardian...');
  new CodeGuardianAssistant();
});