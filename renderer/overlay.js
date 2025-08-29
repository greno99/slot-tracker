const { ipcRenderer } = require('electron');

class ElectronCasinoTracker {
    constructor() {
        this.isTracking = false;
        this.isPaused = false;
        this.currentGame = null;
        this.sessionStartTime = null;
        this.isMinimized = false;
        
        this.sessionData = {
            spins: 0,
            totalBet: 0,
            totalWin: 0,
            bestWin: 0,
            startTime: null,
            spinsHistory: []
        };
        
        // FIX: Add settings object with default values
        this.settings = {
            defaultBet: 1.00,
            bigWinThreshold: 50.00,
            autoSave: true,
            notifications: true
        };
        
        this.initEventListeners();
        this.setupIPC();
        this.loadStoredData();
        this.startTimers();
        this.setupMouseWheelHandlers(); // FIX: Add mouse wheel support
    }
    
    initEventListeners() {
        // UI Controls
        document.getElementById('startBtn').addEventListener('click', () => this.startSession());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopSession());
        document.getElementById('minimizeBtn').addEventListener('click', () => this.toggleMinimize());
        
        // FIX: Proper close button handler
        document.getElementById('closeBtn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeOverlay();
        });
        
        document.getElementById('setGameBtn').addEventListener('click', () => this.setCurrentGame());
        document.getElementById('addBetBtn').addEventListener('click', () => this.addBet());
        document.getElementById('addWinBtn').addEventListener('click', () => this.addWin());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('statsBtn').addEventListener('click', () => this.showStats());
        
        // FIX: Better input handlers with proper event prevention
        document.getElementById('gameInput').addEventListener('keypress', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                this.setCurrentGame();
            }
        });
        
        document.getElementById('betInput').addEventListener('keypress', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addBet();
            }
        });
        
        document.getElementById('winInput').addEventListener('keypress', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addWin();
            }
        });

        // FIX: Prevent inputs from being affected by global shortcuts
        const inputs = document.querySelectorAll('.input-field');
        inputs.forEach(input => {
            input.addEventListener('focus', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });
        });
    }
    
    // FIX: Add mouse wheel support for number inputs
    setupMouseWheelHandlers() {
        const betInput = document.getElementById('betInput');
        const winInput = document.getElementById('winInput');
        
        [betInput, winInput].forEach(input => {
            input.addEventListener('wheel', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const step = parseFloat(input.step) || 0.01;
                const currentValue = parseFloat(input.value) || 0;
                
                if (e.deltaY < 0) {
                    // Scroll up - increase value
                    input.value = (currentValue + step).toFixed(2);
                } else {
                    // Scroll down - decrease value
                    const newValue = Math.max(0, currentValue - step);
                    input.value = newValue.toFixed(2);
                }
                
                // Trigger change event
                input.dispatchEvent(new Event('change'));
            });
            
            // Show wheel hint on focus
            input.addEventListener('focus', () => {
                this.showNotification('Verwenden Sie das Mausrad zum Ändern des Werts', 'info');
            });
        });
    }
    
    setupIPC() {
        // Hotkey-Handler vom Main Process
        ipcRenderer.on('hotkey', (event, key) => {
            this.handleHotkey(key);
        });
        
        ipcRenderer.on('screenshot-saved', (event, path) => {
            this.showNotification(`Screenshot gespeichert: ${path}`, 'success');
        });

        // FIX: Listen for main window close events
        ipcRenderer.on('main-window-closed', () => {
            this.closeOverlay();
        });

        // FIX: Listen for settings updates from main window
        ipcRenderer.on('settings-updated', async () => {
            try {
                const storedSettings = await ipcRenderer.invoke('get-store-data', 'settings');
                if (storedSettings) {
                    this.settings = storedSettings;
                    this.applySettings();
                    this.showNotification('Einstellungen aktualisiert', 'info');
                }
            } catch (error) {
                console.error('Fehler beim Laden der aktualisierten Einstellungen:', error);
            }
        });
    }
    
    handleHotkey(key) {
        // FIX: Don't process hotkeys when input is focused
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'INPUT') {
            return;
        }

        switch(key) {
            case 'F1': // Quick Spin
                if (this.isTracking && !this.isPaused) {
                    this.addQuickSpin();
                }
                break;
            case 'F2': // Add Win
                document.getElementById('winInput').focus();
                break;
            case 'F3': // New Game
                document.getElementById('gameInput').focus();
                break;
            case 'F4': // Export
                this.exportData();
                break;
            case 'F5': // Toggle Pause
                this.togglePause();
                break;
            case 'F6': // Screenshot (handled by main process)
                this.showNotification('Screenshot wird erstellt...', 'info');
                break;
            case 'F7': // Debug
                this.showDebugInfo();
                break;
            case 'F8': // Reset
                if (confirm('Session zurücksetzen?')) {
                    this.resetSession();
                }
                break;
        }
    }
    
    async loadStoredData() {
        try {
            const storedSession = await ipcRenderer.invoke('get-store-data', 'currentSession');
            const storedGame = await ipcRenderer.invoke('get-store-data', 'currentGame');
            // FIX: Load settings including default bet
            const storedSettings = await ipcRenderer.invoke('get-store-data', 'settings');
            
            if (storedSession) {
                this.sessionData = { ...this.sessionData, ...storedSession };
                this.updateUI();
            }
            
            if (storedGame) {
                this.currentGame = storedGame;
                document.getElementById('currentGame').textContent = storedGame;
            }
            
            // FIX: Apply settings if available
            if (storedSettings) {
                this.settings = storedSettings;
                this.applySettings();
            }
        } catch (error) {
            console.error('Fehler beim Laden der Daten:', error);
        }
    }
    
    async saveData() {
        try {
            await ipcRenderer.invoke('set-store-data', 'currentSession', this.sessionData);
            await ipcRenderer.invoke('set-store-data', 'currentGame', this.currentGame);
        } catch (error) {
            console.error('Fehler beim Speichern der Daten:', error);
        }
    }
    
    startSession() {
        if (this.isTracking) return;
        
        this.isTracking = true;
        this.isPaused = false;
        this.sessionStartTime = Date.now();
        this.sessionData.startTime = this.sessionStartTime;
        
        document.getElementById('statusDot').className = 'status-dot status-active';
        document.getElementById('startBtn').textContent = 'Running';
        document.getElementById('pauseBtn').textContent = 'Pause';
        
        this.showNotification('Session gestartet!', 'success');
        this.saveData();
    }
    
    togglePause() {
        if (!this.isTracking) return;
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            document.getElementById('statusDot').className = 'status-dot status-paused';
            document.getElementById('pauseBtn').textContent = 'Resume';
            this.showNotification('Session pausiert', 'info');
        } else {
            document.getElementById('statusDot').className = 'status-dot status-active';
            document.getElementById('pauseBtn').textContent = 'Pause';
            this.showNotification('Session fortgesetzt', 'success');
        }
        
        this.saveData();
    }
    
    stopSession() {
        if (!this.isTracking) return;
        
        if (this.sessionData.spins > 0) {
            this.saveSession();
        }
        
        this.resetSession();
        this.showNotification('Session beendet und gespeichert!', 'success');
    }
    
    resetSession() {
        this.isTracking = false;
        this.isPaused = false;
        this.sessionStartTime = null;
        
        this.sessionData = {
            spins: 0,
            totalBet: 0,
            totalWin: 0,
            bestWin: 0,
            startTime: null,
            spinsHistory: []
        };
        
        document.getElementById('statusDot').className = 'status-dot status-inactive';
        document.getElementById('startBtn').textContent = 'Start';
        document.getElementById('pauseBtn').textContent = 'Pause';
        
        this.updateUI();
        this.saveData();
    }
    
    async saveSession() {
        const sessionId = Date.now();
        const sessionRecord = {
            id: sessionId,
            game: this.currentGame,
            startTime: this.sessionData.startTime,
            endTime: Date.now(),
            spins: this.sessionData.spins,
            totalBet: this.sessionData.totalBet,
            totalWin: this.sessionData.totalWin,
            bestWin: this.sessionData.bestWin,
            spinsHistory: this.sessionData.spinsHistory,
            profit: this.sessionData.totalWin - this.sessionData.totalBet,
            rtp: this.sessionData.totalBet > 0 ? (this.sessionData.totalWin / this.sessionData.totalBet * 100) : 0
        };
        
        try {
            const sessions = await ipcRenderer.invoke('get-store-data', 'sessions') || [];
            sessions.push(sessionRecord);
            await ipcRenderer.invoke('set-store-data', 'sessions', sessions);
        } catch (error) {
            console.error('Fehler beim Speichern der Session:', error);
        }
    }
    
    // FIX: Add function to apply loaded settings
    applySettings() {
        // Set default bet value in the input field
        const betInput = document.getElementById('betInput');
        if (betInput && this.settings.defaultBet) {
            betInput.placeholder = `Einsatz (Standard: €${this.settings.defaultBet.toFixed(2)})`;
            // Optionally set the value directly
            // betInput.value = this.settings.defaultBet.toFixed(2);
        }
        
        // Apply other settings
        console.log('Settings angewendet:', this.settings);
    }
    
    // FIX: Enhanced addBet function to use default value
    addBet() {
        if (!this.isTracking || this.isPaused) {
            this.showNotification('Session nicht aktiv!', 'error');
            return;
        }
        
        const betInput = document.getElementById('betInput');
        let betAmount = parseFloat(betInput.value);
        
        // FIX: Use default bet if no value entered
        if (!betAmount || betAmount <= 0) {
            betAmount = this.settings.defaultBet;
            betInput.value = betAmount.toFixed(2);
        }
        
        if (betAmount > 0) {
            this.addSpin(betAmount, 0);
            betInput.value = '';
            betInput.focus();
        }
    }
    
    addWin() {
        if (!this.isTracking || this.isPaused) {
            this.showNotification('Session nicht aktiv!', 'error');
            return;
        }
        
        const winInput = document.getElementById('winInput');
        const winAmount = parseFloat(winInput.value);
        
        if (winAmount >= 0 && this.sessionData.spinsHistory.length > 0) {
            // Füge Gewinn zum letzten Spin hinzu
            const lastSpin = this.sessionData.spinsHistory[this.sessionData.spinsHistory.length - 1];
            if (lastSpin && lastSpin.win === 0) {
                lastSpin.win = winAmount;
                this.sessionData.totalWin += winAmount;
                
                if (winAmount > this.sessionData.bestWin) {
                    this.sessionData.bestWin = winAmount;
                }
                
                this.updateUI();
                this.saveData();
                winInput.value = '';
                
                // Zeige Big Win notification
                if (winAmount > lastSpin.bet * 10) {
                    this.showNotification(`Big Win! ${winAmount.toFixed(2)}€`, 'success');
                }
            }
        }
    }
    
    addQuickSpin() {
        // FIX: Use default bet from settings or last spin
        let betAmount = this.settings.defaultBet; // Use settings default
        
        // If there are previous spins, use the last bet amount
        if (this.sessionData.spinsHistory.length > 0) {
            betAmount = this.sessionData.spinsHistory[this.sessionData.spinsHistory.length - 1].bet;
        }
        
        this.addSpin(betAmount, 0);
        this.showNotification(`Quick Spin: ${betAmount.toFixed(2)}€`, 'info');
    }

    setCurrentGame() {
        const gameInput = document.getElementById('gameInput');
        if (gameInput.value.trim()) {
            this.currentGame = gameInput.value.trim();
            document.getElementById('currentGame').textContent = this.currentGame;
            gameInput.value = '';
            this.showNotification(`Spiel gewechselt: ${this.currentGame}`, 'success');
            this.saveData();
        }
    }
    
    addSpin(betAmount, winAmount = 0) {
        const spin = {
            time: Date.now(),
            bet: betAmount,
            win: winAmount,
            game: this.currentGame
        };
        
        this.sessionData.spinsHistory.push(spin);
        this.sessionData.spins++;
        this.sessionData.totalBet += betAmount;
        this.sessionData.totalWin += winAmount;
        
        if (winAmount > this.sessionData.bestWin) {
            this.sessionData.bestWin = winAmount;
        }
        
        this.updateUI();
        this.saveData();
    }
    
    updateUI() {
        // Session Stats
        document.getElementById('spinCount').textContent = this.sessionData.spins;
        document.getElementById('totalBet').textContent = `€${this.sessionData.totalBet.toFixed(2)}`;
        document.getElementById('totalWin').textContent = `€${this.sessionData.totalWin.toFixed(2)}`;
        document.getElementById('bestWin').textContent = `€${this.sessionData.bestWin.toFixed(2)}`;
        
        // Profit/Loss
        const profit = this.sessionData.totalWin - this.sessionData.totalBet;
        const totalWinEl = document.getElementById('totalWin');
        totalWinEl.textContent = `€${profit.toFixed(2)}`;
        totalWinEl.className = `info-value ${profit >= 0 ? 'profit-positive' : 'profit-negative'}`;
        
        // RTP
        const rtp = this.sessionData.totalBet > 0 ? 
            (this.sessionData.totalWin / this.sessionData.totalBet * 100) : 0;
        document.getElementById('rtpValue').textContent = `${rtp.toFixed(1)}%`;
        
        // Average Bet
        const avgBet = this.sessionData.spins > 0 ? 
            (this.sessionData.totalBet / this.sessionData.spins) : 0;
        document.getElementById('avgBet').textContent = `€${avgBet.toFixed(2)}`;
        
        // Letzte Spins
        this.updateSpinsHistory();
    }
    
    updateSpinsHistory() {
        const container = document.getElementById('lastSpins');
        container.innerHTML = '';
        
        const recentSpins = this.sessionData.spinsHistory.slice(-10).reverse();
        
        recentSpins.forEach(spin => {
            const div = document.createElement('div');
            div.className = 'spin-item';
            
            const time = new Date(spin.time).toLocaleTimeString('de-DE', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const multiplier = spin.bet > 0 ? (spin.win / spin.bet) : 0;
            const multiplierClass = multiplier >= 1 ? 'profit-positive' : 'profit-negative';
            
            div.innerHTML = `
                <span class="spin-time">${time}</span>
                <div class="spin-amounts">
                    <span>€${spin.bet.toFixed(2)}</span>
                    <span class="${multiplierClass}">€${spin.win.toFixed(2)}</span>
                    <span class="${multiplierClass}">${multiplier.toFixed(1)}x</span>
                </div>
            `;
            
            container.appendChild(div);
        });
    }
    
    startTimers() {
        setInterval(() => {
            if (this.isTracking && !this.isPaused && this.sessionStartTime) {
                const elapsed = Date.now() - this.sessionStartTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                document.getElementById('sessionTime').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    async exportData() {
        try {
            const sessions = await ipcRenderer.invoke('get-store-data', 'sessions') || [];
            const exportData = {
                sessions: sessions,
                currentSession: this.sessionData,
                exportTime: new Date().toISOString(),
                summary: {
                    totalSessions: sessions.length,
                    totalSpins: sessions.reduce((sum, s) => sum + s.spins, 0),
                    totalProfit: sessions.reduce((sum, s) => sum + s.profit, 0)
                }
            };
            
            const result = await ipcRenderer.invoke('export-data', exportData);
            
            if (result.success) {
                this.showNotification(`Daten exportiert: ${result.path}`, 'success');
            } else if (result.canceled) {
                this.showNotification('Export abgebrochen', 'info');
            } else {
                this.showNotification(`Export-Fehler: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`Export-Fehler: ${error.message}`, 'error');
        }
    }
    
    async showStats() {
        try {
            const sessions = await ipcRenderer.invoke('get-store-data', 'sessions') || [];
            
            if (sessions.length === 0) {
                this.showNotification('Keine Sessions für Statistiken vorhanden', 'info');
                return;
            }
            
            const stats = this.calculateStats(sessions);
            
            // Hier würden Sie ein Statistik-Fenster öffnen
            // Für Demo zeigen wir die Stats in einer Benachrichtigung
            this.showNotification(`${sessions.length} Sessions • Profit: €${stats.totalProfit.toFixed(2)} • RTP: ${stats.avgRTP.toFixed(1)}%`, 'info');
            
            console.log('Detaillierte Statistiken:', stats);
        } catch (error) {
            this.showNotification(`Statistik-Fehler: ${error.message}`, 'error');
        }
    }
    
    calculateStats(sessions) {
        const totalProfit = sessions.reduce((sum, s) => sum + s.profit, 0);
        const totalBet = sessions.reduce((sum, s) => sum + s.totalBet, 0);
        const totalWin = sessions.reduce((sum, s) => sum + s.totalWin, 0);
        const avgRTP = totalBet > 0 ? (totalWin / totalBet * 100) : 0;
        
        return {
            totalSessions: sessions.length,
            totalProfit: totalProfit,
            avgRTP: avgRTP,
            bestSession: sessions.reduce((best, current) => 
                current.profit > best.profit ? current : best, sessions[0]),
            worstSession: sessions.reduce((worst, current) => 
                current.profit < worst.profit ? current : worst, sessions[0])
        };
    }
    
    showDebugInfo() {
        console.log('=== DEBUG INFO ===');
        console.log('Tracking:', this.isTracking);
        console.log('Paused:', this.isPaused);
        console.log('Current Game:', this.currentGame);
        console.log('Session Data:', this.sessionData);
        
        this.showNotification('Debug-Info in Konsole ausgegeben', 'info');
    }
    
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        const overlay = document.getElementById('overlay');
        const btn = document.getElementById('minimizeBtn');
        
        if (this.isMinimized) {
            overlay.classList.add('minimized');
            btn.textContent = '+';
        } else {
            overlay.classList.remove('minimized');
            btn.textContent = '-';
        }
    }
    
    // FIX: Proper close overlay function
    async closeOverlay() {
        try {
            // Send message to main process to hide overlay
            await ipcRenderer.invoke('hide-overlay');
            this.showNotification('Overlay wird geschlossen...', 'info');
        } catch (error) {
            console.error('Fehler beim Schließen des Overlays:', error);
            // Fallback: hide the window directly
            const { remote } = require('electron');
            if (remote) {
                remote.getCurrentWindow().hide();
            }
        }
    }
    
    // FIX: Remove the old hideOverlay function and replace with closeOverlay
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Initialize the tracker
const tracker = new ElectronCasinoTracker();

console.log('Casino Tracker Overlay gestartet!');

// FIX: Prevent context menu on overlay
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// FIX: Prevent drag and drop
document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
});

const inputs = document.querySelectorAll('.input-field');
inputs.forEach(input => {
    input.addEventListener('focus', () => {
        ipcRenderer.send('overlay-focus-input', true);
    });
    input.addEventListener('blur', () => {
        ipcRenderer.send('overlay-focus-input', false);
    });
});