const { ipcRenderer } = require('electron');

class FixedSpinDetection {
    constructor() {
        this.isSetupMode = false;
        this.isDetectionActive = false;
        this.spinButtonPos = null;
        this.areas = {
            bet: null,
            win: null,
            balance: null
        };
        this.currentSetupTarget = null;

        this.setupEventListeners();
        this.loadConfiguration();
        this.setupIPCListeners();

        this.log('🚀 FIXED Detection System gestartet', 'success');
    }

    setupEventListeners() {
        // Button handlers
        document.getElementById('startSetupBtn').addEventListener('click', () => this.startSetup());
        document.getElementById('stopSetupBtn').addEventListener('click', () => this.stopSetup());
        document.getElementById('setBetAreaBtn').addEventListener('click', () => this.startAreaSetup('bet'));
        document.getElementById('setWinAreaBtn').addEventListener('click', () => this.startAreaSetup('win'));
        document.getElementById('setBalanceAreaBtn').addEventListener('click', () => this.startAreaSetup('balance'));
        document.getElementById('testDetectionBtn').addEventListener('click', () => this.testDetection());
        document.getElementById('takeScreenshotBtn').addEventListener('click', () => this.takeScreenshot());
        document.getElementById('startDetectionBtn').addEventListener('click', () => this.startDetection());
        document.getElementById('stopDetectionBtn').addEventListener('click', () => this.stopDetection());
        document.getElementById('closeBtn').addEventListener('click', () => window.close());

        // Mouse tracking for setup mode
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('click', (e) => this.onMouseClick(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F1') this.startSetup();
            if (e.key === 'F2') this.testDetection();
            if (e.key === 'F3') this.startDetection();
            if (e.key === 'Escape') this.stopSetup();
        });
    }

    setupIPCListeners() {
        // Area configuration updates
        ipcRenderer.on('area-configured', (event, areaType, coordinates) => {
            this.areas[areaType] = coordinates;
            this.updateAreaDisplay(areaType, coordinates);
            this.saveConfiguration();
        });

        // FIXED: Enhanced spin detection listener
        ipcRenderer.on('spin-detected', (event, data) => {
            this.log(`🎰 SPIN DETECTED BY ENGINE!`, 'success');
            this.log(`💰 Bet: €${data.bet} | 🎯 Win: €${data.win} | 💳 Balance: €${data.balance}`, 'success');

            if (parseFloat(data.win) > parseFloat(data.bet) * 5) {
                this.log(`🎆 BIG WIN! ${(parseFloat(data.win) / parseFloat(data.bet)).toFixed(1)}x multiplier!`, 'success');
            }

            // Show in preview
            this.showSpinResult(data);
        });
    }

    showSpinResult(data) {
        const preview = document.getElementById('preview');
        preview.innerHTML = `
            <div class="success-box">
                <h4 style="color: #10b981; margin-bottom: 15px;">🎰 LIVE SPIN DETECTED!</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 1.5em;">💰</div>
                        <div style="font-size: 1.2em; font-weight: bold;">€${parseFloat(data.bet).toFixed(2)}</div>
                        <div style="font-size: 0.8em; opacity: 0.8;">Einsatz</div>
                    </div>
                    <div>
                        <div style="font-size: 1.5em;">🎯</div>
                        <div style="font-size: 1.2em; font-weight: bold; color: ${parseFloat(data.win) > 0 ? '#10b981' : '#ef4444'};">€${parseFloat(data.win).toFixed(2)}</div>
                        <div style="font-size: 0.8em; opacity: 0.8;">Gewinn</div>
                    </div>
                    <div>
                        <div style="font-size: 1.5em;">💳</div>
                        <div style="font-size: 1.2em; font-weight: bold;">€${parseFloat(data.balance).toFixed(2)}</div>
                        <div style="font-size: 0.8em; opacity: 0.8;">Guthaben</div>
                    </div>
                </div>
                <div style="margin-top: 15px; font-size: 0.9em; opacity: 0.8; text-align: center;">
                    ⚡ Automatisch an Overlay gesendet!
                </div>
            </div>
        `;
    }

    updateAreaDisplay(areaType, coordinates) {
        const areaNames = {
            bet: '💰 Einsatz-Bereich',
            win: '🎯 Gewinn-Bereich',
            balance: '💳 Guthaben-Bereich'
        };

        document.getElementById('areas').style.display = 'block';

        const displayText = `${coordinates.x}, ${coordinates.y} (${coordinates.width}×${coordinates.height}px)`;
        const elementId = areaType + 'Area';
        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = displayText;
            element.classList.add('configured');
        }

        this.log(`✅ ${areaNames[areaType]} konfiguriert: ${displayText}`, 'success');
    }

    startSetup() {
        this.isSetupMode = true;
        this.currentSetupTarget = 'spinButton';

        document.getElementById('startSetupBtn').style.display = 'none';
        document.getElementById('stopSetupBtn').style.display = 'inline-block';
        document.getElementById('coordinates').style.display = 'block';

        this.log('🖱️ GLOBALES Mouse-Tracking aktiviert - Systemweite Erkennung!', 'info');
        this.log('🎯 Klicke auf deinen Casino Spin-Button...', 'info');

        ipcRenderer.invoke('start-global-mouse-tracking');
    }

    stopSetup() {
        this.isSetupMode = false;
        this.currentSetupTarget = null;

        document.getElementById('startSetupBtn').style.display = 'inline-block';
        document.getElementById('stopSetupBtn').style.display = 'none';

        this.log('⏹️ Mouse-Tracking gestoppt', 'info');
        ipcRenderer.invoke('stop-global-mouse-tracking');
    }

    startAreaSetup(area) {
        const areaNames = {
            bet: '💰 Einsatz-Bereich',
            win: '🎯 Gewinn-Bereich',
            balance: '💳 Guthaben-Bereich'
        };

        this.log(`${areaNames[area]} Setup: Vollbild-Overlay wird gestartet...`, 'info');
        ipcRenderer.invoke('start-area-selection', area);
    }

    onMouseMove(e) {
        if (this.isSetupMode) {
            document.getElementById('mousePos').textContent = `Screen: ${e.screenX}, ${e.screenY}`;
        }
    }

    onMouseClick(e) {
        if (this.isSetupMode && this.currentSetupTarget === 'spinButton') {
            this.spinButtonPos = { x: e.screenX, y: e.screenY };
            document.getElementById('spinBtnPos').textContent = `${e.screenX}, ${e.screenY}`;
            this.log(`🎯 Spin-Button Position gesetzt: ${e.screenX}, ${e.screenY}`, 'success');

            this.saveConfiguration();
        }
    }

    async testDetection() {
        if (!this.spinButtonPos) {
            this.log('❌ Bitte zuerst Spin-Button Position setzen!', 'error');
            return;
        }

        this.log('🧪 Starte FUNKTIONSFÄHIGEN OCR-Test...', 'info');

        try {
            const result = await ipcRenderer.invoke('test-spin-detection', {
                spinButton: this.spinButtonPos,
                areas: this.areas
            });

            if (result.success) {
                this.log(`✅ OCR-Test erfolgreich - ECHTE WERTE!`, 'success');

                const preview = document.getElementById('preview');
                preview.innerHTML = `
                    <div class="success-box">
                        <h4 style="color: #10b981; margin-bottom: 15px;">🎯 OCR-Test Erfolgreich!</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div style="text-align: center;">
                                <div style="font-size: 1.5em; color: #fbbf24; margin-bottom: 5px;">💰</div>
                                <div style="font-size: 1.3em; font-weight: bold; color: #fbbf24;">€${result.bet}</div>
                                <div style="font-size: 0.9em; opacity: 0.8;">Einsatz erkannt</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 1.5em; color: #10b981; margin-bottom: 5px;">🎯</div>
                                <div style="font-size: 1.3em; font-weight: bold; color: #10b981;">€${result.win}</div>
                                <div style="font-size: 0.9em; opacity: 0.8;">Gewinn erkannt</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 1.5em; color: #3b82f6; margin-bottom: 5px;">💳</div>
                                <div style="font-size: 1.3em; font-weight: bold; color: #3b82f6;">€${result.balance}</div>
                                <div style="font-size: 0.9em; opacity: 0.8;">Guthaben erkannt</div>
                            </div>
                        </div>
                        <div style="font-size: 0.9em; color: #9ca3af; text-align: center; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px;">
                            📋 ${result.message}
                        </div>
                        <div style="margin-top: 10px; text-align: center; font-size: 0.8em; color: #00ff41;">
                            ✅ FIXED: Keine 0.00 Werte mehr!
                        </div>
                    </div>
                `;

                this.log(`📊 Erkannte Werte: Bet=€${result.bet}, Win=€${result.win}, Balance=€${result.balance}`, 'success');
            } else {
                this.log(`❌ Test fehlgeschlagen: ${result.error}`, 'error');

                document.getElementById('preview').innerHTML = `
                    <div class="error-box">
                        <h4 style="color: #ef4444;">❌ Test-Fehler</h4>
                        <p style="color: #ef4444;">${result.error}</p>
                    </div>
                `;
            }
        } catch (error) {
            this.log(`❌ Test-Fehler: ${error.message}`, 'error');
        }
    }

    async takeScreenshot() {
        try {
            this.log('📸 Erstelle Debug-Screenshot...', 'info');
            const result = await ipcRenderer.invoke('take-detection-screenshot');

            if (result.success) {
                this.log(`✅ Debug-Screenshot erstellt: ${result.path}`, 'success');

                const preview = document.getElementById('preview');
                preview.innerHTML = `
                    <div style="text-align: center;">
                        <img src="file://${result.path}" style="max-width: 100%; max-height: 250px; border-radius: 8px; border: 2px solid #00ff41;">
                        <p style="margin-top: 15px; font-size: 0.9em; color: #9ca3af;">📸 Debug-Screenshot für Analyse gespeichert</p>
                        <p style="font-size: 0.8em; color: #00d4ff; margin-top: 5px;">${result.path}</p>
                    </div>
                `;
            }
        } catch (error) {
            this.log(`❌ Screenshot-Fehler: ${error.message}`, 'error');
        }
    }

    async startDetection() {
        if (!this.spinButtonPos) {
            this.log('❌ Bitte zuerst Spin-Button kalibrieren!', 'error');
            return;
        }

        this.log('🚀 Starte FIXED Detection Engine...', 'success');
        this.log('⚡ Globale Mauserkennung wird aktiviert...', 'info');

        try {
            const result = await ipcRenderer.invoke('start-spin-detection', {
                spinButton: this.spinButtonPos,
                areas: this.areas
            });

            if (result.success) {
                this.isDetectionActive = true;
                document.getElementById('detectionStatus').textContent = 'LIVE & AKTIV';
                document.getElementById('detectionStatus').className = 'status status-active';

                this.log('✅ FIXED Detection Engine ist LIVE!', 'success');
                this.log('🎰 Führe Spins in deinem Casino aus - Erkennung läuft!', 'success');
                this.log('🔧 FIX: Keine JavaScript-Errors mehr!', 'success');
            } else {
                this.log(`❌ Engine-Start fehlgeschlagen: ${result.error}`, 'error');
            }
        } catch (error) {
            this.log(`❌ Unerwarteter Fehler: ${error.message}`, 'error');
        }
    }

    stopDetection() {
        this.log('⏹️ Stoppe Detection Engine...', 'info');

        this.isDetectionActive = false;
        document.getElementById('detectionStatus').textContent = 'Gestoppt';
        document.getElementById('detectionStatus').className = 'status status-inactive';

        ipcRenderer.invoke('stop-spin-detection');
        this.log('✅ Detection Engine gestoppt', 'success');
    }

    log(message, type = 'info') {
        const logContainer = document.getElementById('detectionLog');
        const time = new Date().toLocaleTimeString('de-DE');
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';

        let color = '#ffffff';
        let prefix = '[Info]';
        if (type === 'success') { color = '#10b981'; prefix = '[✅]'; }
        else if (type === 'error') { color = '#ef4444'; prefix = '[❌]'; }
        else if (type === 'warning') { color = '#fbbf24'; prefix = '[⚠️]'; }
        else if (type === 'info') { color = '#3b82f6'; prefix = '[ℹ️]'; }

        logEntry.innerHTML = `
            <span style="color: #9ca3af;">${time}</span> 
            <span style="color: ${color}; font-weight: 600;">${prefix}</span> 
            <span style="color: ${color};">${message}</span>
        `;

        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;

        // Keep last 100 entries
        const entries = logContainer.children;
        if (entries.length > 100) {
            logContainer.removeChild(entries[0]);
        }
    }

    async saveConfiguration() {
        const config = {
            spinButton: this.spinButtonPos,
            areas: this.areas,
            version: '2.1-FIXED',
            timestamp: Date.now()
        };

        try {
            await ipcRenderer.invoke('save-detection-config', config);
            console.log('FIXED Configuration saved:', config);
        } catch (error) {
            this.log(`❌ Speicher-Fehler: ${error.message}`, 'error');
        }
    }

    async loadConfiguration() {
        try {
            const config = await ipcRenderer.invoke('load-detection-config');
            if (config) {
                this.spinButtonPos = config.spinButton;
                this.areas = config.areas || {};

                if (this.spinButtonPos) {
                    document.getElementById('spinBtnPos').textContent =
                        `${this.spinButtonPos.x}, ${this.spinButtonPos.y}`;
                    document.getElementById('coordinates').style.display = 'block';
                }

                Object.keys(this.areas).forEach(areaType => {
                    if (this.areas[areaType]) {
                        this.updateAreaDisplay(areaType, this.areas[areaType]);
                    }
                });

                this.log('📂 Konfiguration wiederhergestellt', 'success');
            } else {
                this.log('ℹ️ Neue Konfiguration - Bereit für Setup', 'info');
            }
        } catch (error) {
            this.log(`❌ Ladefehler: ${error.message}`, 'error');
        }
    }
}

// Initialize FIXED detection system
window.spinDetection = new FixedSpinDetection();