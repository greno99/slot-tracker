// main.js - Electron Hauptprozess
const { app, BrowserWindow, globalShortcut, ipcMain, dialog, Menu, Tray, screen } = require('electron');
const Store = require('electron-store');
const path = require('path');
const fs = require('fs');
const xlsx = require('node-xlsx');

const store = new Store();
let mainWindow;
let overlayWindow;
let tray;

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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('minimize', () => {
    if (process.platform === 'win32') {
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
    }
  });

  overlayWindow.loadFile('renderer/overlay.html');
  overlayWindow.setIgnoreMouseEvents(false);

  // Overlay kann durch Klicken durch transparent gemacht werden
  overlayWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F9') {
      const isIgnoring = overlayWindow.isIgnoringMouseEvents();
      overlayWindow.setIgnoreMouseEvents(!isIgnoring);
    }
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
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Beenden',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Casino Tracker');

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
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
      }
    }
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
  return store.set(key, value);
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
        session.rounds,
        session.totalBet.toFixed(2),
        session.totalWin.toFixed(2),
        profit.toFixed(2),
        rtp,
        formatDuration(session.playTime || 0)
      ]);
    });
    
    worksheets.push({ name: 'Sessions', data: sessionData });
  }
  
  // Spins Worksheet
  if (data.allSpins && data.allSpins.length > 0) {
    const spinData = [
      ['Datum', 'Zeit', 'Spiel', 'Einsatz', 'Gewinn', 'Multiplier']
    ];
    
    data.allSpins.forEach(spin => {
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
      session.rounds,
      session.totalBet.toFixed(2),
      session.totalWin.toFixed(2),
      profit.toFixed(2),
      rtp,
      formatDuration(session.playTime || 0)
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  // Cleanup
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
    }
  });
}