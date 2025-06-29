# CodeGuardian - AI-Powered Security Review for Bolt.new

A Chrome extension that provides intelligent security analysis for bolt.new projects using Google's Gemini AI. CodeGuardian acts as your personal security expert, reviewing implementation plans and providing detailed feedback to ensure secure coding practices.

## 🛡️ Features

### 🔍 AI-Powered Security Analysis
- **Gemini AI Integration**: Leverages Google's advanced Gemini AI for comprehensive security analysis
- **Real-time Review**: Analyzes Bolt AI's latest implementation plans instantly
- **Intelligent Scoring**: Provides security scores (1-10) with detailed explanations
- **Critical Issue Detection**: Identifies and prioritizes security vulnerabilities

### 🚀 Automated Workflow
- **One-Click Review**: Single button press to perform complete security analysis
- **Auto-Generated Prompts**: Creates detailed security feedback prompts automatically
- **Smart Integration**: Seamlessly inserts analysis into bolt.new chat without manual copying
- **Progress Tracking**: Visual progress indicators for each step of the review process

### 🔒 Security Focus Areas
- Authentication and authorization vulnerabilities
- Data validation and sanitization
- SQL injection and XSS prevention
- Secure API design and implementation
- Proper error handling and logging
- Secrets management and encryption
- HTTPS and secure communication
- Input validation and rate limiting
- DoS protection and security headers

### 💡 Intelligent Feedback System
- **Contextual Recommendations**: Provides specific, actionable security improvements
- **Best Practice Guidance**: Suggests industry-standard security practices
- **Implementation Approval**: Determines if plans are ready for implementation
- **Detailed Analysis**: Comprehensive breakdown of security concerns and solutions

## 🚀 Installation

1. **Download the Extension**
   ```bash
   git clone https://github.com/your-username/codeguardian-extension
   cd codeguardian-extension
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension directory

3. **Get Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key for Gemini
   - Copy the API key for configuration

## ⚙️ Configuration

1. **Set Up API Key**
   - Click the CodeGuardian extension icon
   - Navigate to the Configuration section
   - Paste your Gemini API key
   - Click "Save" to store securely

2. **Navigate to Bolt.new**
   - Open any bolt.new project
   - The extension will automatically detect the page
   - Status indicator will show "Connected to bolt.new"

## 🔧 Usage

### Security Review Workflow

1. **Start Review**
   - Ensure you're on a bolt.new project page
   - Click the "🔍 Review Latest Plan" button
   - The extension will begin the automated analysis process

2. **Analysis Process**
   - **Step 1**: Reads the latest Bolt AI implementation plan
   - **Step 2**: Sends plan to Gemini AI for security analysis
   - **Step 3**: Generates comprehensive security feedback prompt
   - **Step 4**: Inserts the prompt into bolt.new chat input

3. **Review Results**
   - Review the generated security prompt in the chat input
   - Modify the prompt if needed
   - Send to Bolt AI for implementation improvements
   - Bolt AI will address security concerns and update the plan

### Security Prompt Format

The generated prompts include:
- **Security Score**: Overall security rating (1-10)
- **Critical Issues**: High-priority security vulnerabilities
- **Recommendations**: Specific improvement suggestions
- **Best Practices**: Missing security standards
- **Implementation Decision**: Approve or request revisions

### Example Security Review

```
🛡️ CodeGuardian Security Review

Security Score: 6/10

⚠️ SECURITY CONCERNS IDENTIFIED

The implementation plan has several security gaps that should be addressed before proceeding.

🚨 Critical Security Issues:
1. No input validation on user registration endpoints
2. API keys stored in client-side code
3. Missing rate limiting on authentication endpoints

🔧 Security Recommendations:
1. Implement server-side input validation with sanitization
2. Move API keys to environment variables
3. Add rate limiting middleware (5 requests/minute for auth)
4. Implement CSRF protection for forms
5. Add proper error handling without information disclosure

📋 Missing Security Best Practices:
1. HTTPS enforcement and security headers
2. Password strength requirements
3. Session timeout and secure cookie settings

Please revise your implementation plan to address these critical security concerns before proceeding.
```

## 🛠️ Advanced Features

### Session Management
- **State Persistence**: Maintains extension state across popup sessions
- **Auto-Save**: Automatically saves configuration and review history
- **Session Recovery**: Resumes interrupted review processes

### Quick Actions
- **Read Latest Plan**: Extract current Bolt AI implementation plan
- **Read Project Code**: Analyze existing project files
- **Manual Input**: Send custom security prompts

### Progress Tracking
- **Visual Indicators**: Real-time progress for each review step
- **Error Handling**: Detailed error messages and recovery options
- **Status Updates**: Clear feedback on extension and connection status

## 🔒 Security & Privacy

### Data Protection
- **Local Storage**: API keys stored locally in Chrome's secure storage
- **No Data Collection**: Extension doesn't collect or transmit user data
- **Secure Communication**: All API calls use HTTPS encryption

### API Usage
- **Direct Integration**: Communicates directly with Google's Gemini API
- **No Intermediary**: No third-party servers or data processing
- **Rate Limiting**: Respects API rate limits and usage guidelines

## 🐛 Troubleshooting

### Common Issues

**Extension Not Connecting**
- Refresh the bolt.new page
- Check if you're on the correct URL (bolt.new/*)
- Reload the extension in chrome://extensions/

**API Key Issues**
- Verify API key is correct and active
- Check Google AI Studio for usage limits
- Ensure API key has Gemini access permissions

**Review Process Fails**
- Check internet connection
- Verify bolt.new page has loaded completely
- Try refreshing both the page and extension

### Debug Mode
Enable debug logging by opening Chrome DevTools:
1. Right-click on the extension popup
2. Select "Inspect"
3. Check Console tab for detailed logs

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Clone repository
git clone https://github.com/your-username/codeguardian-extension
cd codeguardian-extension

# Load extension in Chrome
# Navigate to chrome://extensions/
# Enable Developer mode
# Click "Load unpacked" and select the directory
```

### Testing
- Test on various bolt.new projects
- Verify security analysis accuracy
- Check cross-browser compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful security analysis capabilities
- **Bolt.new** for the innovative development platform
- **Chrome Extensions API** for seamless browser integration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/codeguardian-extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/codeguardian-extension/discussions)
- **Email**: support@codeguardian.dev

---

**CodeGuardian** - Your AI-powered security companion for safer code development.