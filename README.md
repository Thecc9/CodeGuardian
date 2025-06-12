# CodeGuardian Chrome Extension

A Chrome extension designed to protect sensitive code and provide security monitoring for developers.

## Features

- **Code Protection**: Prevents unauthorized access to sensitive code patterns
- **Right-Click Protection**: Blocks context menu on protected code elements
- **Sensitive Pattern Detection**: Automatically detects and protects API keys, passwords, and tokens
- **Code Site Monitoring**: Monitors popular code platforms like GitHub, GitLab, etc.
- **Real-time Statistics**: Tracks threats blocked and code reviews performed

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The CodeGuardian extension should now appear in your extensions list

## Usage

1. Click on the CodeGuardian icon in the Chrome toolbar
2. Toggle protection on/off using the "Enable Protection" button
3. Access settings by clicking the "Settings" button in the popup
4. Configure protection levels and monitoring options

## Development

This extension uses:
- Manifest V3 for modern Chrome extension development
- Service Worker for background processing
- Content Scripts for page interaction
- Chrome Storage API for settings persistence

## File Structure

```
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.css              # Popup styling
├── popup.js               # Popup functionality
├── background.js          # Background service worker
├── content.js             # Content script for page interaction
├── settings.html          # Settings page
└── README.md              # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.