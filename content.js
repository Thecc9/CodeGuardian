// CodeGuardian Content Script

class CodeGuardianContent {
  constructor() {
    this.isActive = false;
    this.init();
  }
  
  async init() {
    await this.loadStatus();
    if (this.isActive) {
      this.startMonitoring();
    }
    
    // Listen for status changes
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'statusChanged') {
        this.isActive = message.isActive;
        if (this.isActive) {
          this.startMonitoring();
        } else {
          this.stopMonitoring();
        }
      }
    });
  }
  
  async loadStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
      this.isActive = response.isActive;
    } catch (error) {
      console.error('Error loading status:', error);
    }
  }
  
  startMonitoring() {
    console.log('CodeGuardian: Starting code protection monitoring');
    
    // Monitor for suspicious code patterns
    this.observeCodeChanges();
    
    // Add visual indicator
    this.addProtectionIndicator();
  }
  
  stopMonitoring() {
    console.log('CodeGuardian: Stopping code protection monitoring');
    this.removeProtectionIndicator();
  }
  
  observeCodeChanges() {
    // Monitor for code elements on the page
    const codeSelectors = [
      'code',
      'pre',
      '.highlight',
      '.code',
      '.source-code',
      '[class*="language-"]'
    ];
    
    codeSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        this.protectCodeElement(element);
      });
    });
  }
  
  protectCodeElement(element) {
    // Add protection attributes
    element.setAttribute('data-codeguardian-protected', 'true');
    
    // Prevent right-click context menu on code
    element.addEventListener('contextmenu', (e) => {
      if (this.isActive) {
        e.preventDefault();
        this.showProtectionNotice();
      }
    });
    
    // Prevent text selection on sensitive code
    element.addEventListener('selectstart', (e) => {
      if (this.isActive && this.isSensitiveCode(element)) {
        e.preventDefault();
        this.showProtectionNotice();
      }
    });
  }
  
  isSensitiveCode(element) {
    const sensitivePatterns = [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token/i,
      /credential/i
    ];
    
    const text = element.textContent.toLowerCase();
    return sensitivePatterns.some(pattern => pattern.test(text));
  }
  
  addProtectionIndicator() {
    if (document.getElementById('codeguardian-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'codeguardian-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        🛡️ CodeGuardian Active
      </div>
    `;
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (indicator && indicator.parentNode) {
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 300);
      }
    }, 3000);
  }
  
  removeProtectionIndicator() {
    const indicator = document.getElementById('codeguardian-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  showProtectionNotice() {
    // Create a temporary notice
    const notice = document.createElement('div');
    notice.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px 30px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        text-align: center;
      ">
        🛡️ Code Protected by CodeGuardian<br>
        <small style="opacity: 0.8;">This action has been blocked for security</small>
      </div>
    `;
    
    document.body.appendChild(notice);
    
    setTimeout(() => {
      if (notice && notice.parentNode) {
        notice.parentNode.removeChild(notice);
      }
    }, 2000);
  }
}

// Initialize content script when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CodeGuardianContent();
  });
} else {
  new CodeGuardianContent();
}