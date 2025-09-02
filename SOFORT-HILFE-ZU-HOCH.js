// SOFORT-HILFE für "Screenshot ist viel zu hoch" Problem
const { BrowserWindow, screen, ipcMain } = require('electron');

console.log('🆘 SOFORT-HILFE: Screenshot viel zu hoch');
console.log('=========================================');

// Das Problem: Y-Koordinaten funktionieren nicht = Browser-Fenster vs Desktop-Koordinaten Problem!

console.log('\n🔍 WAHRSCHEINLICHE URSACHE:');
console.log('Deine Koordinaten sind relativ zum BROWSER-FENSTER,');
console.log('aber die Screenshot-Funktion erfasst den GANZEN DESKTOP!');

console.log('\n⚡ SOFORT-LÖSUNGEN (der Reihe nach probieren):');

console.log('\n1️⃣ BROWSER-POSITION KORRIGIEREN:');
console.log('   - Casino-Browser MAXIMIEREN (F11 oder Vollbild)');  
console.log('   - Browser auf HAUPTMONITOR verschieben');
console.log('   - Browser oben links positionieren (X=0, Y=0)');

console.log('\n2️⃣ KOORDINATEN NEU KALIBRIEREN:');
console.log('   - Spin Detection öffnen');
console.log('   - ALLE alten OCR-Bereiche LÖSCHEN');
console.log('   - Neue Bereiche mit Maus markieren (nicht eingeben!)');
console.log('   - Bei Bereich-Auswahl: Casino-Fenster im VORDERGRUND');

console.log('\n3️⃣ BROWSER-TOOLBAR BERÜCKSICHTIGEN:');
console.log('   - Browser hat vermutlich Toolbar/Adressleiste');
console.log('   - Das verschiebt alles um ~60-80 Pixel nach unten');
console.log('   - Probiere: Y-Koordinaten + 70 Pixel');

console.log('\n4️⃣ MULTI-MONITOR PROBLEM:');
console.log('   - Falls du mehrere Monitore hast:');
console.log('   - Casino NUR auf dem HAUPTMONITOR spielen');
console.log('   - Andere Monitore temporär deaktivieren');

console.log('\n🔧 SCHNELL-TEST:');
console.log('1. node coordinate-diagnostic-tool.js  (ausführen für Diagnose)');
console.log('2. Schaue dir die Debug-Screenshots an');
console.log('3. Vergleiche wo der Screenshot ist vs. wo er sein sollte');

console.log('\n🎯 WAHRSCHEINLICHSTE LÖSUNG:');
console.log('Das Problem ist NICHT der Offset-Code, sondern:');
console.log('→ Browser-Fenster Position ist unbekannt');
console.log('→ Screenshot erfasst Desktop, Koordinaten sind Browser-relativ');
console.log('→ Du brauchst Browser-Fenster Detection!');

// Erstelle sofort anwendbares Browser-Fenster Detection Tool
const browserDetectionCode = `
// === BROWSER-FENSTER DETECTION FIX ===
// Füge diesen Code in main.js ein (statt dem Offset-Fix):

async function getBrowserWindowPosition() {
    const { execSync } = require('child_process');
    
    try {
        const psScript = \`
Get-Process | Where-Object {
    \\$_.MainWindowTitle -match "casino|slot|bet|game" -and
    \\$_.ProcessName -match "chrome|firefox|msedge|opera"
} | ForEach-Object {
    Add-Type -AssemblyName System.Windows.Forms
    \\$handle = \\$_.MainWindowHandle
    if (\\$handle -ne [IntPtr]::Zero) {
        try {
            \\$form = [System.Windows.Forms.Form]::FromHandle(\\$handle)
            Write-Host "BROWSER:\\$(\\$form.Left):\\$(\\$form.Top):\\$(\\$form.Width):\\$(\\$form.Height)"
        } catch {
            Write-Host "BROWSER:0:0:1920:1080"
        }
    }
}
        \`;
        
        const result = execSync(\`powershell -ExecutionPolicy Bypass -Command "\${psScript}"\`, {
            encoding: 'utf8',
            timeout: 5000
        });
        
        const browserLine = result.split('\\n').find(line => line.startsWith('BROWSER:'));
        if (browserLine) {
            const [, x, y, width, height] = browserLine.split(':').map(Number);
            return { x, y, width, height, found: true };
        }
        
    } catch (error) {
        console.warn('Browser-Erkennung fehlgeschlagen:', error.message);
    }
    
    // Fallback: Annahme dass Browser maximiert ist
    return { x: 0, y: 0, width: 2560, height: 1440, found: false };
}

// Überschreibe die Koordinaten-Funktion:
const originalScaleCoordinates = scaleCoordinatesIfNeeded;
scaleCoordinatesIfNeeded = async function(area) {
    // Erst original Skalierung
    let scaledArea = originalScaleCoordinates(area);
    
    // Dann Browser-Fenster Position hinzufügen
    const browserPos = await getBrowserWindowPosition();
    
    if (browserPos.found) {
        console.log('🌐 Browser-Fenster gefunden:', browserPos);
        
        // Koordinaten von Browser-relativ zu Desktop-absolut konvertieren
        return {
            x: browserPos.x + scaledArea.x,
            y: browserPos.y + scaledArea.y + 70, // +70 für Browser-Toolbar
            width: scaledArea.width,
            height: scaledArea.height
        };
    } else {
        console.log('⚠️ Browser nicht gefunden - verwende Standard-Offset');
        
        // Fallback für maximierten Browser mit Toolbar
        return {
            x: scaledArea.x,
            y: scaledArea.y + 70, // Nur Toolbar-Höhe hinzufügen
            width: scaledArea.width,
            height: scaledArea.height
        };
    }
};

console.log('✅ Browser-Fenster Detection aktiviert');
// === BROWSER-DETECTION ENDE ===
`;

// Code in Datei speichern
const fs = require('fs');
const path = require('path');

fs.writeFileSync(path.join(__dirname, 'BROWSER-FENSTER-FIX.js'), browserDetectionCode);

console.log('\n💾 BROWSER-FENSTER-FIX.js erstellt!');

console.log('\n🚀 NÄCHSTE SCHRITTE:');
console.log('1. Den alten Offset-Fix aus main.js ENTFERNEN');
console.log('2. Code aus BROWSER-FENSTER-FIX.js in main.js einfügen');  
console.log('3. App neustarten');
console.log('4. Browser-Fenster mit Casino öffnen (Titel sollte "casino" enthalten)');
console.log('5. OCR testen');

console.log('\n🔍 ODER ERST DIAGNOSTIZIEREN:');
console.log('node coordinate-diagnostic-tool.js');
console.log('(erstellt Screenshots um das Problem zu sehen)');

console.log('\n❓ FALLS IMMER NOCH PROBLEME:');
console.log('Das ist dann wahrscheinlich ein Monitor-DPI oder Multi-Monitor Problem.');
console.log('Die Diagnose wird das genau zeigen!');
