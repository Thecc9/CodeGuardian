# Bolt.new Assistant - Enhanced File Reader

A Chrome extension that can read project files and their content from bolt.new, send chat messages, and extract the latest plans. This enhanced version provides comprehensive file reading capabilities that work directly with bolt.new's HTML structure.

## Features

### 🔥 Enhanced File Reading
- **Comprehensive File Detection**: Automatically detects all files in the bolt.new file tree
- **Smart Content Extraction**: Reads content from CodeMirror 6 editors, Monaco editors, and other code editors
- **Progress Tracking**: Real-time progress indicator showing file reading status
- **Error Handling**: Detailed error reporting and graceful handling of edge cases
- **Content Filtering**: Intelligent filtering to exclude binary files, shell commands, and non-code content

### 💬 Chat Integration
- Send messages directly to bolt.new chat
- Automatic input field detection and interaction

### 📋 Plan Reading
- Extract the latest conversation and plans from bolt.new
- Smart content detection from various message formats

## How It Works

### File Structure Recognition

The extension works by analyzing bolt.new's HTML structure:

1. **File Tree Analysis**: Scans for button elements with specific class patterns that represent files
2. **Icon Detection**: Distinguishes between file icons (`i-ph:file-duotone`) and folder icons (`i-ph:caret-right`)
3. **Name Extraction**: Retrieves filenames from elements with `translate="no"` attributes
4. **Content Reading**: Clicks on files to open them and extracts content from the code editor

### Code Editor Support

The extension supports multiple editor types commonly used in web development tools:

- **CodeMirror 6** (primary editor in bolt.new)
- **Monaco Editor** (VS Code-based editor)
- **Generic code editors** with standard HTML structures
- **Textarea fallbacks** for simple text editors

### Smart Content Filtering

The extension includes intelligent filtering to provide only useful code content:

- **File Type Recognition**: Identifies actual code files vs configuration/binary files
- **Content Analysis**: Uses pattern matching to detect programming languages
- **Size Filtering**: Excludes extremely large or tiny files
- **Shell Command Detection**: Filters out terminal commands and build scripts

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. Navigate to bolt.new and the extension will be ready to use

## Usage

### Reading Project Files

1. Open a project in bolt.new
2. Click the extension icon in your browser toolbar
3. Click "Read Project Code"
4. The extension will:
   - Switch to code mode if needed
   - Scan the file tree for all files
   - Click through each file to read its content
   - Display a progress indicator
   - Compile all file contents into a comprehensive report

### Progress Tracking

During file reading, you'll see a progress indicator showing:
- Current file being read
- Progress bar with percentage
- File count (current/total)

### Results Format

The extension provides results in a structured format:
```
=== PROJECT CODE (X files) ===

📁 FILES:
  - package.json
  - src/index.js
  - src/components/App.jsx
  ...

==================================================
📄 FILE: package.json
==================================================
{
  "name": "my-project",
  ...
}

==================================================
📄 FILE: src/index.js
==================================================
import React from 'react';
...

📊 SUMMARY:
✅ Successfully read: X files
❌ Errors: Y files
📊 Total characters: Z
```

## Technical Details

### File Detection Algorithm

The extension uses a multi-method approach to detect files:

1. **Primary Method**: Searches for buttons with class `group flex items-center gap-1.5` containing file icons
2. **Folder Traversal**: Handles expanded folders with nested file structures
3. **Alternative Layouts**: Supports different bolt.new interface variations
4. **Deduplication**: Prevents reading the same file multiple times

### Content Extraction Strategies

Multiple strategies ensure reliable content extraction:

1. **CodeMirror 6**: Direct `.cm-content` element reading
2. **Editor Traversal**: Searches within `.cm-editor` containers
3. **Monaco Support**: Handles `.view-lines` elements
4. **Generic Fallbacks**: Works with standard code element structures
5. **Textarea Support**: Handles simple text input areas

### Error Handling

Comprehensive error handling includes:
- Network timeout protection
- Element not found graceful degradation
- Content extraction failure recovery
- Progress indicator cleanup
- Detailed error reporting

## Development

### File Structure
```
/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.js              # Popup logic and UI interactions
├── popup.css             # Popup styling
├── content.js            # Enhanced content script (main logic)
├── background.js         # Background service worker
└── README.md            # Documentation
```

### Key Components

- **BoltNewAssistant Class**: Main content script class handling all interactions
- **File Detection**: Enhanced algorithms for finding files in bolt.new's DOM
- **Content Extraction**: Multi-strategy approach for reading editor content
- **Progress Management**: Real-time progress tracking and user feedback
- **Error Handling**: Comprehensive error management and reporting

## Troubleshooting

### No Files Found
- Ensure you have a project open in bolt.new
- Make sure the file tree is visible on the left side
- Try refreshing the bolt.new page and reopening the extension

### Content Reading Issues
- Check that files can be opened manually by clicking them
- Ensure you're in "Code" mode (not "Preview" mode)
- Try reading individual files first to test functionality

### Performance Issues
- Large projects may take time to read all files
- The extension includes automatic delays to prevent overwhelming the UI
- Files are read sequentially to ensure reliability

## Contributing

1. Fork the repository
2. Make your changes
3. Test thoroughly with different bolt.new projects
4. Submit a pull request with detailed description

## License

MIT License - see LICENSE file for details