// quick-coordinate-fix.js - Schnelle Koordinaten-Offset-Korrektur

const fs = require('fs');
const path = require('path');

console.log('🔧 Schnelle Koordinaten-Offset-Korrektur...\n');

// Analysiere typische Offset-Probleme für 2560x1440 Monitor
function analyzeTypicalOffsets() {
    console.log('🔍 Analysiere typische Offset-Probleme für 2560x1440 Monitor:\n');
    
    const typicalProblems = [
        {
            description: 'DPI-Skalierung (Windows 125%, 150%)',
            offsetPattern: { x: 0.8, y: 0.8 }, // 20% kleiner
            example: 'Ausgewählt: (1000, 800) → Erfasst: (800, 640)',
            fix: 'DPI-Skalierung in Windows auf 100% setzen oder App DPI-aware machen'
        },
        {
            description: 'Browser-Adressleiste und Titelleiste',
            offsetPattern: { x: 0, y: -65 }, // 65px nach oben
            example: 'Ausgewählt: (1000, 800) → Erfasst: (1000, 735)',
            fix: 'Y-Koordinaten um Browser-UI-Höhe korrigieren'
        },
        {
            description: 'Electron screenshot Skalierung',
            offsetPattern: { x: 0.75, y: 0.75 }, // 25% kleiner
            example: 'Ausgewählt: (2000, 1200) → Erfasst: (1500, 900)',
            fix: 'Native Auflösung für Screenshot verwenden'
        },
        {
            description: 'Kombiniertes Problem (häufig bei Casino-Sites)',
            offsetPattern: { x: 0.75, y: 0.70 }, // X: 25% kleiner, Y: 30% kleiner
            example: 'Ausgewählt: (1356, 1079) → Erfasst: (1017, 755)',
            fix: 'Sowohl Auflösungs- als auch Browser-Korrektur nötig'
        }
    ];
    
    typicalProblems.forEach((problem, index) => {
        console.log(`${index + 1}. ${problem.description}`);
        console.log(`   Offset-Muster: x=${problem.offsetPattern.x}, y=${problem.offsetPattern.y}`);
        console.log(`   Beispiel: ${problem.example}`);
        console.log(`   Lösung: ${problem.fix}\n`);
    });
}

// Berechne Koordinaten-Korrektur basierend auf Beschreibung des Users
function calculateCorrection() {
    console.log('🎯 Berechne Korrektur für "etwas nach oben und links versetzt":\n');
    
    // User sagt: "etwas nach oben und links" bedeutet:
    // - Der erfasste Bereich ist oberhalb und links von der gewünschten Position
    // - Also müssen wir die Koordinaten nach unten und rechts verschieben
    
    const userProblem = {
        description: 'Erfasster Bereich ist zu weit oben und links',
        likelyOffsets: [
            { name: 'Kleiner Offset', x: 10, y: 15, description: 'Wenige Pixel daneben' },
            { name: 'Browser-UI Offset', x: 0, y: 65, description: 'Browser-Leisten werden mitgezählt' },
            { name: 'DPI-Skalierungs-Offset', x: 20, y: 20, description: 'Windows DPI-Skalierung' },
            { name: 'Auflösungs-Offset', x: 339, y: 324, description: '2560→1920 und 1440→1080 Skalierung' }
        ]
    };
    
    console.log(`Problem: ${userProblem.description}\n`);
    console.log('Mögliche Korrekturen (zu den Koordinaten ADDIEREN):\n');
    
    userProblem.likelyOffsets.forEach((offset, index) => {
        console.log(`${index + 1}. ${offset.name}:`);
        console.log(`   Korrektur: +${offset.x}px X, +${offset.y}px Y`);
        console.log(`   Ursache: ${offset.description}`);
        
        // Beispiel-Berechnung
        const testArea = { x: 1356, y: 1079, width: 98, height: 42 };
        const corrected = {
            x: testArea.x + offset.x,
            y: testArea.y + offset.y,
            width: testArea.width,
            height: testArea.height
        };
        
        console.log(`   Beispiel: {x:${testArea.x}, y:${testArea.y}} → {x:${corrected.x}, y:${corrected.y}}\n`);
    });
}

// Erstelle ein einfaches Patch-Script
function createQuickPatch() {
    console.log('🛠️  Erstelle schnellen Patch für main.js...\n');
    
    const mainJsPath = path.join(__dirname, 'main.js');
    if (!fs.existsSync(mainJsPath)) {
        console.log('❌ main.js nicht gefunden');
        return;
    }
    
    const patchContent = `
// QUICK FIX: Manuelle Koordinaten-Korrektur für "etwas oben und links" Problem
function quickFixCoordinateOffset(area, offsetX = 20, offsetY = 30) {
    // User-Problem: Erfassung ist "etwas nach oben und links versetzt"
    // Lösung: Koordinaten nach unten und rechts verschieben
    
    const corrected = {
        x: area.x + offsetX,  // Nach rechts verschieben
        y: area.y + offsetY,  // Nach unten verschieben  
        width: area.width,
        height: area.height
    };
    
    console.log(\`🔧 Quick-Fix Offset: \${JSON.stringify(area)} → \${JSON.stringify(corrected)}\`);
    return corrected;
}

// Überschreibe die scaleCoordinatesIfNeeded Funktion mit Quick-Fix
const originalScaleCoordinates = scaleCoordinatesIfNeeded;
scaleCoordinatesIfNeeded = function(area) {
    // Erst die normale Skalierung
    let scaled = originalScaleCoordinates(area);
    
    // Dann den Quick-Fix Offset anwenden
    scaled = quickFixCoordinateOffset(scaled, 20, 30); // Anpassbare Werte
    
    return scaled;
};
`;
    
    // Schreibe den Patch in eine separate Datei
    const patchPath = path.join(__dirname, 'coordinate-quick-fix-patch.js');
    fs.writeFileSync(patchPath, patchContent);
    
    console.log(`✅ Quick-Fix Patch erstellt: ${path.basename(patchPath)}`);
    console.log('\nUm den Patch anzuwenden:');
    console.log('1. Öffne main.js');
    console.log('2. Füge den Inhalt von coordinate-quick-fix-patch.js am Ende hinzu');
    console.log('3. Starte die App neu');
    console.log('4. Teste mit verschiedenen Offset-Werten (20, 30 sind Startwerte)');
}

// Erstelle Test-Koordinaten für verschiedene Offset-Szenarien
function createOffsetTestCases() {
    console.log('🧪 Erstelle Test-Fälle für verschiedene Offset-Probleme:\n');
    
    const baseArea = { x: 1356, y: 1079, width: 98, height: 42 };
    
    const testCases = [
        { name: 'Original', offset: { x: 0, y: 0 } },
        { name: 'Klein Offset', offset: { x: 10, y: 15 } },
        { name: 'Browser-UI', offset: { x: 0, y: 65 } },
        { name: 'DPI-Fix', offset: { x: 20, y: 20 } },
        { name: 'Auflösung 75%', offset: { x: 339, y: 270 } },
        { name: 'Kombiniert', offset: { x: 25, y: 45 } }
    ];
    
    console.log('Test-Koordinaten zum Ausprobieren:\n');
    
    testCases.forEach(testCase => {
        const corrected = {
            x: baseArea.x + testCase.offset.x,
            y: baseArea.y + testCase.offset.y,
            width: baseArea.width,
            height: baseArea.height
        };
        
        console.log(`${testCase.name}:`);
        console.log(`   Koordinaten: {x: ${corrected.x}, y: ${corrected.y}, width: ${corrected.width}, height: ${corrected.height}}`);
        console.log(`   Offset: +${testCase.offset.x}px X, +${testCase.offset.y}px Y\n`);
    });
    
    console.log('💡 Empfehlung: Starte mit "Klein Offset" und teste dich hoch zu "Kombiniert"\n');
}

// Hauptfunktion
function runQuickFix() {
    console.log('🚀 Schnelle Koordinaten-Korrektur für dein "oben und links"-Problem\n');
    
    analyzeTypicalOffsets();
    calculateCorrection();
    createQuickPatch();
    createOffsetTestCases();
    
    console.log('✨ Quick-Fix Analyse abgeschlossen!\n');
    console.log('🎯 Empfohlenes Vorgehen:');
    console.log('1. Verwende die "Klein Offset" Koordinaten zum Testen');
    console.log('2. Falls das nicht reicht, probiere "Browser-UI" oder "DPI-Fix"');
    console.log('3. Bei großen Abweichungen verwende "Auflösung 75%" oder "Kombiniert"');
    console.log('4. Passe die Offset-Werte in coordinate-quick-fix-patch.js an');
    console.log('\n🔧 Für permanente Lösung führe aus: node diagnose-coordinate-offset.js');
}

runQuickFix();
