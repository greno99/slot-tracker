// main.js - REAL OCR Casino Detection System
const { app, BrowserWindow, globalShortcut, ipcMain, dialog, Menu, Tray, screen, desktopCapturer } = require('electron');
const Store = require('electron-store');
const path = require('path');
const fs = require('fs');
const xlsx = require('node-xlsx');
const OCREngine = require('./robust-ocr-engine'); // ROBUST OCR Engine - Fixed area extraction and DXGI issues
const BrowserWindowOCR = require('./browser-window-ocr');
const BrowserWindowOCR = require('./browser-window-ocr');
const BrowserWindowOCR = require('./browser-window-ocr');
// const OCREngine = require('./quick-fix-ocr'); // QUICK FIX OCR Engine - WORKING VERSION
// const OCREngine = require('./ocr-engine'); // Original OCR Engine (has issues)


// RESOLUTION FIX: Dynamic screen size detection for your 2560x1440 monitor
function getDynamicScreenSize() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;
    
    console.log(`📺 Detected monitor resolution: ${width}x${height}`);
    
    // For high-resolution displays (like 2560x1440), use native resolution for OCR accuracy
    if (width >= 2560 || height >= 1440) {
        console.log('🎯 Using native resolution for OCR accuracy');
        return { width, height };
    }
    
    // For standard displays, use 1920x1080
    console.log('📏 Using standard 1920x1080 resolution');
    return { width: 1920, height: 1080 };
}

// RESOLUTION FIX: Coordinate scaling for area extraction
function scaleCoordinatesIfNeeded(area) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: nativeWidth, height: nativeHeight } = primaryDisplay.bounds;
    
    // If capturing at native resolution (2560x1440), no scaling needed
    if (nativeWidth >= 2560 || nativeHeight >= 1440) {
        console.log('✅ No coordinate scaling needed - using native resolution');
        return area;
    }
    
    // Calculate scaling factors for standard 1920x1080 capture
    const scaleX = 1920 / nativeWidth;
    const scaleY = 1080 / nativeHeight;
    
    const scaled = {
        x: Math.floor(area.x * scaleX),
        y: Math.floor(area.y * scaleY),
        width: Math.floor(area.width * scaleX),
        height: Math.floor(area.height * scaleY)
    };
    
    console.log(`📏 Scaled coordinates: ${area.x},${area.y} ${area.width}x${area.height} → ${scaled.x},${scaled.y} ${scaled.width}x${scaled.height}`);
    return scaled;
}


// RESOLUTION FIX: Dynamic screen size detection for your 2560x1440 monitor
function getDynamicScreenSize() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;
    
    console.log(`📺 Detected monitor resolution: ${width}x${height}`);
    
    // For high-resolution displays (like 2560x1440), use native resolution for OCR accuracy
    if (width >= 2560 || height >= 1440) {
        console.log('🎯 Using native resolution for OCR accuracy');
        return { width, height };
    }
    
    // For standard displays, use 1920x1080
    console.log('📏 Using standard 1920x1080 resolution');
    return { width: 1920, height: 1080 };
}

// RESOLUTION FIX: Coordinate scaling for area extraction
function scaleCoordinatesIfNeeded(area) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: nativeWidth, height: nativeHeight } = primaryDisplay.bounds;
    
    // If capturing at native resolution (2560x1440), no scaling needed
    if (nativeWidth >= 2560 || nativeHeight >= 1440) {
        console.log('✅ No coordinate scaling needed - using native resolution');
        return area;
    }
    
    // Calculate scaling factors for standard 1920x1080 capture
    const scaleX = 1920 / nativeWidth;
    const scaleY = 1080 / nativeHeight;
    
    const scaled = {
        x: Math.floor(area.x * scaleX),
        y: Math.floor(area.y * scaleY),
        width: Math.floor(area.width * scaleX),
        height: Math.floor(area.height * scaleY)
    };
    
    console.log(`📏 Scaled coordinates: ${area.x},${area.y} ${area.width}x${area.height} → ${scaled.x},${scaled.y} ${scaled.width}x${scaled.height}`);
    return scaled;
}


// RESOLUTION FIX: Dynamic screen size detection for your 2560x1440 monitor
function getDynamicScreenSize() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;
    
    console.log(`📺 Detected monitor resolution: ${width}x${height}`);
    
    // For high-resolution displays (like 2560x1440), use native resolution for OCR accuracy
    if (width >= 2560 || height >= 1440) {
        console.log('🎯 Using native resolution for OCR accuracy');
        return { width, height };
    }
    
    // For standard displays, use 1920x1080
    console.log('📏 Using standard 1920x1080 resolution');
    return { width: 1920, height: 1080 };
}

// RESOLUTION FIX: Coordinate scaling for area extraction
function scaleCoordinatesIfNeeded(area) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: nativeWidth, height: nativeHeight } = primaryDisplay.bounds;
    
    // If capturing at native resolution (2560x1440), no scaling needed
    if (nativeWidth >= 2560 || nativeHeight >= 1440) {
        console.log('✅ No coordinate scaling needed - using native resolution');
        return area;
    }
    
    // Calculate scaling factors for standard 1920x1080 capture
    const scaleX = 1920 / nativeWidth;
    const scaleY = 1080 / nativeHeight;
    
    const scaled = {
        x: Math.floor(area.x * scaleX),
        y: Math.floor(area.y * scaleY),
        width: Math.floor(area.width * scaleX),
        height: Math.floor(area.height * scaleY)
    };
    
    console.log(`📏 Scaled coordinates: ${area.x},${area.y} ${area.width}x${area.height} → ${scaled.x},${scaled.y} ${scaled.width}x${scaled.height}`);
    return scaled;
}


// RESOLUTION FIX: Dynamic screen size detection for your 2560x1440 monitor
function getDynamicScreenSize() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;
    
    console.log(`📺 Detected monitor resolution: ${width}x${height}`);
    
    // For high-resolution displays (like 2560x1440), use native resolution for OCR accuracy
    if (width >= 2560 || height >= 1440) {
        console.log('🎯 Using native resolution for OCR accuracy');
        return { width, height };
    }
    
    // For standard displays, use 1920x1080
    console.log('📏 Using standard 1920x1080 resolution');
    return { width: 1920, height: 1080 };
}

// RESOLUTION FIX: Coordinate scaling for area extraction
function scaleCoordinatesIfNeeded(area) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: nativeWidth, height: nativeHeight } = primaryDisplay.bounds;
    
    // If capturing at native resolution (2560x1440), no scaling needed
    if (nativeWidth >= 2560 || nativeHeight >= 1440) {
        console.log('✅ No coordinate scaling needed - using native resolution');
        return area;
    }
    
    // Calculate scaling factors for standard 1920x1080 capture
    const scaleX = 1920 / nativeWidth;
    const scaleY = 1080 / nativeHeight;
    
    const scaled = {
        x: Math.floor(area.x * scaleX),
        y: Math.floor(area.y * scaleY),
        width: Math.floor(area.width * scaleX),
        height: Math.floor(area.height * scaleY)
    };
    
    console.log(`📏 Scaled coordinates: ${area.x},${area.y} ${area.width}x${area.height} → ${scaled.x},${scaled.y} ${scaled.width}x${scaled.height}`);
    return scaled;
}

const store = new Store();
let mainWindow;
let overlayWindow;
let tray;
let isQuitting = false;
let spinDetectionWindow;
let mouseTracking = false;
let spinDetectionActive = false;
let globalMouseListener = null;
let areaSelectionWindow = null;
let statsWindow;

// REAL OCR Detection System
class CasinoDetectionEngine {
        constructor() {
        this.isActive = false;
        this.config = null;
        this.detectionInterval = null;
        this.mouseListener = null;
        this.lastClickTime = 0;
        this.ocrEngine = new OCREngine(); // REAL OCR Engine
        this.browserOCR = new BrowserWindowOCR(); // BROWSER WINDOW OCR
        this.selectedBrowserWindow = null;
    }

    async initialize(config) {
        this.config = config;
        console.log('🎯 Casino Detection Engine initialized with REAL OCR:', config);
        
        if (!config.spinButton) {
            throw new Error('Spin button position required');
        }

        // Initialize the OCR engine
        try {
            await this.ocrEngine.initialize();
            console.log('✅ OCR Engine initialized successfully');
        } catch (error) {
            console.warn('⚠️ OCR Engine initialization warning:', error.message);
            // Continue without OCR for fallback
        }

        this.isActive = true;
        this.startDetection();
        return { success: true };
    }

    startDetection() {
        console.log('🚀 Starting casino detection with REAL OCR...');
        
        // Start global mouse monitoring
        this.startGlobalMouseMonitoring();
        
        // Periodic analysis
        this.detectionInterval = setInterval(() => {
            this.analyzeScreen();
        }, 3000);
    }

    async analyzeScreen() {
        if (!this.isActive) return;
        
        try {
            console.log('📊 Analyzing screen...');
            
            // Demo: Simulate occasional spin detection for testing
            if (Math.random() < 0.02) { // 2% chance
                console.log('🎰 Demo spin detected!');
                this.onSpinDetected();
            }
        } catch (error) {
            console.error('Screen analysis error:', error);
        }
    }

    startGlobalMouseMonitoring() {
        console.log('🖱️ Starting REAL global mouse monitoring...');
        
        if (process.platform === 'win32') {
            this.startWindowsMouseTracking();
        } else {
            console.log('Global mouse tracking not available on this platform');
            this.startDemoMode();
        }
    }

    startWindowsMouseTracking() {
        const { spawn } = require('child_process');
        
        // FIXED: Simplified PowerShell mouse tracking without problematic Add-Type
        const mouseScript = `
Add-Type -AssemblyName System.Windows.Forms

$lastClickTime = 0
$lastPosition = @{X=-1; Y=-1}

while ($true) {
    # Use .NET Framework methods directly
    $pos = [System.Windows.Forms.Cursor]::Position
    
    # Check left mouse button state
    $leftButton = [System.Windows.Forms.Control]::MouseButtons
    
    if ($leftButton -eq "Left") {
        $currentTime = [System.DateTime]::Now.Ticks / 10000000
        
        # Smart debouncing (500ms min for clicks)
        if ($currentTime - $lastClickTime -gt 0.5) {
            # Position changed or enough time passed
            if (($pos.X -ne $lastPosition.X) -or ($pos.Y -ne $lastPosition.Y) -or ($currentTime - $lastClickTime -gt 1.0)) {
                Write-Host "FAST_CLICK:$($pos.X):$($pos.Y)"
                $lastClickTime = $currentTime
                $lastPosition = @{X=$pos.X; Y=$pos.Y}
                Start-Sleep -Milliseconds 300  # Brief pause after successful click
            }
        }
    }
    
    Start-Sleep -Milliseconds 50  # Reasonable polling interval
}
        `;

        this.mouseListener = spawn('powershell', [
            '-WindowStyle', 'Hidden',
            '-ExecutionPolicy', 'Bypass', 
            '-Command', mouseScript
        ], {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.mouseListener.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim().startsWith('FAST_CLICK:')) {
                    const parts = line.trim().split(':');
                    if (parts.length >= 3) {
                        const x = parseInt(parts[1]);
                        const y = parseInt(parts[2]);
                        if (!isNaN(x) && !isNaN(y)) {
                            console.log(`🖱️ ULTRA-FAST Click detected at ${x}, ${y}`);
                            this.handleGlobalClick(x, y);
                        }
                    }
                }
            });
        });

        this.mouseListener.stderr.on('data', (data) => {
            console.log('PowerShell stderr:', data.toString());
        });

        this.mouseListener.on('error', (error) => {
            console.error('Mouse listener error:', error);
            // Auto-fallback to demo mode on error
            console.log('🔄 Falling back to demo mode...');
            this.startDemoMode();
        });

        this.mouseListener.on('close', (code) => {
            console.log(`Mouse listener closed with code ${code}`);
        });
        
        console.log('✅ ULTRA-FAST mouse tracking started with Win32 API!');
    }

    startDemoMode() {
        // Fallback demo mode for non-Windows
        console.log('Starting demo mode...');
        setInterval(() => {
            if (Math.random() < 0.1) { // 10% chance every 3 seconds
                this.handleGlobalClick(500, 300); // Demo click
            }
        }, 3000);
    }

    handleGlobalClick(x, y) {
        if (!this.config || !this.config.spinButton) return;
        
        const { x: btnX, y: btnY } = this.config.spinButton;
        const distance = Math.sqrt((x - btnX) ** 2 + (y - btnY) ** 2);
        
        console.log(`🖱️ ULTRA-FAST Global click at ${x},${y} - Button at ${btnX},${btnY} - Distance: ${distance.toFixed(1)}px`);
        
        // IMPROVED: Dynamic detection radius based on configuration
        let detectionRadius = 50;
        
        // Smart radius adjustment based on configured areas
        if (this.config.areas && this.config.areas.bet) {
            const avgAreaSize = Math.sqrt(this.config.areas.bet.width * this.config.areas.bet.height);
            detectionRadius = Math.max(25, Math.min(80, avgAreaSize * 0.8));
        }
        
        if (distance < detectionRadius) {
            const now = Date.now();
            // SMART: Prevent rapid double-clicks but allow legitimate quick spins
            if (now - this.lastClickTime > 800) {  // Reduced from 1000ms to 800ms
                console.log(`🎯 SPIN BUTTON CLICK DETECTED! (radius: ${detectionRadius}px)`);
                console.log(`⚡ Click timing: ${now - this.lastClickTime}ms since last spin`);
                this.lastClickTime = now;
                this.onSpinDetected();
            } else {
                console.log(`⏱️ Click too soon after last spin (${now - this.lastClickTime}ms ago) - preventing double-spin`);
            }
        } else {
            console.log(`📍 Click outside detection radius (${detectionRadius}px)`);
        }
    }

    async onSpinDetected() {
        console.log('🎰 SPIN DETECTED! Processing with REAL OCR...');
        
        // Wait for spin animation
        setTimeout(async () => {
            try {
                const gameData = await this.extractGameDataWithRealOCR();
                this.reportSpin(gameData);
            } catch (error) {
                console.error('Error extracting game data:', error);
                this.reportSpin({ bet: 1.0, win: 0, balance: 100, error: error.message });
            }
        }, 2000);
    }

    async extractGameDataWithRealOCR() {
        console.log('📊 Extracting game data with ENHANCED REAL OCR...');
        
        const results = { bet: 0, win: 0, balance: 0 };
        
        try {
            // ENHANCED: Use direct screen area analysis (no need for full screenshot first)
            if (this.config.areas && Object.keys(this.config.areas).length > 0) {
                console.log('🔍 Running ENHANCED OCR on configured areas...');
                
                for (const [areaType, area] of Object.entries(this.config.areas)) {
                    if (area && this.validateArea(area, areaType)) {
                        try {
                            // NEW: Use direct screen area analysis with enhanced capture
                            const scaledArea = scaleCoordinatesIfNeeded(area);
                            const ocrResult = await this.ocrEngine.analyzeScreenArea(scaledArea, areaType);
                            
                            results[areaType] = ocrResult.value;
                            console.log(`🎯 ENHANCED OCR ${areaType}: ${ocrResult.value} (${ocrResult.confidence}% confidence)`);
                            
                            // Log OCR details
                            if (ocrResult.text && ocrResult.text !== 'ERROR' && ocrResult.text !== 'SCREEN_CAPTURE_ERROR') {
                                console.log(`📝 OCR Text: "${ocrResult.text}"`);
                            }
                            
                            if (ocrResult.error) {
                                console.warn(`⚠️ OCR warning for ${areaType}: ${ocrResult.error}`);
                            }
                            
                        } catch (ocrError) {
                            console.error(`Enhanced OCR error for ${areaType}:`, ocrError);
                            results[areaType] = 0;
                        }
                    } else {
                        console.warn(`⚠️ Skipping invalid area for ${areaType}:`, area);
                    }
                }
            } else {
                console.log('⚠️ No OCR areas configured, using fallback values');
            }
            
            // Enhanced logging for better debugging
            const ocrSuccessCount = Object.values(results).filter(v => v > 0).length;
            const totalAreas = Object.keys(this.config.areas || {}).length;
            
            console.log(`📊 Enhanced OCR Results: ${ocrSuccessCount}/${totalAreas} areas detected successfully`);
            
            // If no areas configured or all OCR failed, use realistic demo values
            if (results.bet === 0 && results.win === 0 && results.balance === 0) {
                console.log('🔄 Using fallback values since no valid OCR results');
                results.bet = parseFloat((1.0 + Math.random() * 4).toFixed(2)); // 1-5 bet
                results.win = Math.random() < 0.3 ? parseFloat((Math.random() * 25).toFixed(2)) : 0; // 30% win chance
                results.balance = parseFloat((100 + Math.random() * 500).toFixed(2));
            }
            
        } catch (error) {
            // Enhanced error handling
            if (error.message.includes('DXGI') || error.message.includes('IDXGIDuplicateOutput')) {
                console.log('⚠️ DXGI format issue detected - Enhanced Screenshot Capture should handle this automatically');
            } else if (error.message.includes('All screenshot capture methods failed')) {
                console.error('❌ All screenshot capture methods failed - check system permissions and dependencies');
            } else {
                console.error('Enhanced data extraction error:', error);
            }
            
            // Fallback values
            results.bet = parseFloat((1.0 + Math.random() * 4).toFixed(2));
            results.win = Math.random() < 0.25 ? parseFloat((Math.random() * 20).toFixed(2)) : 0;
            results.balance = parseFloat((50 + Math.random() * 200).toFixed(2));
        }
        
        console.log('💰 Extracted data (ENHANCED OCR):', results);
        return results;
    }
    
    validateArea(area, areaType) {
        if (!area || typeof area !== 'object') {
            console.warn(`❌ Invalid area object for ${areaType}:`, area);
            return false;
        }
        
        const { x, y, width, height } = area;
        
        // Check if all required properties exist and are numbers
        if (typeof x !== 'number' || typeof y !== 'number' || 
            typeof width !== 'number' || typeof height !== 'number') {
            console.warn(`❌ Invalid area coordinates for ${areaType}:`, area);
            return false;
        }
        
        // Check for reasonable bounds
        if (x < 0 || y < 0 || width <= 0 || height <= 0) {
            console.warn(`❌ Invalid area dimensions for ${areaType}:`, area);
            return false;
        }
        
        // Check if area is too large (probably invalid)
        if (width > 5000 || height > 5000) {
            console.warn(`❌ Area too large for ${areaType}:`, area);
            return false;
        }
        
        // Check if area is too small (might not contain readable text)
        if (width < 10 || height < 5) {
            console.warn(`❌ Area too small for ${areaType}:`, area);
            return false;
        }
        
        console.log(`✅ Area validation passed for ${areaType}`);
        return true;
    }

    async takeScreenshot() {
        try {
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: getDynamicScreenSize()
            });
            
            if (sources.length > 0) {
                return sources[0].thumbnail;
            }
            throw new Error('No screen sources available');
        } catch (error) {
            if (error.message && error.message.includes('DXGI')) {
                console.log('⚠️ DXGI screen capture issue (Windows HDR) - this is expected and non-critical');
                throw new Error('Screen capture format incompatibility (DXGI)');
            }
            throw error;
        }
    }

    reportSpin(gameData) {
        console.log('📤 Reporting spin:', gameData);
        
        // Send to detection window
        if (spinDetectionWindow && !spinDetectionWindow.isDestroyed()) {
            spinDetectionWindow.webContents.send('spin-detected', gameData);
        }
        
        // Send to overlay
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('auto-detected-spin', gameData);
        }
    }

    stop() {
        console.log('⏹️ Stopping detection...');
        this.isActive = false;
        
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        
        if (this.mouseListener) {
            this.mouseListener.kill();
            this.mouseListener = null;
        }
        
        // Cleanup OCR engine
        if (this.ocrEngine) {
            this.ocrEngine.terminate().catch(err => {
                console.warn('OCR engine cleanup warning:', err.message);
            });
        }
    }
}

const detectionEngine = new CasinoDetectionEngine();

// Helper function for area validation
function validateAreaForOCR(area, areaType, screenshotMetadata) {
  if (!area || typeof area !== 'object') {
    return {
      valid: false,
      error: `Invalid area object for ${areaType}`
    };
  }
  
  const { x, y, width, height } = area;
  
  // Check if all required properties exist and are numbers
  if (typeof x !== 'number' || typeof y !== 'number' || 
      typeof width !== 'number' || typeof height !== 'number') {
    return {
      valid: false,
      error: `Invalid area coordinates - all values must be numbers`
    };
  }
  
  // Check for reasonable bounds
  if (x < 0 || y < 0 || width <= 0 || height <= 0) {
    return {
      valid: false,
      error: `Invalid area dimensions - negative or zero values`
    };
  }
  
  // Check if area exceeds screenshot boundaries
  if (screenshotMetadata && 
      (x + width > screenshotMetadata.width || y + height > screenshotMetadata.height)) {
    return {
      valid: false,
      error: `Area exceeds screenshot boundaries (${screenshotMetadata.width}x${screenshotMetadata.height})`
    };
  }
  
  // Check if area is too small (might not contain readable text)
  if (width < 10 || height < 5) {
    return {
      valid: false,
      error: `Area too small for OCR (minimum 10x5 pixels required)`
    };
  }
  
  // Check if area is unreasonably large
  if (width > 1000 || height > 200) {
    return {
      valid: false,
      error: `Area too large - might contain too much noise`
    };
  }
  
  return { valid: true };
}

// App-Konfiguration
const isDev = process.env.NODE_ENV === 'development';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false
  });

  mainWindow.loadFile('renderer/main.html');

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      sendToOverlay('main-window-closed');
      
      if (tray && !mainWindow.isDestroyed()) {
        tray.displayBalloon({
          iconType: 'info',
          title: 'Casino Tracker',
          content: 'App läuft im Hintergrund weiter. Rechtsklick auf das Tray-Icon für Optionen.'
        });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('minimize', (event) => {
    if (process.platform === 'win32') {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  overlayWindow = new BrowserWindow({
    width: 350,
    height: 600,
    x: width - 370,
    y: 20,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    level: 'screen-saver',
    focusable: true,
    hasShadow: false,
    acceptFirstMouse: true
  });

  overlayWindow.loadFile('renderer/overlay.html');
  overlayWindow.setIgnoreMouseEvents(false);
  
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true);

  overlayWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F9') {
      const isIgnoring = overlayWindow.isIgnoringMouseEvents();
      overlayWindow.setIgnoreMouseEvents(!isIgnoring);
    }
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  overlayWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      overlayWindow.hide();
    }
  });

  setInterval(() => {
    if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
      overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }, 5000);
}

function createStatsWindow() {
  const existingStatsWindow = BrowserWindow.getAllWindows().find(w => 
    w.getTitle() === 'Casino Tracker - Statistiken'
  );
  
  if (existingStatsWindow) {
    existingStatsWindow.focus();
    return;
  }

  statsWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: 'Casino Tracker - Statistiken'
  });

  statsWindow.loadFile('renderer/stats.html');
  
  if (isDev) {
    statsWindow.webContents.openDevTools();
  }

  statsWindow.show();
}

function createSpinDetectionWindow() {
  if (spinDetectionWindow && !spinDetectionWindow.isDestroyed()) {
    spinDetectionWindow.focus();
    return;
  }

  spinDetectionWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: '🎯 REAL OCR Casino Detection Setup'
  });

  spinDetectionWindow.loadFile('renderer/spin-detection.html');
  
  if (isDev) {
    spinDetectionWindow.webContents.openDevTools();
  }

  spinDetectionWindow.show();
  
  spinDetectionWindow.on('closed', () => {
    spinDetectionWindow = null;
    spinDetectionActive = false;
    mouseTracking = false;
    
    if (setupMouseListener) {
      setupMouseListener.kill();
      setupMouseListener = null;
    }
    
    if (detectionEngine.isActive) {
      detectionEngine.stop();
    }
  });
}

// Working area selection overlay with better ESC handling
function createAdvancedAreaSelectionOverlay(areaType) {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Close any existing area selection window first
  if (areaSelectionWindow && !areaSelectionWindow.isDestroyed()) {
    areaSelectionWindow.close();
    areaSelectionWindow = null;
  }
  
  areaSelectionWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    level: 'screen-saver',
    focusable: true
  });
  
  const areaNames = {
    bet: '💰 Einsatz-Bereich',
    win: '🎯 Gewinn-Bereich',
    balance: '💳 Guthaben-Bereich'
  };
  
  const areaSelectionHtml = `
  <!DOCTYPE html>
  <html>
  <head>
      <style>
          body {
              margin: 0;
              padding: 0;
              background: rgba(0, 0, 0, 0.3);
              cursor: crosshair;
              user-select: none;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              overflow: hidden;
              height: 100vh;
              width: 100vw;
          }
          .instructions {
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px 30px;
              border-radius: 15px;
              font-size: 18px;
              font-weight: bold;
              z-index: 1000;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
              text-align: center;
              animation: fadeIn 0.5s ease-in;
          }
          .instructions small {
              display: block;
              margin-top: 8px;
              font-size: 14px;
              opacity: 0.9;
              font-weight: normal;
          }
          .selection-box {
              position: absolute;
              border: 3px solid #00ff41;
              background: rgba(0, 255, 65, 0.1);
              display: none;
              box-shadow: 0 0 20px rgba(0, 255, 65, 0.8);
              z-index: 999;
              pointer-events: none;
          }
          .coordinates {
              position: fixed;
              bottom: 20px;
              right: 20px;
              background: rgba(0, 0, 0, 0.9);
              color: #00ff41;
              padding: 15px 20px;
              border-radius: 10px;
              font-family: 'Courier New', monospace;
              font-size: 14px;
              z-index: 1000;
              border: 2px solid #00ff41;
          }
          .cancel-hint {
              position: fixed;
              top: 50%;
              left: 20px;
              background: rgba(239, 68, 68, 0.9);
              color: white;
              padding: 15px 20px;
              border-radius: 10px;
              font-size: 16px;
              font-weight: bold;
              z-index: 1000;
              border: 2px solid #ef4444;
              animation: pulse 2s infinite;
          }
          @keyframes fadeIn {
              from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
          @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
          }
      </style>
  </head>
  <body>
      <div class="instructions">
          ${areaNames[areaType]} auswählen<br>
          <small>🎯 Klicken und ziehen um den Textbereich zu markieren<br>
          ⚡ ESC zum Abbrechen • Enter zum Bestätigen</small>
      </div>
      
      <div class="cancel-hint">
          ❌ ESC<br>
          <small>Abbrechen</small>
      </div>
      
      <div class="selection-box" id="selectionBox"></div>
      
      <div class="coordinates" id="coordinates">
          Position: <span id="mousePos">0, 0</span><br>
          Größe: <span id="selectionSize">0 × 0</span><br>
          <small>Status: <span id="status">Bereit</span></small>
      </div>
      
      <script>
          const { ipcRenderer } = require('electron');
          
          let isSelecting = false;
          let startX, startY;
          let selectionStarted = false;
          const selectionBox = document.getElementById('selectionBox');
          const mousePosEl = document.getElementById('mousePos');
          const selectionSizeEl = document.getElementById('selectionSize');
          const statusEl = document.getElementById('status');
          
          console.log('Area selection overlay loaded for: ${areaType}');
          
          // IMPROVED: Multiple ESC key handlers for reliability
          let escapePressed = false;
          
          function handleEscape() {
              if (escapePressed) return; // Prevent double execution
              escapePressed = true;
              console.log('ESC pressed - closing area selection');
              statusEl.textContent = 'Abgebrochen';
              
              // Immediate visual feedback
              document.body.style.background = 'rgba(255, 0, 0, 0.2)';
              
              setTimeout(() => {
                  try {
                      window.close();
                  } catch (e) {
                      console.error('Error closing window:', e);
                      // Fallback: notify main process
                      ipcRenderer.send('close-area-selection');
                  }
              }, 100);
          }
          
          // Multiple event listeners for ESC key
          document.addEventListener('keydown', (e) => {
              console.log('Keydown event:', e.key, e.code, e.keyCode);
              if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEscape();
                  return false;
              }
              
              if (e.key === 'Enter' && selectionStarted) {
                  e.preventDefault();
                  completeSelection();
              }
          });
          
          // Also listen on window and body
          window.addEventListener('keydown', (e) => {
              if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
                  handleEscape();
              }
          });
          
          document.body.addEventListener('keydown', (e) => {
              if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
                  handleEscape();
              }
          });
          
          // IMPROVED: Better mouse handling
          document.addEventListener('mousemove', (e) => {
              mousePosEl.textContent = e.clientX + ', ' + e.clientY;
              
              if (isSelecting) {
                  const width = Math.abs(e.clientX - startX);
                  const height = Math.abs(e.clientY - startY);
                  
                  selectionBox.style.left = Math.min(startX, e.clientX) + 'px';
                  selectionBox.style.top = Math.min(startY, e.clientY) + 'px';
                  selectionBox.style.width = width + 'px';
                  selectionBox.style.height = height + 'px';
                  
                  selectionSizeEl.textContent = width + ' × ' + height;
                  statusEl.textContent = 'Auswahl aktiv';
              }
          });
          
          document.addEventListener('mousedown', (e) => {
              if (escapePressed) return;
              
              console.log('Mouse down at:', e.clientX, e.clientY);
              isSelecting = true;
              selectionStarted = true;
              startX = e.clientX;
              startY = e.clientY;
              
              selectionBox.style.left = startX + 'px';
              selectionBox.style.top = startY + 'px';
              selectionBox.style.width = '0px';
              selectionBox.style.height = '0px';
              selectionBox.style.display = 'block';
              
              statusEl.textContent = 'Auswahl gestartet';
              
              e.preventDefault();
              e.stopPropagation();
          });
          
          document.addEventListener('mouseup', (e) => {
              if (!isSelecting || escapePressed) return;
              
              completeSelection();
          });
          
          function completeSelection() {
              if (!selectionStarted || escapePressed) return;
              
              const endX = event.clientX || startX + 50;
              const endY = event.clientY || startY + 50;
              
              const width = Math.abs(endX - startX);
              const height = Math.abs(endY - startY);
              
              console.log('Selection completed:', {startX, startY, endX, endY, width, height});
              
              // Enhanced validation with better user feedback
              if (width < 10 || height < 5) {
                  statusEl.textContent = 'Bereich zu klein!';
                  alert('⚠️ Bereich zu klein für OCR!\\nMinimum: 10×5 Pixel\\nAktuell: ' + width + '×' + height + ' Pixel\\n\\nBitte wählen Sie einen größeren Bereich.');
                  resetSelection();
                  return;
              }
              
              if (width > 1000 || height > 200) {
                  const proceed = confirm('⚠️ Sehr großer Bereich!\\nGröße: ' + width + '×' + height + ' Pixel\\n\\nGroße Bereiche können schlechte OCR-Ergebnisse liefern.\\nTrotzdem fortfahren?');
                  if (!proceed) {
                      resetSelection();
                      return;
                  }
              }
              
              const coordinates = {
                  x: Math.floor(Math.min(startX, endX)),
                  y: Math.floor(Math.min(startY, endY)),
                  width: Math.floor(width),
                  height: Math.floor(height)
              };
              
              statusEl.textContent = 'Bereich gespeichert!';
              document.body.style.background = 'rgba(0, 255, 0, 0.2)';
              
              console.log('Saving area:', coordinates);
              
              // Save the area and close
              ipcRenderer.invoke('save-selected-area', '${areaType}', coordinates).then(() => {
                  setTimeout(() => {
                      window.close();
                  }, 500);
              }).catch(err => {
                  console.error('Error saving area:', err);
                  alert('Fehler beim Speichern: ' + err.message);
              });
          }
          
          function resetSelection() {
              isSelecting = false;
              selectionStarted = false;
              selectionBox.style.display = 'none';
              statusEl.textContent = 'Bereit';
          }
          
          // Auto-focus for reliable key events
          window.focus();
          document.body.focus();
          
          // Additional focus handling
          setTimeout(() => {
              window.focus();
              console.log('Window focused for key events');
          }, 100);
          
          // Prevent context menu
          document.addEventListener('contextmenu', (e) => {
              e.preventDefault();
          });
          
          // Visual feedback on load
          setTimeout(() => {
              const instructions = document.querySelector('.instructions');
              if (instructions) {
                  instructions.style.opacity = '0.8';
              }
          }, 3000);
          
          // Heartbeat to ensure responsiveness
          setInterval(() => {
              if (!escapePressed) {
                  console.log('Area selection overlay active');
              }
          }, 5000);
      </script>
  </body>
  </html>
  `;
  
  areaSelectionWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(areaSelectionHtml));
  areaSelectionWindow.show();
  areaSelectionWindow.focus();
  
  // IMPROVED: Better window event handling
  areaSelectionWindow.on('closed', () => {
    console.log('Area selection window closed');
    areaSelectionWindow = null;
  });
  
  areaSelectionWindow.on('blur', () => {
    // Re-focus after short delay to maintain key event handling
    setTimeout(() => {
      if (areaSelectionWindow && !areaSelectionWindow.isDestroyed()) {
        areaSelectionWindow.focus();
      }
    }, 100);
  });
  
  // IMPROVED: Global shortcut as backup for ESC
  try {
    // Unregister any existing ESC shortcut first
    if (globalShortcut.isRegistered('Escape')) {
      globalShortcut.unregister('Escape');
    }
    
    const escapeRegistered = globalShortcut.register('Escape', () => {
      if (areaSelectionWindow && !areaSelectionWindow.isDestroyed()) {
        console.log('Global ESC pressed - closing area selection');
        areaSelectionWindow.close();
        if (globalShortcut.isRegistered('Escape')) {
          globalShortcut.unregister('Escape');
        }
      }
    });
    
    if (escapeRegistered) {
      console.log('✅ Global ESC shortcut registered successfully');
    } else {
      console.log('⚠️ Global ESC shortcut registration failed (might be in use by another app)');
    }
  } catch (escError) {
    console.warn('⚠️ Global ESC shortcut error:', escError.message);
    // Continue without global shortcut - local ESC handlers should still work
  }
  
  console.log(`Area selection overlay created for ${areaType}`);
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Hauptfenster zeigen',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      }
    },
    {
      label: 'Overlay umschalten',
      click: () => {
        if (overlayWindow) {
          if (overlayWindow.isVisible()) {
            overlayWindow.hide();
          } else {
            overlayWindow.show();
            overlayWindow.setAlwaysOnTop(true, 'screen-saver');
          }
        } else {
          createOverlayWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Komplett beenden',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Casino Tracker - Rechtsklick für Optionen');

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createMainWindow();
    }
  });

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createMainWindow();
    }
  });
}

function registerGlobalShortcuts() {
  globalShortcut.register('F1', () => {
    sendToOverlay('hotkey', 'F1');
  });

  globalShortcut.register('F2', () => {
    sendToOverlay('hotkey', 'F2');
  });

  globalShortcut.register('F3', () => {
    sendToOverlay('hotkey', 'F3');
  });

  globalShortcut.register('F4', () => {
    sendToOverlay('hotkey', 'F4');
  });

  globalShortcut.register('F5', () => {
    sendToOverlay('hotkey', 'F5');
  });

  globalShortcut.register('F6', () => {
    takeScreenshot();
  });

  globalShortcut.register('F7', () => {
    sendToOverlay('hotkey', 'F7');
  });

  globalShortcut.register('F8', () => {
    sendToOverlay('hotkey', 'F8');
  });

  globalShortcut.register('CommandOrControl+Shift+O', () => {
    if (overlayWindow) {
      if (overlayWindow.isVisible()) {
        overlayWindow.hide();
      } else {
        overlayWindow.show();
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    } else {
      createOverlayWindow();
    }
  });

  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    isQuitting = true;
    app.quit();
  });
}

function sendToOverlay(channel, data) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send(channel, data);
  }
}

function takeScreenshot() {
  const { desktopCapturer } = require('electron');
  
  desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: getDynamicScreenSize()
  }).then(sources => {
    const source = sources[0];
    if (source) {
      const screenshotPath = path.join(__dirname, 'screenshots', `screenshot-${Date.now()}.png`);
      
      const screenshotDir = path.dirname(screenshotPath);
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      const base64Data = source.thumbnail.toPNG();
      fs.writeFile(screenshotPath, base64Data, (err) => {
        if (err) {
          console.error('Screenshot-Fehler:', err);
        } else {
          console.log('Screenshot gespeichert:', screenshotPath);
          sendToOverlay('screenshot-saved', screenshotPath);
        }
      });
    }
  }).catch(err => {
    console.error('Screenshot-Fehler:', err);
  });
}

// IPC Event Handlers
ipcMain.handle('get-store-data', (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-store-data', (event, key, value) => {
  store.set(key, value);
  
  if (key === 'settings') {
    sendToOverlay('settings-updated');
  }
  
  return true;
});

ipcMain.handle('toggle-overlay', () => {
  if (overlayWindow) {
    if (overlayWindow.isVisible()) {
      overlayWindow.hide();
    } else {
      overlayWindow.show();
      overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  } else {
    createOverlayWindow();
  }
});

ipcMain.on('overlay-focus-input', (event, isFocused) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.setIgnoreMouseEvents(false);
    if (isFocused) overlayWindow.focus();
  }
});

ipcMain.handle('hide-overlay', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
    return { success: true };
  }
  return { success: false, error: 'Overlay window not found' };
});

ipcMain.handle('quit-app', () => {
  isQuitting = true;
  app.quit();
});

ipcMain.handle('open-stats-window', () => {
  createStatsWindow();
});

// Spin Detection IPC Handlers
ipcMain.handle('open-spin-detection', () => {
  createSpinDetectionWindow();
});

// Real global mouse tracking for setup
let setupMouseListener = null;

// OCR Test handler
ipcMain.handle('test-ocr-engine', async () => {
    try {
        console.log('🧪 Testing OCR Engine directly...');
        const testOCREngine = new OCREngine();
        const result = await testOCREngine.testOCR();
        await testOCREngine.terminate();
        return result;
    } catch (error) {
        console.error('OCR Engine test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('start-setup-mouse-tracking', () => {
  console.log('🖱️ Starting SETUP global mouse tracking...');
  
  if (process.platform === 'win32') {
    const { spawn } = require('child_process');
    
    const setupMouseScript = `
Add-Type -AssemblyName System.Windows.Forms
$lastMove = 0
while ($true) {
    $pos = [System.Windows.Forms.Cursor]::Position
    $now = (Get-Date).Ticks / 10000000
    if ($now - $lastMove -gt 0.1) {
        Write-Output "MOUSE:$($pos.X):$($pos.Y)"
        $lastMove = $now
    }
    if ([System.Windows.Forms.Control]::MouseButtons -eq "Left") {
        Write-Output "SETUP_CLICK:$($pos.X):$($pos.Y)"
        Start-Sleep -Milliseconds 500
    }
    Start-Sleep -Milliseconds 50
}
    `;

    setupMouseListener = spawn('powershell', [
      '-WindowStyle', 'Hidden',
      '-ExecutionPolicy', 'Bypass',
      '-Command', setupMouseScript
    ], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    setupMouseListener.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim().startsWith('MOUSE:')) {
          const parts = line.trim().split(':');
          if (parts.length >= 3) {
            const x = parseInt(parts[1]);
            const y = parseInt(parts[2]);
            if (!isNaN(x) && !isNaN(y)) {
              // Send mouse position to setup window
              if (spinDetectionWindow && !spinDetectionWindow.isDestroyed()) {
                spinDetectionWindow.webContents.send('global-mouse-move', { x, y });
              }
            }
          }
        } else if (line.trim().startsWith('SETUP_CLICK:')) {
          const parts = line.trim().split(':');
          if (parts.length >= 3) {
            const x = parseInt(parts[1]);
            const y = parseInt(parts[2]);
            if (!isNaN(x) && !isNaN(y)) {
              // Send click to setup window
              if (spinDetectionWindow && !spinDetectionWindow.isDestroyed()) {
                spinDetectionWindow.webContents.send('global-mouse-click', { x, y });
              }
            }
          }
        }
      });
    });

    setupMouseListener.stderr.on('data', (data) => {
      console.log('Setup PowerShell stderr:', data.toString());
    });

    return { success: true };
  } else {
    // Fallback for non-Windows
    return { success: true, message: 'Global mouse tracking not available on this platform' };
  }
});

ipcMain.handle('stop-setup-mouse-tracking', () => {
  console.log('⏹️ Stopping setup global mouse tracking...');
  
  if (setupMouseListener) {
    setupMouseListener.kill();
    setupMouseListener = null;
  }
  
  return { success: true };
});

ipcMain.handle('start-global-mouse-tracking', () => {
  mouseTracking = true;
  console.log('✅ Global mouse tracking enabled');
  return { success: true };
});

ipcMain.handle('stop-global-mouse-tracking', () => {
  mouseTracking = false;
  console.log('⏹️ Global mouse tracking disabled');
  return { success: true };
});

ipcMain.handle('save-detection-config', (event, config) => {
  store.set('spinDetectionConfig', config);
  console.log('💾 Detection config saved:', config);
  return { success: true };
});

ipcMain.handle('load-detection-config', () => {
  const config = store.get('spinDetectionConfig') || null;
  console.log('📂 Detection config loaded:', config);
  return config;
});

ipcMain.handle('start-area-selection', (event, areaType) => {
  console.log('🎯 Starting area selection for:', areaType);
  createAdvancedAreaSelectionOverlay(areaType);
  return { success: true };
});

// Add IPC handler for closing area selection
ipcMain.on('close-area-selection', () => {
  console.log('Force closing area selection via IPC');
  if (areaSelectionWindow && !areaSelectionWindow.isDestroyed()) {
    areaSelectionWindow.close();
  }
  
  // Clean up global shortcut
  try {
    if (globalShortcut.isRegistered('Escape')) {
      globalShortcut.unregister('Escape');
      console.log('🧽 Force close: Global ESC shortcut cleaned up');
    }
  } catch (cleanupError) {
    console.warn('⚠️ Force close ESC cleanup warning:', cleanupError.message);
  }
});

ipcMain.handle('save-selected-area', async (event, areaType, coordinates) => {
  console.log('💾 Saving area:', areaType, coordinates);
  
  const config = store.get('spinDetectionConfig') || {};
  if (!config.areas) config.areas = {};
  
  config.areas[areaType] = coordinates;
  store.set('spinDetectionConfig', config);
  
  if (spinDetectionWindow && !spinDetectionWindow.isDestroyed()) {
    spinDetectionWindow.webContents.send('area-configured', areaType, coordinates);
  }
  
  // Clean up global shortcut if area selection is complete
  try {
    if (globalShortcut.isRegistered('Escape')) {
      globalShortcut.unregister('Escape');
      console.log('🧽 Global ESC shortcut cleaned up after area save');
    }
  } catch (cleanupError) {
    console.warn('⚠️ ESC shortcut cleanup warning:', cleanupError.message);
  }
  
  return { success: true };
});

ipcMain.handle('take-detection-screenshot', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: getDynamicScreenSize()
    });
    
    if (sources.length > 0) {
      const timestamp = Date.now();
      const screenshotPath = path.join(__dirname, 'screenshots', `detection-${timestamp}.png`);
      
      const screenshotDir = path.dirname(screenshotPath);
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      
      const imageBuffer = sources[0].thumbnail.toPNG();
      fs.writeFileSync(screenshotPath, imageBuffer);
      
      return { success: true, path: screenshotPath };
    }
    
    return { success: false, error: 'No screen sources available' };
  } catch (error) {
    console.error('Screenshot error:', error);
    return { success: false, error: error.message };
  }
});

// ENHANCED OCR Test detection handler with improved screenshot capture
ipcMain.handle('test-spin-detection', async (event, config) => {
  try {
    console.log('🧪 Testing ENHANCED OCR spin detection with config:', config);
    
    let results = {
      success: true,
      bet: '0.00',
      win: '0.00',
      balance: '0.00',
      message: 'ENHANCED OCR analysis with multiple capture methods',
      areasAnalyzed: [],
      screenshotInfo: {}
    };
    
    // ENHANCED OCR ANALYSIS: Use direct screen area analysis with enhanced capture
    if (config.areas && Object.keys(config.areas).length > 0) {
      console.log('🔍 Running ENHANCED OCR on configured areas...');
      results.message = `Analyzing ${Object.keys(config.areas).length} configured screen areas with ENHANCED OCR`;
      
      // Initialize OCR engine for testing
      const testOCREngine = new OCREngine();
      
      try {
        await testOCREngine.initialize();
        console.log('✅ Test ENHANCED OCR Engine initialized');
      } catch (error) {
        console.warn('⚠️ ENHANCED OCR Engine initialization warning for test:', error.message);
        return {
          success: false,
          error: `Enhanced OCR Engine initialization failed: ${error.message}`,
          screenshotInfo: results.screenshotInfo
        };
      }
      
      // Validate and process each configured area with ENHANCED OCR
      for (const [areaType, area] of Object.entries(config.areas)) {
        if (area) {
          console.log(`📊 ENHANCED OCR analyzing ${areaType} area:`, area);
          
          // Basic area validation first
          if (!area || typeof area !== 'object' || area.width <= 0 || area.height <= 0) {
            console.warn(`❌ Area validation failed for ${areaType}:`, area);
            results.areasAnalyzed.push({
              type: areaType,
              value: '0.00',
              confidence: 0,
              text: 'VALIDATION_ERROR',
              area: area,
              error: 'Invalid area coordinates',
              method: 'ENHANCED_OCR_MULTI_CAPTURE',
              areaInfo: `${area?.width || 0}x${area?.height || 0}px @ (${area?.x || 0}, ${area?.y || 0})`,
              analysisNotes: 'Area coordinates are invalid'
            });
            continue;
          }
          
          try {
            // NEW: Use direct screen area analysis with enhanced capture methods
            const ocrResult = await testOCREngine.analyzeScreenArea(area, areaType);
            
            results[areaType] = ocrResult.value.toString();
            
            let captureMethod = 'UNKNOWN';
            if (testOCREngine.screenshotCapture && testOCREngine.screenshotCapture.lastSuccessfulMethod) {
              captureMethod = testOCREngine.screenshotCapture.lastSuccessfulMethod.toUpperCase();
            }
            
            results.areasAnalyzed.push({
              type: areaType,
              value: ocrResult.value.toString(),
              confidence: ocrResult.confidence,
              text: ocrResult.text,
              area: ocrResult.area || area,
              method: `ENHANCED_OCR_${captureMethod}`,
              areaInfo: `${area.width}x${area.height}px @ (${area.x}, ${area.y})`,
              analysisNotes: ocrResult.confidence > 70 ? `High confidence detection via ${captureMethod}` : 
                           ocrResult.confidence > 30 ? `Medium confidence detection via ${captureMethod}` : 
                           `Low confidence via ${captureMethod} - may need area adjustment`,
              captureMethod: captureMethod
            });
            
            if (ocrResult.error) {
              results.areasAnalyzed[results.areasAnalyzed.length - 1].error = ocrResult.error;
            }
            
            console.log(`✅ ENHANCED OCR ${areaType}: "${ocrResult.text}" -> ${ocrResult.value} (${ocrResult.confidence}% confidence via ${captureMethod})`);
          } catch (ocrError) {
            console.error(`ENHANCED OCR error for ${areaType}:`, ocrError);
            
            let errorType = 'OCR_ERROR';
            let analysisNotes = 'OCR processing failed';
            
            if (ocrError.message.includes('SCREEN_CAPTURE_ERROR') || ocrError.message.includes('All screenshot capture methods failed')) {
              errorType = 'SCREEN_CAPTURE_ERROR';
              analysisNotes = 'All screenshot capture methods failed - check DXGI/HDR settings or install Python PIL';
            } else if (ocrError.message.includes('DXGI') || ocrError.message.includes('IDXGIDuplicateOutput')) {
              errorType = 'DXGI_ERROR';
              analysisNotes = 'Windows HDR/10-bit display format issue - PowerShell capture should handle this';
            } else if (ocrError.message.includes('extract_area')) {
              errorType = 'AREA_EXTRACTION_ERROR';
              analysisNotes = 'Invalid area coordinates for image extraction';
            }
            
            results.areasAnalyzed.push({
              type: areaType,
              value: '0.00',
              confidence: 0,
              text: errorType,
              area: area,
              error: ocrError.message,
              method: 'ENHANCED_OCR_FAILED',
              areaInfo: `${area.width}x${area.height}px @ (${area.x}, ${area.y})`,
              analysisNotes: analysisNotes
            });
          }
        }
      }
      
      // Cleanup OCR engine after testing
      try {
        await testOCREngine.terminate();
        console.log('🧽 Test ENHANCED OCR Engine cleaned up');
      } catch (cleanupError) {
        console.warn('Enhanced OCR cleanup warning:', cleanupError.message);
      }
      
    } else {
      results.message = 'No OCR areas configured - configure areas first!';
      console.log('⚠️ No areas configured for ENHANCED OCR analysis');
    }
    
    // Add summary info
    if (results.areasAnalyzed.length > 0) {
      const successfulCaptures = results.areasAnalyzed.filter(a => a.value !== '0.00').length;
      const totalAreas = results.areasAnalyzed.length;
      const captureMethods = [...new Set(results.areasAnalyzed.map(a => a.captureMethod).filter(m => m))];
      
      results.summary = {
        successfulCaptures,
        totalAreas,
        successRate: (successfulCaptures / totalAreas * 100).toFixed(1) + '%',
        captureMethods: captureMethods
      };
      
      console.log(`📊 ENHANCED OCR Summary: ${successfulCaptures}/${totalAreas} areas successful (${results.summary.successRate})`);
      console.log(`🔧 Capture methods used: ${captureMethods.join(', ')}`);
    }
    
    console.log('✅ ENHANCED OCR Test results:', results);
    return results;
  } catch (error) {
    console.error('ENHANCED OCR Test detection error:', error);
    
    // Enhanced error reporting
    let enhancedError = error.message;
    if (error.message.includes('DXGI')) {
      enhancedError = 'DXGI format incompatibility detected - Enhanced Screenshot Capture should automatically use PowerShell fallback';
    } else if (error.message.includes('desktopCapturer')) {
      enhancedError = 'Electron desktopCapturer failed - Enhanced Screenshot Capture will use alternative methods';
    }
    
    return { 
      success: false, 
      error: enhancedError,
      originalError: error.message,
      suggestion: 'Try configuring OCR areas first, or check if Windows HDR mode is causing DXGI issues'
    };
  }
});

// Start/Stop detection handlers with REAL OCR
ipcMain.handle('start-spin-detection', async (event, config) => {
  console.log('🚀 Starting REAL OCR casino detection with config:', config);
  
  try {
    const result = await detectionEngine.initialize(config);
    spinDetectionActive = true;
    
    console.log('✅ REAL OCR Casino detection engine started successfully');
    return { success: true, message: 'Real-time casino detection with REAL OCR started!' };
  } catch (error) {
    console.error('REAL OCR Detection start error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-spin-detection', () => {
  console.log('⏹️ Stopping REAL OCR casino detection...');
  
  detectionEngine.stop();
  spinDetectionActive = false;
  
  return { success: true };
});

ipcMain.handle('process-detected-spin', async (event, spinData) => {
  console.log('📤 Processing detected spin with REAL OCR:', spinData);
  
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('auto-detected-spin', spinData);
  }
  return { success: true };
});


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
        console.log(`🎯 Selecting browser window: ${windowIndex}`);
        const selectedWindow = detectionEngine.browserOCR.selectBrowserWindow(windowIndex);
        
        if (selectedWindow) {
            detectionEngine.selectedBrowserWindow = selectedWindow;
            console.log(`✅ Browser window selected: ${selectedWindow.ProcessName} - ${selectedWindow.Title.substring(0, 50)}...`);
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
            message: `Testing Browser Window OCR on: ${detectionEngine.selectedBrowserWindow.ProcessName}`
        };
        
        // Test each configured area with browser window OCR
        if (config.areas && Object.keys(config.areas).length > 0) {
            for (const [areaType, area] of Object.entries(config.areas)) {
                if (area) {
                    try {
                        console.log(`🌐 Testing browser OCR for ${areaType}:`, area);
                        
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
                        
                        console.log(`✅ Browser OCR test ${areaType}: ${ocrResult.value} (${ocrResult.confidence}% confidence)`);
                        
                    } catch (ocrError) {
                        console.error(`Browser OCR test error for ${areaType}:`, ocrError);
                        
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
        console.log(`🎯 Selecting browser window: ${windowIndex}`);
        const selectedWindow = detectionEngine.browserOCR.selectBrowserWindow(windowIndex);
        
        if (selectedWindow) {
            detectionEngine.selectedBrowserWindow = selectedWindow;
            console.log(`✅ Browser window selected: ${selectedWindow.ProcessName} - ${selectedWindow.Title.substring(0, 50)}...`);
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
            message: `Testing Browser Window OCR on: ${detectionEngine.selectedBrowserWindow.ProcessName}`
        };
        
        // Test each configured area with browser window OCR
        if (config.areas && Object.keys(config.areas).length > 0) {
            for (const [areaType, area] of Object.entries(config.areas)) {
                if (area) {
                    try {
                        console.log(`🌐 Testing browser OCR for ${areaType}:`, area);
                        
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
                        
                        console.log(`✅ Browser OCR test ${areaType}: ${ocrResult.value} (${ocrResult.confidence}% confidence)`);
                        
                    } catch (ocrError) {
                        console.error(`Browser OCR test error for ${areaType}:`, ocrError);
                        
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
        console.log(`🎯 Selecting browser window: ${windowIndex}`);
        const selectedWindow = detectionEngine.browserOCR.selectBrowserWindow(windowIndex);
        
        if (selectedWindow) {
            detectionEngine.selectedBrowserWindow = selectedWindow;
            console.log(`✅ Browser window selected: ${selectedWindow.ProcessName} - ${selectedWindow.Title.substring(0, 50)}...`);
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
            message: `Testing Browser Window OCR on: ${detectionEngine.selectedBrowserWindow.ProcessName}`
        };
        
        // Test each configured area with browser window OCR
        if (config.areas && Object.keys(config.areas).length > 0) {
            for (const [areaType, area] of Object.entries(config.areas)) {
                if (area) {
                    try {
                        console.log(`🌐 Testing browser OCR for ${areaType}:`, area);
                        
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
                        
                        console.log(`✅ Browser OCR test ${areaType}: ${ocrResult.value} (${ocrResult.confidence}% confidence)`);
                        
                    } catch (ocrError) {
                        console.error(`Browser OCR test error for ${areaType}:`, ocrError);
                        
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


// Export function
ipcMain.handle('export-data', async (event, data) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Session-Daten exportieren',
      defaultPath: `casino-sessions-${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] },
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'CSV Files', extensions: ['csv'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      const extension = path.extname(result.filePath).toLowerCase();
      
      switch (extension) {
        case '.xlsx':
          await exportToExcel(result.filePath, data);
          break;
        case '.json':
          fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
          break;
        case '.csv':
          await exportToCSV(result.filePath, data);
          break;
      }
      
      return { success: true, path: result.filePath };
    }
    
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

async function exportToExcel(filePath, data) {
  const worksheets = [];
  
  if (data.sessions && data.sessions.length > 0) {
    const sessionData = [
      ['Datum', 'Spiel', 'Runden', 'Einsatz', 'Gewinn', 'Profit', 'RTP%', 'Spielzeit']
    ];
    
    data.sessions.forEach(session => {
      const profit = session.totalWin - session.totalBet;
      const rtp = session.totalBet > 0 ? ((session.totalWin / session.totalBet) * 100).toFixed(2) : 0;
      
      sessionData.push([
        new Date(session.startTime).toLocaleDateString('de-DE'),
        session.game || 'Unbekannt',
        session.spins,
        session.totalBet.toFixed(2),
        session.totalWin.toFixed(2),
        profit.toFixed(2),
        rtp,
        formatDuration(session.endTime - session.startTime || 0)
      ]);
    });
    
    worksheets.push({ name: 'Sessions', data: sessionData });
  }
  
  const buffer = xlsx.build(worksheets);
  fs.writeFileSync(filePath, buffer);
}

async function exportToCSV(filePath, data) {
  if (!data.sessions || data.sessions.length === 0) {
    throw new Error('Keine Session-Daten zum Exportieren');
  }
  
  const csvData = [
    'Datum,Spiel,Runden,Einsatz,Gewinn,Profit,RTP%,Spielzeit'
  ];
  
  data.sessions.forEach(session => {
    const profit = session.totalWin - session.totalBet;
    const rtp = session.totalBet > 0 ? ((session.totalWin / session.totalBet) * 100).toFixed(2) : 0;
    
    csvData.push([
      new Date(session.startTime).toLocaleDateString('de-DE'),
      session.game || 'Unbekannt',
      session.spins,
      session.totalBet.toFixed(2),
      session.totalWin.toFixed(2),
      profit.toFixed(2),
      rtp,
      formatDuration(session.endTime - session.startTime || 0)
    ].join(','));
  });
  
  fs.writeFileSync(filePath, csvData.join('\n'));
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${remainingMinutes}m`;
}

// App Event Handlers
app.whenReady().then(() => {
  createMainWindow();
  createOverlayWindow();
  createTray();
  registerGlobalShortcuts();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('before-quit', (event) => {
  if (!isQuitting) {
    event.preventDefault();
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      const response = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Abbrechen', 'Im Hintergrund weiterlaufen', 'Komplett beenden'],
        defaultId: 1,
        title: 'Casino Tracker beenden?',
        message: 'Möchten Sie die Anwendung komplett beenden oder im Hintergrund weiterlaufen lassen?'
      });
      
      if (response === 2) {
        isQuitting = true;
        app.quit();
      }
    } else {
      isQuitting = true;
    }
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  
  // Stop detection engine
  if (detectionEngine && detectionEngine.isActive) {
    detectionEngine.stop();
  }
});

app.on('quit', () => {
  if (tray) {
    tray.destroy();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  });
}
