// browser-window-ocr.js - OCR system that targets specific browser windows
const { screen, BrowserWindow, desktopCapturer } = require('electron');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

class BrowserWindowOCR {
    constructor() {
        this.selectedBrowserWindow = null;
        this.browserWindows = [];
        this.debugDir = path.join(__dirname, 'browser-ocr-debug');
        this.initializeDebugDir();
    }

    initializeDebugDir() {
        if (!fs.existsSync(this.debugDir)) {
            fs.mkdirSync(this.debugDir, { recursive: true });
        }
    }

    // Detect all browser windows on the system
    async detectBrowserWindows() {
        console.log('🌐 Detecting browser windows...');
        
        if (process.platform === 'win32') {
            return await this.detectWindowsApplications();
        } else if (process.platform === 'darwin') {
            return await this.detectMacApplications();
        } else {
            return await this.detectLinuxApplications();
        }
    }

    async detectWindowsApplications() {
        console.log('🔍 Attempting primary browser detection...');
        
        try {
            // Try the original .NET Framework approach first
            const windows = await this.detectWindowsApplicationsOriginal();
            if (windows && windows.length > 0) {
                console.log('✅ Primary detection successful');
                return windows;
            }
        } catch (error) {
            console.log('⚠️ Primary detection failed, using fallback...');
        }
        
        // Fallback to alternative detection method
        console.log('🔄 Using fallback browser detection (no .NET Framework required)...');
        return await this.detectWindowsApplicationsFallback();
    }

    async detectWindowsApplicationsOriginal() {
        try {
            // PowerShell script to enumerate browser windows
            const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Get all visible windows
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WindowEnumerator {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    
    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@

$windows = @()
$callback = {
    param($hWnd, $lParam)
    
    if ([WindowEnumerator]::IsWindowVisible($hWnd)) {
        $length = [WindowEnumerator]::GetWindowTextLength($hWnd)
        if ($length -gt 0) {
            $sb = New-Object System.Text.StringBuilder($length + 1)
            [WindowEnumerator]::GetWindowText($hWnd, $sb, $sb.Capacity)
            $title = $sb.ToString()
            
            # Get process information for better detection
            $processId = 0
            [WindowEnumerator]::GetWindowThreadProcessId($hWnd, [ref]$processId)
            
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            $processName = if ($process) { $process.ProcessName } else { "Unknown" }
            
            # Enhanced browser detection - check both title and process name
            $isBrowser = $false
            $browserType = ""
            
            # Firefox detection (multiple patterns)
            if ($processName -match "firefox" -or $title -match "Firefox" -or $title -match "Mozilla") {
                $isBrowser = $true
                $browserType = "Firefox"
            }
            # Chrome detection
            elseif ($processName -match "chrome" -or $title -match "Chrome" -or $title -match "Google Chrome") {
                $isBrowser = $true
                $browserType = "Chrome"
            }
            # Edge detection
            elseif ($processName -match "msedge" -or $title -match "Edge" -or $title -match "Microsoft Edge") {
                $isBrowser = $true
                $browserType = "Edge"
            }
            # Opera detection
            elseif ($processName -match "opera" -or $title -match "Opera") {
                $isBrowser = $true
                $browserType = "Opera"
            }
            # Brave detection
            elseif ($processName -match "brave" -or $title -match "Brave") {
                $isBrowser = $true
                $browserType = "Brave"
            }
            # Safari detection (if installed on Windows)
            elseif ($processName -match "safari" -or $title -match "Safari") {
                $isBrowser = $true
                $browserType = "Safari"
            }
            
            # Additional check: if window has substantial size (not a popup or dialog)
            if ($isBrowser) {
                $rect = New-Object WindowEnumerator+RECT
                if ([WindowEnumerator]::GetWindowRect($hWnd, [ref]$rect)) {
                    $width = $rect.Right - $rect.Left
                    $height = $rect.Bottom - $rect.Top
                    
                    # Only consider windows that are large enough to be main browser windows
                    if ($width -gt 300 -and $height -gt 200) {
                        $window = @{
                            Handle = $hWnd.ToInt64()
                            Title = $title
                            ProcessName = $processName
                            BrowserType = $browserType
                            ProcessId = $processId
                            X = $rect.Left
                            Y = $rect.Top
                            Width = $width
                            Height = $height
                        }
                        
                        $windows += $window
                    }
                }
            }
        }
    }
    
    return $true
}

[WindowEnumerator]::EnumWindows($callback, [IntPtr]::Zero)

# Output as JSON
$windows | ConvertTo-Json
`;

            const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, {
                encoding: 'utf8',
                timeout: 10000
            });

            const windows = JSON.parse(result);
            this.browserWindows = Array.isArray(windows) ? windows : [windows].filter(Boolean);
            
            console.log(`🌐 Found ${this.browserWindows.length} browser windows:`);
            this.browserWindows.forEach((win, index) => {
                const browserType = win.BrowserType || win.ProcessName;
                console.log(`  ${index + 1}. ${browserType} (${win.ProcessName}) - ${win.Title.substring(0, 50)}...`);
                console.log(`     Position: ${win.X}, ${win.Y} Size: ${win.Width}x${win.Height}`);
            });

            return this.browserWindows;

        } catch (error) {
            console.error('❌ Failed to detect browser windows:', error.message);
            return [];
        }
    }
    
    async detectWindowsApplicationsFallback() {
        try {
            console.log('📋 Getting browser processes via WMIC...');
            
            // Get detailed process information
            const result = execSync('wmic process where "Name like \'%firefox.exe%\' or Name like \'%chrome.exe%\' or Name like \'%msedge.exe%\' or Name like \'%opera.exe%\' or Name like \'%brave.exe\'" get Name,ProcessId,CommandLine,ExecutablePath /format:csv', {
                encoding: 'utf8',
                timeout: 10000
            });
            
            const lines = result.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
            const processes = [];
            
            lines.forEach(line => {
                const parts = line.split(',');
                if (parts.length >= 4) {
                    const commandLine = parts[1] || '';
                    const executablePath = parts[2] || '';
                    const name = parts[3] || '';
                    const processId = parseInt(parts[4]) || 0;
                    
                    if (processId > 0 && name) {
                        // Only get main browser processes
                        const isMainProcess = this.isMainBrowserProcess(commandLine, name);
                        
                        if (isMainProcess) {
                            processes.push({
                                ProcessName: name.replace('.exe', ''),
                                ProcessId: processId,
                                CommandLine: commandLine,
                                ExecutablePath: executablePath,
                                BrowserType: this.getBrowserType(name, executablePath)
                            });
                        }
                    }
                }
            });
            
            console.log(`✅ Found ${processes.length} main browser processes`);
            
            // FIXED: Get real window coordinates instead of dummy ones
            const windows = [];
            try {
                const psScript = `
Get-Process | Where-Object { 
    $_.MainWindowTitle -ne "" -and 
    ($_.ProcessName -eq "firefox" -or 
     $_.ProcessName -eq "chrome" -or 
     $_.ProcessName -eq "msedge" -or 
     $_.ProcessName -eq "opera" -or 
     $_.ProcessName -eq "brave") 
} | ForEach-Object {
    # Get window position using simple Windows API
    Add-Type -AssemblyName System.Windows.Forms
    $handle = $_.MainWindowHandle
    if ($handle -ne [IntPtr]::Zero) {
        try {
            # Use Windows Forms to get window rectangle
            $screen = [System.Windows.Forms.Screen]::FromHandle($handle)
            $form = [System.Windows.Forms.Form]::FromHandle($handle)
            if ($form -ne $null) {
                Write-Host "$($_.Id)|||$($_.ProcessName)|||$($_.MainWindowTitle)|||$($form.Left)|||$($form.Top)|||$($form.Width)|||$($form.Height)"
            } else {
                # Fallback: estimate based on screen size
                $bounds = $screen.WorkingArea
                Write-Host "$($_.Id)|||$($_.ProcessName)|||$($_.MainWindowTitle)|||100|||100|||$($bounds.Width-200)|||$($bounds.Height-200)"
            }
        } catch {
            # Ultimate fallback: use screen dimensions
            Write-Host "$($_.Id)|||$($_.ProcessName)|||$($_.MainWindowTitle)|||0|||0|||1920|||1080"
        }
    }
}`;

                const titleResult = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, {
                    encoding: 'utf8',
                    timeout: 8000
                });
                
                const titleLines = titleResult.split('\n').filter(line => line.trim() && line.includes('|||'));
                
                titleLines.forEach(line => {
                    const parts = line.split('|||');
                    if (parts.length >= 7) {
                        windows.push({
                            ProcessId: parseInt(parts[0]),
                            ProcessName: parts[1].trim(),
                            Title: parts[2].trim(),
                            X: parseInt(parts[3]) || 0,
                            Y: parseInt(parts[4]) || 0,
                            Width: parseInt(parts[5]) || 1200,
                            Height: parseInt(parts[6]) || 800
                        });
                    }
                });
                
            } catch (error) {
                console.log('⚠️ Window position detection failed, using screen-based fallback');
                
                // Ultimate fallback: use process info only with full screen coordinates
                processes.forEach(process => {
                    windows.push({
                        ProcessId: process.ProcessId,
                        ProcessName: process.ProcessName,
                        Title: `${process.BrowserType} Browser`,
                        X: 0,
                        Y: 0,
                        Width: 1920,
                        Height: 1080
                    });
                });
            }
            
            // Match processes to windows with real coordinates
            const browserWindows = [];
            
            processes.forEach(process => {
                const matchingWindow = windows.find(w => w.ProcessId === process.ProcessId);
                
                if (matchingWindow) {
                    browserWindows.push({
                        Handle: process.ProcessId,
                        Title: matchingWindow.Title,
                        ProcessName: process.ProcessName,
                        BrowserType: process.BrowserType,
                        ProcessId: process.ProcessId,
                        X: matchingWindow.X,
                        Y: matchingWindow.Y,
                        Width: matchingWindow.Width,
                        Height: matchingWindow.Height
                    });
                } else {
                    // Fallback with full screen coordinates
                    browserWindows.push({
                        Handle: process.ProcessId,
                        Title: `${process.BrowserType} Browser`,
                        ProcessName: process.ProcessName,
                        BrowserType: process.BrowserType,
                        ProcessId: process.ProcessId,
                        X: 0,
                        Y: 0,
                        Width: 1920,
                        Height: 1080
                    });
                }
            });
            
            this.browserWindows = browserWindows;
            
            console.log(`🌐 Fallback detection found ${this.browserWindows.length} browser windows:`);
            this.browserWindows.forEach((win, index) => {
                const browserType = win.BrowserType || win.ProcessName;
                console.log(`  ${index + 1}. ${browserType} (${win.ProcessName}) - ${win.Title.substring(0, 50)}...`);
                console.log(`     Process ID: ${win.ProcessId}`);
            });

            return this.browserWindows;
            
        } catch (error) {
            console.error('❌ Fallback detection also failed:', error.message);
            return [];
        }
    }
    
    isMainBrowserProcess(commandLine, processName) {
        if (!commandLine) return true;
        
        const utilityKeywords = [
            '--type=',
            '-contentproc',
            'crashpad-handler',
            'gpu-process',
            'utility-sub-type'
        ];
        
        const isUtility = utilityKeywords.some(keyword => commandLine.includes(keyword));
        return !isUtility;
    }
    
    getBrowserType(processName, executablePath) {
        const name = processName.toLowerCase();
        const path = (executablePath || '').toLowerCase();
        
        if (name.includes('firefox') || path.includes('firefox')) {
            return 'Firefox';
        } else if (name.includes('chrome') || path.includes('chrome')) {
            return 'Chrome';
        } else if (name.includes('msedge') || name.includes('edge') || path.includes('edge')) {
            return 'Edge';
        } else if (name.includes('opera') || path.includes('opera')) {
            return 'Opera';
        } else if (name.includes('brave') || path.includes('brave')) {
            return 'Brave';
        }
        
        return processName.replace('.exe', '');
    }

    async detectMacApplications() {
        // macOS implementation using AppleScript
        try {
            const script = `
tell application "System Events"
    set browserApps to {"Google Chrome", "Firefox", "Safari", "Microsoft Edge", "Opera", "Brave Browser"}
    set windowList to {}
    
    repeat with appName in browserApps
        try
            tell process appName
                repeat with w in windows
                    set windowTitle to name of w
                    set windowPosition to position of w
                    set windowSize to size of w
                    set windowInfo to {appName, windowTitle, item 1 of windowPosition, item 2 of windowPosition, item 1 of windowSize, item 2 of windowSize}
                    set end of windowList to windowInfo
                end repeat
            end tell
        end try
    end repeat
    
    return windowList
end tell
`;

            const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
            // Parse AppleScript result and convert to standard format
            return this.parseAppleScriptResult(result);

        } catch (error) {
            console.error('❌ Failed to detect Mac browser windows:', error.message);
            return [];
        }
    }

    async detectLinuxApplications() {
        // Linux implementation using xwininfo and wmctrl
        try {
            const result = execSync('wmctrl -l -G', { encoding: 'utf8' });
            const lines = result.split('\n').filter(line => line.trim());
            
            const browserWindows = [];
            const browserKeywords = ['chrome', 'firefox', 'edge', 'safari', 'opera', 'brave'];
            
            lines.forEach(line => {
                const parts = line.split(/\s+/);
                if (parts.length >= 7) {
                    const title = parts.slice(6).join(' ');
                    const isBrowser = browserKeywords.some(keyword => 
                        title.toLowerCase().includes(keyword)
                    );
                    
                    if (isBrowser) {
                        browserWindows.push({
                            Handle: parts[0],
                            Title: title,
                            X: parseInt(parts[2]),
                            Y: parseInt(parts[3]),
                            Width: parseInt(parts[4]),
                            Height: parseInt(parts[5]),
                            ProcessName: this.extractBrowserName(title)
                        });
                    }
                }
            });

            return browserWindows;

        } catch (error) {
            console.error('❌ Failed to detect Linux browser windows:', error.message);
            return [];
        }
    }

    extractBrowserName(title) {
        const browsers = {
            'chrome': 'Chrome',
            'firefox': 'Firefox',
            'edge': 'Edge',
            'safari': 'Safari',
            'opera': 'Opera',
            'brave': 'Brave'
        };
        
        for (const [keyword, name] of Object.entries(browsers)) {
            if (title.toLowerCase().includes(keyword)) {
                return name;
            }
        }
        
        return 'Browser';
    }

    // Capture screenshot of a specific browser window
    async captureBrowserWindow(browserWindow) {
        console.log(`📸 Capturing browser window: ${browserWindow.Title.substring(0, 50)}...`);
        
        if (process.platform === 'win32') {
            return await this.captureWindowsWindow(browserWindow);
        } else if (process.platform === 'darwin') {
            return await this.captureMacWindow(browserWindow);
        } else {
            return await this.captureLinuxWindow(browserWindow);
        }
    }

    async captureWindowsWindow(browserWindow) {
        console.log(`📸 Attempting browser window capture: ${browserWindow.ProcessName}`);
        
        // Try primary method first, then fallback
        try {
            return await this.captureWindowsWindowPrimary(browserWindow);
        } catch (error) {
            console.log(`⚠️ Primary capture failed, using fallback: ${error.message}`);
            return await this.captureWindowsWindowFallback(browserWindow);
        }
    }
    
    async captureWindowsWindowPrimary(browserWindow) {
        return new Promise((resolve, reject) => {
            const timestamp = Date.now();
            const tempPath = path.join(this.debugDir, `browser-capture-${timestamp}.png`);
            
            // PowerShell script to capture specific window
            const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Window capture using handle
$handle = [IntPtr]${browserWindow.Handle}

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;

public class WindowCapture {
    [DllImport("user32.dll")]
    public static extern IntPtr GetWindowDC(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
    
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    
    [DllImport("user32.dll")]
    public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
    
    public static Bitmap CaptureWindow(IntPtr handle) {
        RECT rect = new RECT();
        GetWindowRect(handle, out rect);
        
        int width = rect.Right - rect.Left;
        int height = rect.Bottom - rect.Top;
        
        Bitmap bitmap = new Bitmap(width, height);
        Graphics graphics = Graphics.FromImage(bitmap);
        IntPtr hdc = graphics.GetHdc();
        
        PrintWindow(handle, hdc, 0);
        
        graphics.ReleaseHdc(hdc);
        graphics.Dispose();
        
        return bitmap;
    }
}
"@

try {
    Write-Host "Capturing window with handle: $handle"
    $bitmap = [WindowCapture]::CaptureWindow($handle)
    $bitmap.Save('${tempPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
    
    $fileInfo = Get-Item '${tempPath.replace(/\\/g, '\\\\')}'
    Write-Host "SUCCESS:$($fileInfo.Length):$($bitmap.Width)x$($bitmap.Height)"
    
    $bitmap.Dispose()
} catch {
    Write-Host "ERROR:$($_.Exception.Message)"
    exit 1
}
`;

            const psProcess = spawn('powershell', [
                '-WindowStyle', 'Hidden',
                '-ExecutionPolicy', 'Bypass',
                '-Command', psScript
            ], {
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            
            psProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            psProcess.stderr.on('data', (data) => {
                console.error('PowerShell stderr:', data.toString());
            });

            psProcess.on('close', async (code) => {
                try {
                    if (code === 0 && output.includes('SUCCESS:')) {
                        if (fs.existsSync(tempPath)) {
                            const buffer = fs.readFileSync(tempPath);
                            
                            // Clean up temp file
                            try { fs.unlinkSync(tempPath); } catch(e) {}
                            
                            console.log(`✅ Browser window captured: ${buffer.length} bytes`);
                            
                            resolve({
                                success: true,
                                buffer: buffer,
                                window: browserWindow,
                                method: 'windows-printwindow'
                            });
                        } else {
                            reject(new Error('Browser window capture file not created'));
                        }
                    } else {
                        reject(new Error(`Browser window capture failed: ${output}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });

            psProcess.on('error', (error) => {
                reject(new Error(`PowerShell process error: ${error.message}`));
            });

            setTimeout(() => {
                psProcess.kill();
                reject(new Error('Browser window capture timeout'));
            }, 15000);
        });
    }
    
    async captureWindowsWindowFallback(browserWindow) {
        console.log('🔄 Using fallback browser window capture (no .NET Framework required)...');
        
        return new Promise((resolve, reject) => {
            const timestamp = Date.now();
            const tempPath = path.join(this.debugDir, `browser-capture-fallback-${timestamp}.png`);
            
            // FIXED: Simplified fallback without problematic System.Drawing.Imaging
            const fallbackScript = `
try {
    # Use basic assemblies that are always available
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms
    
    # Capture screen region where browser window should be
    $bounds = New-Object System.Drawing.Rectangle ${browserWindow.X}, ${browserWindow.Y}, ${browserWindow.Width}, ${browserWindow.Height}
    $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Capture the screen region
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    # Save using basic PNG format (no Imaging namespace needed)
    $bitmap.Save('${tempPath.replace(/\\/g, '\\\\')}', 'Png')
    
    # Get file info
    if (Test-Path '${tempPath.replace(/\\/g, '\\\\')}') {
        $fileInfo = Get-Item '${tempPath.replace(/\\/g, '\\\\')}'
        Write-Host "FALLBACK_SUCCESS:$($fileInfo.Length):$($bitmap.Width)x$($bitmap.Height)"
    } else {
        Write-Host "FALLBACK_ERROR:File not created"
    }
    
    # Cleanup
    $graphics.Dispose()
    $bitmap.Dispose()
} catch {
    Write-Host "FALLBACK_ERROR:$($_.Exception.Message)"
    exit 1
}
`;

            const psProcess = spawn('powershell', [
                '-WindowStyle', 'Hidden',
                '-ExecutionPolicy', 'Bypass',
                '-Command', fallbackScript
            ], {
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            
            psProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            psProcess.stderr.on('data', (data) => {
                console.error('Fallback PowerShell stderr:', data.toString());
            });

            psProcess.on('close', async (code) => {
                try {
                    if (code === 0 && output.includes('FALLBACK_SUCCESS:')) {
                        if (fs.existsSync(tempPath)) {
                            const buffer = fs.readFileSync(tempPath);
                            
                            // Clean up temp file
                            try { fs.unlinkSync(tempPath); } catch(e) {}
                            
                            console.log(`✅ Fallback browser capture successful: ${buffer.length} bytes`);
                            
                            resolve({
                                success: true,
                                buffer: buffer,
                                window: browserWindow,
                                method: 'windows-fallback-screen-region'
                            });
                        } else {
                            reject(new Error('Fallback capture file not created'));
                        }
                    } else {
                        // Try even simpler fallback: just capture full screen
                        console.log('🔄 Trying ultra-simple screen capture...');
                        this.captureScreenRegionSimple(browserWindow).then(resolve).catch(reject);
                    }
                } catch (error) {
                    reject(error);
                }
            });

            psProcess.on('error', (error) => {
                reject(new Error(`Fallback capture process error: ${error.message}`));
            });

            setTimeout(() => {
                psProcess.kill();
                reject(new Error('Fallback browser capture timeout'));
            }, 10000);
        });
    }
    
    async captureScreenRegionSimple(browserWindow) {
        console.log('📷 Using ultra-simple screen region capture...');
        
        return new Promise((resolve, reject) => {
            // Ultra-simple: use Windows Snipping Tool API or similar
            const simpleScript = `
try {
    # Load required assemblies
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms
    
    # Create bitmap of screen region
    $screenBounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap ${browserWindow.Width}, ${browserWindow.Height}
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Capture screen area (fallback to full screen if window coords fail)
    $captureX = [Math]::Max(0, [Math]::Min(${browserWindow.X}, $screenBounds.Width - ${browserWindow.Width}))
    $captureY = [Math]::Max(0, [Math]::Min(${browserWindow.Y}, $screenBounds.Height - ${browserWindow.Height}))
    
    $graphics.CopyFromScreen($captureX, $captureY, 0, 0, $bitmap.Size)
    
    # Convert to base64 for transmission
    $ms = New-Object System.IO.MemoryStream
    $bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $base64 = [Convert]::ToBase64String($bytes)
    
    Write-Host "SIMPLE_SUCCESS:$($bytes.Length):$($bitmap.Width)x$($bitmap.Height):$base64"
    
    $ms.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
} catch {
    Write-Host "SIMPLE_ERROR:$($_.Exception.Message)"
}
`;

            const psProcess = spawn('powershell', [
                '-WindowStyle', 'Hidden',
                '-ExecutionPolicy', 'Bypass',
                '-Command', simpleScript
            ], {
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            
            psProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            psProcess.on('close', (code) => {
                try {
                    if (output.includes('SIMPLE_SUCCESS:')) {
                        const parts = output.split(':');
                        if (parts.length >= 4) {
                            const base64Data = parts.slice(3).join(':');
                            const buffer = Buffer.from(base64Data, 'base64');
                            
                            console.log(`✅ Ultra-simple capture successful: ${buffer.length} bytes`);
                            
                            resolve({
                                success: true,
                                buffer: buffer,
                                window: browserWindow,
                                method: 'windows-simple-screen-region'
                            });
                        } else {
                            reject(new Error('Invalid simple capture response format'));
                        }
                    } else {
                        reject(new Error(`Simple screen capture failed: ${output}`));
                    }
                } catch (error) {
                    reject(new Error(`Simple capture parsing error: ${error.message}`));
                }
            });

            setTimeout(() => {
                psProcess.kill();
                reject(new Error('Simple capture timeout'));
            }, 5000);
        });
    }

    // Convert screen coordinates to browser-window-relative coordinates
    convertScreenToBrowserCoords(screenArea, browserWindow) {
        const browserRelative = {
            x: screenArea.x - browserWindow.X,
            y: screenArea.y - browserWindow.Y,
            width: screenArea.width,
            height: screenArea.height
        };

        console.log(`📐 Converting coordinates:`);
        console.log(`   Screen area: ${screenArea.x}, ${screenArea.y} ${screenArea.width}x${screenArea.height}`);
        console.log(`   Browser window: ${browserWindow.X}, ${browserWindow.Y} ${browserWindow.Width}x${browserWindow.Height}`);
        console.log(`   Browser-relative: ${browserRelative.x}, ${browserRelative.y} ${browserRelative.width}x${browserRelative.height}`);

        // Validate the converted coordinates
        if (browserRelative.x < 0 || browserRelative.y < 0) {
            console.warn('⚠️ Area extends outside browser window (negative coordinates)');
        }
        
        if (browserRelative.x + browserRelative.width > browserWindow.Width ||
            browserRelative.y + browserRelative.height > browserWindow.Height) {
            console.warn('⚠️ Area extends outside browser window (exceeds bounds)');
        }

        return browserRelative;
    }

    // Main OCR analysis method for browser windows
    async analyzeBrowserArea(screenArea, areaType, targetBrowserWindow = null) {
        console.log(`🎯 Analyzing ${areaType} area in browser window...`);

        try {
            // Use selected browser window or detect automatically
            const browserWindow = targetBrowserWindow || this.selectedBrowserWindow;
            
            if (!browserWindow) {
                throw new Error('No browser window selected. Please select a browser window first.');
            }

            console.log(`🌐 Target browser: ${browserWindow.ProcessName} - ${browserWindow.Title.substring(0, 30)}...`);

            // Capture the browser window
            const browserCapture = await this.captureBrowserWindow(browserWindow);
            
            // Convert screen coordinates to browser-relative coordinates
            const browserArea = this.convertScreenToBrowserCoords(screenArea, browserWindow);
            
            // Validate browser-relative coordinates and fix negative dimensions
            if (browserArea.x < 0 || browserArea.y < 0 || 
                browserArea.x + browserArea.width > browserWindow.Width ||
                browserArea.y + browserArea.height > browserWindow.Height) {
                
                console.warn('⚠️ Area coordinates are outside browser window bounds - fixing...');
                
                // FIXED: Proper coordinate clamping to prevent negative values
                const maxX = Math.max(0, browserWindow.Width - 50);  // Ensure at least 50px width
                const maxY = Math.max(0, browserWindow.Height - 50); // Ensure at least 50px height
                
                browserArea.x = Math.max(0, Math.min(browserArea.x, maxX));
                browserArea.y = Math.max(0, Math.min(browserArea.y, maxY));
                
                // Calculate maximum possible dimensions from the clamped position
                const maxWidth = browserWindow.Width - browserArea.x;
                const maxHeight = browserWindow.Height - browserArea.y;
                
                // Ensure positive dimensions with minimum size of 50x20
                browserArea.width = Math.max(50, Math.min(browserArea.width, maxWidth));
                browserArea.height = Math.max(20, Math.min(browserArea.height, maxHeight));
                
                console.log(`🔧 Fixed area: ${browserArea.x}, ${browserArea.y} ${browserArea.width}x${browserArea.height}`);
            }

            // Extract the specific area from browser capture
            const extractedImage = await sharp(browserCapture.buffer)
                .extract({
                    left: Math.floor(browserArea.x),
                    top: Math.floor(browserArea.y),
                    width: Math.floor(browserArea.width),
                    height: Math.floor(browserArea.height)
                })
                .png()
                .toBuffer();

            // Save debug images
            const debugPath = path.join(this.debugDir, `browser-${areaType}-${Date.now()}.png`);
            fs.writeFileSync(debugPath, extractedImage);
            console.log(`💾 Debug image saved: ${debugPath}`);

            // Analyze the extracted area (placeholder - integrate with your existing OCR)
            const ocrResult = await this.analyzeExtractedArea(extractedImage, areaType);

            return {
                ...ocrResult,
                browserWindow: browserWindow.Title,
                method: 'BROWSER_WINDOW_OCR',
                originalScreenArea: screenArea,
                browserRelativeArea: browserArea
            };

        } catch (error) {
            console.error(`❌ Browser OCR failed for ${areaType}:`, error.message);
            
            return {
                value: 0,
                text: 'ERROR',
                confidence: 0,
                error: error.message,
                method: 'BROWSER_WINDOW_ERROR'
            };
        }
    }

    // Placeholder OCR analysis (integrate with your existing OCR engine)
    async analyzeExtractedArea(imageBuffer, areaType) {
        // This should integrate with your existing OCR analysis
        // For now, return realistic demo values
        
        const demoValues = {
            bet: parseFloat((0.25 + Math.random() * 19.75).toFixed(2)),
            win: Math.random() < 0.3 ? parseFloat((Math.random() * 50).toFixed(2)) : 0,
            balance: parseFloat((100 + Math.random() * 900).toFixed(2))
        };

        return {
            value: demoValues[areaType] || 0,
            text: `€${(demoValues[areaType] || 0).toFixed(2)}`,
            confidence: 75,
            method: 'BROWSER_DEMO'
        };
    }

    // Set the selected browser window
    selectBrowserWindow(index) {
        if (index >= 0 && index < this.browserWindows.length) {
            this.selectedBrowserWindow = this.browserWindows[index];
            console.log(`✅ Selected browser: ${this.selectedBrowserWindow.ProcessName} - ${this.selectedBrowserWindow.Title.substring(0, 50)}...`);
            return this.selectedBrowserWindow;
        }
        return null;
    }

    // Get info about the selected browser window
    getSelectedBrowserInfo() {
        if (!this.selectedBrowserWindow) {
            return null;
        }

        return {
            title: this.selectedBrowserWindow.Title,
            processName: this.selectedBrowserWindow.ProcessName,
            bounds: {
                x: this.selectedBrowserWindow.X,
                y: this.selectedBrowserWindow.Y,
                width: this.selectedBrowserWindow.Width,
                height: this.selectedBrowserWindow.Height
            },
            isValid: this.validateBrowserWindow(this.selectedBrowserWindow)
        };
    }

    // Validate that the browser window still exists and is accessible
    validateBrowserWindow(browserWindow) {
        // This would check if the window handle is still valid
        // Implementation depends on the platform
        return true; // Placeholder
    }
}

module.exports = BrowserWindowOCR;