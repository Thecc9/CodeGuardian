// Bolt.new Assistant Content Script - Filter Out Binary and Noise

class BoltNewAssistant {
  constructor() {
    this.initialized = false;
    this.init();
  }
  
  init() {
    if (this.initialized) return;
    this.initialized = true;
    
    console.log('🚀 Bolt.new Assistant: Content script loaded on:', window.location.href);
    
    // Add a visual indicator that the content script is loaded
    this.addDebugIndicator();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Content script received message:', message);
      this.handleMessage(message, sendResponse);
      return true; // Keep message channel open for async response
    });
    
    console.log('✅ Content script initialized and listening for messages');
  }
  
  addDebugIndicator() {
    // Remove any existing indicator
    const existing = document.getElementById('bolt-assistant-debug');
    if (existing) existing.remove();
    
    const indicator = document.createElement('div');
    indicator.id = 'bolt-assistant-debug';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 10px;
        left: 10px;
        background: #28a745;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        font-family: monospace;
      ">
        ✅ Bolt Assistant Ready
      </div>
    `;
    document.body.appendChild(indicator);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
      }
    }, 3000);
  }
  
  async handleMessage(message, sendResponse) {
    console.log('🎯 Handling message:', message.action);
    
    try {
      switch (message.action) {
        case 'ping':
          sendResponse({ success: true, message: 'Content script is ready' });
          break;
        case 'readLatestPlan':
          await this.readLatestPlan(sendResponse);
          break;
        case 'sendChatMessage':
          await this.sendChatMessage(message.message, sendResponse);
          break;
        case 'readProjectCode':
          await this.readProjectCode(sendResponse);
          break;
        default:
          console.log('❌ Unknown action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('💥 Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  async readLatestPlan(sendResponse) {
    console.log('📋 Attempting to read latest plan...');
    
    try {
      // Look for chat messages in bolt.new
      const messageSelectors = [
        '[class*="message"]',
        '[class*="chat"]',
        '[class*="response"]',
        '[class*="assistant"]',
        '[class*="ai"]',
        'div[class*="bolt"]',
        '.prose',
        '[role="assistant"]'
      ];
      
      let planText = '';
      let foundMessages = [];
      
      // Try each selector to find messages
      for (const selector of messageSelectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`🔍 Found ${elements.length} elements for selector: ${selector}`);
        
        elements.forEach(element => {
          const text = element.textContent.trim();
          if (text.length > 50 && text.length < 3000) {
            foundMessages.push({
              selector: selector,
              text: text,
              length: text.length
            });
          }
        });
      }
      
      // Sort by length (longer messages are likely more substantial)
      foundMessages.sort((a, b) => b.length - a.length);
      
      // Get the most substantial message (likely the latest plan)
      if (foundMessages.length > 0) {
        planText = foundMessages[0].text;
        console.log('✅ Found plan content from:', foundMessages[0].selector);
      } else {
        // Fallback: get any substantial text content
        const allDivs = document.querySelectorAll('div, p, article, section');
        for (const div of allDivs) {
          const text = div.textContent.trim();
          if (text.length > 100 && text.length < 2000 && 
              (text.includes('plan') || text.includes('step') || text.includes('create') || text.includes('build'))) {
            planText = text;
            break;
          }
        }
      }
      
      if (planText) {
        // Limit length for display
        if (planText.length > 1500) {
          planText = planText.substring(0, 1500) + '...\n\n(truncated for display)';
        }
        
        console.log('✅ Successfully found plan content');
        sendResponse({ 
          success: true, 
          plan: planText
        });
      } else {
        console.log('❌ No plan content found');
        sendResponse({ 
          success: false, 
          error: 'No conversation or plan found. Try having a conversation with Bolt first.' 
        });
      }
    } catch (error) {
      console.error('💥 Error reading plan:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  async sendChatMessage(message, sendResponse) {
    console.log('💬 Attempting to send chat message:', message);
    
    try {
      // Look for the specific bolt.new textarea
      const boltTextarea = document.querySelector('textarea[placeholder*="How can Bolt help you today"]');
      
      let chatInput = null;
      
      if (boltTextarea) {
        chatInput = boltTextarea;
        console.log('✅ Found Bolt textarea with correct placeholder');
      } else {
        // Fallback: look for textarea with bolt classes
        const textareaSelectors = [
          'textarea[class*="bolt"]',
          'textarea[class*="w-full"]',
          'textarea[placeholder*="help"]',
          'textarea[placeholder*="today"]',
          'textarea'
        ];
        
        for (const selector of textareaSelectors) {
          const textarea = document.querySelector(selector);
          if (textarea && textarea.offsetParent !== null && !textarea.disabled) {
            chatInput = textarea;
            console.log('✅ Found textarea with selector:', selector);
            break;
          }
        }
      }
      
      if (!chatInput) {
        console.log('❌ No chat input found');
        sendResponse({ success: false, error: 'Chat input field not found. Make sure you\'re on the main Bolt.new page.' });
        return;
      }
      
      // Clear existing content and set new message
      chatInput.value = '';
      chatInput.focus();
      
      // Set the message
      chatInput.value = message;
      
      // Trigger input events to notify React/Vue components
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      
      chatInput.dispatchEvent(inputEvent);
      chatInput.dispatchEvent(changeEvent);
      
      console.log('✅ Message set in textarea');
      
      // Wait a moment for UI to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Look for send button - likely near the textarea
      const sendButtonSelectors = [
        'button[type="submit"]',
        'button[class*="send"]',
        'button[class*="submit"]',
        'button[aria-label*="send"]',
        'button[title*="send"]',
        'button svg',
        'button[class*="bolt"]'
      ];
      
      let sendButton = null;
      
      // First, try to find button near the textarea
      const textareaParent = chatInput.closest('div');
      if (textareaParent) {
        const nearbyButtons = textareaParent.querySelectorAll('button');
        for (const button of nearbyButtons) {
          if (!button.disabled && button.offsetParent !== null) {
            sendButton = button;
            console.log('✅ Found nearby send button');
            break;
          }
        }
      }
      
      if (sendButton) {
        sendButton.click();
        console.log('✅ Clicked send button');
        sendResponse({ success: true });
      } else {
        console.log('⚠️ No send button found, message is in chat field');
        sendResponse({ 
          success: true, 
          message: 'Message placed in chat field. You may need to press Enter or click send manually.' 
        });
      }
      
    } catch (error) {
      console.error('💥 Error sending message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // Enhanced function to check if content should be excluded
  shouldExcludeContent(text) {
    const trimmedText = text.trim();
    
    // Skip very short content
    if (trimmedText.length < 20) return true;
    
    // Skip shell commands
    const commandPatterns = [
      /^rm -rf/,
      /^npm (install|run|start)/,
      /^yarn (install|start)/,
      /^cd \w+/,
      /^mkdir/,
      /^cp /,
      /^mv /,
      /\s+&&\s+rm\s+-rf/
    ];
    
    if (commandPatterns.some(pattern => pattern.test(trimmedText))) {
      console.log('⚠️ Excluding shell command');
      return true;
    }
    
    // Skip binary data (repeating 0s and 1s)
    if (/^[01\s]+$/.test(trimmedText) && trimmedText.length > 50) {
      console.log('⚠️ Excluding binary data');
      return true;
    }
    
    // Skip repetitive patterns (same character repeated many times)
    const uniqueChars = new Set(trimmedText.replace(/\s/g, ''));
    if (uniqueChars.size <= 2 && trimmedText.length > 100) {
      console.log('⚠️ Excluding repetitive pattern');
      return true;
    }
    
    // Skip content that's mostly numbers or symbols without meaningful structure
    const alphaCount = (trimmedText.match(/[a-zA-Z]/g) || []).length;
    const totalCount = trimmedText.replace(/\s/g, '').length;
    if (totalCount > 100 && alphaCount / totalCount < 0.1) {
      console.log('⚠️ Excluding non-textual content');
      return true;
    }
    
    // Skip very long lines without breaks (likely minified or encoded content)
    const lines = trimmedText.split('\n');
    const hasVeryLongLines = lines.some(line => line.length > 500);
    const hasReasonableStructure = lines.length > 3 || trimmedText.includes('{') || trimmedText.includes('<');
    
    if (hasVeryLongLines && !hasReasonableStructure) {
      console.log('⚠️ Excluding minified/encoded content');
      return true;
    }
    
    return false;
  }
  
  // Function to check if content is actual code
  isActualCode(text) {
    const trimmedText = text.trim();
    
    // Check for code patterns
    const codePatterns = [
      // JavaScript/TypeScript
      /function\s+\w+\s*\(/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /import\s+.*from/,
      /export\s+(default\s+)?/,
      /class\s+\w+/,
      /interface\s+\w+/,
      /=>\s*[{(]/,
      /console\.log\s*\(/,
      /document\./,
      /window\./,
      /addEventListener/,
      
      // HTML
      /<!DOCTYPE\s+html>/i,
      /<html[^>]*>/i,
      /<head[^>]*>/i,
      /<body[^>]*>/i,
      /<div[^>]*>/i,
      /<script[^>]*>/i,
      /<style[^>]*>/i,
      /<[a-zA-Z]+[^>]*>/,
      
      // CSS
      /\.[a-zA-Z][\w-]*\s*\{/,
      /#[a-zA-Z][\w-]*\s*\{/,
      /[a-zA-Z][\w-]*\s*:\s*[^;]+;/,
      /@media\s*\(/,
      /@import\s+/,
      
      // JSON
      /^\s*\{[\s\S]*\}\s*$/,
      /"[^"]+"\s*:\s*"[^"]*"/,
      /"[^"]+"\s*:\s*\d+/,
      /"[^"]+"\s*:\s*\[/,
      
      // Common programming constructs
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/,
      /try\s*\{/,
      /catch\s*\(/
    ];
    
    return codePatterns.some(pattern => pattern.test(trimmedText));
  }
  
  async readProjectCode(sendResponse) {
    console.log('📁 Reading project code (filtering out noise)...');
    
    try {
      let codeContent = '';
      let filesFound = 0;
      const capturedContent = new Set();
      
      // 1. EXACT ORDER: Use the exact order specified
      const exactOrder = [
        '.bolt',
        '.gitignore',
        'background.js',
        'content.js',
        'manifest.json',
        'package-loc...',
        'package.json',
        'popup.css',
        'popup.html',
        'popup.js',
        'README.md',
        'settings.html'
      ];
      
      console.log('📋 Using exact specified order:', exactOrder);
      
      // Create the file list in exact order
      const fileListContent = exactOrder.join('\n');
      codeContent += `=== PROJECT FILES (In Exact Order) ===\n${fileListContent}\n`;
      console.log('✅ Added file list in exact specified order');
      
      // 2. Get code content with enhanced filtering
      console.log('🔍 Looking for actual code content...');
      
      const addUniqueContent = (content, label) => {
        const trimmedContent = content.trim();
        
        // Enhanced filtering
        if (this.shouldExcludeContent(trimmedContent)) {
          console.log(`⚠️ Skipping excluded content: ${label}`);
          return false;
        }
        
        // Check if it's actual code
        if (!this.isActualCode(trimmedContent)) {
          console.log(`⚠️ Skipping non-code content: ${label}`);
          return false;
        }
        
        const signature = trimmedContent.substring(0, 100);
        if (capturedContent.has(signature)) {
          console.log(`⚠️ Skipping duplicate content: ${label}`);
          return false;
        }
        
        capturedContent.add(signature);
        filesFound++;
        codeContent += `\n=== ${label} ===\n${trimmedContent}\n`;
        console.log(`✅ Added code content: ${label}`);
        return true;
      };
      
      // Look for code in various places
      const codeSelectors = [
        { selector: '.monaco-editor .view-lines', name: 'Monaco Editor' },
        { selector: '.monaco-editor', name: 'Monaco Editor' },
        { selector: '.CodeMirror-code', name: 'CodeMirror' },
        { selector: '.cm-content', name: 'CodeMirror' },
        { selector: 'pre code', name: 'Code Block' },
        { selector: 'code[class*="language-"]', name: 'Syntax Highlighted' },
        { selector: '.hljs', name: 'Highlighted Code' }
      ];
      
      for (const { selector, name } of codeSelectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`🔍 Found ${elements.length} ${name} elements`);
        
        elements.forEach((element, index) => {
          const text = element.textContent.trim();
          if (text.length > 20) {
            // Try to determine language
            const classList = element.className.toLowerCase();
            let language = '';
            
            if (classList.includes('javascript') || classList.includes('js')) language = 'JavaScript';
            else if (classList.includes('html')) language = 'HTML';
            else if (classList.includes('css')) language = 'CSS';
            else if (classList.includes('json')) language = 'JSON';
            else if (text.includes('<!DOCTYPE') || text.includes('<html')) language = 'HTML';
            else if (text.includes('function') || text.includes('const ')) language = 'JavaScript';
            else if (text.includes('"name":') && text.includes('"version":')) language = 'JSON';
            else if (text.includes('background:') || text.includes('color:')) language = 'CSS';
            
            const label = language ? `${language} CODE` : `${name.toUpperCase()}`;
            addUniqueContent(text, label);
          }
        });
      }
      
      console.log(`🔍 Total code sections found: ${filesFound}`);
      
      if (codeContent.trim()) {
        const maxLength = 8000;
        if (codeContent.length > maxLength) {
          codeContent = codeContent.substring(0, maxLength) + '\n\n...(truncated - showing first 8,000 characters)\n\nTotal sections: ' + filesFound;
        }
        
        console.log('✅ Successfully found clean code content');
        sendResponse({ 
          success: true, 
          code: codeContent,
          filesFound: filesFound
  });
} else {
        console.log('❌ No actual code content found');
        
        const debugInfo = `
Debug Info:
- File list: Created in exact specified order
- Monaco editors: ${document.querySelectorAll('.monaco-editor').length}
- Code blocks: ${document.querySelectorAll('pre code').length}
- Highlighted code: ${document.querySelectorAll('.hljs').length}

Files in exact order:
${exactOrder.join('\n')}

Make sure you have actual code files open in the Bolt editor.
        `;
        
        sendResponse({ 
          success: false, 
          error: 'No actual code content found.\n\n' + debugInfo
        });
      }
    } catch (error) {
      console.error('💥 Error reading code:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Initialize content script
const boltAssistant = new BoltNewAssistant();

// Also make it available globally for debugging
window.boltAssistant = boltAssistant;
