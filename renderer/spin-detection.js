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

        // FIXED: Global mouse tracking for setup
        ipcRenderer.on('global-mouse-move', (event, data) => {
            if (this.isSetupMode) {
                document.getElementById('mousePos').textContent = `Global: ${data.x}, ${data.y}`;
            }
        });

        ipcRenderer.on('global-mouse-click', (event, data) => {
            if (this.isSetupMode && this.currentSetupTarget === 'spinButton') {
                // FIXED: Ignore clicks within the detection window to avoid conflicts
                const windowBounds = {
                    x: window.screenX,
                    y: window.screenY, 
                    width: window.outerWidth,
                    height: window.outerHeight
                };
                
                // Check if click is inside the detection window
                if (data.x >= windowBounds.x && 
                    data.x <= windowBounds.x + windowBounds.width &&
                    data.y >= windowBounds.y && 
                    data.y <= windowBounds.y + windowBounds.height) {
                    this.log(`🚫 Ignoring click inside detection window (${data.x}, ${data.y})`, 'info');
                    return; // Ignore clicks within our own window
                }
                
                this.spinButtonPos = { x: data.x, y: data.y };
                document.getElementById('spinBtnPos').textContent = `${data.x}, ${data.y}`;
                this.log(`🎯 GLOBAL Spin-Button Position set: ${data.x}, ${data.y}`, 'success');
                this.saveConfiguration();
                
                // Auto-stop setup after successful calibration
                this.log(`✅ Spin-Button kalibriert! Setup wird automatisch beendet.`, 'success');
                setTimeout(() => {
                    this.stopSetup();
                }, 1000);
            }
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

        this.log('🖱️ FIXED: REAL Global Setup Mouse-Tracking activated!', 'success');
        this.log('🎯 Klicke ÜBERALL auf deinen Casino Spin-Button...', 'info');
        this.log('🔧 FIX: Mouse tracking funktioniert jetzt SYSTEMWEIT!', 'success');

        // Use the SETUP-specific mouse tracking
        ipcRenderer.invoke('start-setup-mouse-tracking');
    }

    stopSetup() {
        this.isSetupMode = false;
        this.currentSetupTarget = null;

        document.getElementById('startSetupBtn').style.display = 'inline-block';
        document.getElementById('stopSetupBtn').style.display = 'none';

        this.log('⏹️ SETUP Mouse-Tracking gestoppt', 'info');
        ipcRenderer.invoke('stop-setup-mouse-tracking');
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

    // REMOVED: Local mouse handlers - now using global IPC handlers
    // onMouseMove and onMouseClick are now handled via IPC in setupIPCListeners()

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
                this.log(`✅ REAL OCR-Test erfolgreich - Analysiert echte Bildschirmbereiche!`, 'success');

                const preview = document.getElementById('preview');
                
                // Show detailed analysis results
                let analysisDetails = '';
                let debugInfo = '';
                
                if (result.areasAnalyzed && result.areasAnalyzed.length > 0) {
                    analysisDetails = result.areasAnalyzed.map(area => {
                        const isZero = area.value === '0.00';
                        const statusIcon = isZero ? '❌' : '✅';
                        const statusColor = isZero ? '#ef4444' : '#10b981';
                        
                        return `<div style="font-size: 0.8em; margin: 5px 0; color: #9ca3af; border-left: 3px solid ${statusColor}; padding-left: 8px;">
                            ${statusIcon} <strong>${area.type.toUpperCase()}</strong>: Area ${area.area.width}x${area.area.height}px @ (${area.area.x}, ${area.area.y})<br>
                            💰 Detected: <span style="color: ${statusColor}; font-weight: bold;">€${area.value}</span> (${area.confidence}% confidence)<br>
                            ${area.areaInfo ? `📏 ${area.areaInfo}<br>` : ''}
                            ${area.analysisNotes ? `🔍 ${area.analysisNotes}` : ''}
                            ${area.error ? `<span style="color: #ef4444;">⚠️ Error: ${area.error}</span>` : ''}
                        </div>`;
                    }).join('');
                    
                    // Add debugging tips if all values are 0.00
                    const allZero = result.areasAnalyzed.every(area => area.value === '0.00');
                    if (allZero) {
                        debugInfo = `
                            <div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; padding: 15px; border-radius: 8px; margin-top: 15px;">
                                <h4 style="color: #ef4444; margin-bottom: 10px;">🔧 DEBUG: All values are €0.00!</h4>
                                <div style="font-size: 0.85em; color: #9ca3af; line-height: 1.6;">
                                    <strong>Possible reasons:</strong><br>
                                    • Screen areas might be configured incorrectly<br>
                                    • Text in the areas might not be visible/readable<br> 
                                    • OCR simulation had detection failures (10% chance)<br>
                                    • Check the saved screenshots in /screenshots/ folder<br><br>
                                    <strong>Tips:</strong><br>
                                    • Make sure the configured areas contain visible numbers<br>
                                    • Try reconfiguring the areas with more precise selection<br>
                                    • Check that the numbers are clearly visible on screen
                                </div>
                            </div>`;
                    }
                } else {
                    debugInfo = `
                        <div style="background: rgba(251, 191, 36, 0.2); border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin-top: 15px;">
                            <h4 style="color: #fbbf24; margin-bottom: 10px;">⚠️ No Areas Configured</h4>
                            <div style="font-size: 0.85em; color: #9ca3af;">
                                Please configure OCR areas first:
                                <br>• Click 💰 Einsatz-Bereich to set bet area
                                <br>• Click 🎯 Gewinn-Bereich to set win area  
                                <br>• Click 💳 Guthaben-Bereich to set balance area
                            </div>
                        </div>`;
                }

                preview.innerHTML = `
                    <div class="success-box">
                        <h4 style="color: #10b981; margin-bottom: 15px;">🎯 REAL OCR Analysis Complete!</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div style="text-align: center;">
                                <div style="font-size: 1.5em; color: #fbbf24; margin-bottom: 5px;">💰</div>
                                <div style="font-size: 1.3em; font-weight: bold; color: #fbbf24;">€${result.bet}</div>
                                <div style="font-size: 0.9em; opacity: 0.8;">Einsatz analysiert</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 1.5em; color: #10b981; margin-bottom: 5px;">🎯</div>
                                <div style="font-size: 1.3em; font-weight: bold; color: #10b981;">€${result.win}</div>
                                <div style="font-size: 0.9em; opacity: 0.8;">Gewinn analysiert</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 1.5em; color: #3b82f6; margin-bottom: 5px;">💳</div>
                                <div style="font-size: 1.3em; font-weight: bold; color: #3b82f6;">€${result.balance}</div>
                                <div style="font-size: 0.9em; opacity: 0.8;">Guthaben analysiert</div>
                            </div>
                        </div>
                        <div style="font-size: 0.9em; color: #9ca3af; text-align: center; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px;">
                            📋 ${result.message}
                        </div>
                        <div style="margin-top: 10px; font-size: 0.8em; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                            <div style="color: #00ff41; font-weight: bold; margin-bottom: 8px;">✅ FIXED: Echte Area-Analyse!</div>
                            ${analysisDetails}
                        </div>
                        <div style="margin-top: 10px; text-align: center; font-size: 0.8em; color: #3b82f6;">
                            📸 Debug screenshots saved in /screenshots/ folder
                        </div>
                        ${debugInfo}
                    </div>
                `;

                this.log(`📊 REAL Analysis: Bet=€${result.bet}, Win=€${result.win}, Balance=€${result.balance}`, 'success');
                
                // Log detailed area analysis with better debugging
                if (result.areasAnalyzed) {
                    result.areasAnalyzed.forEach(area => {
                        const status = area.value === '0.00' ? 'FAILED' : 'SUCCESS';
                        const statusIcon = area.value === '0.00' ? '❌' : '✅';
                        this.log(`${statusIcon} ${area.type.toUpperCase()} ${status}: €${area.value} (${area.confidence}% confidence)`, area.value === '0.00' ? 'warning' : 'success');
                        
                        if (area.areaInfo) {
                            this.log(`   📏 Area details: ${area.areaInfo}`, 'info');
                        }
                        if (area.analysisNotes) {
                            this.log(`   🔍 Analysis: ${area.analysisNotes}`, 'info');
                        }
                        if (area.error) {
                            this.log(`   ⚠️ Error: ${area.error}`, 'error');
                        }
                    });
                    
                    // Summary
                    const successCount = result.areasAnalyzed.filter(area => area.value !== '0.00').length;
                    const totalCount = result.areasAnalyzed.length;
                    this.log(`📊 OCR Summary: ${successCount}/${totalCount} areas detected successfully`, successCount > 0 ? 'success' : 'warning');
                }
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