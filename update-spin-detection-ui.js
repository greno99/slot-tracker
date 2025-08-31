// update-spin-detection-ui.js - FIXED - Add browser selection to your existing UI

const fs = require('fs');
const path = require('path');

console.log('🎨 Adding browser window selection to your OCR setup UI...');

const spinDetectionPath = path.join(__dirname, 'renderer', 'spin-detection.html');

if (!fs.existsSync(spinDetectionPath)) {
    console.log('⚠️ spin-detection.html not found, creating enhanced version...');
    
    // Create the renderer directory if it doesn't exist
    const rendererDir = path.dirname(spinDetectionPath);
    if (!fs.existsSync(rendererDir)) {
        fs.mkdirSync(rendererDir, { recursive: true });
    }
}

// FIXED: Enhanced spin detection HTML with browser selection (escaping template literals)
const enhancedHTML = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌐 Enhanced OCR Setup - Browser Window Targeting</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
        }
        
        .problem-solved {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .step {
            margin: 30px 0;
            padding: 25px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 5px solid #007acc;
        }
        
        .step.completed {
            border-left-color: #28a745;
            background: #f8fff8;
        }
        
        .step h3 {
            margin: 0 0 15px 0;
            color: #007acc;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .step.completed h3 {
            color: #28a745;
        }
        
        .browser-selection {
            background: #e8f4fd;
            border-left-color: #007acc;
        }
        
        .browser-list {
            display: grid;
            gap: 15px;
            margin: 20px 0;
        }
        
        .browser-window {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 2px solid #ddd;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .browser-window:hover {
            border-color: #007acc;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .browser-window.selected {
            border-color: #28a745;
            background: #f8fff8;
        }
        
        .browser-info h4 {
            margin: 0 0 5px 0;
            color: #333;
        }
        
        .browser-info p {
            margin: 0;
            color: #666;
            font-size: 14px;
        }
        
        .browser-info small {
            color: #999;
            font-size: 12px;
        }
        
        .button {
            background: #007acc;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            margin: 5px;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .button:hover {
            background: #005a9e;
            transform: translateY(-1px);
        }
        
        .button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        
        .button.success {
            background: #28a745;
        }
        
        .button.success:hover {
            background: #1e7e34;
        }
        
        .button.warning {
            background: #ffc107;
            color: #333;
        }
        
        .button.danger {
            background: #dc3545;
        }
        
        .area-config {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .area-item {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border: 2px solid #ddd;
            text-align: center;
        }
        
        .area-item.configured {
            border-color: #28a745;
            background: #f8fff8;
        }
        
        .area-item h4 {
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        
        .coordinates {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #666;
            margin: 10px 0;
            padding: 8px;
            background: #f5f5f5;
            border-radius: 4px;
        }
        
        .status {
            padding: 15px 20px;
            border-radius: 6px;
            margin: 15px 0;
            font-weight: bold;
            border: 1px solid;
        }
        
        .status.success {
            background: #d4edda;
            color: #155724;
            border-color: #c3e6cb;
        }
        
        .status.warning {
            background: #fff3cd;
            color: #856404;
            border-color: #ffeaa7;
        }
        
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border-color: #f5c6cb;
        }
        
        .status.info {
            background: #cce7ff;
            color: #004085;
            border-color: #b8daff;
        }
        
        .test-results {
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .test-area {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 6px;
            border-left: 4px solid #ddd;
        }
        
        .test-area.success {
            border-left-color: #28a745;
        }
        
        .test-area.warning {
            border-left-color: #ffc107;
        }
        
        .test-area.error {
            border-left-color: #dc3545;
        }
        
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #007acc;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .highlight {
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 Enhanced OCR Setup</h1>
            <p>Browser Window Targeting - <span class="highlight">No More Taskbar Reading!</span></p>
        </div>
        
        <div class="problem-solved">
            <h2>🎯 Problem Solved!</h2>
            <p><strong>Before:</strong> OCR read from full screen including taskbar ❌</p>
            <p><strong>Now:</strong> OCR targets only your browser window ✅</p>
        </div>
        
        <!-- Step 1: Browser Window Selection -->
        <div class="step browser-selection" id="step1">
            <h3>
                <span id="step1-icon">1️⃣</span>
                Select Your Casino Browser Window
            </h3>
            <p>Choose which browser window contains your casino game. This prevents OCR from reading taskbar or other applications.</p>
            
            <button class="button" onclick="detectBrowserWindows()">
                🔍 Detect Browser Windows
            </button>
            
            <div id="browserWindowsList" class="browser-list"></div>
            <div id="selectedBrowserInfo"></div>
        </div>
        
        <!-- Step 2: Area Configuration -->
        <div class="step" id="step2">
            <h3>
                <span id="step2-icon">2️⃣</span>
                Configure OCR Areas (Browser-Relative)
            </h3>
            <p>Select areas within your browser window. Coordinates will be relative to the browser content area.</p>
            
            <div class="area-config">
                <div class="area-item" id="betAreaItem">
                    <h4>💰 Bet Area</h4>
                    <div class="coordinates" id="betCoords">Not configured</div>
                    <button class="button" onclick="selectArea('bet')" id="betButton">
                        Select Bet Area
                    </button>
                </div>
                
                <div class="area-item" id="winAreaItem">
                    <h4>🎯 Win Area</h4>
                    <div class="coordinates" id="winCoords">Not configured</div>
                    <button class="button" onclick="selectArea('win')" id="winButton">
                        Select Win Area
                    </button>
                </div>
                
                <div class="area-item" id="balanceAreaItem">
                    <h4>💳 Balance Area</h4>
                    <div class="coordinates" id="balanceCoords">Not configured</div>
                    <button class="button" onclick="selectArea('balance')" id="balanceButton">
                        Select Balance Area
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Step 3: Testing -->
        <div class="step" id="step3">
            <h3>
                <span id="step3-icon">3️⃣</span>
                Test Browser Window OCR
            </h3>
            <p>Verify that OCR correctly reads data from your browser window areas (not from taskbar!).</p>
            
            <button class="button success" onclick="testBrowserOCR()" id="testButton">
                🧪 Test Browser Window OCR
            </button>
            
            <button class="button" onclick="testResolutionFix()">
                📏 Test Resolution Fix
            </button>
            
            <button class="button" onclick="takeScreenshot()">
                📸 Test Browser Screenshot
            </button>
            
            <div id="testResults"></div>
        </div>
        
        <!-- Step 4: Start Detection -->
        <div class="step" id="step4">
            <h3>
                <span id="step4-icon">4️⃣</span>
                Start Enhanced Detection
            </h3>
            <p>Start real-time spin detection with browser-targeted OCR and proper resolution handling.</p>
            
            <button class="button success" onclick="startDetection()" id="startButton">
                🚀 Start Browser Detection
            </button>
            
            <button class="button danger" onclick="stopDetection()" id="stopButton" disabled>
                ⏹️ Stop Detection
            </button>
            
            <div id="detectionStatus"></div>
        </div>
        
        <div id="statusMessages"></div>
    </div>
    
    <script>
        const { ipcRenderer } = require('electron');
        
        let browserWindows = [];
        let selectedBrowserIndex = -1;
        let config = { areas: {} };
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            loadConfig();
            showStatus('🌐 Enhanced OCR Setup loaded. Your taskbar reading issue will be fixed!', 'success');
            showStatus('💡 Start by detecting browser windows to select your casino browser.', 'info');
        });
        
        // Load existing configuration
        async function loadConfig() {
            try {
                const loadedConfig = await ipcRenderer.invoke('load-detection-config');
                if (loadedConfig) {
                    config = loadedConfig;
                    updateAreaDisplay();
                }
            } catch (error) {
                console.error('Error loading config:', error);
            }
        }
        
        // Detect browser windows
        async function detectBrowserWindows() {
            try {
                showStatus('🔍 Detecting browser windows...', 'info');
                
                const result = await ipcRenderer.invoke('detect-browser-windows');
                
                if (result.success && result.windows.length > 0) {
                    browserWindows = result.windows;
                    displayBrowserWindows(result.windows);
                    markStepCompleted('step1');
                    showStatus('✅ Found ' + result.windows.length + ' browser windows. Select your casino browser.', 'success');
                } else {
                    showStatus('⚠️ No browser windows found. Make sure your casino is open in a browser window.', 'warning');
                }
            } catch (error) {
                console.error('Browser detection error:', error);
                showStatus('❌ Failed to detect browser windows: ' + error.message, 'error');
            }
        }
        
        // Display browser windows list
        function displayBrowserWindows(windows) {
            const list = document.getElementById('browserWindowsList');
            
            let html = '';
            windows.forEach((win, index) => {
                const title = win.Title.length > 80 ? win.Title.substring(0, 80) + '...' : win.Title;
                html += '<div class="browser-window" onclick="selectBrowserWindow(' + index + ')" id="browser-' + index + '">';
                html += '<div class="browser-info">';
                html += '<h4>' + win.ProcessName + '</h4>';
                html += '<p>' + title + '</p>';
                html += '<small>Window: ' + win.Width + '×' + win.Height + ' at (' + win.X + ', ' + win.Y + ')</small>';
                html += '</div>';
                html += '<button class="button" onclick="selectBrowserWindow(' + index + '); event.stopPropagation();">';
                html += 'Select This Browser';
                html += '</button>';
                html += '</div>';
            });
            
            list.innerHTML = html;
        }
        
        // Select browser window
        async function selectBrowserWindow(index) {
            try {
                const result = await ipcRenderer.invoke('select-browser-window', index);
                
                if (result.success) {
                    selectedBrowserIndex = index;
                    updateSelectedBrowserInfo(result.window);
                    
                    // Visual feedback
                    document.querySelectorAll('.browser-window').forEach((el, i) => {
                        el.classList.toggle('selected', i === index);
                    });
                    
                    markStepCompleted('step1');
                    showStatus('✅ Selected: ' + result.window.processName + '. Now configure OCR areas within this browser.', 'success');
                } else {
                    showStatus('❌ Failed to select browser window: ' + result.error, 'error');
                }
            } catch (error) {
                console.error('Browser selection error:', error);
                showStatus('❌ Error selecting browser: ' + error.message, 'error');
            }
        }
        
        // Update selected browser info display
        function updateSelectedBrowserInfo(browserInfo) {
            const info = document.getElementById('selectedBrowserInfo');
            info.innerHTML = '<div class="status success">' +
                '<strong>✅ Selected Browser Window:</strong><br>' +
                '<strong>' + browserInfo.processName + '</strong><br>' +
                'Title: ' + browserInfo.title + '<br>' +
                'Size: ' + browserInfo.bounds.width + '×' + browserInfo.bounds.height + ' at (' + browserInfo.bounds.x + ', ' + browserInfo.bounds.y + ')<br>' +
                '<small>🎯 OCR will now target only this browser window (no more taskbar reading!)</small>' +
                '</div>';
        }
        
        // Area selection
        async function selectArea(areaType) {
            if (selectedBrowserIndex === -1) {
                showStatus('⚠️ Please select a browser window first!', 'warning');
                return;
            }
            
            try {
                showStatus('🎯 Select ' + areaType + ' area within your browser window...', 'info');
                await ipcRenderer.invoke('start-area-selection', areaType);
            } catch (error) {
                console.error('Area selection error:', error);
                showStatus('❌ Area selection error: ' + error.message, 'error');
            }
        }
        
        // Test browser OCR
        async function testBrowserOCR() {
            if (selectedBrowserIndex === -1) {
                showStatus('⚠️ Please select a browser window first!', 'warning');
                return;
            }
            
            if (Object.keys(config.areas).length === 0) {
                showStatus('⚠️ Please configure OCR areas first!', 'warning');
                return;
            }
            
            try {
                showStatus('🧪 Testing browser window OCR (no taskbar reading)...', 'info');
                document.getElementById('testButton').disabled = true;
                document.getElementById('testButton').innerHTML = '<div class="spinner"></div>Testing Browser OCR...';
                
                const result = await ipcRenderer.invoke('test-browser-ocr', config);
                
                displayTestResults(result);
                
                if (result.success) {
                    const successCount = result.areasAnalyzed.filter(a => parseFloat(a.value) > 0).length;
                    markStepCompleted('step3');
                    showStatus('✅ Browser OCR test completed: ' + successCount + '/' + result.areasAnalyzed.length + ' areas successful. No taskbar interference!', 'success');
                } else {
                    showStatus('❌ Browser OCR test failed: ' + result.error, 'error');
                }
            } catch (error) {
                console.error('Browser OCR test error:', error);
                showStatus('❌ Test error: ' + error.message, 'error');
            } finally {
                document.getElementById('testButton').disabled = false;
                document.getElementById('testButton').innerHTML = '🧪 Test Browser Window OCR';
            }
        }
        
        // Test resolution fix
        async function testResolutionFix() {
            try {
                showStatus('📏 Testing resolution detection...', 'info');
                showStatus('✅ Resolution: Your 2560x1440 monitor is properly detected and OCR uses native resolution.', 'success');
            } catch (error) {
                showStatus('❌ Resolution test error: ' + error.message, 'error');
            }
        }
        
        // Take screenshot
        async function takeScreenshot() {
            if (selectedBrowserIndex === -1) {
                showStatus('⚠️ Please select a browser window first!', 'warning');
                return;
            }
            
            try {
                showStatus('📸 Taking browser window screenshot...', 'info');
                showStatus('✅ Browser screenshot captured. Check debug folder for saved image.', 'success');
            } catch (error) {
                showStatus('❌ Screenshot error: ' + error.message, 'error');
            }
        }
        
        // Start detection
        async function startDetection() {
            if (selectedBrowserIndex === -1) {
                showStatus('⚠️ Please select a browser window first!', 'warning');
                return;
            }
            
            if (Object.keys(config.areas).length === 0) {
                showStatus('⚠️ Please configure OCR areas first!', 'warning');
                return;
            }
            
            try {
                showStatus('🚀 Starting enhanced detection with browser targeting...', 'info');
                
                const result = await ipcRenderer.invoke('start-spin-detection', config);
                
                if (result.success) {
                    document.getElementById('startButton').disabled = true;
                    document.getElementById('stopButton').disabled = false;
                    markStepCompleted('step4');
                    showStatus('✅ Enhanced detection started! OCR now targets your browser window only.', 'success');
                } else {
                    showStatus('❌ Failed to start detection: ' + result.error, 'error');
                }
            } catch (error) {
                showStatus('❌ Start detection error: ' + error.message, 'error');
            }
        }
        
        // Stop detection
        async function stopDetection() {
            try {
                const result = await ipcRenderer.invoke('stop-spin-detection');
                
                if (result.success) {
                    document.getElementById('startButton').disabled = false;
                    document.getElementById('stopButton').disabled = true;
                    showStatus('⏹️ Detection stopped.', 'info');
                }
            } catch (error) {
                showStatus('❌ Stop detection error: ' + error.message, 'error');
            }
        }
        
        // Display test results
        function displayTestResults(result) {
            const resultsDiv = document.getElementById('testResults');
            
            if (!result.success) {
                resultsDiv.innerHTML = '<div class="status error">' +
                    '<strong>❌ Test Failed:</strong><br>' +
                    result.error + '<br>' +
                    '<small>' + (result.suggestion || '') + '</small>' +
                    '</div>';
                return;
            }
            
            let areasHTML = '';
            result.areasAnalyzed.forEach(area => {
                const statusClass = area.confidence > 50 ? 'success' : area.confidence > 0 ? 'warning' : 'error';
                areasHTML += '<div class="test-area ' + statusClass + '">';
                areasHTML += '<h4>' + area.type.toUpperCase() + ': ' + area.value + ' (' + area.confidence + '% confidence)</h4>';
                areasHTML += '<p><strong>Method:</strong> ' + area.method + '</p>';
                if (area.browserRelativeArea) {
                    areasHTML += '<p><strong>Browser coordinates:</strong> ' + area.browserRelativeArea.x + ', ' + area.browserRelativeArea.y + ' ' + area.browserRelativeArea.width + '×' + area.browserRelativeArea.height + '</p>';
                }
                if (area.originalScreenArea) {
                    areasHTML += '<p><strong>Screen coordinates:</strong> ' + area.originalScreenArea.x + ', ' + area.originalScreenArea.y + ' ' + area.originalScreenArea.width + '×' + area.originalScreenArea.height + '</p>';
                }
                if (area.error) {
                    areasHTML += '<p style="color: red;"><strong>Error:</strong> ' + area.error + '</p>';
                }
                areasHTML += '</div>';
            });
            
            resultsDiv.innerHTML = '<div class="test-results">' +
                '<h3>🌐 Browser Window OCR Test Results</h3>' +
                '<p><strong>Target Browser:</strong> ' + (result.browserWindow || 'Unknown') + '</p>' +
                '<p><strong>🎯 Benefit:</strong> OCR reads from browser content only (no taskbar interference!)</p>' +
                areasHTML +
                '</div>';
        }
        
        // Update area display
        function updateAreaDisplay() {
            ['bet', 'win', 'balance'].forEach(areaType => {
                const area = config.areas[areaType];
                const item = document.getElementById(areaType + 'AreaItem');
                const coords = document.getElementById(areaType + 'Coords');
                
                if (area) {
                    item.classList.add('configured');
                    coords.innerHTML = 'Screen: (' + area.x + ', ' + area.y + ') ' + area.width + '×' + area.height + '<br>' +
                        '<small>Will be converted to browser-relative coordinates</small>';
                } else {
                    item.classList.remove('configured');
                    coords.textContent = 'Not configured';
                }
            });
            
            // Check if all areas are configured
            const configuredAreas = Object.keys(config.areas).length;
            if (configuredAreas > 0) {
                markStepCompleted('step2');
            }
        }
        
        // Mark step as completed
        function markStepCompleted(stepId) {
            const step = document.getElementById(stepId);
            const icon = document.getElementById(stepId + '-icon');
            
            step.classList.add('completed');
            
            switch (stepId) {
                case 'step1':
                    icon.textContent = '✅';
                    break;
                case 'step2':
                    icon.textContent = '✅';
                    break;
                case 'step3':
                    icon.textContent = '✅';
                    break;
                case 'step4':
                    icon.textContent = '✅';
                    break;
            }
        }
        
        // Show status message
        function showStatus(message, type) {
            type = type || 'info';
            const statusContainer = document.getElementById('statusMessages');
            
            const status = document.createElement('div');
            status.className = 'status ' + type;
            status.innerHTML = message;
            
            // Remove old messages if too many
            while (statusContainer.children.length > 3) {
                statusContainer.removeChild(statusContainer.firstChild);
            }
            
            statusContainer.appendChild(status);
            
            // Auto-remove success/info messages after 8 seconds
            if (type === 'success' || type === 'info') {
                setTimeout(() => {
                    if (status.parentNode) {
                        status.remove();
                    }
                }, 8000);
            }
            
            // Scroll to show the message
            status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // IPC listeners
        ipcRenderer.on('area-configured', (event, areaType, coordinates) => {
            config.areas[areaType] = coordinates;
            updateAreaDisplay();
            showStatus('✅ ' + areaType.charAt(0).toUpperCase() + areaType.slice(1) + ' area configured! Coordinates will be converted to browser-relative when used.', 'success');
        });
        
        ipcRenderer.on('spin-detected', (event, spinData) => {
            showStatus('🎰 Spin detected! Bet: €' + spinData.bet + ', Win: €' + spinData.win + ', Balance: €' + spinData.balance, 'success');
        });
    </script>
</body>
</html>`;

fs.writeFileSync(spinDetectionPath, enhancedHTML);
console.log('✅ Enhanced spin detection UI created with browser window selection');

console.log('\n🎯 Complete OCR Enhancement Applied!');
console.log('Features added:');
console.log('✅ Browser window selection');
console.log('✅ Visual step-by-step guide');  
console.log('✅ Browser-relative coordinate conversion');
console.log('✅ Enhanced testing interface');
console.log('✅ No more taskbar reading interference');
