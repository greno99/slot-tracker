// standalone-coordinate-diagnostic.js - Funktioniert ohne Electron
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class StandaloneCoordinateDiagnostic {
    constructor() {
        this.debugDir = path.join(__dirname, 'coordinate-debug');
        this.results = {};
        this.ensureDebugDir();
    }

    ensureDebugDir() {
        if (!fs.existsSync(this.debugDir)) {
            fs.mkdirSync(this.debugDir, { recursive: true });
        }
    }

    // SCHRITT 1: System-Analyse ohne Electron
    async diagnoseSystem() {
        console.log('🔍 STANDALONE SYSTEM-DIAGNOSE GESTARTET');
        console.log('=========================================');

        // 1. Display-Informationen über PowerShell sammeln
        await this.analyzeDisplaysViaPS();
        
        // 2. Browser-Fenster finden
        await this.findBrowserWindows();
        
        // 3. Screenshot-Tests
        await this.testScreenshotMethods();
        
        // 4. Casino-Bereich Tests
        await this.testCasinoAreas();
        
        // 5. Diagnose-Bericht erstellen
        this.generateDiagnosisReport();
        
        return this.results;
    }

    async analyzeDisplaysViaPS() {
        console.log('\n📺 DISPLAY-ANALYSE (PowerShell):');
        
        try {
            const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$screens = [System.Windows.Forms.Screen]::AllScreens

$primary = [System.Windows.Forms.Screen]::PrimaryScreen
$primaryInfo = @{
    Width = $primary.Bounds.Width
    Height = $primary.Bounds.Height  
    X = $primary.Bounds.X
    Y = $primary.Bounds.Y
    WorkingAreaWidth = $primary.WorkingArea.Width
    WorkingAreaHeight = $primary.WorkingArea.Height
    BitsPerPixel = $primary.BitsPerPixel
    Primary = $true
}

$allScreens = @()
foreach ($screen in $screens) {
    $screenInfo = @{
        Width = $screen.Bounds.Width
        Height = $screen.Bounds.Height
        X = $screen.Bounds.X  
        Y = $screen.Bounds.Y
        WorkingAreaWidth = $screen.WorkingArea.Width
        WorkingAreaHeight = $screen.WorkingArea.Height
        Primary = $screen.Primary
        DeviceName = $screen.DeviceName
    }
    $allScreens += $screenInfo
}

$result = @{
    Primary = $primaryInfo
    All = $allScreens
    Count = $screens.Count
}

$result | ConvertTo-Json -Depth 3
`;

            const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, {
                encoding: 'utf8',
                timeout: 10000
            });

            const displayInfo = JSON.parse(result);
            this.results.displays = displayInfo;

            console.log(`   Primärer Monitor: ${displayInfo.Primary.Width}x${displayInfo.Primary.Height}`);
            console.log(`   Arbeitsbereich: ${displayInfo.Primary.WorkingAreaWidth}x${displayInfo.Primary.WorkingAreaHeight}`);
            console.log(`   Anzahl Monitore: ${displayInfo.Count}`);
            
            if (displayInfo.Count > 1) {
                console.log('   ⚠️ MULTI-MONITOR SETUP ERKANNT!');
                displayInfo.All.forEach((display, i) => {
                    console.log(`     Monitor ${i + 1}: ${display.Width}x${display.Height} @ (${display.X}, ${display.Y})`);
                });
            }

        } catch (error) {
            console.log('   ❌ Display-Analyse fehlgeschlagen:', error.message);
            
            // Fallback: Standard-Werte für 2560x1440
            this.results.displays = {
                Primary: { Width: 2560, Height: 1440, X: 0, Y: 0 },
                Count: 1
            };
        }
    }

    async findBrowserWindows() {
        console.log('\n🌐 BROWSER-FENSTER SUCHE:');
        
        try {
            const psScript = `
Get-Process | Where-Object {
    $_.MainWindowTitle -ne "" -and 
    ($_.ProcessName -match "chrome|firefox|msedge|opera|brave")
} | ForEach-Object {
    $bounds = @{
        ProcessName = $_.ProcessName
        WindowTitle = $_.MainWindowTitle
        ProcessId = $_.Id
        HasCasino = $_.MainWindowTitle -match "casino|bet|slot|game|stake|roulette|blackjack"
    }
    
    # Versuche Fenster-Position zu ermitteln
    try {
        Add-Type -AssemblyName System.Windows.Forms
        $handle = $_.MainWindowHandle
        if ($handle -ne [IntPtr]::Zero) {
            
            # Windows API für Fenster-Rectangle
            Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
    }
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
}
"@
            
            $rect = New-Object WinAPI+RECT
            if ([WinAPI]::GetWindowRect($handle, [ref]$rect)) {
                $bounds.X = $rect.Left
                $bounds.Y = $rect.Top  
                $bounds.Width = $rect.Right - $rect.Left
                $bounds.Height = $rect.Bottom - $rect.Top
                $bounds.Method = "WinAPI"
            } else {
                # Fallback über .NET Forms
                try {
                    $form = [System.Windows.Forms.Form]::FromHandle($handle)
                    if ($form) {
                        $bounds.X = $form.Left
                        $bounds.Y = $form.Top
                        $bounds.Width = $form.Width  
                        $bounds.Height = $form.Height
                        $bounds.Method = "Forms"
                    }
                } catch {
                    $bounds.X = -1
                    $bounds.Y = -1
                    $bounds.Width = -1
                    $bounds.Height = -1
                    $bounds.Method = "Failed"
                }
            }
        }
    } catch {
        $bounds.X = -1
        $bounds.Y = -1
        $bounds.Width = -1
        $bounds.Height = -1
        $bounds.Error = $_.Exception.Message
        $bounds.Method = "Error"
    }
    
    $bounds | ConvertTo-Json -Compress
}`;

            const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, {
                encoding: 'utf8',
                timeout: 15000
            });

            const lines = result.split('\n').filter(line => line.trim());
            const browserWindows = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            }).filter(Boolean);

            this.results.browserWindows = browserWindows;

            console.log(`   Gefundene Browser: ${browserWindows.length}`);
            browserWindows.forEach((browser, i) => {
                const pos = browser.X >= 0 ? 
                    `${browser.X}, ${browser.Y} (${browser.Width}x${browser.Height})` : 
                    'Position unbekannt';
                const casinoMarker = browser.HasCasino ? ' 🎰 CASINO' : '';
                
                console.log(`     ${i + 1}. ${browser.ProcessName}: "${browser.WindowTitle.substring(0, 50)}..."${casinoMarker}`);
                console.log(`        Position: ${pos} [${browser.Method}]`);
            });

            // Suche nach Casino-Browser
            const casinoBrowser = browserWindows.find(b => b.HasCasino && b.X >= 0);
            if (casinoBrowser) {
                console.log(`   ✅ Casino-Browser gefunden: ${casinoBrowser.ProcessName} @ ${casinoBrowser.X},${casinoBrowser.Y}`);
                this.results.casinoBrowser = casinoBrowser;
            } else {
                console.log('   ⚠️ Kein Casino-Browser mit gültiger Position gefunden');
            }

        } catch (error) {
            console.log('   ❌ Browser-Erkennung fehlgeschlagen:', error.message);
            this.results.browserWindows = [];
        }
    }

    async testScreenshotMethods() {
        console.log('\n📸 SCREENSHOT-METHODEN TEST:');
        
        const methods = [
            { name: 'PowerShell GDI', func: () => this.screenshotPowerShellGDI() },
            { name: 'PowerShell BitBlt', func: () => this.screenshotPowerShellBitBlt() },
            { name: 'PowerShell Graphics', func: () => this.screenshotPowerShellGraphics() }
        ];

        this.results.screenshotMethods = [];

        for (const method of methods) {
            try {
                console.log(`   Testing ${method.name}...`);
                const result = await method.func();
                
                this.results.screenshotMethods.push({
                    name: method.name,
                    success: true,
                    size: result.size,
                    dimensions: result.dimensions,
                    path: result.path,
                    method: result.method
                });
                
                console.log(`     ✅ ${method.name}: ${result.dimensions.width}x${result.dimensions.height} (${Math.round(result.size / 1024)}KB)`);
                
            } catch (error) {
                console.log(`     ❌ ${method.name}: ${error.message}`);
                
                this.results.screenshotMethods.push({
                    name: method.name,
                    success: false,
                    error: error.message
                });
            }
        }
    }

    async screenshotPowerShellGDI() {
        const tempPath = path.join(this.debugDir, `gdi-screenshot-${Date.now()}.png`);
        
        const psScript = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)

$bitmap.Save('${tempPath.replace(/\\/g, '\\\\')}', 'Png')

Write-Host "SUCCESS:$($bounds.Width)x$($bounds.Height)"

$graphics.Dispose()
$bitmap.Dispose()`;

        const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, {
            encoding: 'utf8',
            timeout: 15000
        });

        if (!result.includes('SUCCESS:') || !fs.existsSync(tempPath)) {
            throw new Error('PowerShell GDI Screenshot fehlgeschlagen');
        }

        const buffer = fs.readFileSync(tempPath);
        const dimensions = this.getImageDimensions(buffer);

        return {
            size: buffer.length,
            dimensions: dimensions,
            path: tempPath,
            method: 'powershell-gdi'
        };
    }

    async screenshotPowerShellBitBlt() {
        const tempPath = path.join(this.debugDir, `bitblt-screenshot-${Date.now()}.png`);
        
        const psScript = `
Add-Type @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class ScreenCapture {
    [DllImport("user32.dll")]
    public static extern IntPtr GetDC(IntPtr hwnd);
    
    [DllImport("user32.dll")]  
    public static extern int ReleaseDC(IntPtr hwnd, IntPtr hdc);
    
    [DllImport("gdi32.dll")]
    public static extern IntPtr CreateCompatibleDC(IntPtr hdc);
    
    [DllImport("gdi32.dll")]
    public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int cx, int cy);
    
    [DllImport("gdi32.dll")]
    public static extern IntPtr SelectObject(IntPtr hdc, IntPtr obj);
    
    [DllImport("gdi32.dll")]
    public static extern bool BitBlt(IntPtr hdcDest, int xDest, int yDest, int wDest, int hDest, IntPtr hdcSrc, int xSrc, int ySrc, uint rop);
    
    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);
    
    public static Bitmap CaptureScreen() {
        int width = GetSystemMetrics(0);
        int height = GetSystemMetrics(1);
        
        IntPtr hdcSrc = GetDC(IntPtr.Zero);
        IntPtr hdcDest = CreateCompatibleDC(hdcSrc);
        IntPtr hBitmap = CreateCompatibleBitmap(hdcSrc, width, height);
        IntPtr hOld = SelectObject(hdcDest, hBitmap);
        
        BitBlt(hdcDest, 0, 0, width, height, hdcSrc, 0, 0, 0x00CC0020);
        
        Bitmap bitmap = Image.FromHbitmap(hBitmap);
        
        SelectObject(hdcDest, hOld);
        ReleaseDC(IntPtr.Zero, hdcSrc);
        
        return bitmap;
    }
}
"@ -ReferencedAssemblies System.Drawing

$bitmap = [ScreenCapture]::CaptureScreen()
$bitmap.Save('${tempPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "SUCCESS:$($bitmap.Width)x$($bitmap.Height)"

$bitmap.Dispose()`;

        const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, {
            encoding: 'utf8',
            timeout: 15000
        });

        if (!result.includes('SUCCESS:') || !fs.existsSync(tempPath)) {
            throw new Error('PowerShell BitBlt Screenshot fehlgeschlagen');
        }

        const buffer = fs.readFileSync(tempPath);
        const dimensions = this.getImageDimensions(buffer);

        return {
            size: buffer.length,
            dimensions: dimensions,
            path: tempPath,
            method: 'powershell-bitblt'
        };
    }

    async screenshotPowerShellGraphics() {
        const tempPath = path.join(this.debugDir, `graphics-screenshot-${Date.now()}.png`);
        
        const psScript = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

# Alternative Graphics-basierte Methode
$screenBounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $screenBounds.Width, $screenBounds.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb

$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screenBounds.Left, $screenBounds.Top, 0, 0, $screenBounds.Size, [System.Drawing.CopyPixelOperation]::SourceCopy)

$bitmap.Save('${tempPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "SUCCESS:$($bitmap.Width)x$($bitmap.Height)"

$graphics.Dispose()
$bitmap.Dispose()`;

        const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, {
            encoding: 'utf8',
            timeout: 15000
        });

        if (!result.includes('SUCCESS:') || !fs.existsSync(tempPath)) {
            throw new Error('PowerShell Graphics Screenshot fehlgeschlagen');
        }

        const buffer = fs.readFileSync(tempPath);
        const dimensions = this.getImageDimensions(buffer);

        return {
            size: buffer.length,
            dimensions: dimensions,
            path: tempPath,
            method: 'powershell-graphics'
        };
    }

    getImageDimensions(buffer) {
        // Einfache PNG-Dimensionen aus Header lesen
        if (buffer.length < 24) return { width: 0, height: 0 };
        
        // PNG Signature und IHDR prüfen
        if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
            return { width: 0, height: 0 };
        }
        
        // Width und Height aus IHDR lesen (Big Endian)
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        
        return { width, height };
    }

    async testCasinoAreas() {
        console.log('\n🎰 CASINO-BEREICH TESTS:');
        
        // Standard Casino-Koordinaten (deine ursprünglichen)
        const testAreas = [
            { name: 'BET-Bereich', x: 1356, y: 1079, width: 98, height: 42 },
            { name: 'WIN-Bereich', x: 962, y: 1082, width: 112, height: 48 },
            { name: 'BALANCE-Bereich', x: 552, y: 1075, width: 126, height: 46 },
            // Test-Bereiche für Koordinaten-Verifikation
            { name: 'Oben-Links-Test', x: 100, y: 100, width: 200, height: 100 },
            { name: 'Zentrum-Test', x: 1280, y: 720, width: 200, height: 100 },
            { name: 'Unten-Rechts-Test', x: 2000, y: 1200, width: 200, height: 100 }
        ];

        this.results.casinoTests = [];

        // Verwende die beste Screenshot-Methode
        const bestMethod = this.results.screenshotMethods.find(m => m.success);
        if (!bestMethod) {
            console.log('   ❌ Keine funktionierende Screenshot-Methode verfügbar');
            return;
        }

        console.log(`   Verwende Screenshot-Methode: ${bestMethod.name}`);
        
        for (const area of testAreas) {
            try {
                console.log(`   Testing ${area.name} @ ${area.x},${area.y}...`);
                
                // Screenshots mit verschiedenen Koordinaten-Anpassungen
                const testVariations = [
                    { name: 'Original', offsetX: 0, offsetY: 0 },
                    { name: 'Browser-Toolbar', offsetX: 0, offsetY: 70 },
                    { name: 'Standard-Offset', offsetX: 20, offsetY: 35 }
                ];

                // Falls Casino-Browser gefunden wurde, teste auch Browser-relative Koordinaten
                if (this.results.casinoBrowser) {
                    testVariations.push({
                        name: 'Browser-Relativ',
                        offsetX: this.results.casinoBrowser.X,
                        offsetY: this.results.casinoBrowser.Y + 70 // +70 für Toolbar
                    });
                }

                for (const variation of testVariations) {
                    const adjustedArea = {
                        ...area,
                        x: area.x + variation.offsetX,
                        y: area.y + variation.offsetY
                    };

                    try {
                        const extractedPath = await this.extractAreaFromFullScreenshot(
                            adjustedArea,
                            `${area.name.toLowerCase().replace(/\s+/g, '-')}-${variation.name.toLowerCase()}`
                        );

                        this.results.casinoTests.push({
                            area: area,
                            variation: variation,
                            adjustedArea: adjustedArea,
                            success: true,
                            extractedPath: extractedPath
                        });

                        console.log(`     ✅ ${variation.name}: Erfolgreich extrahiert`);

                    } catch (extractError) {
                        console.log(`     ❌ ${variation.name}: ${extractError.message}`);
                        
                        this.results.casinoTests.push({
                            area: area,
                            variation: variation,
                            adjustedArea: adjustedArea,
                            success: false,
                            error: extractError.message
                        });
                    }
                }
                
            } catch (error) {
                console.log(`     ❌ ${area.name}: ${error.message}`);
            }
        }
    }

    async extractAreaFromFullScreenshot(area, prefix) {
        const extractedPath = path.join(this.debugDir, `${prefix}-${Date.now()}.png`);
        
        // Erst einen neuen Screenshot machen
        const bestMethod = this.results.screenshotMethods.find(m => m.success);
        if (!bestMethod) {
            throw new Error('Keine Screenshot-Methode verfügbar');
        }

        let fullScreenshot;
        if (bestMethod.name.includes('GDI')) {
            fullScreenshot = await this.screenshotPowerShellGDI();
        } else if (bestMethod.name.includes('BitBlt')) {
            fullScreenshot = await this.screenshotPowerShellBitBlt();
        } else {
            fullScreenshot = await this.screenshotPowerShellGraphics();
        }

        // Bereich mit PowerShell extrahieren (da wir kein Sharp haben)
        const psScript = `
Add-Type -AssemblyName System.Drawing

$sourceImage = [System.Drawing.Image]::FromFile('${fullScreenshot.path.replace(/\\/g, '\\\\')}')
$targetBitmap = New-Object System.Drawing.Bitmap ${area.width}, ${area.height}
$graphics = [System.Drawing.Graphics]::FromImage($targetBitmap)

$sourceRect = New-Object System.Drawing.Rectangle ${area.x}, ${area.y}, ${area.width}, ${area.height}
$destRect = New-Object System.Drawing.Rectangle 0, 0, ${area.width}, ${area.height}

try {
    $graphics.DrawImage($sourceImage, $destRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
    $targetBitmap.Save('${extractedPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "SUCCESS"
} catch {
    Write-Host "ERROR:$($_.Exception.Message)"
} finally {
    $graphics.Dispose()
    $targetBitmap.Dispose()
    $sourceImage.Dispose()
}`;

        const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, {
            encoding: 'utf8',
            timeout: 10000
        });

        if (!result.includes('SUCCESS') || !fs.existsSync(extractedPath)) {
            throw new Error(`Area-Extraktion fehlgeschlagen: ${result}`);
        }

        // Temp-Screenshot löschen
        try { fs.unlinkSync(fullScreenshot.path); } catch(e) {}

        return extractedPath;
    }

    generateDiagnosisReport() {
        console.log('\n📋 DIAGNOSE-BERICHT:');
        console.log('==================');

        const report = {
            timestamp: new Date().toISOString(),
            ...this.results
        };

        // Speichere detaillierten Bericht
        const reportPath = path.join(this.debugDir, `diagnosis-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Analysiere die Ergebnisse
        console.log('\n🔍 PROBLEMANALYSE:');
        
        // Multi-Monitor Problem?
        if (report.displays.Count > 1) {
            console.log('⚠️ MULTI-MONITOR SETUP ERKANNT:');
            console.log('   Koordinaten-Problem wahrscheinlich durch mehrere Monitore');
        }

        // Casino-Browser Problem?
        if (!report.casinoBrowser) {
            console.log('⚠️ KEIN CASINO-BROWSER GEFUNDEN:');
            console.log('   Browser-Titel muss "casino", "bet", "slot" oder ähnlich enthalten');
        } else {
            console.log(`✅ Casino-Browser gefunden: ${report.casinoBrowser.ProcessName}`);
            console.log(`   Position: ${report.casinoBrowser.X}, ${report.casinoBrowser.Y}`);
            console.log(`   Größe: ${report.casinoBrowser.Width}x${report.casinoBrowser.Height}`);
        }

        // Screenshot-Tests
        const workingMethods = report.screenshotMethods.filter(m => m.success);
        if (workingMethods.length === 0) {
            console.log('❌ KEINE SCREENSHOT-METHODE FUNKTIONIERT:');
        } else {
            console.log(`✅ ${workingMethods.length} Screenshot-Methoden funktionieren`);
        }

        // Casino-Tests
        const successfulTests = report.casinoTests?.filter(t => t.success) || [];
        const failedTests = report.casinoTests?.filter(t => !t.success) || [];
        
        console.log(`\n📊 Casino-Tests: ${successfulTests.length} erfolgreich, ${failedTests.length} fehlgeschlagen`);

        // Empfehlungen generieren
        this.generateRecommendations(report);

        console.log(`\n💾 Detaillierter Bericht: ${reportPath}`);
        console.log(`🖼️ Debug-Screenshots: ${this.debugDir}`);
        console.log('\n🔍 SCHAUE DIR DIE SCREENSHOTS AN!');
        console.log('Die zeigen genau wo deine OCR-Bereiche landen!');

        return report;
    }

    generateRecommendations(report) {
        console.log('\n💡 KONKRETE LÖSUNGSEMPFEHLUNGEN:');
        console.log('=================================');

        const recommendations = [];

        // Casino-Browser Empfehlungen
        if (!report.casinoBrowser) {
            recommendations.push({
                priority: 'CRITICAL',
                issue: 'Casino-Browser nicht erkannt',
                solution: 'Browser-Titel muss "casino", "bet", "slot", "game" enthalten'
            });
        } else if (report.casinoBrowser.X !== 0 || report.casinoBrowser.Y !== 0) {
            recommendations.push({
                priority: 'HIGH',
                issue: `Browser nicht bei (0,0) - Position: ${report.casinoBrowser.X},${report.casinoBrowser.Y}`,
                solution: 'Browser maximieren (F11) oder an obere linke Ecke verschieben'
            });
        }

        // Multi-Monitor Empfehlung
        if (report.displays.Count > 1) {
            recommendations.push({
                priority: 'HIGH',
                issue: 'Multi-Monitor Setup erkannt',
                solution: 'Casino nur auf Hauptmonitor spielen, andere Monitore temporär deaktivieren'
            });
        }

        // Screenshot-Tests Empfehlung
        const workingMethods = report.screenshotMethods.filter(m => m.success);
        if (workingMethods.length > 0) {
            recommendations.push({
                priority: 'INFO',
                issue: 'Screenshots funktionieren grundsätzlich',
                solution: `Verwende ${workingMethods[0].name} als Screenshot-Methode`
            });
        }

        // Casino-Tests Empfehlung  
        const successfulCasinoTests = report.casinoTests?.filter(t => t.success) || [];
        if (successfulCasinoTests.length > 0) {
            const bestTest = successfulCasinoTests[0];
            recommendations.push({
                priority: 'SOLUTION',
                issue: 'Funktionierende Koordinaten-Variation gefunden',
                solution: `Verwende "${bestTest.variation.name}" mit Offset X:${bestTest.variation.offsetX}, Y:${bestTest.variation.offsetY}`
            });
        }

        // Ausgabe der Empfehlungen
        recommendations.forEach((rec, i) => {
            const priorityColor = rec.priority === 'CRITICAL' ? '🔴' : 
                                  rec.priority === 'HIGH' ? '🟡' : 
                                  rec.priority === 'SOLUTION' ? '🟢' : '🔵';
            
            console.log(`\n${i + 1}. ${priorityColor} [${rec.priority}] ${rec.issue}`);
            console.log(`   💡 Lösung: ${rec.solution}`);
        });

        if (recommendations.filter(r => r.priority === 'SOLUTION').length === 0) {
            console.log('\n❌ KEINE AUTOMATISCHE LÖSUNG GEFUNDEN');
            console.log('📱 Schaue dir die Screenshots im coordinate-debug Ordner an!');
            console.log('🎯 Die zeigen genau wo das Problem liegt.');
        }

        // Speichere Empfehlungen
        const recsPath = path.join(this.debugDir, `recommendations-${Date.now()}.json`);
        fs.writeFileSync(recsPath, JSON.stringify(recommendations, null, 2));
    }
}

// CLI Interface
if (require.main === module) {
    const diagnostic = new StandaloneCoordinateDiagnostic();
    
    console.log('🚀 STANDALONE KOORDINATEN-DIAGNOSE');
    console.log('===================================');
    console.log('Funktioniert ohne Electron - analysiert dein System...\n');
    
    diagnostic.diagnoseSystem().then(results => {
        console.log('\n🎉 DIAGNOSE ABGESCHLOSSEN');
        console.log('\n📂 Schaue dir die Debug-Screenshots im coordinate-debug Ordner an!');
        console.log('🎯 Diese zeigen genau wo die OCR-Bereiche landen vs. wo sie sein sollten.');
        console.log('\n💡 Die Empfehlungen oben zeigen dir die beste Lösung für dein System!');
        
    }).catch(error => {
        console.error('\n❌ DIAGNOSE FEHLER:', error.message);
        console.log('\n🆘 Fallback-Lösungen:');
        console.log('1. Browser maximieren (F11)');
        console.log('2. Casino-Browser auf Hauptmonitor verschieben'); 
        console.log('3. Browser-Titel muss "casino" enthalten');
        console.log('4. node BROWSER-FENSTER-FIX.js verwenden');
    });
}

module.exports = StandaloneCoordinateDiagnostic;