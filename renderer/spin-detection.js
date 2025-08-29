    const { ipcRenderer } = require('electron');

    class SpinDetection {
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
        }

        setupEventListeners() {
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

            // Global mouse tracking
            document.addEventListener('mousemove', (e) => this.onMouseMove(e));
            document.addEventListener('click', (e) => this.onMouseClick(e));
        }

        startSetup() {
            this.isSetupMode = true;
            this.currentSetupTarget = 'spinButton';
            document.getElementById('startSetupBtn').style.display = 'none';
            document.getElementById('stopSetupBtn').style.display = 'inline-block';
            document.getElementById('coordinates').style.display = 'block';

            this.log('Setup-Modus gestartet. Klicke auf den Spin-Button in deinem Casino!');

            // Request global mouse tracking
            ipcRenderer.invoke('start-global-mouse-tracking');
        }

        stopSetup() {
            this.isSetupMode = false;
            this.currentSetupTarget = null;
            document.getElementById('startSetupBtn').style.display = 'inline-block';
            document.getElementById('stopSetupBtn').style.display = 'none';

            this.log('Setup-Modus beendet.');
            ipcRenderer.invoke('stop-global-mouse-tracking');
        }

        startAreaSetup(area) {
            this.isSetupMode = true;
            this.currentSetupTarget = area;

            const areaNames = {
                bet: 'Einsatz-Bereich',
                win: 'Gewinn-Bereich',
                balance: 'Guthaben-Bereich'
            };

            this.log(`${areaNames[area]} Setup: Klicke und ziehe um den Bereich zu markieren`);
            ipcRenderer.invoke('start-area-selection', area);
        }

        onMouseMove(e) {
            if (this.isSetupMode) {
                document.getElementById('mousePos').textContent = `${e.screenX}, ${e.screenY}`;
            }
        }
        onMouseClick(e) {
            if (this.isSetupMode && this.currentSetupTarget === 'spinButton') {
                this.spinButtonPos = { x: e.screenX, y: e.screenY };
                document.getElementById('spinBtnPos').textContent = `${e.screenX}, ${e.screenY}`;
                this.log(`Spin-Button Position gesetzt: ${e.screenX}, ${e.screenY}`);
                this.saveConfiguration();
            }
        }

        async testDetection() {
            if (!this.spinButtonPos) {
                this.log('❌ Spin-Button Position noch nicht definiert!');
                return;
            }
            this.log('🧪 Teste Erkennung...');

            try {
                const result = await ipcRenderer.invoke('test-spin-detection', {
                    spinButton: this.spinButtonPos,
                    areas: this.areas
                });

                if (result.success) {
                    this.log(`✅ Test erfolgreich!`);
                    this.log(`📊 Erkannte Werte: Einsatz: €${result.bet}, Gewinn: €${result.win}, Guthaben: €${result.balance}`);
                } else {
                    this.log(`❌ Test fehlgeschlagen: ${result.error}`);
                }

            } catch (error) {
                this.log(`❌ Fehler beim Test: ${error.message}`);
            }
        }

        async takeScreenshot() {
            try {
                const result = await ipcRenderer.invoke('take-detection-screenshot');
                if (result.success) {
                    this.log(`📸 Screenshot gespeichert: ${result.path}`);
                    // Show preview if possible\n                        
                    const preview = document.getElementById('preview');
                    preview.innerHTML = `<img src="file://${result.path}" style="max-width: 100%; max-height: 200px;">`;
                }
            } catch (error) {
                this.log(`❌ Screenshot-Fehler: ${error.message}`);
            }
        }

        startDetection() {
            if (!this.spinButtonPos) {
                this.log('❌ Spin-Button Position noch nicht konfiguriert!');
                return;
                this.isDetectionActive = true;
                document.getElementById('detectionStatus').textContent = 'Aktiv';
                document.getElementById('detectionStatus').className = 'status status-active';
                this.log('🚀 Automatische Spin-Erkennung gestartet!');

                // Start monitoring                
                ipcRenderer.invoke('start-spin-detection', {
                    spinButton: this.spinButtonPos,
                    areas: this.areas
                });
            }
        }

        stopDetection() {
            this.isDetectionActive = false;
            document.getElementById('detectionStatus').textContent = 'Inaktiv';
            document.getElementById('detectionStatus').className = 'status status-inactive';
            this.log('⏹️ Automatische Spin-Erkennung gestoppt.');
            ipcRenderer.invoke('stop-spin-detection');

        }

        log(message) {
            const logDiv = document.getElementById('detectionLog'); const time = new Date().toLocaleTimeString('de-DE');
            const logEntry = document.createElement('div');
            logEntry.innerHTML = `<span style="color: #9ca3af;">${time}</span> ${message}`;
            logDiv.appendChild(logEntry);
            logDiv.scrollTop = logDiv.scrollHeight;
        }

        async saveConfiguration() {
            const config = {
                spinButton: this.spinButtonPos,
                areas: this.areas,
                version: '1.0'
            };
            try {
                await ipcRenderer.invoke('save-detection-config', config);
                this.log('💾 Konfiguration gespeichert.');
            } catch (error) {
                this.log(`❌ Fehler beim Speichern: ${error.message}`);

            }
        }

        async loadConfiguration() {
            try {
                const config = await ipcRenderer.invoke('load-detection-config');
                if (config) {
                    this.spinButtonPos = config.spinButton;
                    this.areas = config.areas || this.areas;

                    // Update UI

                    if (this.spinButtonPos) {
                        document.getElementById('spinBtnPos').textContent = `${this.spinButtonPos.x}, ${this.spinButtonPos.y}`;
                        document.getElementById('coordinates').style.display = 'block';
                    } this.log('📂 Konfiguration geladen.');
                }
            } catch (error) {
                this.log(`❌ Fehler beim Laden: ${error.message}`);
            }
        }
    }
    // Listen for detection results\n        
    ipcRenderer.on('spin-detected', (event, data) => {
        const detection = window.spinDetection;
        if (detection) {
            detection.log(`🎰 Spin erkannt! Einsatz: €${data.bet}, Gewinn: €${data.win}`);

            // Send to overlay for processing\n                
            ipcRenderer.invoke('process-detected-spin', data);
        }
    });

    // Initialize\n       
    window.spinDetection = new SpinDetection();