class CodeGuardianAssistant {
  constructor() {
    this.isBoltNewPage = false;
    this.contentScriptReady = false;
    this.selectedModel = 'gemini';
    this.apiKeys = {
      gemini: '',
      claude: '',
      openai: '',
      deepseek: ''
    };
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
    await this.loadApiKeys();
    this.checkBoltNewPage();
    this.bindEvents();
    this.restoreUIState();
    this.updateUI();
  }
  
  async loadApiKeys() {
    try {
      const stored = await chrome.storage.local.get(['apiKeys', 'selectedModel']);
      if (stored.apiKeys) {
        this.apiKeys = { ...this.apiKeys, ...stored.apiKeys };
      }
      if (stored.selectedModel) {
        this.selectedModel = stored.selectedModel;
        document.getElementById('aiModelSelect').value = this.selectedModel;
      }
      this.updateApiKeyUI();
    } catch (error) {
      console.error('❌ Error loading API keys:', error);
    }
  }
  
  async saveApiKey() {
    const apiKeyInput = document.getElementById('apiKey');
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey || apiKey === '••••••••••••••••') {
      this.showError('saveApiKey', 'Please enter a valid API key');
      return;
    }
    
    try {
      this.apiKeys[this.selectedModel] = apiKey;
      await chrome.storage.local.set({ 
        apiKeys: this.apiKeys,
        selectedModel: this.selectedModel
      });
      
      apiKeyInput.value = '••••••••••••••••';
      this.showSuccess('saveApiKey', 'API key saved successfully!');
    } catch (error) {
      console.error('❌ Error saving API key:', error);
      this.showError('saveApiKey', 'Failed to save API key');
    }
  }
  
  updateApiKeyUI() {
    const modelSelect = document.getElementById('aiModelSelect');
    const apiKeyLabel = document.getElementById('apiKeyLabel');
    const apiKeyInput = document.getElementById('apiKey');
    const apiKeyHelp = document.getElementById('apiKeyHelp');
    
    const modelConfig = {
      gemini: {
        label: 'Gemini API Key:',
        placeholder: 'Enter your Gemini API key...',
        helpText: 'Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a>'
      },
      claude: {
        label: 'Claude API Key:',
        placeholder: 'Enter your Claude API key...',
        helpText: 'Get your API key from <a href="https://console.anthropic.com/" target="_blank">Anthropic Console</a>'
      },
      openai: {
        label: 'OpenAI API Key:',
        placeholder: 'Enter your OpenAI API key...',
        helpText: 'Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>'
      },
      deepseek: {
        label: 'DeepSeek API Key:',
        placeholder: 'Enter your DeepSeek API key...',
        helpText: 'Get your API key from <a href="https://platform.deepseek.com/" target="_blank">DeepSeek Platform</a>'
      }
    };
    
    const config = modelConfig[this.selectedModel];
    apiKeyLabel.textContent = config.label;
    apiKeyInput.placeholder = config.placeholder;
    apiKeyHelp.innerHTML = config.helpText;
    
    // Show masked key if exists, otherwise empty
    if (this.apiKeys[this.selectedModel]) {
      apiKeyInput.value = '••••••••••••••••';
    } else {
      apiKeyInput.value = '';
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
    
    // AI model selection
    document.getElementById('aiModelSelect').addEventListener('change', (e) => {
      this.selectedModel = e.target.value;
      this.updateApiKeyUI();
      chrome.storage.local.set({ selectedModel: this.selectedModel });
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
    
    if (!this.apiKeys[this.selectedModel]) {
      this.showError('reviewBtn', `Please configure your ${this.selectedModel.toUpperCase()} API key first`);
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
      
      // Step 2: Analyze with selected AI
      this.updateReviewStep('analyze', 'active');
      const analysis = await this.analyzeWithAI(planResponse.plan);
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
  
  async analyzeWithAI(planContent) {
    switch (this.selectedModel) {
      case 'gemini':
        return await this._analyzeWithGemini(planContent);
      case 'claude':
        return await this._analyzeWithClaude(planContent);
      case 'openai':
        return await this._analyzeWithOpenAI(planContent);
      case 'deepseek':
        return await this._analyzeWithDeepSeek(planContent);
      default:
        throw new Error('Unknown AI model selected');
    }
  }
  
  async _analyzeWithGemini(planContent) {
    const prompt = this.getSecurityAnalysisPrompt(planContent);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKeys.gemini}`, {
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
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = JSON.stringify(errorData, null, 2);
        } catch (parseError) {
          try {
            errorDetails = await response.text();
          } catch (textError) {
            errorDetails = 'Unable to parse error response';
          }
        }
        
        console.error('🔍 Gemini API Error Details:', errorDetails);
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}\n\nDetails: ${errorDetails}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response format from Gemini API');
      }
      
      const analysisText = data.candidates[0].content.parts[0].text;
      return this.parseAnalysisResponse(analysisText);
    } catch (error) {
      console.error('❌ Gemini API error:', error);
      throw new Error('Failed to analyze with Gemini AI: ' + error.message);
    }
  }
  
  async _analyzeWithClaude(planContent) {
    const prompt = this.getSecurityAnalysisPrompt(planContent);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKeys.claude,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = JSON.stringify(errorData, null, 2);
        } catch (parseError) {
          try {
            errorDetails = await response.text();
          } catch (textError) {
            errorDetails = 'Unable to parse error response';
          }
        }
        
        console.error('🔍 Claude API Error Details:', errorDetails);
        throw new Error(`Claude API error: ${response.status} ${response.statusText}\n\nDetails: ${errorDetails}`);
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid response format from Claude API');
      }
      
      const analysisText = data.content[0].text;
      return this.parseAnalysisResponse(analysisText);
    } catch (error) {
      console.error('❌ Claude API error:', error);
      throw new Error('Failed to analyze with Claude AI: ' + error.message);
    }
  }
  
  async _analyzeWithOpenAI(planContent) {
    const prompt = this.getSecurityAnalysisPrompt(planContent);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKeys.openai}`,
          'User-Agent': 'CodeGuardian-Extension/1.0'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 2000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = JSON.stringify(errorData, null, 2);
        } catch (parseError) {
          try {
            errorDetails = await response.text();
          } catch (textError) {
            errorDetails = 'Unable to parse error response';
          }
        }
        
        console.error('🔍 OpenAI API Error Details:', errorDetails);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\n\nDetails: ${errorDetails}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI API');
      }
      
      const analysisText = data.choices[0].message.content;
      return this.parseAnalysisResponse(analysisText);
    } catch (error) {
      console.error('❌ OpenAI API error:', error);
      throw new Error('Failed to analyze with OpenAI: ' + error.message);
    }
  }
  
  async _analyzeWithDeepSeek(planContent) {
    const prompt = this.getSecurityAnalysisPrompt(planContent);

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKeys.deepseek}`,
          'User-Agent': 'CodeGuardian-Extension/1.0'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 2000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = JSON.stringify(errorData, null, 2);
        } catch (parseError) {
          try {
            errorDetails = await response.text();
          } catch (textError) {
            errorDetails = 'Unable to parse error response';
          }
        }
        
        console.error('🔍 DeepSeek API Error Details:', errorDetails);
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}\n\nDetails: ${errorDetails}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from DeepSeek API');
      }
      
      const analysisText = data.choices[0].message.content;
      return this.parseAnalysisResponse(analysisText);
    } catch (error) {
      console.error('❌ DeepSeek API error:', error);
      throw new Error('Failed to analyze with DeepSeek: ' + error.message);
    }
  }
  
  getSecurityAnalysisPrompt(planContent) {
    return `You are CodeGuardian, an AI security expert that reviews code implementation plans for security vulnerabilities and best practices.

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
  }
  
  parseAnalysisResponse(analysisText) {
    try {
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
      console.error('❌ Error parsing analysis response:', error);
      return {
        securityScore: 5,
        criticalIssues: ['Failed to parse security analysis'],
        recommendations: [analysisText],
        bestPractices: [],
        overallAssessment: "Analysis parsing failed, manual review recommended",
        shouldImplement: false
      };
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
          <span>Analyzing with ${this.selectedModel.toUpperCase()} AI...</span>
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
    // Create a comprehensive help page content
    const helpContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeGuardian Help</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        h1 {
            color: #667eea;
            text-align: center;
            margin-bottom: 30px;
        }
        h2 {
            color: #495057;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        .feature {
            background: #f8f9ff;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #667eea;
        }
        .step {
            background: #fff3cd;
            padding: 10px;
            border-radius: 6px;
            margin: 10px 0;
        }
        code {
            background: #f1f3f4;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', monospace;
        }
        .warning {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 12px;
            border-radius: 6px;
            margin: 15px 0;
        }
        .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 12px;
            border-radius: 6px;
            margin: 15px 0;
        }
        .model-info {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            padding: 12px;
            border-radius: 6px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ CodeGuardian Help</h1>
        
        <h2>🚀 Getting Started</h2>
        <div class="feature">
            <h3>1. Choose Your AI Model</h3>
            <div class="step">Select from Gemini, Claude, OpenAI, or DeepSeek in the Configuration section</div>
            <div class="step">Each model offers different strengths for security analysis</div>
        </div>
        
        <div class="feature">
            <h3>2. Setup API Key</h3>
            <div class="step">Get your API key from the respective platform</div>
            <div class="step">Enter the API key in the Configuration section</div>
            <div class="step">Click "Save" to store it securely</div>
        </div>
        
        <div class="feature">
            <h3>3. Navigate to Bolt.new</h3>
            <div class="step">Open any bolt.new project in your browser</div>
            <div class="step">The extension will automatically detect the page</div>
            <div class="step">Status indicator will show "Connected to bolt.new"</div>
        </div>
        
        <h2>🤖 AI Models</h2>
        <div class="model-info">
            <h3>Google Gemini</h3>
            <p><strong>Best for:</strong> Comprehensive analysis, code understanding</p>
            <p><strong>API Key:</strong> <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></p>
        </div>
        
        <div class="model-info">
            <h3>Anthropic Claude</h3>
            <p><strong>Best for:</strong> Detailed reasoning, security best practices</p>
            <p><strong>API Key:</strong> <a href="https://console.anthropic.com/" target="_blank">Anthropic Console</a></p>
        </div>
        
        <div class="model-info">
            <h3>OpenAI GPT</h3>
            <p><strong>Best for:</strong> General analysis, well-rounded feedback</p>
            <p><strong>API Key:</strong> <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a></p>
        </div>
        
        <div class="model-info">
            <h3>DeepSeek</h3>
            <p><strong>Best for:</strong> Code-focused analysis, technical depth</p>
            <p><strong>API Key:</strong> <a href="https://platform.deepseek.com/" target="_blank">DeepSeek Platform</a></p>
        </div>
        
        <h2>🔍 Security Review Process</h2>
        <div class="feature">
            <h3>Automated Security Analysis</h3>
            <p>CodeGuardian performs a 4-step security review:</p>
            <div class="step"><strong>Step 1:</strong> Reads the latest Bolt AI implementation plan</div>
            <div class="step"><strong>Step 2:</strong> Analyzes the plan using your selected AI model</div>
            <div class="step"><strong>Step 3:</strong> Generates a comprehensive security feedback prompt</div>
            <div class="step"><strong>Step 4:</strong> Inserts the prompt into bolt.new chat input</div>
        </div>
        
        <h2>🛠️ Features</h2>
        <div class="feature">
            <h3>🔍 Multi-Model Security Review</h3>
            <p>Analyzes implementation plans for:</p>
            <ul>
                <li>Authentication & authorization vulnerabilities</li>
                <li>Data validation & sanitization</li>
                <li>SQL injection & XSS prevention</li>
                <li>Secure API design</li>
                <li>Proper error handling</li>
                <li>Secrets management</li>
                <li>HTTPS & encryption</li>
                <li>Rate limiting & DoS protection</li>
            </ul>
        </div>
        
        <div class="feature">
            <h3>🚀 Quick Actions</h3>
            <p><strong>Read Latest Plan:</strong> Extract current Bolt AI implementation plan</p>
            <p><strong>Read Project Code:</strong> Analyze existing project files</p>
            <p><strong>Manual Input:</strong> Send custom security prompts</p>
        </div>
        
        <h2>⚠️ Troubleshooting</h2>
        <div class="warning">
            <h3>Common Issues</h3>
            <p><strong>Extension Not Connecting:</strong></p>
            <ul>
                <li>Refresh the bolt.new page</li>
                <li>Check if you're on the correct URL (bolt.new/*)</li>
                <li>Reload the extension in chrome://extensions/</li>
            </ul>
            
            <p><strong>API Key Issues:</strong></p>
            <ul>
                <li>Verify API key is correct and active</li>
                <li>Check the respective platform for usage limits</li>
                <li>Ensure API key has proper permissions</li>
                <li>Try switching to a different AI model</li>
            </ul>
            
            <p><strong>Review Process Fails:</strong></p>
            <ul>
                <li>Check internet connection</li>
                <li>Verify bolt.new page has loaded completely</li>
                <li>Try refreshing both the page and extension</li>
                <li>Switch to a different AI model if one is having issues</li>
            </ul>
        </div>
        
        <h2>🔒 Security & Privacy</h2>
        <div class="success">
            <h3>Your Data is Safe</h3>
            <ul>
                <li><strong>Local Storage:</strong> API keys stored locally in Chrome's secure storage</li>
                <li><strong>No Data Collection:</strong> Extension doesn't collect or transmit user data</li>
                <li><strong>Direct API:</strong> Communicates directly with AI providers</li>
                <li><strong>HTTPS Only:</strong> All communications use secure encryption</li>
                <li><strong>Multi-Provider:</strong> Choose your preferred AI provider</li>
            </ul>
        </div>
        
        <h2>📞 Support</h2>
        <p>Need help? Contact us:</p>
        <ul>
            <li><strong>GitHub:</strong> <a href="https://github.com/your-username/codeguardian-extension" target="_blank">Report Issues</a></li>
            <li><strong>Email:</strong> support@codeguardian.dev</li>
        </ul>
        
        <h2>🎯 Tips for Best Results</h2>
        <div class="feature">
            <ul>
                <li>Try different AI models for varied perspectives on security</li>
                <li>Ensure Bolt AI has provided a detailed implementation plan before reviewing</li>
                <li>Review the generated security prompt before sending to Bolt AI</li>
                <li>Use the manual input feature for custom security requirements</li>
                <li>Keep your API keys updated and monitor usage limits</li>
                <li>Claude excels at detailed reasoning, Gemini at code analysis</li>
                <li>OpenAI provides balanced feedback, DeepSeek focuses on technical depth</li>
            </ul>
        </div>
    </div>
</body>
</html>
    `;
    
    // Create a blob with the help content and open it in a new tab
    const blob = new Blob([helpContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    chrome.tabs.create({ url: url });
  }
}

// Initialize the extension when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, initializing CodeGuardian...');
  new CodeGuardianAssistant();
});