// Vereinfachtes overlay.js - Auto-Detect Funktionalität entfernt

const { ipcRenderer } = require('electron');

class ElectronCasinoTracker {
    constructor() {
        this.isTracking = false;
        this.isPaused = false;
        this.currentGame = null;
        this.sessionStartTime = null;
        this.isMinimized = false;
        this.lastBetAmount = 1.00;
        this.editMode = false;
        
        this.sessionData = {
            spins: 0,
            totalBet: 0,
            totalWin: 0,
            bestWin: 0,
            startTime: null,
            spinsHistory: []
        };
        
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
        this.setupMouseWheelHandlers();
        this.updateCurrentBetDisplay();
    }
    
    initEventListeners() {
        // UI Controls
        document.getElementById('startBtn').addEventListener('click', () => this.startSession());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopSession());
        document.getElementById('minimizeBtn').addEventListener('click', () => this.toggleMinimize());
        
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
        
        // Input Event Listeners
        const gameInput = document.getElementById('gameInput');
        gameInput.addEventListener('keypress', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                this.setCurrentGame();
            }
        });
        
        gameInput.addEventListener('focus', (e) => {
            e.stopPropagation();
            ipcRenderer.send('overlay-focus-input', true);
        });
        
        gameInput.addEventListener('blur', (e) => {
            ipcRenderer.send('overlay-focus-input', false);
        });
        
        const betInput = document.getElementById('betInput');
        betInput.addEventListener('keypress', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addBet();
            }
        });
        
        const winInput = document.getElementById('winInput');
        winInput.addEventListener('keypress', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addWin();
            }
        });

        // Enhanced focus management for all inputs
        const inputs = document.querySelectorAll('.input-field');
        inputs.forEach(input => {
            input.addEventListener('focus', (e) => {
                e.stopPropagation();
                ipcRenderer.send('overlay-focus-input', true);
            });
            input.addEventListener('blur', (e) => {
                ipcRenderer.send('overlay-focus-input', false);
            });
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });
        });
    }
    
    setupMouseWheelHandlers() {
        const betInput = document.getElementById('betInput');
        const winInput = document.getElementById('winInput');
        
        [betInput, winInput].forEach(input => {
            input.addEventListener('wheel', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const step = 0.05; // 5 Cent Schritte für beide
                const currentValue = parseFloat(input.value) || 0;
                
                if (e.deltaY < 0) {
                    // Scroll up - increase value
                    input.value = (currentValue + step).toFixed(2);
                } else {
                    // Scroll down - decrease value
                    const newValue = Math.max(0, currentValue - step);
                    input.value = newValue.toFixed(2);
                }
                
                input.dispatchEvent(new Event('change'));
            });
            
            input.addEventListener('focus', () => {
                this.showNotification('Mausrad verwenden (Schritte: €0.05)', 'info', 2000);
            });
        });
    }
    
    updateCurrentBetDisplay() {
        const currentBetDisplay = document.getElementById('currentBetAmount');
        if (currentBetDisplay) {
            currentBetDisplay.textContent = `€${this.lastBetAmount.toFixed(2)}`;
        }
    }
    
    setupIPC() {
        ipcRenderer.on('hotkey', (event, key) => {
            this.handleHotkey(key);
        });
        
        ipcRenderer.on('screenshot-saved', (event, path) => {
            this.showNotification(`Screenshot gespeichert: ${path}`, 'success');
        });

        ipcRenderer.on('main-window-closed', () => {
            this.closeOverlay();
        });

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
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'INPUT') {
            return; // Nicht störend eingreifen wenn User tippt
        }

        switch(key) {
            case 'F1': // Quick Spin
                if (this.isTracking && !this.isPaused) {
                    this.addQuickSpin();
                }
                break;
            case 'F2': // VEREINFACHT: Fokussiert nur Win Input
                if (this.isTracking && !this.isPaused) {
                    document.getElementById('winInput').focus();
                    this.showNotification('Gewinn eingeben', 'info');
                } else {
                    document.getElementById('winInput').focus();
                }
                break;
            case 'F3': // Set Game
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
            const storedSettings = await ipcRenderer.invoke('get-store-data', 'settings');
            
            if (storedSession) {
                this.sessionData = { ...this.sessionData, ...storedSession };
                this.updateUI();
                
                if (storedSession.spinsHistory && storedSession.spinsHistory.length > 0) {
                    this.lastBetAmount = storedSession.spinsHistory[storedSession.spinsHistory.length - 1].bet;
                }
            }
            
            if (storedGame) {
                this.currentGame = storedGame;
                document.getElementById('currentGame').textContent = storedGame;
            }
            
            if (storedSettings) {
                this.settings = storedSettings;
                this.applySettings();
            }
            
            this.updateCurrentBetDisplay();
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
    
    // Session Management Methods
    startSession() {
        if (this.isTracking) return;
        
        this.isTracking = true;
        this.isPaused = false;
        this.sessionStartTime = Date.now();
        this.sessionData.startTime = this.sessionStartTime;
        
        document.getElementById('statusDot').className = 'status-dot status-active';
        document.getElementById('startBtn').textContent = 'Running';
        document.getElementById('pauseBtn').textContent = 'Pause';
        
        this.showNotification('Session gestartet! 🚀', 'success');
        this.saveData();
    }
    
    togglePause() {
        if (!this.isTracking) return;
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            document.getElementById('statusDot').className = 'status-dot status-paused';
            document.getElementById('pauseBtn').textContent = 'Resume';
            this.showNotification('Session pausiert ⏸️', 'info');
        } else {
            document.getElementById('statusDot').className = 'status-dot status-active';
            document.getElementById('pauseBtn').textContent = 'Pause';
            this.showNotification('Session fortgesetzt ▶️', 'success');
        }
        
        this.saveData();
    }
    
    stopSession() {
        if (!this.isTracking) return;
        
        if (this.sessionData.spins > 0) {
            this.saveSession();
        }
        
        this.resetSession();
        this.showNotification('Session beendet und gespeichert! 💾', 'success');
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
        this.updateCurrentBetDisplay();
        this.saveData();
    }
    
    // Input Methods - VEREINFACHT
    addBet() {
        if (!this.isTracking || this.isPaused) {
            this.showNotification('Session nicht aktiv! ⚠️', 'error');
            return;
        }
        
        const betInput = document.getElementById('betInput');
        let betAmount = parseFloat(betInput.value);
        
        if (!betAmount || betAmount <= 0) {
            betAmount = this.lastBetAmount || this.settings.defaultBet;
        }
        
        if (betAmount > 0) {
            this.lastBetAmount = betAmount;
            this.addSpin(betAmount, 0);
            betInput.value = '';
            this.updateCurrentBetDisplay();
            
            // Fokussiere Win Input für schnelle Eingabe
            betInput.blur();
            setTimeout(() => {
                const winInput = document.getElementById('winInput');
                winInput.focus();
                winInput.select();
            }, 100);
            
            this.showNotification(`Einsatz: €${betAmount.toFixed(2)} - Gewinn eingeben 💰`, 'info', 2000);
        }
    }
    
    addWin() {
        if (!this.isTracking || this.isPaused) {
            this.showNotification('Session nicht aktiv! ⚠️', 'error');
            return;
        }
        
        const winInput = document.getElementById('winInput');
        const winAmount = parseFloat(winInput.value);
        
        if (winAmount >= 0 && this.sessionData.spinsHistory.length > 0) {
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
                
                // Notifications basierend auf Gewinn
                if (winAmount === 0) {
                    this.showNotification('Verlust registriert 😐', 'info');
                } else if (winAmount > lastSpin.bet * 10) {
                    this.showNotification(`🎆 BIG WIN! €${winAmount.toFixed(2)} (${(winAmount/lastSpin.bet).toFixed(1)}x)`, 'success', 4000);
                } else {
                    this.showNotification(`Gewinn: €${winAmount.toFixed(2)} 🎉`, 'success');
                }
                
                winInput.blur();
                document.activeElement.blur();
                
                setTimeout(() => {
                    this.showNotification('Hotkeys aktiv - F1 für nächsten Spin 🎮', 'info', 2000);
                }, 500);
                
            } else {
                this.showNotification('Kein offener Spin für Gewinn vorhanden! ❌', 'error');
            }
        } else if (winAmount < 0) {
            this.showNotification('Gewinn kann nicht negativ sein! ❌', 'error');
        }
    }
    
    addQuickSpin() {
        let betAmount = this.lastBetAmount || this.settings.defaultBet;
        
        if (this.sessionData.spinsHistory.length > 0) {
            betAmount = this.sessionData.spinsHistory[this.sessionData.spinsHistory.length - 1].bet;
        }
        
        this.addSpin(betAmount, 0);
        this.lastBetAmount = betAmount;
        this.updateCurrentBetDisplay();
        this.showNotification(`⚡ Quick Spin: €${betAmount.toFixed(2)}`, 'info');
    }

    setCurrentGame() {
        const gameInput = document.getElementById('gameInput');
        const gameName = gameInput.value.trim();
        
        if (gameName) {
            this.currentGame = gameName;
            document.getElementById('currentGame').textContent = this.currentGame;
            gameInput.value = '';
            gameInput.blur();
            this.showNotification(`🎮 Spiel gewechselt: ${this.currentGame}`, 'success');
            this.saveData();
        } else {
            this.showNotification('Bitte Spielname eingeben! ⚠️', 'error');
            gameInput.focus();
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
    
    // UI Update Methods (Rest bleibt gleich)
    updateUI() {
        // Session Stats
        document.getElementById('spinCount').textContent = this.sessionData.spins;
        document.getElementById('totalBet').textContent = `€${this.sessionData.totalBet.toFixed(2)}`;
        
        // Profit/Loss
        const profit = this.sessionData.totalWin - this.sessionData.totalBet;
        const profitEl = document.getElementById('totalWin');
        profitEl.textContent = `€${profit.toFixed(2)}`;
        profitEl.className = `info-value ${profit >= 0 ? 'profit-positive' : 'profit-negative'}`;
        
        // Best Win
        document.getElementById('bestWin').textContent = `€${this.sessionData.bestWin.toFixed(2)}`;
        
        // RTP
        const rtp = this.sessionData.totalBet > 0 ? 
            (this.sessionData.totalWin / this.sessionData.totalBet * 100) : 0;
        document.getElementById('rtpValue').textContent = `${rtp.toFixed(1)}%`;
        
        // Average Bet
        const avgBet = this.sessionData.spins > 0 ? 
            (this.sessionData.totalBet / this.sessionData.spins) : 0;
        document.getElementById('avgBet').textContent = `€${avgBet.toFixed(2)}`;
        
        // Update spins history
        this.updateSpinsHistory();
        this.updateCurrentBetDisplay();
    }
    
    updateSpinsHistory() {
        const container = document.getElementById('lastSpins');
        container.innerHTML = '';
        
        const maxSpins = this.editMode ? 20 : 10;
        const recentSpins = this.sessionData.spinsHistory.slice(-maxSpins).reverse();
        
        recentSpins.forEach((spin, displayIndex) => {
            const actualIndex = this.sessionData.spinsHistory.length - 1 - displayIndex;
            
            const div = document.createElement('div');
            div.className = 'spin-item' + (this.editMode ? ' edit-mode' : '');
            
            const time = new Date(spin.time).toLocaleTimeString('de-DE', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const multiplier = spin.bet > 0 ? (spin.win / spin.bet) : 0;
            const multiplierClass = multiplier >= 1 ? 'profit-positive' : 'profit-negative';
            
            let spinContent = `
                <span class="spin-time">${time}</span>
                <div class="spin-amounts">
                    <span>€${spin.bet.toFixed(2)}</span>
                    <span class="${multiplierClass}">€${spin.win.toFixed(2)}</span>
                    <span class="${multiplierClass}">${multiplier.toFixed(1)}x</span>
                </div>
            `;
            
            if (this.editMode) {
                spinContent += `
                    <div class="spin-edit-buttons">
                        <button class="spin-edit-btn edit-btn" onclick="tracker.editSpin(${actualIndex})" title="Bearbeiten">✏️</button>
                        <button class="spin-edit-btn delete-btn" onclick="tracker.deleteSpin(${actualIndex})" title="Löschen">🗑️</button>
                    </div>
                `;
            }
            
            div.innerHTML = spinContent;
            container.appendChild(div);
        });
        
        if (this.editMode && recentSpins.length > 0) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'edit-mode-info';
            infoDiv.innerHTML = `<small>✏️ Edit Mode: ${recentSpins.length} Spins • ✏️ Bearbeiten • 🗑️ Löschen</small>`;
            container.appendChild(infoDiv);
        }
    }
    
    // Stats Window Methods
    async showStats() {
        try {
            console.log('Opening stats window from overlay...');
            await ipcRenderer.invoke('open-stats-window');
            this.showNotification('📊 Stats-Fenster geöffnet', 'success');
        } catch (error) {
            console.error('Fehler beim Öffnen des Stats-Fensters:', error);
            this.showNotification(`❌ Stats-Fehler: ${error.message}`, 'error');
        }
    }
    
    // Export Methods
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
                this.showNotification(`💾 Daten exportiert: ${result.path}`, 'success');
            } else if (result.canceled) {
                this.showNotification('Export abgebrochen', 'info');
            } else {
                this.showNotification(`❌ Export-Fehler: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`❌ Export-Fehler: ${error.message}`, 'error');
        }
    }
    
    // Debug Methods
    showDebugInfo() {
        console.log('=== DEBUG INFO ===');
        console.log('Tracking:', this.isTracking);
        console.log('Paused:', this.isPaused);
        console.log('Current Game:', this.currentGame);
        console.log('Last Bet Amount:', this.lastBetAmount);
        console.log('Session Data:', this.sessionData);
        
        this.showNotification('🔍 Debug-Info in Konsole ausgegeben', 'info');
    }
    
    // Session Management Methods
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
    
    applySettings() {
        const betInput = document.getElementById('betInput');
        if (betInput && this.settings.defaultBet) {
            betInput.placeholder = `Standard: €${this.settings.defaultBet.toFixed(2)}`;
            if (this.sessionData.spinsHistory.length === 0) {
                this.lastBetAmount = this.settings.defaultBet;
                this.updateCurrentBetDisplay();
            }
        }
        
        console.log('Settings angewendet:', this.settings);
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
    
    async closeOverlay() {
        try {
            await ipcRenderer.invoke('hide-overlay');
            this.showNotification('Overlay wird geschlossen...', 'info');
        } catch (error) {
            console.error('Fehler beim Schließen des Overlays:', error);
            const { remote } = require('electron');
            if (remote) {
                remote.getCurrentWindow().hide();
            }
        }
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }
}

// Initialize the tracker
const tracker = new ElectronCasinoTracker();

console.log('🎰 Vereinfachter Casino Tracker Overlay gestartet!');