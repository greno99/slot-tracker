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
        this.balanceTracker = new BalanceTracker(this);
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

        switch (key) {
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
            const sessionProfit = this.sessionData.totalWin - this.sessionData.totalBet;
            this.saveSession();

            // Optional: Auto-update balance from session result
            // this.balanceTracker.updateBalanceFromSession(sessionProfit);
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

    getBalanceTracker() {
        return this.balanceTracker;
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
                    this.showNotification(`🎆 BIG WIN! €${winAmount.toFixed(2)} (${(winAmount / lastSpin.bet).toFixed(1)}x)`, 'success', 4000);
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

    // ===== SPIN EDIT & DELETE FUNCTIONALITY =====
    
    toggleEditMode() {
        this.editMode = !this.editMode;
        const btn = document.getElementById('editModeBtn');
        const modeIndicator = document.getElementById('editModeIndicator');
        
        if (this.editMode) {
            btn.textContent = '✅ Edit Mode';
            btn.classList.add('btn-active');
            modeIndicator.style.display = 'block';
            modeIndicator.textContent = '✏️ Edit Mode Active';
            this.showNotification('Edit Mode aktiviert - Klicke auf Spins zum Bearbeiten', 'info');
        } else {
            btn.textContent = '✏️ Edit';
            btn.classList.remove('btn-active');
            modeIndicator.style.display = 'none';
            this.showNotification('Edit Mode deaktiviert', 'info');
        }
        
        // Update the spins display
        this.updateSpinsHistory();
    }
    
    editSpin(spinIndex) {
        if (spinIndex >= this.sessionData.spinsHistory.length) {
            this.showNotification('Spin nicht gefunden!', 'error');
            return;
        }
        
        const spin = this.sessionData.spinsHistory[spinIndex];
        const time = new Date(spin.time).toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Create edit dialog
        const newBet = prompt(
            `Spin bearbeiten (${time}):\n\nNeuer Einsatz:`, 
            spin.bet.toFixed(2)
        );
        
        if (newBet === null) return; // User cancelled
        
        const newWin = prompt(
            `Spin bearbeiten (${time}):\n\nNeuer Gewinn:`, 
            spin.win.toFixed(2)
        );
        
        if (newWin === null) return; // User cancelled
        
        // Validate input
        const betAmount = parseFloat(newBet);
        const winAmount = parseFloat(newWin);
        
        if (isNaN(betAmount) || betAmount < 0) {
            this.showNotification('Ungültiger Einsatz!', 'error');
            return;
        }
        
        if (isNaN(winAmount) || winAmount < 0) {
            this.showNotification('Ungültiger Gewinn!', 'error');
            return;
        }
        
        // Update spin and recalculate totals
        this.updateSpin(spinIndex, betAmount, winAmount);
    }
    
    updateSpin(spinIndex, newBet, newWin) {
        const oldSpin = this.sessionData.spinsHistory[spinIndex];
        
        // Subtract old values from totals
        this.sessionData.totalBet -= oldSpin.bet;
        this.sessionData.totalWin -= oldSpin.win;
        
        // Update the spin
        oldSpin.bet = newBet;
        oldSpin.win = newWin;
        
        // Add new values to totals
        this.sessionData.totalBet += newBet;
        this.sessionData.totalWin += newWin;
        
        // Recalculate best win
        this.recalculateBestWin();
        
        // Update UI and save
        this.updateUI();
        this.saveData();
        
        this.showNotification(`Spin aktualisiert: €${newBet.toFixed(2)} → €${newWin.toFixed(2)}`, 'success');
    }
    
    deleteSpin(spinIndex) {
        if (spinIndex >= this.sessionData.spinsHistory.length) {
            this.showNotification('Spin nicht gefunden!', 'error');
            return;
        }
        
        const spin = this.sessionData.spinsHistory[spinIndex];
        const time = new Date(spin.time).toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const confirmed = confirm(
            `Spin löschen (${time})?\n\nEinsatz: €${spin.bet.toFixed(2)}\nGewinn: €${spin.win.toFixed(2)}\n\nDies kann nicht rückgängig gemacht werden!`
        );
        
        if (!confirmed) return;
        
        // Remove spin from history
        this.sessionData.spinsHistory.splice(spinIndex, 1);
        
        // Update totals
        this.sessionData.spins--;
        this.sessionData.totalBet -= spin.bet;
        this.sessionData.totalWin -= spin.win;
        
        // Recalculate best win
        this.recalculateBestWin();
        
        // Update UI and save
        this.updateUI();
        this.saveData();
        
        this.showNotification(`Spin gelöscht (${time}): €${spin.bet.toFixed(2)} → €${spin.win.toFixed(2)}`, 'success');
    }
    
    recalculateBestWin() {
        this.sessionData.bestWin = 0;
        this.sessionData.spinsHistory.forEach(spin => {
            if (spin.win > this.sessionData.bestWin) {
                this.sessionData.bestWin = spin.win;
            }
        });
    }
}

class BalanceTracker {
    constructor(casinoTracker) {
        this.tracker = casinoTracker;
        this.currentBalance = 100.00; // Startwert
        this.balanceHistory = [];
        this.isBalanceInputActive = false;

        this.initBalanceEventListeners();
        this.loadBalanceData();
    }

    initBalanceEventListeners() {
        // Balance Action Buttons
        document.getElementById('addBalanceBtn').addEventListener('click', () => {
            this.toggleBalanceInput('deposit');
        });

        document.getElementById('withdrawBalanceBtn').addEventListener('click', () => {
            this.toggleBalanceInput('withdraw');
        });

        // Balance Input Actions
        document.getElementById('confirmBalanceBtn').addEventListener('click', () => {
            this.confirmBalanceChange();
        });

        document.getElementById('cancelBalanceBtn').addEventListener('click', () => {
            this.cancelBalanceInput();
        });

        // Balance Input Enter Key
        document.getElementById('balanceInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.confirmBalanceChange();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelBalanceInput();
            }
        });

        // Mouse wheel support for balance input
        document.getElementById('balanceInput').addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const step = 5.00; // €5 steps for balance
            const currentValue = parseFloat(e.target.value) || 0;

            if (e.deltaY < 0) {
                e.target.value = (currentValue + step).toFixed(2);
            } else {
                const newValue = Math.max(0, currentValue - step);
                e.target.value = newValue.toFixed(2);
            }
        });
    }

    toggleBalanceInput(type = 'deposit') {
        const actionsDiv = document.getElementById('balanceActions');
        const typeSelect = document.getElementById('balanceTypeSelect');
        const balanceInput = document.getElementById('balanceInput');

        if (this.isBalanceInputActive) {
            this.cancelBalanceInput();
            return;
        }

        this.isBalanceInputActive = true;
        typeSelect.value = type;
        actionsDiv.style.display = 'block';
        balanceInput.focus();

        // Visual feedback
        document.querySelector('.balance-section').style.borderColor = 'rgba(34, 197, 94, 0.8)';

        this.tracker.showNotification(
            type === 'deposit' ? '💰 Einzahlung eingeben' : '💸 Auszahlung eingeben',
            'info'
        );
    }

    confirmBalanceChange() {
        const balanceInput = document.getElementById('balanceInput');
        const typeSelect = document.getElementById('balanceTypeSelect');
        const noteInput = document.getElementById('balanceNoteInput');

        const amount = parseFloat(balanceInput.value);
        const type = typeSelect.value;
        const note = noteInput.value.trim();

        if (!amount || amount <= 0) {
            this.tracker.showNotification('❌ Bitte gültigen Betrag eingeben!', 'error');
            balanceInput.focus();
            return;
        }

        // Create balance transaction
        const transaction = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: type,
            amount: amount,
            note: note,
            oldBalance: this.currentBalance,
            newBalance: 0 // Will be calculated
        };

        // Calculate new balance
        switch (type) {
            case 'deposit':
            case 'bonus':
            case 'correction':
                transaction.newBalance = this.currentBalance + amount;
                break;
            case 'withdraw':
                transaction.newBalance = Math.max(0, this.currentBalance - amount);
                break;
        }

        // Update balance
        const oldBalance = this.currentBalance;
        this.currentBalance = transaction.newBalance;
        this.balanceHistory.push(transaction);

        // Save data
        this.saveBalanceData();

        // Update UI
        this.updateBalanceDisplay();
        this.showBalanceChange(transaction.newBalance - oldBalance);

        // Show success notification
        const typeEmoji = {
            'deposit': '💰',
            'withdraw': '💸',
            'bonus': '🎁',
            'correction': '🔧'
        };

        const changeAmount = transaction.newBalance - oldBalance;
        this.tracker.showNotification(
            `${typeEmoji[type]} ${this.getTypeLabel(type)}: ${changeAmount >= 0 ? '+' : ''}€${changeAmount.toFixed(2)}`,
            changeAmount >= 0 ? 'success' : 'info'
        );

        // Reset input
        this.cancelBalanceInput();
    }

    cancelBalanceInput() {
        const actionsDiv = document.getElementById('balanceActions');
        const balanceInput = document.getElementById('balanceInput');
        const noteInput = document.getElementById('balanceNoteInput');

        this.isBalanceInputActive = false;
        actionsDiv.style.display = 'none';

        // Reset inputs
        balanceInput.value = '';
        noteInput.value = '';

        // Reset visual feedback
        document.querySelector('.balance-section').style.borderColor = 'rgba(34, 197, 94, 0.4)';

        // Remove focus
        document.activeElement.blur();
    }

    showBalanceChange(change) {
        const changeDiv = document.getElementById('balanceChange');
        const changeText = document.getElementById('balanceChangeText');

        changeText.textContent = `${change >= 0 ? '+' : ''}€${change.toFixed(2)}`;
        changeDiv.className = `balance-change ${change >= 0 ? 'positive' : 'negative'}`;
        changeDiv.style.display = 'block';

        // Auto hide after 3 seconds
        setTimeout(() => {
            changeDiv.style.display = 'none';
        }, 3000);
    }

    updateBalanceDisplay() {
        const balanceDisplay = document.getElementById('currentBalance');
        balanceDisplay.textContent = `€${this.currentBalance.toFixed(2)}`;

        // Color coding based on balance level
        if (this.currentBalance < 10) {
            balanceDisplay.style.color = '#ef4444';
        } else if (this.currentBalance < 50) {
            balanceDisplay.style.color = '#f59e0b';
        } else {
            balanceDisplay.style.color = '#22c55e';
        }
    }

    getTypeLabel(type) {
        const labels = {
            'deposit': 'Einzahlung',
            'withdraw': 'Auszahlung',
            'bonus': 'Bonus erhalten',
            'correction': 'Korrektur'
        };
        return labels[type] || type;
    }

    async loadBalanceData() {
        try {
            const storedBalance = await this.tracker.ipcRenderer.invoke('get-store-data', 'currentBalance');
            const storedHistory = await this.tracker.ipcRenderer.invoke('get-store-data', 'balanceHistory');

            if (storedBalance !== null && storedBalance !== undefined) {
                this.currentBalance = storedBalance;
            }

            if (storedHistory) {
                this.balanceHistory = storedHistory;
            }

            this.updateBalanceDisplay();
            console.log('💰 Balance data loaded:', this.currentBalance);
        } catch (error) {
            console.error('Error loading balance data:', error);
        }
    }

    async saveBalanceData() {
        try {
            await this.tracker.ipcRenderer.invoke('set-store-data', 'currentBalance', this.currentBalance);
            await this.tracker.ipcRenderer.invoke('set-store-data', 'balanceHistory', this.balanceHistory);
            console.log('💾 Balance data saved');
        } catch (error) {
            console.error('Error saving balance data:', error);
        }
    }

    // Get balance statistics for session
    getBalanceStats() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayTransactions = this.balanceHistory.filter(t =>
            new Date(t.timestamp) >= todayStart
        );

        const totalDeposits = todayTransactions
            .filter(t => t.type === 'deposit' || t.type === 'bonus')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalWithdrawals = todayTransactions
            .filter(t => t.type === 'withdraw')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            currentBalance: this.currentBalance,
            todayDeposits: totalDeposits,
            todayWithdrawals: totalWithdrawals,
            todayNet: totalDeposits - totalWithdrawals,
            transactionCount: todayTransactions.length
        };
    }

    // Auto-update balance based on session profit (optional feature)
    updateBalanceFromSession(sessionProfit) {
        if (Math.abs(sessionProfit) > 0.01) { // Only significant changes
            const transaction = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                type: 'session_end',
                amount: Math.abs(sessionProfit),
                note: sessionProfit >= 0 ? 'Session Gewinn' : 'Session Verlust',
                oldBalance: this.currentBalance,
                newBalance: this.currentBalance + sessionProfit
            };

            this.currentBalance = Math.max(0, this.currentBalance + sessionProfit);
            this.balanceHistory.push(transaction);

            this.saveBalanceData();
            this.updateBalanceDisplay();
            this.showBalanceChange(sessionProfit);
        }
    }

    // Export balance data
    getExportData() {
        return {
            currentBalance: this.currentBalance,
            balanceHistory: this.balanceHistory,
            balanceStats: this.getBalanceStats()
        };
    }
}

// Initialize the tracker
const tracker = new ElectronCasinoTracker();

console.log('🎰 Vereinfachter Casino Tracker Overlay gestartet!');