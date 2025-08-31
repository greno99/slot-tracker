// fallback-browser-detection.js - Browser detection using tasklist + WMIC (no .NET Framework needed)

const { execSync } = require('child_process');
const path = require('path');

class FallbackBrowserDetection {
    constructor() {
        this.browserProcesses = [];
        this.debugMode = true;
    }

    async detectBrowserWindows() {
        console.log('🔄 Using fallback browser detection (no .NET Framework required)...\n');
        
        try {
            // Step 1: Get browser processes with their command lines
            const browserProcesses = await this.getBrowserProcesses();
            
            // Step 2: Get window information using alternative method
            const windowsWithTitles = await this.getWindowTitles();
            
            // Step 3: Match processes with windows
            const browserWindows = this.matchProcessesToWindows(browserProcesses, windowsWithTitles);
            
            return browserWindows;
            
        } catch (error) {
            console.error('❌ Fallback detection failed:', error.message);
            return [];
        }
    }
    
    async getBrowserProcesses() {
        console.log('📋 Getting browser processes via WMIC...');
        
        try {
            // Get detailed process information including command lines
            const result = execSync('wmic process where "Name like \'%firefox.exe%\' or Name like \'%chrome.exe%\' or Name like \'%msedge.exe%\' or Name like \'%opera.exe%\' or Name like \'%brave.exe%\'" get Name,ProcessId,CommandLine,ExecutablePath /format:csv', {
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
                        // Only get main browser processes (not utility processes)
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
            return processes;
            
        } catch (error) {
            console.error('❌ Failed to get browser processes:', error.message);
            return [];
        }
    }
    
    async getWindowTitles() {
        console.log('🪟 Getting window titles via tasklist...');
        
        try {
            // Alternative approach: use PowerShell without Add-Type
            const psScript = `
Get-Process | Where-Object { 
    $_.MainWindowTitle -ne "" -and 
    ($_.ProcessName -eq "firefox" -or 
     $_.ProcessName -eq "chrome" -or 
     $_.ProcessName -eq "msedge" -or 
     $_.ProcessName -eq "opera" -or 
     $_.ProcessName -eq "brave") 
} | ForEach-Object {
    Write-Host "$($_.Id)|||$($_.ProcessName)|||$($_.MainWindowTitle)"
}`;

            const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, {
                encoding: 'utf8',
                timeout: 5000
            });
            
            const windows = [];
            const lines = result.split('\n').filter(line => line.trim() && line.includes('|||'));
            
            lines.forEach(line => {
                const parts = line.split('|||');
                if (parts.length >= 3) {
                    windows.push({
                        ProcessId: parseInt(parts[0]),
                        ProcessName: parts[1].trim(),
                        Title: parts[2].trim()
                    });
                }
            });
            
            console.log(`✅ Found ${windows.length} browser windows with titles`);
            return windows;
            
        } catch (error) {
            console.log('⚠️ PowerShell window title detection failed, using fallback...');
            
            // Fallback: create dummy windows based on processes
            return [];
        }
    }
    
    matchProcessesToWindows(processes, windows) {
        console.log('🔗 Matching processes to windows...');
        
        const browserWindows = [];
        
        processes.forEach(process => {
            // Find matching window by process ID
            const matchingWindow = windows.find(w => w.ProcessId === process.ProcessId);
            
            if (matchingWindow) {
                // Real window found
                browserWindows.push({
                    Handle: process.ProcessId, // Use PID as handle for fallback
                    Title: matchingWindow.Title,
                    ProcessName: process.ProcessName,
                    BrowserType: process.BrowserType,
                    ProcessId: process.ProcessId,
                    CommandLine: process.CommandLine,
                    // Estimated window bounds (will be refined during capture)
                    X: 100,
                    Y: 100, 
                    Width: 1200,
                    Height: 800,
                    DetectionMethod: 'FALLBACK_MATCHED'
                });
            } else {
                // No window title found, but process exists - create estimated entry
                browserWindows.push({
                    Handle: process.ProcessId,
                    Title: `${process.BrowserType} Browser`,
                    ProcessName: process.ProcessName,
                    BrowserType: process.BrowserType,
                    ProcessId: process.ProcessId,
                    CommandLine: process.CommandLine,
                    X: 100,
                    Y: 100,
                    Width: 1200,
                    Height: 800,
                    DetectionMethod: 'FALLBACK_ESTIMATED'
                });
            }
        });
        
        // Sort by browser type
        browserWindows.sort((a, b) => a.BrowserType.localeCompare(b.BrowserType));
        
        console.log(`✅ Matched ${browserWindows.length} browser windows:`);
        browserWindows.forEach((win, index) => {
            console.log(`  ${index + 1}. ${win.BrowserType} (PID: ${win.ProcessId})`);
            console.log(`     Title: ${win.Title}`);
            console.log(`     Method: ${win.DetectionMethod}`);
        });
        
        return browserWindows;
    }
    
    isMainBrowserProcess(commandLine, processName) {
        if (!commandLine) return true; // If no command line info, assume main process
        
        // Filter out utility processes
        const utilityKeywords = [
            '--type=', // Chrome/Edge utility processes
            '-contentproc', // Firefox content processes  
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
}

// Test the fallback detection
async function testFallbackDetection() {
    console.log('🧪 Testing Fallback Browser Detection\n');
    
    const detector = new FallbackBrowserDetection();
    const windows = await detector.detectBrowserWindows();
    
    console.log('\n📊 FINAL RESULTS:');
    
    if (windows.length > 0) {
        console.log(`🎉 SUCCESS! Found ${windows.length} browser windows using fallback detection:`);
        
        windows.forEach((win, index) => {
            console.log(`\n${index + 1}. ${win.BrowserType}`);
            console.log(`   Process: ${win.ProcessName} (PID: ${win.ProcessId})`);
            console.log(`   Title: ${win.Title}`);
            console.log(`   Detection: ${win.DetectionMethod}`);
            console.log(`   Estimated Size: ${win.Width}×${win.Height} at (${win.X}, ${win.Y})`);
        });
        
        console.log('\n✅ This fallback method should work with your OCR system!');
        console.log('The .NET Framework issue has been bypassed.');
        
    } else {
        console.log('❌ No browser windows detected even with fallback method.');
        console.log('This indicates a deeper system configuration issue.');
    }
    
    return windows;
}

module.exports = FallbackBrowserDetection;

// Run test if called directly
if (require.main === module) {
    testFallbackDetection();
}
