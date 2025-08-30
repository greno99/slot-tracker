// debug-area-selection.js - Debug utility for area selection issues
const { app, BrowserWindow, screen, globalShortcut } = require('electron');

let debugWindow = null;

app.whenReady().then(() => {
    console.log('🔧 Starting Area Selection Debug Tool...');
    createDebugWindow();
});

function createDebugWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    debugWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: '🔧 Area Selection Debug Tool'
    });
    
    const debugHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Area Selection Debug Tool</title>
        <style>
            body {
                font-family: 'Segoe UI', sans-serif;
                padding: 20px;
                background: #1a1a2e;
                color: white;
            }
            .test-btn {
                background: #16213e;
                color: white;
                border: 2px solid #0f4c75;
                padding: 15px 25px;
                margin: 10px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
            }
            .test-btn:hover {
                background: #0f4c75;
            }
            .log {
                background: #000;
                padding: 15px;
                border-radius: 8px;
                margin: 10px 0;
                height: 300px;
                overflow-y: auto;
                font-family: 'Courier New', monospace;
                font-size: 12px;
            }
            .success { color: #10b981; }
            .error { color: #ef4444; }
            .info { color: #3b82f6; }
        </style>
    </head>
    <body>
        <h1>🔧 Area Selection Debug Tool</h1>
        <p>This tool helps diagnose area selection issues with casino websites.</p>
        
        <div>
            <button class="test-btn" onclick="testBasicOverlay()">🧪 Test Basic Overlay</button>
            <button class="test-btn" onclick="testFullscreenOverlay()">📺 Test Fullscreen Overlay</button>
            <button class="test-btn" onclick="testKeyHandling()">⌨️ Test Key Handling</button>
            <button class="test-btn" onclick="testMouseTracking()">🖱️ Test Mouse Tracking</button>
            <button class="test-btn" onclick="checkWindowInfo()">ℹ️ Check Window Info</button>
            <button class="test-btn" onclick="clearLog()">🧹 Clear Log</button>
        </div>
        
        <div id="log" class="log">
            <div class="info">Debug tool ready. Click buttons above to run tests.</div>
        </div>
        
        <script>
            const { ipcRenderer } = require('electron');
            
            function log(message, type = 'info') {
                const logDiv = document.getElementById('log');
                const time = new Date().toLocaleTimeString();
                const entry = document.createElement('div');
                entry.className = type;
                entry.textContent = \`[\${time}] \${message}\`;
                logDiv.appendChild(entry);
                logDiv.scrollTop = logDiv.scrollHeight;
            }
            
            function testBasicOverlay() {
                log('Testing basic overlay creation...', 'info');
                
                // Create a simple test overlay
                const testWindow = new (require('electron').remote.BrowserWindow)({
                    width: 400,
                    height: 300,
                    frame: false,
                    alwaysOnTop: true,
                    transparent: true
                });
                
                testWindow.loadURL('data:text/html,<body style="background:rgba(255,0,0,0.3);color:white;padding:20px;"><h2>Test Overlay</h2><p>Press ESC to close</p></body>');
                
                testWindow.webContents.on('did-finish-load', () => {
                    log('✅ Basic overlay created successfully', 'success');
                    
                    testWindow.webContents.executeJavaScript(\`
                        document.addEventListener('keydown', (e) => {
                            if (e.key === 'Escape') {
                                require('electron').remote.getCurrentWindow().close();
                            }
                        });
                        window.focus();
                    \`);
                    
                    setTimeout(() => {
                        if (!testWindow.isDestroyed()) {
                            testWindow.close();
                            log('✅ Basic overlay auto-closed', 'success');
                        }
                    }, 3000);
                });
            }
            
            function testFullscreenOverlay() {
                log('Testing fullscreen overlay...', 'info');
                
                const { screen } = require('electron').remote;
                const { width, height } = screen.getPrimaryDisplay().workAreaSize;
                
                log(\`Screen size: \${width}x\${height}\`, 'info');
                
                try {
                    const fullscreenWindow = new (require('electron').remote.BrowserWindow)({
                        width: width,
                        height: height,
                        x: 0,
                        y: 0,
                        frame: false,
                        alwaysOnTop: true,
                        transparent: true,
                        skipTaskbar: true,
                        level: 'screen-saver'
                    });
                    
                    fullscreenWindow.loadURL(\`data:text/html,
                        <body style="background:rgba(0,255,0,0.2);color:white;padding:20px;margin:0;height:100vh;display:flex;align-items:center;justify-content:center;">
                            <div style="background:rgba(0,0,0,0.8);padding:40px;border-radius:15px;text-align:center;">
                                <h2>Fullscreen Test Overlay</h2>
                                <p>Size: \${width}x\${height}</p>
                                <p>This overlay should cover the entire screen</p>
                                <p><strong>Press ESC to close</strong></p>
                            </div>
                        </body>
                    \`);
                    
                    fullscreenWindow.webContents.on('did-finish-load', () => {
                        log('✅ Fullscreen overlay created', 'success');
                        
                        fullscreenWindow.webContents.executeJavaScript(\`
                            document.addEventListener('keydown', (e) => {
                                console.log('Key pressed:', e.key);
                                if (e.key === 'Escape') {
                                    require('electron').remote.getCurrentWindow().close();
                                }
                            });
                            window.focus();
                            console.log('Fullscreen overlay ready');
                        \`);
                    });
                    
                    fullscreenWindow.on('closed', () => {
                        log('✅ Fullscreen overlay closed', 'success');
                    });
                    
                } catch (error) {
                    log(\`❌ Fullscreen overlay error: \${error.message}\`, 'error');
                }
            }
            
            function testKeyHandling() {
                log('Testing key event handling...', 'info');
                
                // Test global shortcut
                try {
                    const { globalShortcut } = require('electron').remote;
                    
                    globalShortcut.register('F12', () => {
                        log('✅ Global shortcut F12 works!', 'success');
                        globalShortcut.unregister('F12');
                    });
                    
                    log('Press F12 to test global shortcut...', 'info');
                    
                    // Auto-cleanup after 5 seconds
                    setTimeout(() => {
                        if (globalShortcut.isRegistered('F12')) {
                            globalShortcut.unregister('F12');
                            log('⏰ F12 test timeout - please try pressing F12', 'info');
                        }
                    }, 5000);
                    
                } catch (error) {
                    log(\`❌ Global shortcut error: \${error.message}\`, 'error');
                }
                
                // Test local key events
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'F11') {
                        log(\`✅ Local key event works: \${e.key}\`, 'success');
                    }
                });
                
                log('Press F11 to test local key handling...', 'info');
            }
            
            function testMouseTracking() {
                log('Testing mouse event tracking...', 'info');
                
                let mouseTestActive = true;
                
                function trackMouse(e) {
                    if (mouseTestActive) {
                        log(\`Mouse: \${e.clientX}, \${e.clientY}\`, 'info');
                    }
                }
                
                document.addEventListener('mousemove', trackMouse);
                
                setTimeout(() => {
                    mouseTestActive = false;
                    document.removeEventListener('mousemove', trackMouse);
                    log('✅ Mouse tracking test completed', 'success');
                }, 3000);
                
                log('Move your mouse around for 3 seconds...', 'info');
            }
            
            function checkWindowInfo() {
                log('Checking window and system information...', 'info');
                
                const { screen } = require('electron').remote;
                const displays = screen.getAllDisplays();
                
                displays.forEach((display, index) => {
                    log(\`Display \${index + 1}: \${display.size.width}x\${display.size.height} @ \${display.bounds.x},\${display.bounds.y}\`, 'info');
                });
                
                log(\`Window size: \${window.outerWidth}x\${window.outerHeight}\`, 'info');
                log(\`Screen position: \${window.screenX}, \${window.screenY}\`, 'info');
                log(\`User agent: \${navigator.userAgent}\`, 'info');
                log(\`Platform: \${process.platform}\`, 'info');
            }
            
            function clearLog() {
                document.getElementById('log').innerHTML = '<div class="info">Log cleared.</div>';
            }
            
            log('🔧 Debug tool loaded successfully', 'success');
            log('Click the buttons above to run various tests', 'info');
        </script>
    </body>
    </html>
    `;
    
    debugWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(debugHtml));
    debugWindow.show();
    
    debugWindow.on('closed', () => {
        debugWindow = null;
        app.quit();
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
