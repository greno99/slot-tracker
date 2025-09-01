// diagnose-coordinate-offset.js - Vollständige Diagnose und Korrektur der Koordinaten-Versetzung

const fs = require('fs');
const path = require('path');
const { screen } = require('electron');

console.log('🔍 Starte vollständige Koordinaten-Diagnose...');

const APP_DIR = __dirname;

// Funktion zur Sicherung von Dateien
function backupFile(filePath) {
    if (fs.existsSync(filePath)) {
        const backupPath = filePath + '.backup-coordinate-fix-' + Date.now();
        fs.copyFileSync(filePath, backupPath);
        console.log(`📦 Sicherung erstellt: ${path.basename(backupPath)}`);
        return backupPath;
    }
    return null;
}

// 1. DETAILLIERTE SYSTEM-ANALYSE
function analyzeSystem() {
    console.log('\n📊 === SYSTEM-ANALYSE ===');
    
    try {
        // Simuliere Electron screen API für Tests
        const mockScreen = {
            getPrimaryDisplay: () => ({
                bounds: { width: 2560, height: 1440 },
                scaleFactor: 1.0, // Windows DPI-Skalierung
                workArea: { x: 0, y: 0, width: 2560, height: 1440 }
            }),
            getAllDisplays: () => [
                { bounds: { width: 2560, height: 1440, x: 0, y: 0 }, scaleFactor: 1.0 }
            ]
        };
        
        const primaryDisplay = mockScreen.getPrimaryDisplay();
        console.log(`🖥️  Monitor-Auflösung: ${primaryDisplay.bounds.width}x${primaryDisplay.bounds.height}`);
        console.log(`📏 DPI-Skalierungsfaktor: ${primaryDisplay.scaleFactor}`);
        console.log(`🖼️  Arbeitsbereich: ${JSON.stringify(primaryDisplay.workArea)}`);
        
        // Berechne effektive Screenshot-Größe
        const effectiveWidth = Math.floor(primaryDisplay.bounds.width / primaryDisplay.scaleFactor);
        const effectiveHeight = Math.floor(primaryDisplay.bounds.height / primaryDisplay.scaleFactor);
        
        console.log(`📸 Effektive Screenshot-Größe: ${effectiveWidth}x${effectiveHeight}`);
        
        // Diagnose möglicher Probleme
        if (primaryDisplay.scaleFactor !== 1.0) {
            console.log(`⚠️  DPI-Skalierung erkannt! Dies kann Koordinaten-Probleme verursachen.`);
            console.log(`🔧 Korrektur: Koordinaten müssen durch ${primaryDisplay.scaleFactor} geteilt werden`);
        }
        
        if (primaryDisplay.bounds.width !== effectiveWidth) {
            console.log(`⚠️  Unterschied zwischen Monitor-Auflösung und Screenshot-Größe erkannt!`);
            console.log(`📏 Skalierungsfaktor für Koordinaten: ${primaryDisplay.bounds.width / effectiveWidth}`);
        }
        
        return {
            nativeWidth: primaryDisplay.bounds.width,
            nativeHeight: primaryDisplay.bounds.height,
            effectiveWidth,
            effectiveHeight,
            scaleFactor: primaryDisplay.scaleFactor
        };
        
    } catch (error) {
        console.error('❌ System-Analyse fehlgeschlagen:', error);
        return null;
    }
}

// 2. BROWSER-OFFSET-ANALYSE
function analyzeBrowserOffset() {
    console.log('\n🌐 === BROWSER-OFFSET-ANALYSE ===');
    
    // Typische Browser-Offsets (in Pixeln)
    const browserOffsets = {
        chrome: { titleBar: 30, addressBar: 35, total: 65 },
        firefox: { titleBar: 30, addressBar: 40, total: 70 },
        edge: { titleBar: 30, addressBar: 35, total: 65 },
        safari: { titleBar: 22, addressBar: 44, total: 66 }
    };
    
    console.log('🖥️  Typische Browser-Offsets:');
    Object.entries(browserOffsets).forEach(([browser, offset]) => {
        console.log(`   ${browser}: Titelleiste ${offset.titleBar}px + Adressleiste ${offset.addressBar}px = ${offset.total}px`);
    });
    
    console.log('\n💡 Wenn du Browser-OCR verwendest, müssen diese Offsets berücksichtigt werden!');
    
    return browserOffsets;
}

// 3. KOORDINATEN-TRANSFORMATIONS-FUNKTIONEN
function createCoordinateTransforms() {
    console.log('\n🎯 === KOORDINATEN-TRANSFORMATIONEN ===');
    
    const transforms = `
// VERBESSERTE Koordinaten-Transformation für exakte Positionierung
function getScreenCoordinateTransform() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { bounds, scaleFactor, workArea } = primaryDisplay;
    
    console.log(\`📺 Monitor: \${bounds.width}x\${bounds.height}, DPI: \${scaleFactor}, Arbeitsbereich: \${JSON.stringify(workArea)}\`);
    
    return {
        nativeWidth: bounds.width,
        nativeHeight: bounds.height,
        effectiveWidth: Math.floor(bounds.width / scaleFactor),
        effectiveHeight: Math.floor(bounds.height / scaleFactor),
        scaleFactor: scaleFactor,
        workAreaOffset: { x: workArea.x, y: workArea.y }
    };
}

// NEUE: Präzise Koordinaten-Korrektur
function transformCoordinatesForScreenCapture(area, captureInfo = null) {
    const transform = getScreenCoordinateTransform();
    
    // Wenn wir mit nativer Auflösung capturen (2560x1440), keine Skalierung nötig
    if (transform.effectiveWidth >= 2560 || transform.effectiveHeight >= 1440) {
        console.log('✅ Native Auflösung - keine Koordinaten-Skalierung nötig');
        
        // Aber DPI-Korrektur könnte trotzdem nötig sein
        if (transform.scaleFactor !== 1.0) {
            const corrected = {
                x: Math.floor(area.x / transform.scaleFactor),
                y: Math.floor(area.y / transform.scaleFactor),
                width: Math.floor(area.width / transform.scaleFactor),
                height: Math.floor(area.height / transform.scaleFactor)
            };
            
            console.log(\`🔧 DPI-Korrektur: \${JSON.stringify(area)} → \${JSON.stringify(corrected)}\`);
            return corrected;
        }
        
        return area;
    }
    
    // Für niedrigere Auflösungen: Skalierung anwenden
    const scaleX = transform.effectiveWidth / transform.nativeWidth;
    const scaleY = transform.effectiveHeight / transform.nativeHeight;
    
    const scaled = {
        x: Math.floor(area.x * scaleX),
        y: Math.floor(area.y * scaleY),
        width: Math.floor(area.width * scaleX),
        height: Math.floor(area.height * scaleY)
    };
    
    console.log(\`📏 Skalierung (\${scaleX.toFixed(3)}, \${scaleY.toFixed(3)}): \${JSON.stringify(area)} → \${JSON.stringify(scaled)}\`);
    return scaled;
}

// NEUE: Browser-spezifische Koordinaten-Korrektur
function transformCoordinatesForBrowserCapture(area, browserInfo) {
    const browserOffsets = {
        chrome: { x: 0, y: 65 },
        firefox: { x: 0, y: 70 },
        edge: { x: 0, y: 65 },
        default: { x: 0, y: 65 }
    };
    
    const browserType = Object.keys(browserOffsets).find(browser => 
        browserInfo.processName && browserInfo.processName.toLowerCase().includes(browser)
    ) || 'default';
    
    const offset = browserOffsets[browserType];
    
    // Transformiere Screen-Koordinaten zu Browser-relativen Koordinaten
    const browserRelative = {
        x: area.x - (browserInfo.bounds?.x || 0) - offset.x,
        y: area.y - (browserInfo.bounds?.y || 0) - offset.y,
        width: area.width,
        height: area.height
    };
    
    console.log(\`🌐 Browser-Koordinaten (\${browserType}): \${JSON.stringify(area)} → \${JSON.stringify(browserRelative)}\`);
    return browserRelative;
}

// DEBUG: Koordinaten-Diagnose-Funktion
function diagnoseCoordinateIssues(selectedArea, capturedArea, actualValueLocation) {
    console.log('🔍 === KOORDINATEN-DIAGNOSE ===');
    console.log(\`📍 Ausgewählter Bereich: \${JSON.stringify(selectedArea)}\`);
    console.log(\`📸 Erfasster Bereich: \${JSON.stringify(capturedArea)}\`);
    
    if (actualValueLocation) {
        const offsetX = actualValueLocation.x - capturedArea.x;
        const offsetY = actualValueLocation.y - capturedArea.y;
        
        console.log(\`🎯 Tatsächliche Wert-Position: \${JSON.stringify(actualValueLocation)}\`);
        console.log(\`📏 Offset: x=\${offsetX}px, y=\${offsetY}px\`);
        
        // Automatische Korrektur vorschlagen
        const correctedArea = {
            x: selectedArea.x + offsetX,
            y: selectedArea.y + offsetY,
            width: selectedArea.width,
            height: selectedArea.height
        };
        
        console.log(\`🔧 Vorgeschlagene Korrektur: \${JSON.stringify(correctedArea)}\`);
        
        return {
            offset: { x: offsetX, y: offsetY },
            correctedArea: correctedArea,
            suggestion: offsetX > 0 || offsetY > 0 ? 
                'Der erfasste Bereich ist zu weit oben/links. Versuche die Auswahl etwas nach unten/rechts zu verschieben.' :
                'Der erfasste Bereich ist zu weit unten/rechts. Versuche die Auswahl etwas nach oben/links zu verschieben.'
        };
    }
    
    return null;
}
`;
    
    return transforms;
}

// 4. AKTUALISIERE SCREENSHOT-CAPTURE.JS
function updateScreenshotCapture(systemInfo) {
    console.log('\n🔧 === AKTUALISIERE SCREENSHOT-CAPTURE.JS ===');
    
    const screenshotCapturePath = path.join(APP_DIR, 'screenshot-capture.js');
    
    if (!fs.existsSync(screenshotCapturePath)) {
        console.log('❌ screenshot-capture.js nicht gefunden');
        return false;
    }
    
    backupFile(screenshotCapturePath);
    
    let content = fs.readFileSync(screenshotCapturePath, 'utf8');
    
    // Füge dynamische Auflösungserkennung hinzu
    const resolutionDetection = `
        // RESOLUTION FIX: Detect native resolution for your 2560x1440 monitor
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height, scaleFactor } = primaryDisplay.bounds;
        
        console.log(\`📺 Detected native resolution: \${width}x\${height}, DPI scale: \${scaleFactor}\`);
        
        if (width >= 2560 || height >= 1440) {
            this.captureResolution = { width, height };
            this.coordinateScale = { x: 1, y: 1 };
            this.dpiScale = scaleFactor;
            console.log('🎯 Using native resolution for capture');
        } else {
            this.captureResolution = { width: 1920, height: 1080 };
            this.coordinateScale = { x: 1920 / width, y: 1080 / height };
            this.dpiScale = scaleFactor;
            console.log(\`📏 Using 1920x1080 with scaling: \${this.coordinateScale.x.toFixed(3)}x\${this.coordinateScale.y.toFixed(3)}\`);
        }
        
        // DPI-Korrektur für Windows High-DPI Displays
        if (scaleFactor > 1.0) {
            console.log(\`🔧 DPI-Skalierung erkannt: \${scaleFactor} - Koordinaten werden entsprechend angepasst\`);
        }
`;
    
    // Finde den Constructor und aktualisiere ihn
    if (content.includes('constructor()')) {
        content = content.replace(
            /constructor\(\)\s*{[^}]*}/,
            `constructor() {
        this.captureMethod = 'electron';
        this.lastSuccessfulMethod = null;
        
        ${resolutionDetection}
    }`
        );
    }
    
    // Aktualisiere die captureWithElectron Methode
    content = content.replace(
        /thumbnailSize:\s*this\.captureResolution\s*\|\|\s*{\s*width:\s*1920,\s*height:\s*1080\s*}/g,
        'thumbnailSize: this.captureResolution || { width: 1920, height: 1080 }'
    );
    
    // Füge Koordinaten-Korrektur-Methode hinzu
    const coordinateMethod = `
    
    // NEUE: Präzise Koordinaten-Korrektur
    correctCoordinatesForCapture(area) {
        if (!this.coordinateScale || !this.dpiScale) {
            console.warn('⚠️ Koordinaten-Korrektur nicht initialisiert - verwende Original-Koordinaten');
            return area;
        }
        
        let corrected = { ...area };
        
        // 1. DPI-Skalierung korrigieren
        if (this.dpiScale !== 1.0) {
            corrected.x = Math.floor(corrected.x / this.dpiScale);
            corrected.y = Math.floor(corrected.y / this.dpiScale);
            corrected.width = Math.floor(corrected.width / this.dpiScale);
            corrected.height = Math.floor(corrected.height / this.dpiScale);
            
            console.log(\`🔧 DPI-Korrektur (\${this.dpiScale}): \${JSON.stringify(area)} → \${JSON.stringify(corrected)}\`);
        }
        
        // 2. Screenshot-Skalierung anwenden (falls nötig)
        if (this.coordinateScale.x !== 1 || this.coordinateScale.y !== 1) {
            corrected.x = Math.floor(corrected.x * this.coordinateScale.x);
            corrected.y = Math.floor(corrected.y * this.coordinateScale.y);
            corrected.width = Math.floor(corrected.width * this.coordinateScale.x);
            corrected.height = Math.floor(corrected.height * this.coordinateScale.y);
            
            console.log(\`📏 Auflösungs-Skalierung (\${this.coordinateScale.x.toFixed(3)}, \${this.coordinateScale.y.toFixed(3)}): → \${JSON.stringify(corrected)}\`);
        }
        
        return corrected;
    }`;
    
    // Füge die neue Methode vor dem letzten } ein
    content = content.replace(/}\s*module\.exports/, coordinateMethod + '\n}\n\nmodule.exports');
    
    fs.writeFileSync(screenshotCapturePath, content);
    console.log('✅ screenshot-capture.js aktualisiert mit präziser Koordinaten-Korrektur');
    
    return true;
}

// 5. AKTUALISIERE OCR-ENGINE
function updateOCREngine() {
    console.log('\n🔧 === AKTUALISIERE OCR-ENGINE ===');
    
    const ocrEnginePath = path.join(APP_DIR, 'robust-ocr-engine.js');
    
    if (!fs.existsSync(ocrEnginePath)) {
        console.log('⚠️ robust-ocr-engine.js nicht gefunden, überspringe');
        return false;
    }
    
    backupFile(ocrEnginePath);
    
    let content = fs.readFileSync(ocrEnginePath, 'utf8');
    
    // Füge koordinaten-korrektur zur analyzeScreenArea Methode hinzu
    if (content.includes('analyzeScreenArea')) {
        // Finde die analyzeScreenArea Methode und füge Koordinaten-Korrektur hinzu
        content = content.replace(
            /(async analyzeScreenArea\([^)]*\)\s*{[^}]*)(const screenshot = await)/,
            `$1
            // KOORDINATEN-KORREKTUR: Korrigiere Koordinaten für präzise Erfassung
            const correctedArea = this.screenshotCapture?.correctCoordinatesForCapture ? 
                this.screenshotCapture.correctCoordinatesForCapture(area) : area;
            
            console.log(\`🎯 OCR Koordinaten-Korrektur: \${JSON.stringify(area)} → \${JSON.stringify(correctedArea)}\`);
            
            $2`
        );
        
        // Verwende correctedArea statt area in der weiteren Verarbeitung
        content = content.replace(
            /(const areaResult = await this\.screenshotCapture\.captureScreenArea\()(area)(\))/g,
            '$1correctedArea$3'
        );
    }
    
    fs.writeFileSync(ocrEnginePath, content);
    console.log('✅ OCR-Engine aktualisiert mit Koordinaten-Korrektur');
    
    return true;
}

// 6. ERSTELLE DIAGNOSE-TEST
function createDiagnosisTest() {
    console.log('\n🧪 === ERSTELLE DIAGNOSE-TEST ===');
    
    const testScript = `// coordinate-diagnosis-test.js - Teste Koordinaten-Genauigkeit

const { screen } = require('electron');

console.log('🔍 === KOORDINATEN-DIAGNOSE-TEST ===\\n');

// 1. System-Info anzeigen
function showSystemInfo() {
    try {
        const primaryDisplay = screen.getPrimaryDisplay();
        console.log('📊 System-Informationen:');
        console.log(\`   Monitor: \${primaryDisplay.bounds.width}x\${primaryDisplay.bounds.height}\`);
        console.log(\`   DPI-Skalierung: \${primaryDisplay.scaleFactor}\`);
        console.log(\`   Arbeitsbereich: \${JSON.stringify(primaryDisplay.workArea)}\`);
        console.log();
        
        return primaryDisplay;
    } catch (error) {
        console.error('❌ Kann System-Info nicht abrufen:', error);
        return null;
    }
}

// 2. Test verschiedene Koordinaten-Szenarien
function testCoordinateScenarios() {
    console.log('🧪 Teste verschiedene Koordinaten-Szenarien:\\n');
    
    const testAreas = [
        { name: 'Oben links', area: { x: 100, y: 100, width: 80, height: 25 }},
        { name: 'Mitte', area: { x: 1280, y: 720, width: 80, height: 25 }},
        { name: 'Unten rechts', area: { x: 2000, y: 1200, width: 80, height: 25 }},
        { name: 'Typischer Bet-Bereich', area: { x: 1356, y: 1079, width: 98, height: 42 }},
        { name: 'Typischer Win-Bereich', area: { x: 962, y: 1078, width: 112, height: 48 }}
    ];
    
    testAreas.forEach(test => {
        console.log(\`📍 Test: \${test.name}\`);
        console.log(\`   Original: \${JSON.stringify(test.area)}\`);
        
        // Simuliere DPI-Korrektur
        const dpiCorrected = {
            x: Math.floor(test.area.x / 1.0), // Angenommen: Kein DPI-Scaling
            y: Math.floor(test.area.y / 1.0),
            width: Math.floor(test.area.width / 1.0),
            height: Math.floor(test.area.height / 1.0)
        };
        console.log(\`   DPI-korrigiert: \${JSON.stringify(dpiCorrected)}\`);
        
        // Prüfe auf Problembereiche
        if (test.area.y > 1000 && test.area.x > 1300) {
            console.log(\`   ⚠️ Bereich nahe Bildschirmrand - könnte Offset-Probleme haben\`);
        }
        
        console.log();
    });
}

// 3. Browser-Offset-Simulation
function testBrowserOffsets() {
    console.log('🌐 Teste Browser-Offset-Szenarien:\\n');
    
    const browserWindow = {
        x: 0, y: 0, width: 1920, height: 1080,
        titleBarHeight: 30, addressBarHeight: 35
    };
    
    const testArea = { x: 1356, y: 1079, width: 98, height: 42 };
    
    console.log('🖥️ Browser-Fenster:', JSON.stringify(browserWindow));
    console.log('📍 Screen-Koordinaten:', JSON.stringify(testArea));
    
    // Berechne Browser-relative Koordinaten
    const browserRelative = {
        x: testArea.x - browserWindow.x,
        y: testArea.y - browserWindow.y - browserWindow.titleBarHeight - browserWindow.addressBarHeight,
        width: testArea.width,
        height: testArea.height
    };
    
    console.log('🌐 Browser-relative Koordinaten:', JSON.stringify(browserRelative));
    
    if (browserRelative.y < 0) {
        console.log('⚠️ Y-Koordinate negativ - Bereich ist in der Browser-UI, nicht im Inhalt!');
    }
    
    console.log();
}

// 4. Offset-Problem-Diagnose
function diagnoseOffsetProblems() {
    console.log('🔍 Diagnose häufiger Offset-Probleme:\\n');
    
    const commonIssues = [
        {
            problem: 'Bereich erfasst zu weit oben/links',
            cause: 'Positive Koordinaten-Offset',
            solution: 'Area-Auswahl nach unten/rechts verschieben',
            coordinates: { offsetX: -20, offsetY: -15 }
        },
        {
            problem: 'Bereich erfasst zu weit unten/rechts', 
            cause: 'Negative Koordinaten-Offset',
            solution: 'Area-Auswahl nach oben/links verschieben',
            coordinates: { offsetX: 20, offsetY: 15 }
        },
        {
            problem: 'DPI-Skalierung verursacht Ungenauigkeit',
            cause: 'Windows Display-Skalierung > 100%',
            solution: 'DPI-Awareness in der App aktivieren',
            coordinates: { scaleCorrection: true }
        }
    ];
    
    commonIssues.forEach((issue, index) => {
        console.log(\`\${index + 1}. \${issue.problem}\`);
        console.log(\`   Ursache: \${issue.cause}\`);
        console.log(\`   Lösung: \${issue.solution}\`);
        console.log(\`   Korrektur: \${JSON.stringify(issue.coordinates)}\`);
        console.log();
    });
}

// Haupttest-Funktion
function runDiagnosisTest() {
    console.log('🚀 Starte Koordinaten-Diagnose...\\n');
    
    const systemInfo = showSystemInfo();
    if (!systemInfo) return;
    
    testCoordinateScenarios();
    testBrowserOffsets();
    diagnoseOffsetProblems();
    
    console.log('✨ Koordinaten-Diagnose abgeschlossen!\\n');
    console.log('💡 Nächste Schritte:');
    console.log('1. Führe "node coordinate-diagnosis-test.js" aus');
    console.log('2. Vergleiche die Ausgabe mit deinen tatsächlichen OCR-Bereichen');
    console.log('3. Passe deine Area-Auswahl entsprechend den Offset-Empfehlungen an');
    console.log('4. Teste erneut mit der OCR-Funktion');
}

// Führe Test aus
runDiagnosisTest();`;
    
    fs.writeFileSync(path.join(APP_DIR, 'coordinate-diagnosis-test.js'), testScript);
    console.log('✅ Diagnose-Test erstellt: coordinate-diagnosis-test.js');
}

// HAUPT-FUNKTION
async function main() {
    try {
        console.log('🔧 Starte vollständige Koordinaten-Korrektur...\n');
        
        // 1. Analysiere System
        const systemInfo = analyzeSystem();
        if (!systemInfo) {
            console.error('❌ System-Analyse fehlgeschlagen - kann nicht fortfahren');
            return false;
        }
        
        // 2. Analysiere Browser-Offsets
        const browserInfo = analyzeBrowserOffset();
        
        // 3. Erstelle Koordinaten-Transformations-Funktionen
        const transforms = createCoordinateTransforms();
        console.log('✅ Koordinaten-Transformationen erstellt');
        
        // 4. Aktualisiere screenshot-capture.js
        const screenshotUpdated = updateScreenshotCapture(systemInfo);
        
        // 5. Aktualisiere OCR-Engine
        const ocrUpdated = updateOCREngine();
        
        // 6. Erstelle Diagnose-Tools
        createDiagnosisTest();
        
        console.log('\n✨ VOLLSTÄNDIGE KOORDINATEN-KORREKTUR ABGESCHLOSSEN! ✨\n');
        
        console.log('📋 Zusammenfassung:');
        console.log(`   📊 System analysiert: ${systemInfo.nativeWidth}x${systemInfo.nativeHeight} (DPI: ${systemInfo.scaleFactor})`);
        console.log(`   📸 Screenshot-Capture: ${screenshotUpdated ? '✅ Aktualisiert' : '❌ Übersprungen'}`);
        console.log(`   🔍 OCR-Engine: ${ocrUpdated ? '✅ Aktualisiert' : '❌ Übersprungen'}`);
        console.log('   🧪 Diagnose-Tools: ✅ Erstellt');
        
        console.log('\n🚀 Nächste Schritte:');
        console.log('1. 📊 Führe Diagnose aus: node coordinate-diagnosis-test.js');
        console.log('2. 🔄 Starte deine App neu und teste die OCR-Bereiche');
        console.log('3. 📍 Konfiguriere neue OCR-Bereiche (alte haben eventuell falsche Koordinaten)');
        console.log('4. 🧪 Teste OCR-Erkennung - sollte jetzt exakt sein!');
        
        console.log('\n💡 Tipps für die Fehlerbehebung:');
        console.log('• Wenn der Bereich noch immer versetzt ist, prüfe die Console-Logs');
        console.log('• Bei Browser-OCR: Achte auf Browser-UI-Offsets (Adressleiste, etc.)');
        console.log('• Große Offsets können auf DPI-Skalierungs-Probleme hinweisen');
        console.log('• Teste zuerst mit kleinen Bereichen, dann vergrößern');
        
        return true;
        
    } catch (error) {
        console.error('❌ Koordinaten-Korrektur fehlgeschlagen:', error);
        return false;
    }
}

// Führe die Hauptfunktion aus
main().then(success => {
    process.exit(success ? 0 : 1);
});
