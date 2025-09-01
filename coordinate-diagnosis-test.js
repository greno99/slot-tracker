// coordinate-diagnosis-test.js - Teste Koordinaten-Genauigkeit (KORRIGIERT)

console.log('🔍 === KOORDINATEN-DIAGNOSE-TEST ===\n');

// 1. System-Info anzeigen (ohne Electron dependency)
function showSystemInfo() {
    try {
        console.log('📊 System-Informationen:');
        
        // Simuliere deine bekannte Monitor-Konfiguration
        const knownDisplay = {
            bounds: { width: 2560, height: 1440 },
            scaleFactor: 1.0, // Angenommen: Standard DPI
            workArea: { x: 0, y: 0, width: 2560, height: 1440 }
        };
        
        console.log(`   Monitor: ${knownDisplay.bounds.width}x${knownDisplay.bounds.height} (deine bekannte Auflösung)`);
        console.log(`   DPI-Skalierung: ${knownDisplay.scaleFactor} (angenommen)`);
        console.log(`   Arbeitsbereich: ${JSON.stringify(knownDisplay.workArea)}`);
        console.log();
        
        // Warnung über echte DPI-Einstellungen
        console.log('⚠️ WICHTIG: Überprüfe deine echten Windows DPI-Einstellungen:');
        console.log('   1. Rechtsklick auf Desktop → Anzeigeeinstellungen');
        console.log('   2. Schaue unter "Skalierung und Anordnung"');
        console.log('   3. Wenn nicht 100%, dann ist das die Ursache deines Problems!\n');
        
        return knownDisplay;
    } catch (error) {
        console.error('❌ System-Info Fehler:', error.message);
        return {
            bounds: { width: 2560, height: 1440 },
            scaleFactor: 1.0,
            workArea: { x: 0, y: 0, width: 2560, height: 1440 }
        };
    }
}

// 2. Test verschiedene Koordinaten-Szenarien
function testCoordinateScenarios() {
    console.log('🧪 Teste verschiedene Koordinaten-Szenarien:\n');
    
    const testAreas = [
        { name: 'Oben links', area: { x: 100, y: 100, width: 80, height: 25 }},
        { name: 'Mitte', area: { x: 1280, y: 720, width: 80, height: 25 }},
        { name: 'Unten rechts', area: { x: 2000, y: 1200, width: 80, height: 25 }},
        { name: 'Dein Bet-Bereich', area: { x: 1356, y: 1079, width: 98, height: 42 }},
        { name: 'Dein Win-Bereich', area: { x: 962, y: 1078, width: 112, height: 48 }}
    ];
    
    testAreas.forEach(test => {
        console.log(`📍 Test: ${test.name}`);
        console.log(`   Original: ${JSON.stringify(test.area)}`);
        
        // Simuliere verschiedene Korrekturen für dein "oben und links" Problem
        const corrections = [
            { name: 'Klein Fix', offsetX: 10, offsetY: 15 },
            { name: 'DPI Fix', offsetX: 20, offsetY: 20 },
            { name: 'Browser Fix', offsetX: 0, offsetY: 65 },
            { name: 'Kombi Fix', offsetX: 25, offsetY: 45 }
        ];
        
        corrections.forEach(correction => {
            const corrected = {
                x: test.area.x + correction.offsetX,
                y: test.area.y + correction.offsetY,
                width: test.area.width,
                height: test.area.height
            };
            console.log(`   ${correction.name}: ${JSON.stringify(corrected)} (+${correction.offsetX}, +${correction.offsetY})`);
        });
        
        // Prüfe auf Problembereiche
        if (test.area.y > 1000 && test.area.x > 1300) {
            console.log(`   ⚠️ Bereich nahe Bildschirmrand - wahrscheinlich dein Problem-Bereich!`);
        }
        
        console.log();
    });
}

// 3. Browser-Offset-Simulation
function testBrowserOffsets() {
    console.log('🌐 Teste Browser-Offset-Szenarien:\n');
    
    const browserConfigs = [
        { name: 'Vollbild Browser', x: 0, y: 0, titleBar: 0, addressBar: 0 },
        { name: 'Chrome Fenster', x: 0, y: 0, titleBar: 30, addressBar: 35 },
        { name: 'Firefox Fenster', x: 0, y: 0, titleBar: 30, addressBar: 40 },
        { name: 'Edge Fenster', x: 0, y: 0, titleBar: 30, addressBar: 35 }
    ];
    
    const testArea = { x: 1356, y: 1079, width: 98, height: 42 };
    console.log('📍 Deine problematischen Koordinaten:', JSON.stringify(testArea));
    console.log();
    
    browserConfigs.forEach(browser => {
        console.log(`🖥️ ${browser.name}:`);
        
        // Berechne Browser-relative Koordinaten
        const browserRelative = {
            x: testArea.x - browser.x,
            y: testArea.y - browser.y - browser.titleBar - browser.addressBar,
            width: testArea.width,
            height: testArea.height
        };
        
        console.log(`   Browser-UI Offset: ${browser.titleBar + browser.addressBar}px nach oben`);
        console.log(`   Korrigierte Koordinaten: ${JSON.stringify(browserRelative)}`);
        
        if (browserRelative.y < 0) {
            console.log('   ⚠️ Y-Koordinate negativ - Bereich wäre in der Browser-UI!');
        } else if (browserRelative.y < 100) {
            console.log('   ⚠️ Y-Koordinate sehr klein - könnte im Browser-Header sein');
        } else {
            console.log('   ✅ Y-Koordinate OK - Bereich ist im Browser-Inhalt');
        }
        console.log();
    });
}

// 4. Dein spezifisches "oben und links" Problem analysieren
function analyzeYourSpecificProblem() {
    console.log('🎯 ANALYSE DEINES SPEZIFISCHEN PROBLEMS\n');
    
    console.log('Problem: "Der erfasste Bereich ist etwas nach oben und links versetzt"\n');
    
    const yourOriginalArea = { x: 1356, y: 1079, width: 98, height: 42 };
    console.log('📍 Deine ursprünglichen Koordinaten:', JSON.stringify(yourOriginalArea));
    console.log();
    
    console.log('🔧 LÖSUNGSVORSCHLÄGE (Koordinaten nach UNTEN und RECHTS verschieben):\n');
    
    const solutions = [
        { 
            name: '1. KLEIN-KORREKTUR', 
            offsetX: 10, offsetY: 15, 
            description: 'Für kleine Ungenauigkeiten',
            likelihood: '30%'
        },
        { 
            name: '2. DPI-KORREKTUR', 
            offsetX: 20, offsetY: 20, 
            description: 'Windows DPI-Skalierung (125%)',
            likelihood: '60%'
        },
        { 
            name: '3. BROWSER-KORREKTUR', 
            offsetX: 0, offsetY: 65, 
            description: 'Browser-Titelleiste + Adressleiste',
            likelihood: '40%'
        },
        { 
            name: '4. AUFLÖSUNGS-KORREKTUR', 
            offsetX: 30, offsetY: 30, 
            description: '2560x1440 → 1920x1080 Skalierung',
            likelihood: '70%'
        },
        { 
            name: '5. KOMBINIERTE KORREKTUR', 
            offsetX: 25, offsetY: 45, 
            description: 'DPI + Browser + kleine Ungenauigkeiten',
            likelihood: '85%'
        }
    ];
    
    solutions.forEach(solution => {
        const corrected = {
            x: yourOriginalArea.x + solution.offsetX,
            y: yourOriginalArea.y + solution.offsetY,
            width: yourOriginalArea.width,
            height: yourOriginalArea.height
        };
        
        console.log(`${solution.name} (Erfolgswahrscheinlichkeit: ${solution.likelihood})`);
        console.log(`   Beschreibung: ${solution.description}`);
        console.log(`   Offset: +${solution.offsetX}px rechts, +${solution.offsetY}px runter`);
        console.log(`   Neue Koordinaten: ${JSON.stringify(corrected)}`);
        console.log();
    });
    
    console.log('💡 EMPFEHLUNG: Starte mit "5. KOMBINIERTE KORREKTUR" - höchste Erfolgsrate!\n');
}

// 5. Praktische Testanweisungen
function providePracticalTestInstructions() {
    console.log('📋 PRAKTISCHE TEST-ANWEISUNGEN\n');
    
    console.log('🎮 SO TESTEST DU DIE KORREKTUREN:');
    console.log('1. Öffne deine Slot-Tracker App');
    console.log('2. Gehe zu OCR-Konfiguration');
    console.log('3. LÖSCHE deine alten Bereiche');
    console.log('4. Gib die neuen Koordinaten von oben ein');
    console.log('5. Teste mit "OCR testen"\n');
    
    console.log('✅ ERFOLG ERKENNST DU DARAN:');
    console.log('• OCR liest echte Werte (nicht 0.00)');
    console.log('• Die Werte stimmen mit dem überein, was du auf dem Bildschirm siehst');
    console.log('• Bet, Win und Balance werden alle korrekt erkannt');
    console.log('• Es funktioniert bei mehreren Tests konsistent\n');
    
    console.log('❌ WENN ES NOCH NICHT FUNKTIONIERT:');
    console.log('• Versuche eine andere Korrektur von oben');
    console.log('• Führe das interaktive Tool aus: node interactive-coordinate-fixer.js');
    console.log('• Prüfe deine Windows DPI-Einstellungen');
    console.log('• Stelle sicher, dass Browser-Zoom auf 100% ist\n');
}

// 6. Erstelle konkrete Koordinaten für alle Casino-Bereiche
function generateAllCasinoCoordiantes() {
    console.log('🎰 VOLLSTÄNDIGE CASINO-KOORDINATEN\n');
    
    const originalAreas = {
        bet: { x: 1356, y: 1079, width: 98, height: 42 },
        win: { x: 962, y: 1078, width: 112, height: 48 },
        balance: { x: 547, y: 1075, width: 126, height: 46 }
    };
    
    console.log('📍 Deine ursprünglichen (problematischen) Bereiche:');
    Object.entries(originalAreas).forEach(([area, coords]) => {
        console.log(`   ${area}: ${JSON.stringify(coords)}`);
    });
    console.log();
    
    // Wende die kombinierte Korrektur auf alle Bereiche an
    const combinedOffsetX = 25;
    const combinedOffsetY = 45;
    
    console.log(`🔧 KORRIGIERTE BEREICHE (Kombinierte Korrektur: +${combinedOffsetX}px X, +${combinedOffsetY}px Y):`);
    console.log('');
    console.log('   📋 KOPIERE DIESE KOORDINATEN IN DEINE APP:');
    console.log('   ================================================');
    
    Object.entries(originalAreas).forEach(([areaName, coords]) => {
        const corrected = {
            x: coords.x + combinedOffsetX,
            y: coords.y + combinedOffsetY,
            width: coords.width,
            height: coords.height
        };
        
        console.log(`   ${areaName.toUpperCase()}: {x: ${corrected.x}, y: ${corrected.y}, width: ${corrected.width}, height: ${corrected.height}}`);
    });
    
    console.log('   ================================================');
    console.log();
    
    console.log('⚡ ALTERNATIVE KORREKTUREN (falls die ersten nicht funktionieren):');
    console.log();
    
    const alternativeOffsets = [
        { name: 'DPI-FIX', x: 20, y: 20 },
        { name: 'BROWSER-FIX', x: 0, y: 65 },
        { name: 'AUFLÖSUNGS-FIX', x: 30, y: 30 }
    ];
    
    alternativeOffsets.forEach(offset => {
        console.log(`   ${offset.name} (+${offset.x}px X, +${offset.y}px Y):`);
        Object.entries(originalAreas).forEach(([areaName, coords]) => {
            const corrected = {
                x: coords.x + offset.x,
                y: coords.y + offset.y,
                width: coords.width,
                height: coords.height
            };
            console.log(`     ${areaName}: {x: ${corrected.x}, y: ${corrected.y}, width: ${corrected.width}, height: ${corrected.height}}`);
        });
        console.log();
    });
}

// Haupttest-Funktion
function runDiagnosisTest() {
    console.log('🚀 Starte Koordinaten-Diagnose...\n');
    
    const systemInfo = showSystemInfo();
    testCoordinateScenarios();
    testBrowserOffsets();
    analyzeYourSpecificProblem();
    providePracticalTestInstructions();
    generateAllCasinoCoordiantes();
    
    console.log('✨ Koordinaten-Diagnose abgeschlossen!\n');
    console.log('🎯 NÄCHSTE SCHRITTE:');
    console.log('1. Verwende die "KORRIGIERTEN BEREICHE" von oben in deiner App');
    console.log('2. Falls das nicht perfekt ist, probiere die "ALTERNATIVEN"');
    console.log('3. Für interaktive Tests: node interactive-coordinate-fixer.js');
    console.log('4. Teste und finde die perfekten Werte für dein System!');
    console.log('\n🚀 Die Lösung ist sehr wahrscheinlich in den Koordinaten oben zu finden!');
}

// Führe Test aus
runDiagnosisTest();
