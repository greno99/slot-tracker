// improved-browser-detection.js - Enhanced browser detection that works with Firefox, Chrome, and Edge

const { execSync } = require('child_process');

class ImprovedBrowserDetection {
    
    async detectAllBrowserWindows() {
        console.log('🌐 Enhanced browser detection starting...\n');
        
        if (process.platform !== 'win32') {
            console.log('❌ This enhanced detection is designed for Windows');
            return [];
        }

        try {
            // Enhanced PowerShell script with better browser detection
            const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Get all visible windows with enhanced browser detection
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
    
    [DllImport("user32.dll")]
    public static extern IntPtr GetParent(IntPtr hWnd);
    
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
            
            # Get process information
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
            $rect = New-Object WindowEnumerator+RECT
            if ($isBrowser -and [WindowEnumerator]::GetWindowRect($hWnd, [ref]$rect)) {
                $width = $rect.Right - $rect.Left
                $height = $rect.Bottom - $rect.Top
                
                # Only consider windows that are large enough to be main browser windows
                if ($width -gt 300 -and $height -gt 200) {
                    # Check if it's a main window (no parent)
                    $parent = [WindowEnumerator]::GetParent($hWnd)
                    if ($parent -eq [IntPtr]::Zero) {
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

Write-Host "Scanning all windows for browsers..."
[WindowEnumerator]::EnumWindows($callback, [IntPtr]::Zero)

Write-Host "Found $($windows.Count) browser windows"

# Sort by browser type and window size (largest first)
$windows = $windows | Sort-Object BrowserType, { $_.Width * $_.Height } -Descending

# Output as JSON
$windows | ConvertTo-Json
`;

            console.log('Running enhanced PowerShell browser detection...');
            
            const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, {
                encoding: 'utf8',
                timeout: 15000,
                windowsHide: true
            });

            const windows = JSON.parse(result);
            const browserWindows = Array.isArray(windows) ? windows : [windows].filter(Boolean);
            
            console.log(`✅ Enhanced detection found ${browserWindows.length} browser windows:\n`);
            
            browserWindows.forEach((win, index) => {
                console.log(`${index + 1}. ${win.BrowserType} (${win.ProcessName})`);
                console.log(`   Title: ${win.Title.substring(0, 80)}...`);
                console.log(`   Size: ${win.Width}×${win.Height} at (${win.X}, ${win.Y})`);
                console.log(`   Process ID: ${win.ProcessId}`);
                console.log('');
            });

            if (browserWindows.length === 0) {
                console.log('❌ No browser windows detected.');
                console.log('\n🔧 Troubleshooting:');
                console.log('1. Make sure your browser is open and visible (not minimized)');
                console.log('2. Try opening a new browser tab');
                console.log('3. Make sure the browser window is at least 300×200 pixels');
                console.log('4. Supported browsers: Firefox, Chrome, Edge, Opera, Brave, Safari');
            }

            return browserWindows;

        } catch (error) {
            console.error('❌ Enhanced browser detection failed:', error.message);
            console.log('\nThis might be due to:');
            console.log('• PowerShell execution policy restrictions');
            console.log('• Antivirus software blocking the script');
            console.log('• Missing .NET Framework components');
            return [];
        }
    }
}

// Test the enhanced detection
async function testEnhancedDetection() {
    const detector = new ImprovedBrowserDetection();
    const windows = await detector.detectAllBrowserWindows();
    
    if (windows.length > 0) {
        console.log('🎉 SUCCESS! Enhanced browser detection is working.');
        console.log(`Found ${windows.length} browser window(s) that should work with the OCR system.`);
    } else {
        console.log('❌ No browsers detected. Please check the troubleshooting steps above.');
    }
    
    return windows;
}

// Run the test
testEnhancedDetection();