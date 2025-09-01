
// coordinate-debugger.js - Debug coordinate flow in real-time

const { ipcRenderer } = require('electron');

class CoordinateDebugger {
    constructor() {
        this.config = null;
        this.lastCoordinates = {};
        this.setupDebugLogging();
    }

    setupDebugLogging() {
        console.log('🔧 Coordinate Debugger activated');
        
        // Intercept coordinate changes
        this.interceptCoordinateChanges();
        
        // Log coordinate flow
        this.logCoordinateFlow();
    }

    interceptCoordinateChanges() {
        // Monitor input field changes
        const inputs = ['betX', 'betY', 'betWidth', 'betHeight', 'winX', 'winY', 'winWidth', 'winHeight', 'balanceX', 'balanceY', 'balanceWidth', 'balanceHeight'];
        
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', (e) => {
                    console.log(`📝 Coordinate changed: ${inputId} = ${e.target.value}`);
                    this.trackCoordinateChange(inputId, e.target.value);
                });
            }
        });

        // Monitor offset changes
        const offsetInputs = ['globalOffsetX', 'globalOffsetY'];
        offsetInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', (e) => {
                    console.log(`🔧 Offset changed: ${inputId} = ${e.target.value}`);
                    this.applyOffsetsDebug();
                });
            }
        });
    }

    trackCoordinateChange(field, value) {
        this.lastCoordinates[field] = value;
        this.logCurrentState();
    }

    applyOffsetsDebug() {
        const offsetX = parseInt(document.getElementById('globalOffsetX')?.value) || 0;
        const offsetY = parseInt(document.getElementById('globalOffsetY')?.value) || 0;
        
        console.log(`🎯 APPLYING OFFSETS: X=${offsetX}, Y=${offsetY}`);
        
        // Show how offsets affect each area
        ['bet', 'win', 'balance'].forEach(area => {
            const x = parseInt(document.getElementById(area + 'X')?.value) || 0;
            const y = parseInt(document.getElementById(area + 'Y')?.value) || 0;
            const width = parseInt(document.getElementById(area + 'Width')?.value) || 0;
            const height = parseInt(document.getElementById(area + 'Height')?.value) || 0;
            
            if (x && y && width && height) {
                const original = { x, y, width, height };
                const corrected = {
                    x: x + offsetX,
                    y: y + offsetY,
                    width,
                    height
                };
                
                console.log(`${area.toUpperCase()} area transformation:`);
                console.log(`  Original:  ${JSON.stringify(original)}`);
                console.log(`  Corrected: ${JSON.stringify(corrected)}`);
            }
        });
    }

    logCurrentState() {
        console.log('📊 Current coordinate state:', this.lastCoordinates);
    }

    async testCoordinateSaving() {
        console.log('💾 Testing coordinate saving...');
        
        // Test save configuration
        try {
            const result = await ipcRenderer.invoke('test-coordinate-save', this.lastCoordinates);
            console.log('Save test result:', result);
        } catch (error) {
            console.error('❌ Save test failed:', error);
        }
    }

    async testCoordinateLoading() {
        console.log('📂 Testing coordinate loading...');
        
        try {
            const config = await ipcRenderer.invoke('load-detection-config');
            console.log('Loaded config:', config);
            
            if (config && config.areas) {
                console.log('✅ Configuration loaded successfully');
                console.log('Areas found:', Object.keys(config.areas));
                
                // Compare with UI values
                Object.entries(config.areas).forEach(([areaType, area]) => {
                    const uiX = parseInt(document.getElementById(areaType + 'X')?.value) || 0;
                    const uiY = parseInt(document.getElementById(areaType + 'Y')?.value) || 0;
                    
                    console.log(`${areaType.toUpperCase()} comparison:`);
                    console.log(`  Saved:  ${area.x}, ${area.y}`);
                    console.log(`  UI:     ${uiX}, ${uiY}`);
                    console.log(`  Match:  ${area.x === uiX && area.y === uiY ? '✅' : '❌'}`);
                });
            } else {
                console.log('❌ No configuration found or invalid config');
            }
        } catch (error) {
            console.error('❌ Load test failed:', error);
        }
    }

    logCoordinateFlow() {
        console.log('🎯 Coordinate flow analysis:');
        console.log('1. Manual input → JavaScript variables ✅');
        console.log('2. Apply offsets → Calculated coordinates');
        console.log('3. Save to config → IPC to main process');
        console.log('4. OCR engine load → From saved config');
        console.log('5. Screenshot capture → Using loaded coordinates');
        console.log('');
        console.log('🔍 Use these methods to debug:');
        console.log('• debugger.testCoordinateSaving() - Test save process');
        console.log('• debugger.testCoordinateLoading() - Test load process');
        console.log('• debugger.logCurrentState() - Show current state');
    }
}

// Auto-start debugger when loaded
if (typeof window !== 'undefined') {
    window.coordinateDebugger = new CoordinateDebugger();
    console.log('🎯 Coordinate debugger ready! Use: window.coordinateDebugger');
}

module.exports = CoordinateDebugger;
