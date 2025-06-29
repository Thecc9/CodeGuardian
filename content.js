// Bolt.new Assistant Content Script - Auto File Reader

// Prevent multiple declarations if script is injected multiple times
if (typeof window.BoltNewAssistant !== 'undefined') {
  console.log('🔄 BoltNewAssistant already loaded, skipping redeclaration');
} else {

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
        case 'getStatus':
          sendResponse({ 
            success: true, 
            isReading: this.isReading || false,
            currentOperation: this.currentOperation || null
          });
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
    console.log('📋 Attempting to read latest AI message...');
    
    try {
      let lastAIMessage = '';
      
      // Find the chat section specifically
      const chatSection = document.querySelector('section[aria-label="Chat"]');
      if (!chatSection) {
        console.log('❌ Chat section not found');
        sendResponse({ 
          success: false, 
          error: 'Chat section not found. Make sure you\'re on a bolt.new conversation page.' 
        });
        return;
      }
      
      console.log('✅ Found chat section');
      
      // Get all message containers in the chat section
      // Look for divs with data-message-id that contain AI responses (not user messages)
      const allMessages = Array.from(chatSection.querySelectorAll('div[data-message-id]'));
      console.log(`📝 Found ${allMessages.length} total messages`);
      
      // Filter to find AI messages (not user messages)
      const aiMessages = [];
      
      allMessages.forEach((messageDiv, index) => {
        // Check if this is a user message (has self-end class and specific background)
        const isUserMessage = messageDiv.classList.contains('self-end') || 
                             messageDiv.querySelector('.bg-bolt-elements-messages-background.self-end');
        
        if (isUserMessage) {
          console.log(`⚠️ Skipping user message at index ${index}`);
          return;
        }
        
        // Look for AI message content - should have the Bolt header and markdown content
        const hasBoltHeader = messageDiv.querySelector('h3') && 
                             messageDiv.querySelector('h3').textContent.trim() === 'Bolt';
        
        const hasMarkdownContent = messageDiv.querySelector('._MarkdownContent_19116_1');
        
        if (hasBoltHeader && hasMarkdownContent) {
          const messageId = messageDiv.getAttribute('data-message-id');
          const markdownContent = messageDiv.querySelector('._MarkdownContent_19116_1');
          const textContent = markdownContent.textContent.trim();
          
          if (textContent && textContent.length > 50) {
            console.log(`✅ Found AI message: ${messageId} (${textContent.substring(0, 100)}...)`);
            aiMessages.push({
              element: messageDiv,
              messageId: messageId,
              text: textContent,
              domPosition: index
            });
          }
        }
      });
      
      if (aiMessages.length > 0) {
        // Get the last AI message (highest DOM position = most recent)
        aiMessages.sort((a, b) => b.domPosition - a.domPosition);
        const lastMessage = aiMessages[0];
        lastAIMessage = lastMessage.text;
        
        console.log(`✅ Selected latest AI message: ${lastMessage.messageId}`);
        console.log(`📋 Message length: ${lastAIMessage.length} characters`);
      }
      
      // Fallback: if no AI messages found with the primary method, try alternative approach
      if (!lastAIMessage) {
        console.log('🔄 Trying fallback method...');
        
        // Look for any div with Bolt header that's not a user message
        const boltMessages = Array.from(chatSection.querySelectorAll('div')).filter(div => {
          const header = div.querySelector('h3');
          const isNotUserMessage = !div.classList.contains('self-end');
          const hasContent = div.querySelector('._MarkdownContent_19116_1');
          
          return header && 
                 header.textContent.trim() === 'Bolt' && 
                 isNotUserMessage && 
                 hasContent;
        });
        
        if (boltMessages.length > 0) {
          const lastBoltMessage = boltMessages[boltMessages.length - 1];
          const content = lastBoltMessage.querySelector('._MarkdownContent_19116_1');
          if (content) {
            lastAIMessage = content.textContent.trim();
            console.log('✅ Found AI message via fallback method');
          }
        }
      }
      
      if (lastAIMessage) {
        // Clean up the message
        lastAIMessage = this.cleanMessageText(lastAIMessage);
        
        // Limit length for display
        if (lastAIMessage.length > 3000) {
          lastAIMessage = lastAIMessage.substring(0, 3000) + '...\n\n(truncated for display)';
        }
        
        console.log('✅ Successfully found latest AI message');
        sendResponse({ 
          success: true, 
          plan: lastAIMessage
        });
      } else {
        console.log('❌ No AI messages found');
        sendResponse({ 
          success: false, 
          error: 'No AI messages found in the conversation. Make sure Bolt has responded to your query.' 
        });
      }
    } catch (error) {
      console.error('💥 Error reading latest AI message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Helper methods for AI message detection
  isUserMessage(element, text) {
    // Check for indicators that this is a user message
    const userIndicators = ['user', 'human', 'you said', 'your message', 'input', 'prompt'];
    const elementClasses = element.className?.toLowerCase() || '';
    const parentClasses = element.parentElement?.className?.toLowerCase() || '';
    
    // Check classes for user indicators
    for (const indicator of userIndicators) {
      if (elementClasses.includes(indicator) || parentClasses.includes(indicator)) {
        return true;
      }
    }
    
    // Check for typical user message patterns (short questions)
    if (text.length < 150 && (text.includes('?') || text.startsWith('Can you') || text.startsWith('Please') || text.startsWith('How'))) {
      return true;
    }
    
    return false;
  }
  
  isUIElement(element, text) {
    // Check for UI chrome, navigation, buttons, etc.
    const uiIndicators = ['button', 'menu', 'nav', 'header', 'footer', 'sidebar', 'toolbar', 'tab', 'panel'];
    const elementTag = element.tagName?.toLowerCase();
    const elementClasses = element.className?.toLowerCase() || '';
    
    // Skip actual button/input elements
    if (['button', 'input', 'textarea', 'select'].includes(elementTag)) {
      return true;
    }
    
    // Skip elements with UI-related classes
    for (const indicator of uiIndicators) {
      if (elementClasses.includes(indicator)) {
        return true;
      }
    }
    
    // Skip very short text that looks like UI labels
    if (text.length < 30 && /^[A-Z][a-z\s]+$/.test(text)) {
      return true;
    }
    
    return false;
  }
  
  isAIMessage(element, text) {
    // Check for indicators that this is an AI response
    const aiIndicators = ['assistant', 'ai', 'bot', 'response', 'answer'];
    const elementClasses = element.className?.toLowerCase() || '';
    const parentClasses = element.parentElement?.className?.toLowerCase() || '';
    
    // Check classes for AI indicators
    for (const indicator of aiIndicators) {
      if (elementClasses.includes(indicator) || parentClasses.includes(indicator)) {
        return true;
      }
    }
    
    // Check for typical AI response patterns
    if (text.length > 100) {
      // Long, structured text is likely AI
      if (text.includes('\n') || text.includes('•') || text.includes('1.') || text.includes('-')) {
        return true;
      }
      
      // Technical explanations are likely AI
      if (text.includes('```') || text.includes('function') || text.includes('import') || text.includes('class')) {
        return true;
      }
      
      // AI-like language patterns
      if (text.includes('I ') || text.includes('I\'ll ') || text.includes('Let me ') || text.includes('Here\'s ')) {
        return true;
      }
    }
    
    return text.length > 80; // Basic fallback - longer text might be AI
  }

  isPlanMessage(element, text) {
    // Check if this message contains a plan or actionable content
    const planIndicators = [
      'the plan',
      'plan:',
      'steps:',
      'action plan',
      'here\'s what',
      'to fix this',
      'solution:',
      'approach:',
      'strategy:',
      'implementation:',
      'next steps',
      'recommended steps'
    ];
    
    const textLower = text.toLowerCase();
    
    // Check for explicit plan indicators
    const hasPlanKeywords = planIndicators.some(indicator => textLower.includes(indicator));
    
    // Check for structured content (numbered lists, action items)
    const hasNumberedSteps = /\d+\.\s*\*?\*?[A-Z]/.test(text); // Patterns like "1. **Step"
    const hasBulletPoints = text.includes('- ') || text.includes('• ');
    const hasActionWords = /\b(create|modify|update|change|add|remove|fix|implement|configure|setup|install)\b/i.test(text);
    
    // Check for structured headings
    const hasHeadings = text.includes('##') || text.includes('###') || /\*\*[A-Z][^*]+\*\*/.test(text);
    
    // Check for file/code references (common in plans)
    const hasFileReferences = /\.(js|ts|html|css|sql|json|md)\b/.test(text) || text.includes('`') || text.includes('```');
    
    // Calculate plan confidence score
    let planScore = 0;
    if (hasPlanKeywords) planScore += 0.8;
    if (hasNumberedSteps) planScore += 0.6;
    if (hasBulletPoints) planScore += 0.3;
    if (hasActionWords) planScore += 0.4;
    if (hasHeadings) planScore += 0.3;
    if (hasFileReferences) planScore += 0.2;
    if (text.length > 500) planScore += 0.2; // Longer content often contains plans
    
    return planScore >= 0.5; // Threshold for plan detection
  }

  getPlanConfidence(element, text) {
    // Enhanced confidence scoring that prioritizes plan content
    let confidence = this.getAIConfidence(element, text);
    
    // Add plan-specific confidence boost
    const textLower = text.toLowerCase();
    
    // Strong plan indicators
    if (textLower.includes('the plan') || textLower.includes('plan:')) confidence += 0.9;
    if (textLower.includes('steps:') || textLower.includes('action plan')) confidence += 0.8;
    if (textLower.includes('solution:') || textLower.includes('to fix this')) confidence += 0.7;
    
    // Structured content indicators
    if (/\d+\.\s*\*?\*?[A-Z]/.test(text)) confidence += 0.6; // Numbered steps
    if (text.includes('##') || /\*\*[A-Z][^*]+\*\*/.test(text)) confidence += 0.4; // Headings
    if (/\b(modify|create|update|fix|implement)\b/i.test(text)) confidence += 0.3; // Action words
    
    // File/technical references
    if (/\.(js|ts|html|css|sql|json)\b/.test(text)) confidence += 0.3;
    if (text.includes('```') || (text.match(/`[^`]+`/g) || []).length > 2) confidence += 0.2;
    
    return Math.min(confidence, 2.0); // Allow higher confidence for plan content
  }
  
  getAIConfidence(element, text) {
    let confidence = 0;
    
    const elementClasses = element.className?.toLowerCase() || '';
    const parentClasses = element.parentElement?.className?.toLowerCase() || '';
    
    // Class-based confidence
    if (elementClasses.includes('assistant') || parentClasses.includes('assistant')) confidence += 0.8;
    if (elementClasses.includes('ai') || parentClasses.includes('ai')) confidence += 0.7;
    if (elementClasses.includes('response') || parentClasses.includes('response')) confidence += 0.6;
    if (elementClasses.includes('prose') || parentClasses.includes('prose')) confidence += 0.4;
    
    // Content-based confidence
    if (text.includes('```')) confidence += 0.3;
    if (text.includes('I ') || text.includes('I\'ll ') || text.includes('Let me ')) confidence += 0.3;
    if (text.length > 300) confidence += 0.2;
    if (text.includes('\n\n')) confidence += 0.1;
    if (text.includes('Here\'s') || text.includes('You can')) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }
  
  getElementPosition(element) {
    // Get approximate DOM position for sorting (higher = more recent)
    let position = 0;
    let current = element;
    
    while (current) {
      const siblings = Array.from(current.parentNode?.children || []);
      position += siblings.indexOf(current) * 1000;
      current = current.parentNode;
      if (current === document.body) break;
    }
    
    return position;
  }
  
  cleanMessageText(text) {
    // Clean up the message text
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^\s*[\w\s]*:\s*/, '') // Remove potential prefixes like "Assistant: "
      .replace(/^(Bolt|AI|Assistant)[:\s]+/i, '') // Remove AI name prefixes  
      .trim();
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
      
      console.log('✅ Message placed in chat input field');
      
      // Wait a moment for UI to update
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Keep the input focused so user can review and send manually
      chatInput.focus();
      
      // Position cursor at the end of the text
      chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
      
      sendResponse({ 
        success: true, 
        message: 'Message placed in chat input field. Review and press Enter or click send when ready.' 
      });
      
    } catch (error) {
      console.error('💥 Error sending message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // Switch to code mode if currently in preview mode
  async switchToCodeMode() {
    console.log('🔄 Ensuring we are in code mode...');
    
    try {
      // Look for the Code/Preview toggle area based on bolt.new structure
      // The toggle has specific class patterns with "Code" and "Preview" buttons
      const toggleContainer = document.querySelector('[class*="flex items-center flex-wrap shrink-0 gap-1"]');
      
      if (toggleContainer) {
        // Look for the Code button specifically
        const codeButton = Array.from(toggleContainer.querySelectorAll('button')).find(btn => 
          btn.textContent.trim() === 'Code' && !btn.getAttribute('aria-pressed')
        );
        
        if (codeButton && codeButton.getAttribute('aria-pressed') === 'false') {
          console.log('🎯 Found Code toggle button, switching...');
          codeButton.click();
          await new Promise(resolve => setTimeout(resolve, 1200));
          console.log('✅ Switched to Code mode');
          return true;
        }
      }
      
      // Alternative: Look for any Code button with aria-pressed="false"
      const allCodeButtons = document.querySelectorAll('button[aria-pressed="false"]');
      for (const button of allCodeButtons) {
        const buttonText = button.textContent?.trim();
        if (buttonText === 'Code') {
          console.log('🎯 Found Code button (alt method), clicking...');
          button.click();
          await new Promise(resolve => setTimeout(resolve, 1200));
          console.log('✅ Switched to Code mode');
          return true;
        }
      }
      
      // Check if we're already in code mode
      const activeCodeButton = document.querySelector('button[aria-pressed="true"]');
      if (activeCodeButton && activeCodeButton.textContent.trim() === 'Code') {
        console.log('✅ Already in Code mode');
        return true;
      }
      
      console.log('ℹ️ Code/Preview toggle not found or already in correct mode');
      return false;
    } catch (error) {
      console.error('💥 Error switching to code mode:', error);
      return false;
    }
  }
  
  // Enhanced method to get all file elements from bolt.new
  getFileElements() {
    console.log('🔍 Searching for file elements in the bolt.new file tree...');
    
    const fileElements = [];
    const seenNames = new Set();
    
    // Method 1: Look for file buttons with the bolt.new structure
    // Based on the HTML structure: button with file icon and translate="no" name
    const fileButtons = document.querySelectorAll('button[class*="group flex items-center gap-1.5"]');
    
    fileButtons.forEach(button => {
      // Look for file icon (not folder icon)
      const hasFileIcon = button.querySelector('[class*="i-ph:file-duotone"]') || 
                         button.querySelector('[class*="i-ph:file"]');
      
      // Skip if it has a folder icon instead
      const hasFolderIcon = button.querySelector('[class*="i-ph:caret-right"]') ||
                           button.querySelector('[class*="caret"]');
      
      if (hasFileIcon && !hasFolderIcon) {
        // Get the filename from translate="no" element
        const nameElement = button.querySelector('[translate="no"]');
        if (nameElement) {
          const fileName = nameElement.textContent.trim();
          if (fileName && !seenNames.has(fileName) && this.isValidFileName(fileName)) {
            seenNames.add(fileName);
            fileElements.push({
              element: button,
              name: fileName,
              type: 'file'
            });
          }
        }
      }
    });
    
    // Method 2: Look for files in folder structures (expanded folders)
    const allButtons = document.querySelectorAll('button[style*="padding-left"]');
    
    allButtons.forEach(button => {
      const hasFileIcon = button.querySelector('[class*="i-ph:file-duotone"]');
      const nameElement = button.querySelector('[translate="no"]');
      
      if (hasFileIcon && nameElement) {
        const fileName = nameElement.textContent.trim();
        if (fileName && !seenNames.has(fileName) && this.isValidFileName(fileName)) {
          seenNames.add(fileName);
          fileElements.push({
            element: button,
            name: fileName,
            type: 'file'
          });
        }
      }
    });
    
    // Method 3: Alternative selector for different bolt.new layouts
    const alternativeButtons = document.querySelectorAll('button[data-state="closed"]');
    
    alternativeButtons.forEach(button => {
      const hasFileIcon = button.querySelector('[class*="i-ph:file"]');
      const nameElement = button.querySelector('[translate="no"]');
      
      if (hasFileIcon && nameElement) {
        const fileName = nameElement.textContent.trim();
        if (fileName && !seenNames.has(fileName) && this.isValidFileName(fileName)) {
          seenNames.add(fileName);
          fileElements.push({
            element: button,
            name: fileName,
            type: 'file'
          });
        }
      }
    });
    
    // Sort files alphabetically
    fileElements.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`📁 Found ${fileElements.length} files:`, fileElements.map(f => f.name));
    return fileElements;
  }
  
  // Check if a filename is valid
  isValidFileName(fileName) {
    if (!fileName || fileName.length === 0 || fileName.length > 100) return false;
    
    // Skip navigation elements
    const invalidNames = ['Files', 'Search', 'caret', 'icon', '.bolt', 'node_modules'];
    if (invalidNames.some(invalid => fileName.includes(invalid))) return false;
    
    // Should contain valid filename characters
    return /^[a-zA-Z0-9._\-\/\\]+$/.test(fileName);
  }
  
  // Enhanced method to get current file content from CodeMirror editor
  getCurrentFileContent() {
    console.log('📖 Attempting to read content from code editor...');
    
    // Multiple strategies to get content from different editor types
    const strategies = [
      // CodeMirror 6 (most common in bolt.new)
      () => {
        const cmContent = document.querySelector('.cm-content');
        if (cmContent) {
          return cmContent.textContent;
        }
        return null;
      },
      
      // CodeMirror with specific classes
      () => {
        const cmEditor = document.querySelector('.cm-editor');
        if (cmEditor) {
          const content = cmEditor.querySelector('.cm-content');
          return content ? content.textContent : null;
        }
        return null;
      },
      
      // Monaco Editor
      () => {
        const monacoLines = document.querySelector('.view-lines');
        if (monacoLines) {
          return monacoLines.textContent;
        }
        return null;
      },
      
      // Generic code editor
      () => {
        const codeElement = document.querySelector('pre code, code pre, .code-content');
        if (codeElement) {
          return codeElement.textContent;
        }
        return null;
      },
      
      // Textarea fallback
      () => {
        const textarea = document.querySelector('textarea[class*="code"], textarea[class*="editor"]');
        if (textarea) {
          return textarea.value;
        }
        return null;
      }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        const content = strategies[i]();
        if (content && content.trim().length > 0) {
          console.log(`✅ Successfully got content using strategy ${i + 1}`);
          return content.trim();
        }
      } catch (error) {
        console.log(`⚠️ Strategy ${i + 1} failed:`, error.message);
      }
    }
    
    console.log('❌ No content found in any editor');
    return null;
  }
  
  // Enhanced function to check if content should be excluded
  shouldExcludeContent(text) {
    const trimmedText = text.trim();
    
    // Skip very short content
    if (trimmedText.length < 10) return true;
    
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
  
  // Function to check if content is actual code or meaningful text
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
      /catch\s*\(/,
      
      // Markdown
      /^#\s+/m,
      /^\*\s+/m,
      /^\d+\.\s+/m,
      /\[.*\]\(.*\)/,
      
      // Config files
      /^\w+\s*=\s*.+$/m,
      /^\[.*\]$/m
    ];
    
    return codePatterns.some(pattern => pattern.test(trimmedText));
  }
  
  // Enhanced file reading with better error handling and progress tracking
  async readProjectCode(sendResponse) {
    console.log('📁 Starting comprehensive file reading...');
    
    // Set reading state
    this.isReading = true;
    this.currentOperation = 'readProjectCode';
    
    try {
      // Ensure we're in code mode
      await this.switchToCodeMode();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const fileElements = this.getFileElements();
      
      if (fileElements.length === 0) {
        sendResponse({ 
          success: false, 
          error: 'No files found. Please ensure you have a project open in bolt.new and the file tree is visible.' 
        });
        return;
      }
      
      console.log(`📋 Found ${fileElements.length} files to read`);
      
      const fileContents = new Map();
      const errors = [];
      let successCount = 0;
      
      // Create progress indicator
      this.showProgress('Starting file read...', 0, fileElements.length);
      
      // Read each file
      for (let i = 0; i < fileElements.length; i++) {
        const fileInfo = fileElements[i];
        const fileName = fileInfo.name;
        
        this.updateProgress(`Reading: ${fileName}`, i + 1, fileElements.length);
        
        try {
          // Click on the file to open it
          if (fileInfo.element && typeof fileInfo.element.click === 'function') {
            fileInfo.element.click();
            console.log(`🖱️ Clicked file: ${fileName}`);
            
            // Wait for content to load
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            // Try to get content
            const content = this.getCurrentFileContent();
            
            if (content && content.length > 0) {
              // Filter out non-useful content
              if (!this.shouldExcludeContent(content)) {
                fileContents.set(fileName, content);
                successCount++;
                console.log(`✅ Read ${fileName} (${content.length} chars)`);
              } else {
                console.log(`⚠️ Excluded ${fileName} (filtered content)`);
              }
            } else {
              console.log(`❌ No content for ${fileName}`);
              errors.push(`No content found for ${fileName}`);
            }
          } else {
            console.log(`❌ Cannot click ${fileName}`);
            errors.push(`Cannot access ${fileName}`);
          }
        } catch (error) {
          console.error(`💥 Error reading ${fileName}:`, error);
          errors.push(`Error reading ${fileName}: ${error.message}`);
        }
        
        // Small delay between files
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      this.hideProgress();
      
      // Compile results
      if (fileContents.size > 0) {
        let result = `=== PROJECT CODE (${fileContents.size} files) ===\n\n`;
        
        // Add file list
        result += '📁 FILES:\n';
        for (const fileName of fileContents.keys()) {
          result += `  - ${fileName}\n`;
        }
        result += '\n';
        
        // Add file contents
        for (const [fileName, content] of fileContents) {
          result += `\n${'='.repeat(50)}\n`;
          result += `📄 FILE: ${fileName}\n`;
          result += `${'='.repeat(50)}\n`;
          result += content;
          result += '\n';
        }
        
        // Add summary
        result += `\n${'='.repeat(50)}\n`;
        result += `📊 SUMMARY:\n`;
        result += `✅ Successfully read: ${successCount} files\n`;
        result += `❌ Errors: ${errors.length} files\n`;
        result += `📊 Total characters: ${result.length}\n`;
        
        if (errors.length > 0) {
          result += `\n⚠️ ERRORS:\n${errors.join('\n')}\n`;
        }
        
        // Truncate if too long
        const maxLength = 15000;
        if (result.length > maxLength) {
          result = result.substring(0, maxLength) + `\n\n...(truncated - showing first ${maxLength} characters)\n\nTotal files: ${fileContents.size}`;
        }
        
        // Clear reading state on success
        this.isReading = false;
        this.currentOperation = null;
        
        sendResponse({
          success: true,
          code: result,
          filesFound: fileContents.size,
          totalFiles: fileElements.length
        });
      } else {
        // Clear reading state on failure
        this.isReading = false;
        this.currentOperation = null;
        
        sendResponse({
          success: false,
          error: `Failed to read any files.\n\nErrors encountered:\n${errors.join('\n')}\n\nTotal files attempted: ${fileElements.length}`
        });
      }
      
    } catch (error) {
      console.error('💥 Critical error in readProjectCode:', error);
      this.hideProgress();
      
      // Clear reading state on error
      this.isReading = false;
      this.currentOperation = null;
      
      sendResponse({ 
        success: false, 
        error: `Critical error: ${error.message}` 
      });
    }
  }
  
  // Progress indicator methods
  showProgress(message, current, total) {
    const existing = document.getElementById('bolt-assistant-progress');
    if (existing) existing.remove();
    
    const progress = document.createElement('div');
    progress.id = 'bolt-assistant-progress';
    progress.innerHTML = `
      <div style="
        position: fixed;
        top: 60px;
        left: 10px;
        background: linear-gradient(45deg, #007bff, #0056b3);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        z-index: 10001;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 1px solid rgba(255,255,255,0.1);
      ">
        <div style="font-weight: 600; margin-bottom: 4px;">📁 Bolt.new File Reader</div>
        <div id="progress-message">${message}</div>
        <div style="margin-top: 8px;">
          <div style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; overflow: hidden;">
            <div id="progress-bar" style="background: #fff; height: 100%; transition: width 0.3s ease; width: ${total > 0 ? (current / total * 100) : 0}%;"></div>
          </div>
          <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">${current}/${total} files</div>
        </div>
      </div>
    `;
    document.body.appendChild(progress);
  }
  
  updateProgress(message, current, total) {
    const messageEl = document.getElementById('progress-message');
    const barEl = document.getElementById('progress-bar');
    
    if (messageEl) messageEl.textContent = message;
    if (barEl) barEl.style.width = `${total > 0 ? (current / total * 100) : 0}%`;
    
    const progress = document.getElementById('bolt-assistant-progress');
    if (progress) {
      const countsEl = progress.querySelector('div:last-child > div:last-child');
      if (countsEl) countsEl.textContent = `${current}/${total} files`;
    }
  }
  
  hideProgress() {
    const progress = document.getElementById('bolt-assistant-progress');
    if (progress) {
      setTimeout(() => {
        if (progress.parentNode) {
          progress.parentNode.removeChild(progress);
        }
      }, 2000);
    }
  }
}

// Initialize content script (only if not already initialized)
if (!window.boltAssistant) {
  const boltAssistant = new BoltNewAssistant();
  
  // Make it available globally for debugging and to prevent re-initialization
  window.boltAssistant = boltAssistant;
  window.BoltNewAssistant = BoltNewAssistant;
  
  console.log('✅ BoltNewAssistant initialized and registered globally');
} else {
  console.log('🔄 BoltNewAssistant already initialized, using existing instance');
}

} // End of prevention block