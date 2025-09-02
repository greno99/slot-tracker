const { ipcRenderer } = require('electron');

class ElectronCasinoTracker {
    constructor() {
        this.isTracking = false;
        this.isPaused = false;
        this.currentGame = null;
        this.sessionStartTime = null;
        this.isMinimized = false;
        this.lastBetAmount = 1.00; // Track last bet amount
        this.autoDetectActive = false; // For auto-detect functionality
        this.editMode = false; // NEW: Edit mode for spins
        
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
        this.updateCurrentBetDisplay(); // NEW: Show current bet
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
        document.getElementById('spinDetectionBtn').addEventListener('click', () => this.openSpinDetection());
        
        // NEW: Auto-detect button
        document.getElementById('autoDetectBtn').addEventListener('click', () => this.toggleAutoDetect());
        
        // IMPROVED: Better input handlers with focus management
        const gameInput = document.getElementById('gameInput');
        gameInput.addEventListener('keypress', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                this.setCurrentGame();
            }
        });
        
        // IMPROVED: Make sure game input can receive focus
        gameInput.addEventListener('focus', (e) => {
            e.stopPropagation();
            // Temporarily disable mouse events to allow typing
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
        
        // REMOVED: No longer update current bet display on input change
        // This was confusing UX - the display should show the actual last bet, not what's being typed
        
        const winInput = document.getElementById('winInput');
        winInput.addEventListener('keypress', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addWin();
            }
        });

        // IMPROVED: Enhanced focus management for all inputs
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
                
                const step = input === betInput ? 0.05 : 0.05; // Different steps for bet vs win
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
                const stepText = input === betInput ? '€0.05' : '€0.05';
                this.showNotification(`Mausrad verwenden (Schritte: ${stepText})`, 'info');
            });
        });
    }
    
    // FIXED: Update display of current bet amount - only show actual last bet
    updateCurrentBetDisplay() {
        const currentBetDisplay = document.getElementById('currentBetAmount');
        
        if (currentBetDisplay) {
            currentBetDisplay.textContent = `€${this.lastBetAmount.toFixed(2)}`;
        }
    }
    
    // NEW: Toggle auto-detect functionality
    toggleAutoDetect() {
        this.autoDetectActive = !this.autoDetectActive;
        const btn = document.getElementById('autoDetectBtn');
        const indicator = document.getElementById('autoDetectIndicator');
        
        if (this.autoDetectActive) {
            btn.textContent = 'Auto: ON';
            btn.classList.add('btn-active');
            indicator.classList.add('status-active');
            this.showNotification('Auto-Detect aktiviert - F2 für schnelle Gewinn-Eingabe', 'success');
        } else {
            btn.textContent = 'Auto: OFF';
            btn.classList.remove('btn-active');
            indicator.classList.remove('status-active');
            this.showNotification('Auto-Detect deaktiviert', 'info');
        }
    }
    
    // NEW: Smart auto-detect for wins
    smartAutoDetect() {
        if (!this.autoDetectActive || !this.isTracking || this.isPaused) {
            return;
        }
        
        // Simple auto-detection logic
        // This could be enhanced with screen reading or pattern recognition
        const winInput = document.getElementById('winInput');
        
        // For now, we'll use a simple prompt-based approach
        const detectedWin = this.getLastPossibleWin();
        
        if (detectedWin > 0) {
            winInput.value = detectedWin.toFixed(2);
            this.showNotification(`Gewinn erkannt: €${detectedWin.toFixed(2)}`, 'success');
            // Auto-submit after 2 seconds if user doesn't change it
            setTimeout(() => {
                if (winInput.value === detectedWin.toFixed(2)) {
                    this.addWin();
                }
            }, 2000);
        } else {
            // Focus the win input for manual entry
            winInput.focus();
            this.showNotification('Gewinn eingeben (oder 0 für Verlust)', 'info');
        }
    }
    
    // NEW: Simple heuristic to detect possible win amounts
    getLastPossibleWin() {
        // This is a placeholder for more sophisticated detection
        // Could integrate with screen reading, OCR, or browser automation
        
        const recentSpins = this.sessionData.spinsHistory.slice(-5);
        if (recentSpins.length === 0) return 0;
        
        const lastBet = recentSpins[recentSpins.length - 1]?.bet || this.lastBetAmount;
        
        // Simple pattern detection based on common multipliers
        const commonMultipliers = [0, 0.5, 1, 1.5, 2, 2.5, 3, 5, 10, 20, 50, 100];
        
        // For demo purposes, return 0 (user needs to input manually)
        // In a real implementation, this would analyze screen content
        return 0;
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
        
        // NEW: Handle auto-detected spins
        ipcRenderer.on('auto-detected-spin', (event, spinData) => {
            this.handleAutoDetectedSpin(spinData);
        });
    }
    
    handleHotkey(key) {
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
            case 'F2': // IMPROVED: Smart Win Detection
                if (this.isTracking && !this.isPaused) {
                    this.smartAutoDetect();
                } else {
                    document.getElementById('winInput').focus();
                }
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
            const storedSettings = await ipcRenderer.invoke('get-store-data', 'settings');
            
            if (storedSession) {
                this.sessionData = { ...this.sessionData, ...storedSession };
                this.updateUI();
                
                // NEW: Restore last bet amount
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
        this.updateCurrentBetDisplay();
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
    
    applySettings() {
        const betInput = document.getElementById('betInput');
        if (betInput && this.settings.defaultBet) {
            betInput.placeholder = `Standard: €${this.settings.defaultBet.toFixed(2)}`;
            // Only update lastBetAmount from settings if no session data exists
            if (this.sessionData.spinsHistory.length === 0) {
                this.lastBetAmount = this.settings.defaultBet;
                this.updateCurrentBetDisplay();
            }
        }
        
        console.log('Settings angewendet:', this.settings);
    }
    
    addBet() {
        if (!this.isTracking || this.isPaused) {
            this.showNotification('Session nicht aktiv!', 'error');
            return;
        }
        
        const betInput = document.getElementById('betInput');
        let betAmount = parseFloat(betInput.value);
        
        if (!betAmount || betAmount <= 0) {
            betAmount = this.lastBetAmount || this.settings.defaultBet;
        }
        
        if (betAmount > 0) {
            this.lastBetAmount = betAmount; // Remember last bet
            this.addSpin(betAmount, 0);
            betInput.value = '';
            this.updateCurrentBetDisplay(); // Update display with new last bet
            
            // IMPROVED: Focus win input after adding bet, but make it work better
            betInput.blur(); // Remove focus from bet input first
            
            setTimeout(() => {
                const winInput = document.getElementById('winInput');
                winInput.focus();
                // Select all text in win input for easy overwriting
                winInput.select();
            }, 100);
            
            this.showNotification(`Einsatz: €${betAmount.toFixed(2)} - Gewinn eingeben`, 'info', 2000);
        }
    }
    
    // IMPROVED: Better win addition with validation and focus management
    addWin() {
        if (!this.isTracking || this.isPaused) {
            this.showNotification('Session nicht aktiv!', 'error');
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
                
                // Show appropriate notification
                if (winAmount === 0) {
                    this.showNotification('Verlust registriert', 'info');
                } else if (winAmount > lastSpin.bet * 10) {
                    this.showNotification(`Big Win! €${winAmount.toFixed(2)} (${(winAmount/lastSpin.bet).toFixed(1)}x)`, 'success');
                } else {
                    this.showNotification(`Gewinn: €${winAmount.toFixed(2)}`, 'success');
                }
                
                // FIXED: Don't auto-focus bet input, keep hotkeys available
                // Instead, blur the win input to make hotkeys work immediately
                winInput.blur();
                
                // Ensure hotkeys are immediately available by removing any focus
                document.activeElement.blur();
                
                // Brief visual feedback to show the win was registered
                setTimeout(() => {
                    // Only focus bet input if user presses F1 within 3 seconds
                    this.showNotification('Hotkeys aktiv - F1 für nächsten Spin oder Bet-Feld anklicken', 'info', 2000);
                }, 500);
                
            } else {
                this.showNotification('Kein offener Spin für Gewinn vorhanden!', 'error');
            }
        } else if (winAmount < 0) {
            this.showNotification('Gewinn kann nicht negativ sein!', 'error');
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
        this.showNotification(`Quick Spin: €${betAmount.toFixed(2)}`, 'info');
    }

    // IMPROVED: Better game setting with validation
    setCurrentGame() {
        const gameInput = document.getElementById('gameInput');
        const gameName = gameInput.value.trim();
        
        if (gameName) {
            this.currentGame = gameName;
            document.getElementById('currentGame').textContent = this.currentGame;
            gameInput.value = '';
            gameInput.blur(); // Remove focus after setting
            this.showNotification(`Spiel gewechselt: ${this.currentGame}`, 'success');
            this.saveData();
        } else {
            this.showNotification('Bitte Spielname eingeben!', 'error');
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
    
    updateUI() {
        // Session Stats
        document.getElementById('spinCount').textContent = this.sessionData.spins;
        document.getElementById('totalBet').textContent = `€${this.sessionData.totalBet.toFixed(2)}`;
        
        // Profit/Loss (corrected to show actual profit)
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
        
        // Update current bet display (but don't change lastBetAmount here)
        this.updateCurrentBetDisplay();
    }
    
    updateSpinsHistory() {
        this.updateSpinsHistoryWithEdit();
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
            // Open the new stats window
            await ipcRenderer.invoke('open-stats-window');
            this.showNotification('Stats-Fenster geöffnet', 'info');
        } catch (error) {
            console.error('Fehler beim Öffnen des Stats-Fensters:', error);
            this.showNotification(`Stats-Fehler: ${error.message}`, 'error');
        }
    }
    
    // NEW: Open Spin Detection window
    async openSpinDetection() {
        try {
            await ipcRenderer.invoke('open-spin-detection');
            this.showNotification('Spin Detection Setup geöffnet 🎯', 'info');
        } catch (error) {
            console.error('Fehler beim Öffnen der Spin Detection:', error);
            this.showNotification(`Detection-Fehler: ${error.message}`, 'error');
        }
    }
    
    // NEW: Handle automatically detected spins
    handleAutoDetectedSpin(spinData) {
        if (!this.isTracking || this.isPaused) {
            this.showNotification('🚨 Spin erkannt, aber Session nicht aktiv!', 'error');
            return;
        }
        
        const betAmount = parseFloat(spinData.bet) || 0;
        const winAmount = parseFloat(spinData.win) || 0;
        
        if (betAmount > 0) {
            // Add the spin with both bet and win
            this.addSpin(betAmount, winAmount);
            
            // Update last bet amount
            this.lastBetAmount = betAmount;
            this.updateCurrentBetDisplay();
            
            // Show notification
            if (winAmount > betAmount * 10) {
                this.showNotification(`🎆 AUTO BIG WIN! €${winAmount.toFixed(2)} (${(winAmount/betAmount).toFixed(1)}x)`, 'success');
            } else if (winAmount > 0) {
                this.showNotification(`🤖 AUTO Spin: Bet €${betAmount.toFixed(2)}, Win €${winAmount.toFixed(2)}`, 'success');
            } else {
                this.showNotification(`🤖 AUTO Spin: Bet €${betAmount.toFixed(2)}, Verlust`, 'info');
            }
            
            // Auto-save
            this.saveData();
        } else {
            this.showNotification('Ungültiger Auto-Spin erkannt', 'error');
        }
    }
    
    
    // ===== SPIN EDIT & DELETE FUNCTIONALITY =====
    
    toggleEditMode() {
        this.editMode = !this.editMode;
        const btn = document.getElementById('editModeBtn');
        const modeIndicator = document.getElementById('editModeIndicator');
        
        if (this.editMode) {
            btn.textContent = '✅ Edit Mode';
            btn.classList.add('btn-active');
            if (modeIndicator) {
                modeIndicator.style.display = 'block';
                modeIndicator.textContent = '✏️ Edit Mode Active';
            }
            this.showNotification('Edit Mode aktiviert - Klicke auf Spins zum Bearbeiten', 'info');
        } else {
            btn.textContent = '✏️ Edit Spins';
            btn.classList.remove('btn-active');
            if (modeIndicator) {
                modeIndicator.style.display = 'none';
            }
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
    
    // Enhanced version of updateSpinsHistory with edit buttons
    updateSpinsHistoryWithEdit() {
        const container = document.getElementById('lastSpins');
        container.innerHTML = '';
        
        // Show more spins when in edit mode
        const maxSpins = this.editMode ? 20 : 10;
        const recentSpins = this.sessionData.spinsHistory.slice(-maxSpins).reverse();
        
        recentSpins.forEach((spin, displayIndex) => {
            // Calculate actual index in the array (since we reversed it)
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
            
            // Add edit buttons if in edit mode
            if (this.editMode) {
                spinContent += `
                    <div class="spin-edit-buttons">
                        <button class="spin-edit-btn edit-btn" onclick="tracker.editSpin(${actualIndex})" title="Bearbeiten">
                            ✏️
                        </button>
                        <button class="spin-edit-btn delete-btn" onclick="tracker.deleteSpin(${actualIndex})" title="Löschen">
                            🗑️
                        </button>
                    </div>
                `;
            }
            
            div.innerHTML = spinContent;
            container.appendChild(div);
        });
        
        // Add edit mode info if active
        if (this.editMode && recentSpins.length > 0) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'edit-mode-info';
            infoDiv.innerHTML = `
                <small>✏️ Edit Mode: Zeige ${recentSpins.length} Spins • Klicke ✏️ zum Bearbeiten oder 🗑️ zum Löschen</small>
            `;
            container.appendChild(infoDiv);
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
        console.log('Last Bet Amount:', this.lastBetAmount);
        console.log('Auto Detect Active:', this.autoDetectActive);
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

console.log('Casino Tracker Overlay gestartet!');

// Prevent context menu on overlay
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Prevent drag and drop
document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
});

// Enhanced input focus management
const inputs = document.querySelectorAll('.input-field');
inputs.forEach(input => {
    input.addEventListener('focus', () => {
        ipcRenderer.send('overlay-focus-input', true);
    });
    input.addEventListener('blur', () => {
        ipcRenderer.send('overlay-focus-input', false);
    });
});

// ===== BETTER F1 FIX (Non-Intrusive) =====
// Only fixes F1 issue without interfering with normal typing

function setupBetterF1Fix() {
    console.log('🎯 Setting up better F1 fix (non-intrusive)...');
    
    // Global F1 handler that works even when input is focused
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('⚡ F1 pressed - executing quick spin');
            
            // Only blur if F1 is pressed, don't auto-blur during typing
            const focusedElement = document.activeElement;
            if (focusedElement && focusedElement.tagName === 'INPUT') {
                focusedElement.blur();
                console.log('🚀 F1: Released input focus for quick spin');
            }
            
            // Execute F1 action
            if (typeof tracker !== 'undefined' && tracker.isTracking && !tracker.isPaused) {
                tracker.addQuickSpin();
                console.log('✅ F1 Quick Spin executed');
            }
            
            return false;
        }
    }, true);
    
    // Only auto-blur on Enter key (when user is done typing)
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                setTimeout(() => {
                    input.blur();
                    console.log('✅ Auto-blur after Enter in', input.id || 'input');
                }, 100);
            }
        });
    });
    
    console.log('✅ Better F1 fix activated - no more typing interruptions!');
}

// Activate when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupBetterF1Fix);
} else {
    setupBetterF1Fix();
}
