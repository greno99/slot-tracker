// main.js - Electron Hauptprozess (Fixed Version)
const { app, BrowserWindow, globalShortcut, ipcMain, dialog, Menu, Tray, screen, desktopCapturer } = require('electron');
const Store = require('electron-store');
const path = require('path');
const fs = require('fs');
const xlsx = require('node-xlsx');

// Add mouse and keyboard monitoring
let globalMouseHook = null;
try {
  // Optional: Add global mouse tracking (requires additional package)
  // const ioHook = require('iohook');
  // globalMouseHook = ioHook;
} catch (e) {
  console.log('Advanced mouse tracking not available - using basic detection');
}

const store = new Store();
let mainWindow;
let overlayWindow;
let tray;
let isQuitting = false;
let spinDetectionWindow;
let mouseTracking = false;
let spinDetectionActive = false;

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

  // FIX: Proper window closing behavior
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // FIX: Notify overlay that main window is closing
      sendToOverlay('main-window-closed');
      
      // Show tray notification on first minimize
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

  // FIX: Better minimize behavior
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
    // FIX: Ensure overlay stays on top
    level: 'screen-saver',  // Higher level than 'floating'
    focusable: true,       // Prevent stealing focus
    hasShadow: false,       // Better transparency
    acceptFirstMouse: true
  });

  overlayWindow.loadFile('renderer/overlay.html');
  overlayWindow.setIgnoreMouseEvents(false);
  
  // FIX: Ensure overlay is always on top
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true);

  // Overlay kann durch Klicken durch transparent gemacht werden
  overlayWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F9') {
      const isIgnoring = overlayWindow.isIgnoringMouseEvents();
      overlayWindow.setIgnoreMouseEvents(!isIgnoring);
    }
  });

  // FIX: Handle overlay window events
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  // FIX: Prevent overlay from being closed accidentally
  overlayWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      overlayWindow.hide();
    }
  });

  // FIX: Refresh overlay position periodically to ensure it stays on top
  setInterval(() => {
    if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
      overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }, 5000);
}

function createStatsWindow() {
  // Don't create multiple stats windows
  const existingStatsWindow = BrowserWindow.getAllWindows().find(w => 
    w.getTitle() === 'Casino Tracker - Statistiken'
  );
  
  if (existingStatsWindow) {
    existingStatsWindow.focus();
    return;
  }

  const statsWindow = new BrowserWindow({
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
  // Don't create multiple detection windows
  if (spinDetectionWindow && !spinDetectionWindow.isDestroyed()) {
    spinDetectionWindow.focus();
    return;
  }

  spinDetectionWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: 'Spin Detection Setup'
  });

  spinDetectionWindow.loadFile('renderer/spin-detection.html');
  
  if (isDev) {
    spinDetectionWindow.webContents.openDevTools();
  }

  spinDetectionWindow.show();
  
  spinDetectionWindow.on('closed', () => {
    spinDetectionWindow = null;
    // Stop any active detection when window closes
    spinDetectionActive = false;
    mouseTracking = false;
  });
}

// Simplified spin monitoring function
function startSpinMonitoring() {
  if (!spinDetectionActive) return;
  
  const config = store.get('activeDetectionConfig');
  if (!config || !config.spinButton) {
    console.log('No valid detection config found');
    return;
  }
  
  console.log('Spin monitoring started at position:', config.spinButton);
  
  // Simple monitoring loop - in a real implementation this would:
  // 1. Monitor mouse clicks at the specified position
  // 2. Take screenshots when clicks are detected
  // 3. Use OCR to read bet/win amounts
  // 4. Send results to overlay
  
  const monitoringInterval = setInterval(() => {
    if (!spinDetectionActive) {
      clearInterval(monitoringInterval);
      return;
    }
    
    // Demo: Simulate random spin detection for testing
    // Remove this in production!
    if (Math.random() < 0.01) { // 1% chance per check
      const demoSpin = {
        bet: (Math.random() * 5 + 0.5).toFixed(2),
        win: (Math.random() * 20).toFixed(2),
        timestamp: Date.now()
      };
      
      if (spinDetectionWindow && !spinDetectionWindow.isDestroyed()) {
        spinDetectionWindow.webContents.send('spin-detected', demoSpin);
      }
    }
  }, 1000); // Check every second
}

// NEW: Create area selection overlay
function createAreaSelectionOverlay(areaType) {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  const selectionOverlay = new BrowserWindow({
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
      contextIsolation: false
    },
    level: 'screen-saver'
  });
  
  // Load area selection HTML
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
          font-family: Arial, sans-serif;
        }
        .instructions {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 15px 25px;
          border-radius: 10px;
          font-size: 16px;
          z-index: 1000;
        }
        .selection-box {
          position: absolute;
          border: 2px dashed #00ff00;
          background: rgba(0, 255, 0, 0.1);
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="instructions">
        ${areaType === 'bet' ? '💰 Einsatz-Bereich' : areaType === 'win' ? '🎯 Gewinn-Bereich' : '💳 Guthaben-Bereich'} auswählen<br>
        <small>Klicken und ziehen um Bereich zu markieren • ESC zum Abbrechen</small>
      </div>
      <div class="selection-box" id="selectionBox"></div>
      
      <script>
        const { ipcRenderer } = require('electron');
        
        let isSelecting = false;
        let startX, startY;
        const selectionBox = document.getElementById('selectionBox');
        
        document.addEventListener('mousedown', (e) => {
          isSelecting = true;
          startX = e.clientX;
          startY = e.clientY;
          selectionBox.style.left = startX + 'px';
          selectionBox.style.top = startY + 'px';
          selectionBox.style.width = '0px';
          selectionBox.style.height = '0px';
          selectionBox.style.display = 'block';
        });
        
        document.addEventListener('mousemove', (e) => {
          if (!isSelecting) return;
          
          const currentX = e.clientX;
          const currentY = e.clientY;
          
          const width = Math.abs(currentX - startX);
          const height = Math.abs(currentY - startY);
          
          selectionBox.style.left = Math.min(startX, currentX) + 'px';
          selectionBox.style.top = Math.min(startY, currentY) + 'px';
          selectionBox.style.width = width + 'px';
          selectionBox.style.height = height + 'px';
        });
        
        document.addEventListener('mouseup', (e) => {
          if (!isSelecting) return;
          
          const endX = e.clientX;
          const endY = e.clientY;
          
          const coordinates = {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY)
          };
          
          // Save the selected area
          ipcRenderer.invoke('save-selected-area', '${areaType}', coordinates);
          
          // Close the overlay
          window.close();
        });
        
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            window.close();
          }
        });
      </script>
    </body>
    </html>
  `;
  
  selectionOverlay.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(areaSelectionHtml));
  selectionOverlay.show();
  
  selectionOverlay.on('closed', () => {
    // Cleanup
  });
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
    // FIX: Add explicit quit option
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

  // FIX: Add click handler for tray
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
  // Globale Hotkeys
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
    // Screenshot-Funktion
    takeScreenshot();
  });

  globalShortcut.register('F7', () => {
    // Debug-Modus
    sendToOverlay('hotkey', 'F7');
  });

  globalShortcut.register('F8', () => {
    sendToOverlay('hotkey', 'F8');
  });

  // Overlay ein/aus
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

  // FIX: Add emergency quit shortcut
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
    thumbnailSize: { width: 1920, height: 1080 }
  }).then(sources => {
    const source = sources[0];
    if (source) {
      const screenshotPath = path.join(__dirname, 'screenshots', `screenshot-${Date.now()}.png`);
      
      // Stelle sicher, dass der Screenshots-Ordner existiert
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
  
  // FIX: Notify overlay when settings are updated
  if (key === 'settings') {
    sendToOverlay('settings-updated');
  }
  
  return true;
});

// FIX: Add IPC handler for overlay toggle
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

// FIX: Add IPC handler for hiding overlay
ipcMain.handle('hide-overlay', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
    return { success: true };
  }
  return { success: false, error: 'Overlay window not found' };
});

// FIX: Add IPC handler for app quit
ipcMain.handle('quit-app', () => {
  isQuitting = true;
  app.quit();
});

// NEW: Add IPC handler for opening stats window
ipcMain.handle('open-stats-window', () => {
  createStatsWindow();
});

// SPIN DETECTION IPC HANDLERS
ipcMain.handle('open-spin-detection', () => {
  createSpinDetectionWindow();
});

ipcMain.handle('start-global-mouse-tracking', () => {
  mouseTracking = true;
  return { success: true };
});

ipcMain.handle('stop-global-mouse-tracking', () => {
  mouseTracking = false;
  return { success: true };
});

ipcMain.handle('save-detection-config', (event, config) => {
  store.set('spinDetectionConfig', config);
  return { success: true };
});

ipcMain.handle('load-detection-config', () => {
  return store.get('spinDetectionConfig') || null;
});

ipcMain.handle('start-area-selection', (event, areaType) => {
  // Create overlay for area selection
  createAreaSelectionOverlay(areaType);
  return { success: true };
});

ipcMain.handle('save-selected-area', (event, areaType, coordinates) => {
  const config = store.get('spinDetectionConfig') || {};
  if (!config.areas) config.areas = {};
  
  config.areas[areaType] = coordinates;
  store.set('spinDetectionConfig', config);
  
  // Notify the detection window
  if (spinDetectionWindow && !spinDetectionWindow.isDestroyed()) {
    spinDetectionWindow.webContents.send('area-configured', areaType, coordinates);
  }
  
  return { success: true };
});

ipcMain.handle('take-detection-screenshot', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    
    if (sources.length > 0) {
      const screenshotPath = path.join(__dirname, 'screenshots', `detection-${Date.now()}.png`);
      
      // Ensure screenshots directory exists
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
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-spin-detection', async (event, config) => {
  try {
    console.log('Testing spin detection with config:', config);
    
    // Take screenshot first
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    
    if (sources.length === 0) {
      return { success: false, error: 'No screen sources available' };
    }
    
    const screenshot = sources[0].thumbnail;
    
    // If we have area configurations, try to extract text from them
    let results = {
      success: true,
      bet: '0.00',
      win: '0.00',
      balance: '0.00',
      message: 'Demo-Werte (OCR wird implementiert)'
    };
    
    // If areas are configured, we could do OCR here
    if (config.areas) {
      // TODO: Implement OCR text recognition from screenshot areas
      // For now, return demo values with area info
      results.message = `Bereiche konfiguriert: ${Object.keys(config.areas).join(', ')}`;
      
      // Simulate some realistic values
      results.bet = (Math.random() * 10 + 0.5).toFixed(2);
      results.win = Math.random() < 0.3 ? (Math.random() * 50).toFixed(2) : '0.00';
      results.balance = (100 + Math.random() * 500).toFixed(2);
    }
    
    return results;
  } catch (error) {
    console.error('Test detection error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-spin-detection', (event, config) => {
  spinDetectionActive = true;
  // Store config for detection
  store.set('activeDetectionConfig', config);
  
  // Start monitoring (simplified for now)
  startSpinMonitoring();
  
  return { success: true };
});

ipcMain.handle('stop-spin-detection', () => {
  spinDetectionActive = false;
  return { success: true };
});

ipcMain.handle('process-detected-spin', async (event, spinData) => {
  // Forward detected spin to overlay for processing
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('auto-detected-spin', spinData);
  }
  return { success: true };
});

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
  
  // Sessions Worksheet
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
  
  // Spins Worksheet
  if (data.sessions && data.sessions.length > 0) {
    const allSpins = data.sessions.reduce((acc, session) => {
      if (session.spinsHistory) {
        return acc.concat(session.spinsHistory);
      }
      return acc;
    }, []);
    
    if (allSpins.length > 0) {
      const spinData = [
        ['Datum', 'Zeit', 'Spiel', 'Einsatz', 'Gewinn', 'Multiplier']
      ];
      
      allSpins.forEach(spin => {
        const multiplier = spin.bet > 0 ? (spin.win / spin.bet).toFixed(2) : 0;
        
        spinData.push([
          new Date(spin.time).toLocaleDateString('de-DE'),
          new Date(spin.time).toLocaleTimeString('de-DE'),
          spin.game || 'Unbekannt',
          spin.bet.toFixed(2),
          spin.win.toFixed(2),
          `${multiplier}x`
        ]);
      });
      
      worksheets.push({ name: 'Spins', data: spinData });
    }
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

// FIX: Improved window closing behavior
app.on('window-all-closed', (event) => {
  // FIX: Don't quit on window close - keep running in tray
  event.preventDefault();
});

// FIX: Proper quit handling
app.on('before-quit', (event) => {
  if (!isQuitting) {
    event.preventDefault();
    
    // Ask user if they really want to quit
    if (mainWindow && !mainWindow.isDestroyed()) {
      const response = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Abbrechen', 'Im Hintergrund weiterlaufen', 'Komplett beenden'],
        defaultId: 1,
        title: 'Casino Tracker beenden?',
        message: 'Möchten Sie die Anwendung komplett beenden oder im Hintergrund weiterlaufen lassen?'
      });
      
      if (response === 2) { // Komplett beenden
        isQuitting = true;
        app.quit();
      }
      // response === 1 (Hintergrund) or 0 (Abbrechen) - do nothing
    } else {
      isQuitting = true;
    }
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// FIX: Cleanup on quit
app.on('quit', () => {
  if (tray) {
    tray.destroy();
  }
});

// Verhindern, dass die App mehrfach gestartet wird
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