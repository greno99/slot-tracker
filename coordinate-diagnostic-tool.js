// coordinate-diagnostic-tool.js - Finde heraus warum die Koordinaten völlig falsch sind
const { screen, BrowserWindow, desktopCapturer } = require('electron');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

class CoordinateDiagnosticTool {
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

    // SCHRITT 1: System-Analyse - Was ist das echte Problem?
    async diagnoseSystem() {
        console.log('🔍 SYSTEM-DIAGNOSE GESTARTET');
        console.log('==============================');

        // 1. Display-Informationen sammeln
        await this.analyzeDisplays();
        
        // 2. Browser-Fenster finden
        await this.findBrowserWindows();
        
        // 3. Screenshot-Methoden testen
        await this.testScreenshotMethods();
        
        // 4. Koordinaten-Mapping testen
        await this.testCoordinateMapping();
        
        // 5. Diagnose-Bericht erstellen
        this.generateDiagnosisReport();
        
        return this.results;
    }

    async analyzeDisplays() {
        console.log('\n📺 DISPLAY-ANALYSE:');
        
        const primaryDisplay = screen.getPrimaryDisplay();
        const allDisplays = screen.getAllDisplays();
        
        this.results.displays = {
            primary: {
                bounds: primaryDisplay.bounds,
                workArea: primaryDisplay.workArea,
                scaleFactor: primaryDisplay.scaleFactor,
                size: primaryDisplay.size
            },
            all: allDisplays.map(d => ({
                id: d.id,
                bounds: d.bounds,
                workArea: d.workArea,
                scaleFactor: d.scaleFactor,
                primary: d.id === primaryDisplay.id
            })),
            count: allDisplays.length
        };

        console.log(`   Primärer Monitor: ${primaryDisplay.bounds.width}x${primaryDisplay.bounds.height}`);
        console.log(`   Skalierungsfaktor: ${primaryDisplay.scaleFactor}`);
        console.log(`   Arbeitsbereich: ${JSON.stringify(primaryDisplay.workArea)}`);
        console.log(`   Anzahl Monitore: ${allDisplays.length}`);
        
        if (allDisplays.length > 1) {
            console.log('   ⚠️ MULTI-MONITOR SETUP ERKANNT!');
            allDisplays.forEach((display, i) => {
                console.log(`     Monitor ${i + 1}: ${display.bounds.width}x${display.bounds.height} @ (${display.bounds.x}, ${display.bounds.y})`);
            });
        }
    }

    async findBrowserWindows() {
        console.log('\n🌐 BROWSER-FENSTER SUCHE:');
        
        try {
            // Windows-spezifische Browser-Fenster Erkennung
            const psScript = `
Get-Process | Where-Object {
    $_.MainWindowTitle -ne "" -and 
    ($_.ProcessName -match "chrome|firefox|msedge|opera|brave")
} | ForEach-Object {
    $bounds = @{
        ProcessName = $_.ProcessName
        WindowTitle = $_.MainWindowTitle
        ProcessId = $_.Id
    }
    
    # Versuche Fenster-Position zu ermitteln
    try {
        Add-Type -AssemblyName System.Windows.Forms
        $handle = $_.MainWindowHandle
        if ($handle -ne [IntPtr]::Zero) {
            $form = [System.Windows.Forms.Form]::FromHandle($handle)
            if ($form) {
                $bounds.X = $form.Left
                $bounds.Y = $form.Top  
                $bounds.Width = $form.Width
                $bounds.Height = $form.Height
                $bounds.WindowState = $form.WindowState
            }
        }
    } catch {
        $bounds.X = -1
        $bounds.Y = -1
        $bounds.Width = -1
        $bounds.Height = -1
        $bounds.Error = "Position nicht ermittelbar"
    }
    
    $bounds | ConvertTo-Json -Compress
}`;

            const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, {
                encoding: 'utf8',
                timeout: 10000
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
                const pos = browser.X >= 0 ? `${browser.X}, ${browser.Y} (${browser.Width}x${browser.Height})` : 'Position unbekannt';
                console.log(`     ${i + 1}. ${browser.ProcessName}: "${browser.WindowTitle.substring(0, 50)}..."`);
                console.log(`        Position: ${pos}`);
            });

        } catch (error) {
            console.log('   ❌ Browser-Erkennung fehlgeschlagen:', error.message);
            this.results.browserWindows = [];
        }
    }

    async testScreenshotMethods() {
        console.log('\n📸 SCREENSHOT-METHODEN TEST:');
        
        const methods = [
            { name: 'Electron desktopCapturer', func: () => this.screenshotElectron() },
            { name: 'PowerShell GDI', func: () => this.screenshotPowerShell() },
            { name: 'PowerShell BitBlt', func: () => this.screenshotBitBlt() }
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

    async screenshotElectron() {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: screen.getPrimaryDisplay().bounds
        });

        if (sources.length === 0) {
            throw new Error('Keine Screen-Quellen verfügbar');
        }

        const buffer = sources[0].thumbnail.toPNG();
        const debugPath = path.join(this.debugDir, `electron-screenshot-${Date.now()}.png`);
        fs.writeFileSync(debugPath, buffer);

        const metadata = await sharp(buffer).metadata();

        return {
            size: buffer.length,
            dimensions: { width: metadata.width, height: metadata.height },
            path: debugPath,
            method: 'electron-desktopCapturer'
        };
    }

    async screenshotPowerShell() {
        const tempPath = path.join(this.debugDir, `powershell-screenshot-${Date.now()}.png`);
        
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
            throw new Error('PowerShell Screenshot fehlgeschlagen');
        }

        const buffer = fs.readFileSync(tempPath);
        const metadata = await sharp(buffer).metadata();

        return {
            size: buffer.length,
            dimensions: { width: metadata.width, height: metadata.height },
            path: tempPath,
            method: 'powershell-gdi'
        };
    }

    async screenshotBitBlt() {
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
            throw new Error('BitBlt Screenshot fehlgeschlagen');
        }

        const buffer = fs.readFileSync(tempPath);
        const metadata = await sharp(buffer).metadata();

        return {
            size: buffer.length,
            dimensions: { width: metadata.width, height: metadata.height },
            path: tempPath,
            method: 'powershell-bitblt'
        };
    }

    async testCoordinateMapping() {
        console.log('\n📐 KOORDINATEN-MAPPING TEST:');
        
        // Test verschiedene Bereiche des Bildschirms
        const testAreas = [
            { name: 'Oben Links', x: 100, y: 100, width: 200, height: 100 },
            { name: 'Oben Rechts', x: 2000, y: 100, width: 200, height: 100 },
            { name: 'Unten Links', x: 100, y: 1200, width: 200, height: 100 },
            { name: 'Unten Rechts', x: 2000, y: 1200, width: 200, height: 100 },
            { name: 'Zentrum', x: 1200, y: 600, width: 200, height: 100 },
            // Casino-spezifische Test-Bereiche
            { name: 'Casino Bet (Original)', x: 1356, y: 1079, width: 98, height: 42 },
            { name: 'Casino Win (Original)', x: 962, y: 1082, width: 112, height: 48 },
            { name: 'Casino Balance (Original)', x: 552, y: 1075, width: 126, height: 46 }
        ];

        this.results.coordinateTests = [];

        // Verwende die beste Screenshot-Methode
        const bestScreenshotMethod = this.results.screenshotMethods.find(m => m.success);
        if (!bestScreenshotMethod) {
            console.log('   ❌ Keine funktionierende Screenshot-Methode verfügbar');
            return;
        }

        console.log(`   Verwende Screenshot-Methode: ${bestScreenshotMethod.name}`);
        
        for (const area of testAreas) {
            try {
                console.log(`   Testing ${area.name} @ ${area.x},${area.y}...`);
                
                // Screenshot der gesamten Bildschirm
                let fullScreenshot;
                if (bestScreenshotMethod.name.includes('Electron')) {
                    fullScreenshot = await this.screenshotElectron();
                } else if (bestScreenshotMethod.name.includes('PowerShell GDI')) {
                    fullScreenshot = await this.screenshotPowerShell();
                } else {
                    fullScreenshot = await this.screenshotBitBlt();
                }

                // Bereich extrahieren
                const extractedPath = await this.extractAreaFromScreenshot(
                    fullScreenshot.path, 
                    area, 
                    `test-${area.name.toLowerCase().replace(/\s+/g, '-')}`
                );

                this.results.coordinateTests.push({
                    area: area,
                    success: true,
                    extractedPath: extractedPath,
                    fullScreenshotPath: fullScreenshot.path,
                    fullScreenshotDimensions: fullScreenshot.dimensions
                });

                console.log(`     ✅ Erfolgreich extrahiert: ${extractedPath}`);

            } catch (error) {
                console.log(`     ❌ ${area.name}: ${error.message}`);
                
                this.results.coordinateTests.push({
                    area: area,
                    success: false,
                    error: error.message
                });
            }
        }
    }

    async extractAreaFromScreenshot(screenshotPath, area, prefix) {
        const extractedPath = path.join(this.debugDir, `${prefix}-${Date.now()}.png`);
        
        // Koordinaten validieren und anpassen
        const buffer = fs.readFileSync(screenshotPath);
        const metadata = await sharp(buffer).metadata();
        
        const safeArea = {
            left: Math.max(0, Math.min(area.x, metadata.width - 10)),
            top: Math.max(0, Math.min(area.y, metadata.height - 10)),
            width: Math.min(area.width, metadata.width - Math.max(0, area.x)),
            height: Math.min(area.height, metadata.height - Math.max(0, area.y))
        };

        if (safeArea.width <= 0 || safeArea.height <= 0) {
            throw new Error(`Area außerhalb der Screenshot-Grenzen: ${JSON.stringify(area)} vs ${metadata.width}x${metadata.height}`);
        }

        await sharp(buffer)
            .extract(safeArea)
            .png()
            .toFile(extractedPath);

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
        if (report.displays.count > 1) {
            console.log('⚠️ MULTI-MONITOR SETUP ERKANNT:');
            console.log('   Möglicherweise werden Koordinaten für falschen Monitor verwendet');
            console.log('   Lösung: Casino-Fenster auf Hauptmonitor verschieben');
        }

        // Browser-Fenster Problem?
        if (report.browserWindows.length === 0) {
            console.log('⚠️ KEINE BROWSER ERKANNT:');
            console.log('   Casino muss in einem Browser geöffnet sein');
        } else if (report.browserWindows.some(b => b.X < 0)) {
            console.log('⚠️ BROWSER-POSITION PROBLEMATISCH:');
            console.log('   Einige Browser-Fenster haben ungültige Koordinaten');
        }

        // Screenshot-Problem?
        const workingScreenshots = report.screenshotMethods.filter(m => m.success);
        if (workingScreenshots.length === 0) {
            console.log('❌ KEINE SCREENSHOT-METHODE FUNKTIONIERT:');
            console.log('   Grundlegendes System-Problem');
        } else {
            console.log(`✅ ${workingScreenshots.length} Screenshot-Methoden funktionieren`);
            
            // Vergleiche Screenshot-Größen
            const sizes = workingScreenshots.map(s => `${s.dimensions.width}x${s.dimensions.height}`);
            const uniqueSizes = [...new Set(sizes)];
            
            if (uniqueSizes.length > 1) {
                console.log('⚠️ INKONSISTENTE SCREENSHOT-GRÖSSEN:');
                console.log('   Verschiedene Methoden liefern verschiedene Auflösungen');
                console.log(`   Größen: ${uniqueSizes.join(', ')}`);
            }
        }

        // Koordinaten-Problem?
        const successfulTests = report.coordinateTests?.filter(t => t.success) || [];
        const failedTests = report.coordinateTests?.filter(t => !t.success) || [];
        
        if (failedTests.length > 0) {
            console.log(`⚠️ ${failedTests.length} KOORDINATEN-TESTS FEHLGESCHLAGEN:`);
            failedTests.forEach(test => {
                console.log(`   ${test.area.name}: ${test.error}`);
            });
        }

        console.log(`\n📊 Erfolgreich: ${successfulTests.length} Tests`);
        console.log(`📊 Fehlgeschlagen: ${failedTests.length} Tests`);
        console.log(`\n💾 Detaillierter Bericht: ${reportPath}`);
        console.log(`🖼️ Debug-Screenshots: ${this.debugDir}`);

        // Konkrete Empfehlungen
        this.generateRecommendations(report);

        return report;
    }

    generateRecommendations(report) {
        console.log('\n💡 LÖSUNGSEMPFEHLUNGEN:');
        console.log('======================');

        const recommendations = [];

        // Multi-Monitor Empfehlungen
        if (report.displays.count > 1) {
            recommendations.push({
                priority: 'HIGH',
                issue: 'Multi-Monitor Setup',
                solution: 'Casino-Browser auf Hauptmonitor (0,0) verschieben und maximieren'
            });
        }

        // DPI-Skalierung Empfehlungen
        const hasScaling = report.displays.primary.scaleFactor !== 1;
        if (hasScaling) {
            recommendations.push({
                priority: 'HIGH', 
                issue: `DPI-Skalierung aktiv (${report.displays.primary.scaleFactor}x)`,
                solution: 'Koordinaten müssen durch Skalierungsfaktor dividiert werden'
            });
        }

        // Browser-Position Empfehlungen
        const validBrowsers = report.browserWindows.filter(b => b.X >= 0 && b.Y >= 0);
        if (validBrowsers.length === 0 && report.browserWindows.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                issue: 'Browser-Fenster Position nicht erkennbar',
                solution: 'Browser im Windowed-Modus (nicht minimiert) verwenden'
            });
        }

        // Screenshot-Methode Empfehlungen
        const electronWorks = report.screenshotMethods.some(m => m.name.includes('Electron') && m.success);
        if (!electronWorks) {
            recommendations.push({
                priority: 'HIGH',
                issue: 'Electron Screenshot funktioniert nicht',
                solution: 'DXGI/HDR-Problem - PowerShell-Fallback verwenden oder HDR deaktivieren'
            });
        }

        // Ausgabe der Empfehlungen
        recommendations.forEach((rec, i) => {
            console.log(`\n${i + 1}. [${rec.priority}] ${rec.issue}`);
            console.log(`   Lösung: ${rec.solution}`);
        });

        if (recommendations.length === 0) {
            console.log('✅ Keine offensichtlichen Systemprobleme erkannt');
            console.log('📍 Problem liegt wahrscheinlich in der Koordinaten-Berechnung');
        }

        // Speichere Empfehlungen
        const recsPath = path.join(this.debugDir, `recommendations-${Date.now()}.json`);
        fs.writeFileSync(recsPath, JSON.stringify(recommendations, null, 2));
        console.log(`\n💾 Empfehlungen gespeichert: ${recsPath}`);
    }
}

// CLI Interface
if (require.main === module) {
    const diagnostic = new CoordinateDiagnosticTool();
    
    console.log('🚀 KOORDINATEN-DIAGNOSE GESTARTET');
    console.log('==================================');
    console.log('Dies wird mehrere Screenshots erstellen und das Problem analysieren...\n');
    
    diagnostic.diagnoseSystem().then(results => {
        console.log('\n🎉 DIAGNOSE ABGESCHLOSSEN');
        console.log('\nSchaue dir die Debug-Screenshots im coordinate-debug Ordner an!');
        console.log('Diese zeigen genau wo die OCR-Bereiche landen vs. wo sie sein sollten.');
        
    }).catch(error => {
        console.error('\n❌ DIAGNOSE FEHLER:', error.message);
    });
}

module.exports = CoordinateDiagnosticTool;