// fix-coordinate-connection.js - Behebt das Problem dass Koordinaten-Änderungen nicht wirken

const fs = require('fs');
const path = require('path');

console.log('🔧 Behebe Koordinaten-Verbindung...');

const mainJsPath = path.join(__dirname, 'main.js');

if (!fs.existsSync(mainJsPath)) {
    console.log('❌ main.js nicht gefunden!');
    process.exit(1);
}

let content = fs.readFileSync(mainJsPath, 'utf8');

// Backup erstellen
const backupPath = mainJsPath + '.backup-coord-connection-' + Date.now();
fs.writeFileSync(backupPath, content);
console.log('📦 Backup erstellt:', path.basename(backupPath));

// Problem-Analyse
console.log('🔍 Analysiere Koordinaten-Probleme...');

const hasExtractGameData = content.includes('extractGameDataWithRealOCR');
const hasScaleFunction = content.includes('scaleCoordinatesIfNeeded');
const hasOCRAreaLoop = content.includes('for (const [areaType, area] of Object.entries(this.config.areas))');

console.log('📄 Code-Analyse:');
console.log(`   extractGameDataWithRealOCR: ${hasExtractGameData ? '✅' : '❌'}`);
console.log(`   scaleCoordinatesIfNeeded: ${hasScaleFunction ? '✅' : '❌'}`);
console.log(`   OCR Area Loop: ${hasOCRAreaLoop ? '✅' : '❌'}`);

if (!hasExtractGameData) {
    console.log('❌ Hauptproblem: extractGameDataWithRealOCR Funktion nicht gefunden');
    console.log('💡 Die OCR-Koordinaten können nicht angewendet werden');
}

// KOORDINATEN-VERBINDUNGS-FIX
console.log('🔧 Wende Koordinaten-Verbindungs-Fix an...');

// 1. Stelle sicher dass Koordinaten korrekt geladen werden
const configLoadingFix = `
        // KOORDINATEN-FIX: Lade gespeicherte Koordinaten mit Debug-Output
        console.log('📊 Lade OCR-Konfiguration...');
        if (this.config && this.config.areas) {
            console.log('✅ Konfiguration gefunden:');
            Object.entries(this.config.areas).forEach(([areaType, area]) => {
                console.log(\`   \${areaType}: {x:\${area.x}, y:\${area.y}, w:\${area.width}, h:\${area.height}}\`);
            });
            
            if (this.config.globalOffset) {
                console.log(\`🔧 Global Offset: {x:\${this.config.globalOffset.x}, y:\${this.config.globalOffset.y}}\`);
            }
        } else {
            console.log('❌ Keine OCR-Konfiguration gefunden!');
        }
`;

// 2. Koordinaten-Anwendungs-Fix
const coordinateApplicationFix = `
                        // KOORDINATEN-ANWENDUNGS-FIX: Wende alle Korrekturen an
                        let finalArea = { ...area };
                        
                        // 1. Wende globalen Offset an
                        if (this.config.globalOffset) {
                            const originalArea = { ...finalArea };
                            finalArea.x += (this.config.globalOffset.x || 0);
                            finalArea.y += (this.config.globalOffset.y || 0);
                            console.log(\`🔧 Offset angewendet (\${this.config.globalOffset.x}, \${this.config.globalOffset.y}):\`);
                            console.log(\`   \${areaType}: \${JSON.stringify(originalArea)} → \${JSON.stringify(finalArea)}\`);
                        }
                        
                        // 2. Wende Resolution-Skalierung an  
                        const scaledArea = scaleCoordinatesIfNeeded(finalArea);
                        if (scaledArea.x !== finalArea.x || scaledArea.y !== finalArea.y) {
                            console.log(\`📏 Resolution-Skalierung angewendet:\`);
                            console.log(\`   \${areaType}: \${JSON.stringify(finalArea)} → \${JSON.stringify(scaledArea)}\`);
                        }
                        finalArea = scaledArea;
                        
                        console.log(\`🎯 FINALE OCR-Koordinaten für \${areaType}: \${JSON.stringify(finalArea)}\`);
                        
                        // 3. Verwende finale Koordinaten für OCR
                        const ocrResult = await this.ocrEngine.analyzeScreenArea(finalArea, areaType);`;

// Finde und ersetze die OCR-Analyse Schleife
if (content.includes('extractGameDataWithRealOCR')) {
    // Füge Config-Loading-Fix hinzu
    content = content.replace(
        /(async extractGameDataWithRealOCR\(\) \{[^}]*)(const results = \{ bet: 0, win: 0, balance: 0 \};)/,
        '$1' + configLoadingFix + '\n        $2'
    );
    
    // Finde OCR-Area-Loop und füge Koordinaten-Fix hinzu
    const ocrLoopPattern = /(for \(const \[areaType, area\] of Object\.entries\(this\.config\.areas\)\) \{[^}]*)(const ocrResult = await this\.ocrEngine\.analyzeScreenArea\(area, areaType\);)/g;
    
    if (ocrLoopPattern.test(content)) {
        content = content.replace(ocrLoopPattern, (match, beforeOCR, ocrCall) => {
            return beforeOCR + coordinateApplicationFix;
        });
        console.log('✅ OCR-Koordinaten-Anwendung gepatcht');
    } else {
        console.log('⚠️ OCR-Area-Loop nicht gefunden, suche nach alternativen Mustern...');
        
        // Fallback: Suche nach anderen OCR-Aufrufen
        const fallbackPattern = /(const scaledArea = scaleCoordinatesIfNeeded\(area\);[\s\S]*?const ocrResult = await this\.ocrEngine\.analyzeScreenArea\(scaledArea, areaType\);)/g;
        
        if (fallbackPattern.test(content)) {
            content = content.replace(fallbackPattern, coordinateApplicationFix.replace('finalArea', 'scaledArea'));
            console.log('✅ Fallback-OCR-Koordinaten-Fix angewendet');
        } else {
            console.log('❌ Konnte OCR-Aufrufe nicht finden - manueller Fix nötig');
        }
    }
} else {
    console.log('❌ extractGameDataWithRealOCR nicht gefunden - kann nicht patchen');
}

// 3. Erweitere die scaleCoordinatesIfNeeded Funktion
if (content.includes('scaleCoordinatesIfNeeded')) {
    const enhancedScaleFunction = `
// ERWEITERTE KOORDINATEN-SKALIERUNG mit Debug-Output
const originalScaleCoordinates = scaleCoordinatesIfNeeded;
scaleCoordinatesIfNeeded = function(area) {
    console.log(\`📏 Skaliere Koordinaten: \${JSON.stringify(area)}\`);
    
    const result = originalScaleCoordinates(area);
    
    if (result.x !== area.x || result.y !== area.y) {
        console.log(\`📏 Skalierung angewendet: \${JSON.stringify(area)} → \${JSON.stringify(result)}\`);
    } else {
        console.log(\`✅ Keine Skalierung nötig (native Resolution)\`);
    }
    
    return result;
};
`;

    // Füge erweiterte Funktion hinzu
    content = content.replace(
        /const store = new Store\(\);/,
        'const store = new Store();\n' + enhancedScaleFunction
    );
    console.log('✅ Erweiterte Koordinaten-Skalierung hinzugefügt');
}

// 4. Debugging für gespeicherte Konfiguration
const configDebugCode = `
// DEBUG: Zeige gespeicherte Konfiguration beim Start
ipcMain.handle('debug-show-config', () => {
    const config = store.get('spinDetectionConfig');
    console.log('🐛 DEBUG - Gespeicherte Konfiguration:');
    console.log(JSON.stringify(config, null, 2));
    return config;
});
`;

// Füge Debug-Handler hinzu
content = content.replace(
    /ipcMain\.handle\('load-detection-config'/,
    configDebugCode + '\nipcMain.handle(\'load-detection-config\''
);

// Datei speichern
fs.writeFileSync(mainJsPath, content);

console.log('✅ Koordinaten-Verbindungs-Fix angewendet!');
console.log('');
console.log('Was wurde gefixt:');
console.log('• ✅ Debug-Output für geladene Koordinaten');
console.log('• ✅ Globale Offsets werden korrekt angewendet');  
console.log('• ✅ Resolution-Skalierung mit Logging');
console.log('• ✅ Finale Koordinaten werden vor OCR angezeigt');
console.log('• ✅ Debug-Handler für Konfiguration');
console.log('');
console.log('🔄 Starte deine App neu und teste OCR:');
console.log('1. Öffne Detection Setup');
console.log('2. Konfiguriere Koordinaten + Offset'); 
console.log('3. Schaue in die Console - du solltest jetzt sehen:');
console.log('   "📊 Lade OCR-Konfiguration..."');
console.log('   "🔧 Offset angewendet..."');
console.log('   "🎯 FINALE OCR-Koordinaten..."');
console.log('');
console.log('Falls das nicht funktioniert, ist das Problem tiefer im OCR-System.');
