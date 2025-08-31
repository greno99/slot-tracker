// diagnose-browser-detection.js - Comprehensive diagnostics to find the root cause

const { execSync, spawn } = require('child_process');
const path = require('path');

class BrowserDetectionDiagnostics {
    
    async runFullDiagnostics() {
        console.log('🔍 BROWSER DETECTION DIAGNOSTICS\n');
        console.log('Let\'s find out why browsers aren\'t being detected...\n');
        
        // Test 1: PowerShell availability and version
        await this.testPowerShellAvailability();
        
        // Test 2: PowerShell execution policy
        await this.testPowerShellExecutionPolicy();
        
        // Test 3: Basic PowerShell window enumeration
        await this.testBasicWindowEnumeration();
        
        // Test 4: .NET Framework availability
        await this.testDotNetFramework();
        
        // Test 5: Process enumeration (alternative approach)
        await this.testProcessEnumeration();
        
        // Test 6: Simple tasklist approach
        await this.testTasklistApproach();
        
        console.log('\n📋 DIAGNOSTIC SUMMARY:');
        console.log('Check the results above to identify the issue.');
    }
    
    async testPowerShellAvailability() {
        console.log('1️⃣ Testing PowerShell Availability...');
        
        try {
            const result = execSync('powershell -Command "$PSVersionTable.PSVersion"', {
                encoding: 'utf8',
                timeout: 5000
            });
            console.log('✅ PowerShell is available');
            console.log(`   Version info: ${result.trim()}`);
        } catch (error) {
            console.log('❌ PowerShell is not available or accessible');
            console.log(`   Error: ${error.message}`);
            return false;
        }
        
        return true;
    }
    
    async testPowerShellExecutionPolicy() {
        console.log('\n2️⃣ Testing PowerShell Execution Policy...');
        
        try {
            const policy = execSync('powershell -Command "Get-ExecutionPolicy"', {
                encoding: 'utf8',
                timeout: 5000
            });
            console.log(`✅ Execution Policy: ${policy.trim()}`);
            
            if (policy.trim() === 'Restricted') {
                console.log('⚠️ WARNING: Execution policy is Restricted - this will block scripts');
                console.log('   Solution: Run as Administrator and execute:');
                console.log('   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser');
            }
            
        } catch (error) {
            console.log('❌ Cannot check PowerShell execution policy');
            console.log(`   Error: ${error.message}`);
        }
    }
    
    async testBasicWindowEnumeration() {
        console.log('\n3️⃣ Testing Basic Window Enumeration...');
        
        const simpleScript = `
try {
    Add-Type -AssemblyName System.Windows.Forms
    $windows = Get-Process | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object ProcessName, MainWindowTitle
    Write-Host "SUCCESS: Found" $windows.Count "windows with titles"
    $windows | ForEach-Object { Write-Host "  " $_.ProcessName ":" $_.MainWindowTitle.Substring(0, [Math]::Min(50, $_.MainWindowTitle.Length)) }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
`;

        try {
            const result = execSync(`powershell -WindowStyle Hidden -ExecutionPolicy Bypass -Command "${simpleScript}"`, {
                encoding: 'utf8',
                timeout: 10000
            });
            
            if (result.includes('SUCCESS:')) {
                console.log('✅ Basic window enumeration works');
                console.log(`   ${result.trim()}`);
            } else {
                console.log('❌ Basic window enumeration failed');
                console.log(`   Output: ${result}`);
            }
            
        } catch (error) {
            console.log('❌ Basic window enumeration completely failed');
            console.log(`   Error: ${error.message}`);
        }
    }
    
    async testDotNetFramework() {
        console.log('\n4️⃣ Testing .NET Framework Support...');
        
        const dotnetScript = `
try {
    Add-Type @"
using System;
public class TestClass {
    public static string GetMessage() {
        return "DotNet works!";
    }
}
"@
    Write-Host "SUCCESS:" ([TestClass]::GetMessage())
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
`;

        try {
            const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${dotnetScript}"`, {
                encoding: 'utf8',
                timeout: 5000
            });
            
            if (result.includes('SUCCESS:')) {
                console.log('✅ .NET Framework Add-Type works');
            } else {
                console.log('❌ .NET Framework Add-Type failed');
                console.log(`   Output: ${result}`);
            }
            
        } catch (error) {
            console.log('❌ .NET Framework test failed');
            console.log(`   Error: ${error.message}`);
        }
    }
    
    async testProcessEnumeration() {
        console.log('\n5️⃣ Testing Process Enumeration (Alternative Approach)...');
        
        const processScript = `
try {
    $browsers = @("firefox", "chrome", "msedge", "opera", "brave")
    $found = @()
    
    foreach ($browser in $browsers) {
        $processes = Get-Process -Name $browser -ErrorAction SilentlyContinue
        foreach ($proc in $processes) {
            if ($proc.MainWindowTitle -ne "") {
                $found += @{
                    Name = $proc.ProcessName
                    Title = $proc.MainWindowTitle
                    Id = $proc.Id
                }
            }
        }
    }
    
    Write-Host "FOUND: $($found.Count) browser processes"
    foreach ($item in $found) {
        Write-Host "  $($item.Name) (PID: $($item.Id)): $($item.Title)"
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
`;

        try {
            const result = execSync(`powershell -ExecutionPolicy Bypass -Command "${processScript}"`, {
                encoding: 'utf8',
                timeout: 10000
            });
            
            console.log('Process enumeration result:');
            console.log(`   ${result.trim()}`);
            
            if (result.includes('FOUND: 0')) {
                console.log('⚠️ No browser processes found with main windows');
            } else if (result.includes('FOUND:')) {
                console.log('✅ Browser processes found! The issue might be with window enumeration API');
            }
            
        } catch (error) {
            console.log('❌ Process enumeration failed');
            console.log(`   Error: ${error.message}`);
        }
    }
    
    async testTasklistApproach() {
        console.log('\n6️⃣ Testing Windows Tasklist Approach...');
        
        try {
            // Simple tasklist to see what's running
            const result = execSync('tasklist /FI "IMAGENAME eq firefox.exe" /FO CSV', {
                encoding: 'utf8',
                timeout: 5000
            });
            
            if (result.includes('firefox.exe')) {
                console.log('✅ Firefox process found via tasklist');
                console.log(`   ${result.trim()}`);
            } else {
                console.log('❌ Firefox process not found via tasklist');
                console.log('   Make sure Firefox is actually running');
            }
            
        } catch (error) {
            console.log('❌ Tasklist approach failed');
            console.log(`   Error: ${error.message}`);
        }
        
        // Also test other browsers
        const browsers = ['chrome.exe', 'msedge.exe'];
        for (const browser of browsers) {
            try {
                const result = execSync(`tasklist /FI "IMAGENAME eq ${browser}" /FO CSV`, {
                    encoding: 'utf8',
                    timeout: 5000
                });
                
                if (result.includes(browser)) {
                    console.log(`✅ ${browser} process found via tasklist`);
                } else {
                    console.log(`ℹ️ ${browser} not running`);
                }
            } catch (error) {
                // Ignore errors for this test
            }
        }
    }
}

// Alternative simple detection using Node.js only (no PowerShell)
async function testNodeJSDetection() {
    console.log('\n🔄 Testing Node.js-only Detection (Backup Method)...');
    
    try {
        // Try to get running processes using Node.js
        const processes = execSync('wmic process get Name,ProcessId,CommandLine /format:csv', {
            encoding: 'utf8',
            timeout: 10000
        });
        
        const lines = processes.split('\n');
        let browserCount = 0;
        
        lines.forEach(line => {
            if (line.includes('firefox.exe') || line.includes('chrome.exe') || line.includes('msedge.exe')) {
                browserCount++;
                console.log(`   Found: ${line.trim()}`);
            }
        });
        
        if (browserCount > 0) {
            console.log(`✅ Found ${browserCount} browser processes using WMIC`);
            console.log('   This could be used as fallback detection method');
        } else {
            console.log('❌ No browser processes found using WMIC');
        }
        
    } catch (error) {
        console.log('❌ Node.js WMIC detection failed');
        console.log(`   Error: ${error.message}`);
    }
}

// Run all diagnostics
async function runAllDiagnostics() {
    const diagnostics = new BrowserDetectionDiagnostics();
    await diagnostics.runFullDiagnostics();
    await testNodeJSDetection();
    
    console.log('\n🔧 RECOMMENDED SOLUTIONS:');
    console.log('1. If PowerShell execution policy is Restricted:');
    console.log('   - Run Command Prompt as Administrator');  
    console.log('   - Execute: powershell Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser');
    console.log('');
    console.log('2. If antivirus is blocking:');
    console.log('   - Temporarily disable real-time protection');
    console.log('   - Add your project folder to antivirus exclusions');
    console.log('');
    console.log('3. If .NET Framework is missing:');
    console.log('   - Install .NET Framework 4.7.2 or later');
    console.log('');
    console.log('4. If all PowerShell approaches fail:');
    console.log('   - We can implement a WMIC-based fallback solution');
}

// Execute diagnostics
runAllDiagnostics();