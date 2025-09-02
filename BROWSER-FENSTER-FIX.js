
// === BROWSER-FENSTER DETECTION FIX ===
// Füge diesen Code in main.js ein (statt dem Offset-Fix):

async function getBrowserWindowPosition() {
    const { execSync } = require('child_process');
    
    try {
        const psScript = `
Get-Process | Where-Object {
    \$_.MainWindowTitle -match "casino|slot|bet|game" -and
    \$_.ProcessName -match "chrome|firefox|msedge|opera"
} | ForEach-Object {
    Add-Type -AssemblyName System.Windows.Forms
    \$handle = \$_.MainWindowHandle
    if (\$handle -ne [IntPtr]::Zero) {
        try {
            \$form = [System.Windows.Forms.Form]::FromHandle(\$handle)
            Write-Host "BROWSER:\$(\$form.Left):\$(\$form.Top):\$(\$form.Width):\$(\$form.Height)"
        } catch {
            Write-Host "BROWSER:0:0:1920:1080"
        }
    }
}
        `;
        
        const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, {
            encoding: 'utf8',
            timeout: 5000
        });
        
        const browserLine = result.split('\n').find(line => line.startsWith('BROWSER:'));
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
