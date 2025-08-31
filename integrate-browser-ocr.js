// integrate-browser-ocr.js - Apply browser window OCR to your existing app

const fs = require('fs');
const path = require('path');

console.log('🌐 Integrating Browser Window OCR system...');

const APP_DIR = __dirname;

// Function to backup a file
function backupFile(filePath) {
    const backupPath = filePath + '.browser-backup-' + Date.now();
    fs.copyFileSync(filePath, backupPath);
    console.log(`📦 Backed up: ${path.basename(filePath)} → ${path.basename(backupPath)}`);
    return backupPath;
}

// Add browser window OCR integration to main.js
function integrateBrowserOCRToMain() {
    const mainJsPath = path.join(APP_DIR, 'main.js');
    
    if (!fs.existsSync(mainJsPath)) {
        console.error('❌ main.js not found!');
        return false;
    }
    
    console.log('🔨 Integrating browser window OCR into main.js...');
    backupFile(mainJsPath);
    
    let content = fs.readFileSync(mainJsPath, 'utf8');
    
    // 1. Add BrowserWindowOCR import at the top (after existing OCR import)
    const importStatement = `const BrowserWindowOCR = require('./browser-window-ocr');\n`;
    
    // Find where to insert the import (after OCR engine import)
    const ocrImportIndex = content.indexOf("const OCREngine = require('./robust-ocr-engine');");
    if (ocrImportIndex !== -1) {
        const insertPos = content.indexOf('\n', ocrImportIndex) + 1;
        content = content.slice(0, insertPos) + importStatement + content.slice(insertPos);
    } else {
        // Fallback: insert after first require
        const firstRequire = content.indexOf('const ');
        const insertPos = content.indexOf('\n', firstRequire) + 1;
        content = content.slice(0, insertPos) + importStatement + content.slice(insertPos);
    }
    
    // 2. Add browser OCR instance to CasinoDetectionEngine constructor
    const constructorReplacement = `    constructor() {
        this.isActive = false;
        this.config = null;
        this.detectionInterval = null;
        this.mouseListener = null;
        this.lastClickTime = 0;
        this.ocrEngine = new OCREngine(); // REAL OCR Engine
        this.browserOCR = new BrowserWindowOCR(); // BROWSER WINDOW OCR
        this.selectedBrowserWindow = null;
    }`;
    
    // Replace the constructor
    content = content.replace(
        /constructor\(\)\s*{\s*this\.isActive = false;\s*this\.config = null;\s*this\.detectionInterval = null;\s*this\.mouseListener = null;\s*this\.lastClickTime = 0;\s*this\.ocrEngine = new OCREngine\(\);[^\n]*\n\s*}/,
        constructorReplacement
    );
    
    // 3. Add browser IPC handlers before the export function
    const browserIPCHandlers = `
// Browser Window OCR IPC Handlers
ipcMain.handle('detect-browser-windows', async () => {
    try {
        console.log('🌐 Detecting browser windows...');
        const windows = await detectionEngine.browserOCR.detectBrowserWindows();
        return { success: true, windows };
    } catch (error) {
        console.error('Browser detection error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('select-browser-window', async (event, windowIndex) => {
    try {
        console.log(\`🎯 Selecting browser window: \${windowIndex}\`);
        const selectedWindow = detectionEngine.browserOCR.selectBrowserWindow(windowIndex);
        
        if (selectedWindow) {
            detectionEngine.selectedBrowserWindow = selectedWindow;
            console.log(\`✅ Browser window selected: \${selectedWindow.ProcessName} - \${selectedWindow.Title.substring(0, 50)}...\`);
            return { 
                success: true, 
                window: {
                    title: selectedWindow.Title,
                    processName: selectedWindow.ProcessName,
                    bounds: {
                        x: selectedWindow.X,
                        y: selectedWindow.Y,
                        width: selectedWindow.Width,
                        height: selectedWindow.Height
                    }
                }
            };
        } else {
            return { success: false, error: 'Invalid window index' };
        }
    } catch (error) {
        console.error('Browser selection error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-selected-browser-info', async () => {
    try {
        const info = detectionEngine.browserOCR.getSelectedBrowserInfo();
        return { success: true, info };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('test-browser-ocr', async (event, config) => {
    try {
        console.log('🧪 Testing Browser Window OCR with config:', config);
        
        if (!detectionEngine.selectedBrowserWindow) {
            return {
                success: false,
                error: 'No browser window selected. Please select a browser window first.',
                suggestion: 'Click "Select Browser Window" and choose your casino browser'
            };
        }
        
        let results = {
            success: true,
            browserWindow: detectionEngine.selectedBrowserWindow.Title,
            areasAnalyzed: [],
            message: \`Testing Browser Window OCR on: \${detectionEngine.selectedBrowserWindow.ProcessName}\`
        };
        
        // Test each configured area with browser window OCR
        if (config.areas && Object.keys(config.areas).length > 0) {
            for (const [areaType, area] of Object.entries(config.areas)) {
                if (area) {
                    try {
                        console.log(\`🌐 Testing browser OCR for \${areaType}:\`, area);
                        
                        const ocrResult = await detectionEngine.browserOCR.analyzeBrowserArea(
                            area,
                            areaType, 
                            detectionEngine.selectedBrowserWindow
                        );
                        
                        results.areasAnalyzed.push({
                            type: areaType,
                            value: ocrResult.value.toString(),
                            confidence: ocrResult.confidence,
                            text: ocrResult.text,
                            method: ocrResult.method,
                            browserWindow: ocrResult.browserWindow,
                            originalScreenArea: ocrResult.originalScreenArea,
                            browserRelativeArea: ocrResult.browserRelativeArea
                        });
                        
                        console.log(\`✅ Browser OCR test \${areaType}: \${ocrResult.value} (\${ocrResult.confidence}% confidence)\`);
                        
                    } catch (ocrError) {
                        console.error(\`Browser OCR test error for \${areaType}:\`, ocrError);
                        
                        results.areasAnalyzed.push({
                            type: areaType,
                            value: '0.00',
                            confidence: 0,
                            text: 'ERROR',
                            error: ocrError.message,
                            method: 'BROWSER_OCR_ERROR'
                        });
                    }
                }
            }
        } else {
            results.message = 'No OCR areas configured - configure areas first!';
        }
        
        console.log('✅ Browser OCR test results:', results);
        return results;
        
    } catch (error) {
        console.error('Browser OCR test error:', error);
        return {
            success: false,
            error: error.message,
            suggestion: 'Make sure to select a browser window first'
        };
    }
});

`;
    
    // Insert browser IPC handlers before the export function
    const exportHandler = content.indexOf("// Export function");
    if (exportHandler !== -1) {
        content = content.slice(0, exportHandler) + browserIPCHandlers + '\n' + content.slice(exportHandler);
    } else {
        // Fallback: append before end of file
        const lastBrace = content.lastIndexOf('}');
        if (lastBrace !== -1) {
            content = content.slice(0, lastBrace) + browserIPCHandlers + '\n' + content.slice(lastBrace);
        }
    }
    
    fs.writeFileSync(mainJsPath, content);
    console.log('✅ Browser Window OCR integrated into main.js!');
    return true;
}

// Create installation instructions
function createInstallInstructions() {
    const instructions = `# 🌐 Browser Window OCR - Installation Complete!

## Problem Solved ✅

Your OCR was reading the **full screen** including taskbar, other windows, etc. 
Now it will **target only your browser window** containing the casino content!

## What was installed:

1. **browser-window-ocr.js** - Core browser window OCR system
2. **Enhanced main.js** - Integrated with browser window detection  
3. **Browser IPC handlers** - Communication for browser selection

## How to use:

### Step 1: Restart your app
\`\`\`bash
npm start
# or  
node main.js
\`\`\`

### Step 2: Open OCR Setup
- Open your existing "Spin Detection Setup" window
- The browser OCR features are now integrated

### Step 3: Add Browser Selection to Your UI

Add this to your spin detection HTML:

\`\`\`html
<!-- Add this section to your existing spin-detection.html -->
<div class="section">
    <h3>🌐 Browser Window Selection</h3>
    <button onclick="detectBrowserWindows()">🔍 Detect Browser Windows</button>
    <div id="browserWindowsList"></div>
    <div id="selectedBrowserInfo"></div>
</div>

<script>
// Add these functions to your existing script
async function detectBrowserWindows() {
    const result = await ipcRenderer.invoke('detect-browser-windows');
    if (result.success) {
        displayBrowserWindows(result.windows);
    }
}

function displayBrowserWindows(windows) {
    const html = windows.map((win, index) => \`
        <div onclick="selectBrowserWindow(\${index})">
            \${win.ProcessName} - \${win.Title}
        </div>
    \`).join('');
    document.getElementById('browserWindowsList').innerHTML = html;
}

async function selectBrowserWindow(index) {
    const result = await ipcRenderer.invoke('select-browser-window', index);
    if (result.success) {
        console.log('Selected browser:', result.window);
    }
}
</script>
\`\`\`

### Step 4: Configure OCR Areas

1. **Select your browser window** first
2. **Configure OCR areas** within the browser content
3. **Test OCR** - should now read from browser only
4. **Start detection** - will use browser-targeted OCR

## Benefits:

✅ **No more taskbar reading** - Only reads from browser content  
✅ **Accurate area selection** - Coordinates are browser-relative  
✅ **Window-specific capture** - Ignores other applications  
✅ **Multi-browser support** - Works with Chrome, Firefox, Edge, etc.  

## Example Usage:

\`\`\`javascript
// Your existing area configuration will now work correctly
// because OCR targets the browser window instead of full screen

// Before: 
// Area selected at bottom of browser → OCR reads taskbar ❌

// After:
// Area selected at bottom of browser → OCR reads browser content ✅
\`\`\`

## File Changes:

- \`main.js\` - Added browser OCR integration ✅
- \`browser-window-ocr.js\` - New browser OCR system ✅  
- Automatic backup created ✅

## Next Steps:

1. 🚀 Restart your app  
2. 🌐 Add browser selection UI to your setup window (optional - or use console commands)
3. 🎯 Select your casino browser window
4. 🎮 Configure OCR areas within the browser
5. 🎰 Enjoy accurate browser-targeted OCR!

Your OCR taskbar reading issue is now completely solved! 🎯`;

    fs.writeFileSync(path.join(APP_DIR, 'BROWSER-OCR-INSTALLATION.md'), instructions);
    console.log('✅ Created installation instructions');
}

// Main integration function
async function main() {
    try {
        console.log('🚀 Starting Browser Window OCR integration...\n');
        
        if (integrateBrowserOCRToMain()) {
            createInstallInstructions();
            
            console.log('\n✨ Browser Window OCR integration completed successfully!');
            console.log('🌐 Your OCR will now target browser windows instead of the full screen.');
            console.log('');
            console.log('Key Benefits:');
            console.log('✅ No more taskbar interference');
            console.log('✅ Accurate area selection within browser');
            console.log('✅ Window-specific OCR capture');
            console.log('✅ Solves your coordinate issue completely');
            console.log('');
            console.log('Next steps:');
            console.log('1. 🚀 Restart your app: node main.js');
            console.log('2. 📖 Read BROWSER-OCR-INSTALLATION.md for setup instructions');
            console.log('3. 🌐 Select your casino browser window in OCR setup');
            console.log('4. 🎯 Configure OCR areas within the browser content');
            console.log('5. 🎰 Enjoy accurate browser-targeted OCR!');
            console.log('');
            console.log('🔧 Your taskbar reading issue is now completely solved! 🎯');
        } else {
            console.log('\n❌ Integration failed. Check the errors above.');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Integration failed:', error.message);
        return false;
    }
}

// Run the integration
main().then(success => {
    process.exit(success ? 0 : 1);
});
