// interactive-coordinate-fixer.js - Interaktives Tool zur Koordinaten-Korrektur

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🎯 Interaktiver Koordinaten-Fixer');
console.log('==================================\n');

let userOffset = { x: 0, y: 0 };
let testArea = { x: 1356, y: 1079, width: 98, height: 42 };

// Haupt-Menü
function showMainMenu() {
    console.log('\n🔧 Was möchtest du tun?');
    console.log('1. 📊 Problem analysieren');
    console.log('2. 🧪 Koordinaten-Offset testen');
    console.log('3. 💾 Funktionierende Koordinaten speichern');
    console.log('4. 🔍 Gespeicherte Konfiguration anzeigen');
    console.log('5. ⚡ Express-Fix anwenden');
    console.log('0. ❌ Beenden\n');
    
    rl.question('Deine Wahl (0-5): ', handleMainMenu);
}

function handleMainMenu(choice) {
    switch(choice.trim()) {
        case '1': analyzeProblem(); break;
        case '2': testCoordinateOffset(); break;
        case '3': saveWorkingCoordinates(); break;
        case '4': showCurrentConfig(); break;
        case '5': applyExpressFix(); break;
        case '0': 
            console.log('👋 Auf Wiedersehen!');
            rl.close();
            break;
        default:
            console.log('❌ Ungültige Auswahl. Bitte 0-5 eingeben.');
            showMainMenu();
    }
}

function analyzeProblem() {
    console.log('\n🔍 PROBLEM-ANALYSE');
    console.log('===================\n');
    
    rl.question('Beschreibe dein Problem (z.B. "10px nach oben und links"): ', (problem) => {
        console.log(`\n📝 Dein Problem: "${problem}"\n`);
        
        if (problem.toLowerCase().includes('oben') && problem.toLowerCase().includes('links')) {
            console.log('✅ Typisches "Oben-Links" Problem erkannt!');
            console.log('💡 Lösung: Koordinaten nach UNTEN und RECHTS verschieben\n');
            
            console.log('🎯 Empfohlene Test-Offsets:');
            console.log('   Klein:     +10px X, +15px Y');
            console.log('   Mittel:    +20px X, +30px Y');  
            console.log('   Groß:      +30px X, +65px Y');
            console.log('   Browser:   +0px X,  +65px Y');
            console.log('   DPI:       +25px X, +25px Y\n');
            
            userOffset = { x: 20, y: 30 }; // Standard-Empfehlung
            console.log(`🔧 Setze Standard-Offset: +${userOffset.x}px X, +${userOffset.y}px Y\n`);
        }
        
        showMainMenu();
    });
}

function testCoordinateOffset() {
    console.log('\n🧪 KOORDINATEN-OFFSET TESTER');
    console.log('==============================\n');
    
    console.log(`📍 Aktuelle Test-Koordinaten: {x: ${testArea.x}, y: ${testArea.y}, width: ${testArea.width}, height: ${testArea.height}}`);
    console.log(`🔧 Aktueller Offset: +${userOffset.x}px X, +${userOffset.y}px Y\n`);
    
    const corrected = {
        x: testArea.x + userOffset.x,
        y: testArea.y + userOffset.y,
        width: testArea.width,
        height: testArea.height
    };
    
    console.log(`🎯 Korrigierte Koordinaten: {x: ${corrected.x}, y: ${corrected.y}, width: ${corrected.width}, height: ${corrected.height}}\n`);
    
    console.log('Was möchtest du tun?');
    console.log('1. ⚙️  Offset ändern');
    console.log('2. 📍 Test-Koordinaten ändern');
    console.log('3. 💾 Diese Koordinaten als funktionierend markieren');
    console.log('4. 🔙 Zurück zum Hauptmenü\n');
    
    rl.question('Deine Wahl (1-4): ', (choice) => {
        switch(choice.trim()) {
            case '1': changeOffset(); break;
            case '2': changeTestCoordinates(); break;
            case '3': 
                console.log('✅ Koordinaten als funktionierend markiert!\n');
                saveWorkingCoordinates(corrected);
                break;
            case '4': showMainMenu(); break;
            default:
                console.log('❌ Ungültige Auswahl.');
                testCoordinateOffset();
        }
    });
}

function changeOffset() {
    console.log('\n⚙️ OFFSET ÄNDERN\n');
    
    rl.question(`Neuer X-Offset (aktuell: +${userOffset.x}px): `, (newX) => {
        rl.question(`Neuer Y-Offset (aktuell: +${userOffset.y}px): `, (newY) => {
            userOffset.x = parseInt(newX) || userOffset.x;
            userOffset.y = parseInt(newY) || userOffset.y;
            
            console.log(`✅ Offset geändert auf: +${userOffset.x}px X, +${userOffset.y}px Y\n`);
            testCoordinateOffset();
        });
    });
}

function changeTestCoordinates() {
    console.log('\n📍 TEST-KOORDINATEN ÄNDERN\n');
    
    rl.question(`Neue X-Position (aktuell: ${testArea.x}): `, (newX) => {
        rl.question(`Neue Y-Position (aktuell: ${testArea.y}): `, (newY) => {
            rl.question(`Neue Breite (aktuell: ${testArea.width}): `, (newW) => {
                rl.question(`Neue Höhe (aktuell: ${testArea.height}): `, (newH) => {
                    testArea.x = parseInt(newX) || testArea.x;
                    testArea.y = parseInt(newY) || testArea.y;
                    testArea.width = parseInt(newW) || testArea.width;
                    testArea.height = parseInt(newH) || testArea.height;
                    
                    console.log(`✅ Test-Koordinaten geändert!\n`);
                    testCoordinateOffset();
                });
            });
        });
    });
}

function saveWorkingCoordinates(coords = null) {
    console.log('\n💾 KOORDINATEN SPEICHERN');
    console.log('=========================\n');
    
    if (!coords) {
        coords = {
            x: testArea.x + userOffset.x,
            y: testArea.y + userOffset.y,
            width: testArea.width,
            height: testArea.height
        };
    }
    
    const workingConfig = {
        offset: userOffset,
        testArea: testArea,
        correctedCoordinates: coords,
        timestamp: new Date().toISOString(),
        notes: 'Interaktiv getestete und funktionierende Koordinaten'
    };
    
    // Speichere in JSON-Datei
    const configPath = path.join(__dirname, 'working-coordinates.json');
    let existingConfig = {};
    
    if (fs.existsSync(configPath)) {
        try {
            existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) {
            console.log('⚠️ Warnung: Bestehende Konfiguration konnte nicht gelesen werden');
        }
    }
    
    existingConfig[`config_${Date.now()}`] = workingConfig;
    
    fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));
    
    console.log('✅ Koordinaten gespeichert in working-coordinates.json');
    console.log(`📍 Funktionierende Koordinaten: {x: ${coords.x}, y: ${coords.y}, width: ${coords.width}, height: ${coords.height}}`);
    console.log(`🔧 Verwendeter Offset: +${userOffset.x}px X, +${userOffset.y}px Y\n`);
    
    // Erstelle auch direkt verwendbaren Code
    const codeSnippet = `
// Funktionierende Koordinaten (getestet am ${new Date().toLocaleDateString()})
const workingAreas = {
    bet: { x: ${coords.x}, y: ${coords.y}, width: ${coords.width}, height: ${coords.height} },
    win: { x: ${coords.x - 394}, y: ${coords.y - 1}, width: 112, height: 48 },
    balance: { x: ${coords.x - 784}, y: ${coords.y - 4}, width: 126, height: 46 }
};

// Offset-Funktion für zukünftige Bereiche
function applyOffset(area) {
    return {
        x: area.x + ${userOffset.x},
        y: area.y + ${userOffset.y},
        width: area.width,
        height: area.height
    };
}
`;
    
    fs.writeFileSync(path.join(__dirname, 'working-coordinates-code.js'), codeSnippet);
    console.log('✅ Code-Snippet gespeichert in working-coordinates-code.js\n');
    
    showMainMenu();
}

function showCurrentConfig() {
    console.log('\n🔍 AKTUELLE KONFIGURATION');
    console.log('==========================\n');
    
    const configPath = path.join(__dirname, 'working-coordinates.json');
    
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const entries = Object.entries(config);
            
            if (entries.length > 0) {
                console.log(`📁 ${entries.length} gespeicherte Konfiguration(en) gefunden:\n`);
                
                entries.forEach(([key, value], index) => {
                    console.log(`${index + 1}. ${new Date(value.timestamp).toLocaleString()}`);
                    console.log(`   Koordinaten: {x: ${value.correctedCoordinates.x}, y: ${value.correctedCoordinates.y}, width: ${value.correctedCoordinates.width}, height: ${value.correctedCoordinates.height}}`);
                    console.log(`   Offset: +${value.offset.x}px X, +${value.offset.y}px Y\n`);
                });
                
                rl.question('Welche Konfiguration laden? (Nummer oder Enter für keine): ', (choice) => {
                    const index = parseInt(choice) - 1;
                    if (index >= 0 && index < entries.length) {
                        const selectedConfig = entries[index][1];
                        userOffset = selectedConfig.offset;
                        testArea = selectedConfig.testArea;
                        console.log('✅ Konfiguration geladen!\n');
                    }
                    showMainMenu();
                });
                
                return;
            }
        } catch (e) {
            console.log('❌ Fehler beim Lesen der Konfiguration');
        }
    }
    
    console.log('📂 Keine gespeicherten Konfigurationen gefunden.\n');
    showMainMenu();
}

function applyExpressFix() {
    console.log('\n⚡ EXPRESS-FIX');
    console.log('================\n');
    
    console.log('🎯 Wende bewährte Standard-Offsets an...\n');
    
    const expressOffsets = [
        { name: 'Browser + Klein', x: 10, y: 65, description: 'Browser-UI + kleine Korrektur' },
        { name: 'DPI Standard', x: 25, y: 30, description: 'Typische DPI-Skalierungs-Korrektur' },
        { name: 'Auflösung 75%', x: 20, y: 20, description: '2560→1920 Skalierungs-Korrektur' },
        { name: 'Kombiniert', x: 25, y: 45, description: 'Mehrere Probleme kombiniert' }
    ];
    
    console.log('Wähle einen Express-Fix:');
    expressOffsets.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix.name}: +${fix.x}px X, +${fix.y}px Y (${fix.description})`);
    });
    console.log('0. Zurück\n');
    
    rl.question('Deine Wahl (0-4): ', (choice) => {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < expressOffsets.length) {
            const selectedFix = expressOffsets[index];
            userOffset = { x: selectedFix.x, y: selectedFix.y };
            
            console.log(`✅ ${selectedFix.name} Express-Fix angewendet!`);
            console.log(`🔧 Offset: +${userOffset.x}px X, +${userOffset.y}px Y\n`);
            
            // Zeige sofort die Ergebnisse
            testCoordinateOffset();
        } else if (choice.trim() === '0') {
            showMainMenu();
        } else {
            console.log('❌ Ungültige Auswahl.');
            applyExpressFix();
        }
    });
}

// Starte das Tool
function start() {
    console.log('Dieses Tool hilft dir dabei, die richtigen Koordinaten-Offsets zu finden.');
    console.log('Du kannst verschiedene Werte testen und funktionierende Konfigurationen speichern.\n');
    
    showMainMenu();
}

start();
