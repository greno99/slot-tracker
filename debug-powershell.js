// debug-powershell.js - Debug PowerShell screenshot issues
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function debugPowerShell() {
    console.log('🔍 Debugging PowerShell screenshot issues...\n');
    
    // Test 1: Basic PowerShell availability
    console.log('1️⃣ Testing PowerShell availability...');
    try {
        const psVersion = execSync('powershell -Command "$PSVersionTable.PSVersion"', { 
            encoding: 'utf8', 
            timeout: 10000 
        });
        console.log('✅ PowerShell is available');
        console.log('   Version:', psVersion.trim());
    } catch (error) {
        console.log('❌ PowerShell not available:', error.message);
        return;
    }
    
    // Test 2: .NET Assemblies loading
    console.log('\n2️⃣ Testing .NET assemblies loading...');
    try {
        const assemblyTest = execSync(`powershell -Command "
            try {
                Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
                Add-Type -AssemblyName System.Drawing -ErrorAction Stop
                Write-Host 'SUCCESS: Assemblies loaded'
            } catch {
                Write-Host 'ERROR: ' + $_.Exception.Message
            }
        "`, { encoding: 'utf8', timeout: 10000 });
        
        console.log('   Result:', assemblyTest.trim());
        
        if (assemblyTest.includes('SUCCESS')) {
            console.log('✅ .NET assemblies load correctly');
        } else {
            console.log('❌ .NET assemblies failed to load');
        }
    } catch (error) {
        console.log('❌ Assembly test failed:', error.message);
    }
    
    // Test 3: Screen access
    console.log('\n3️⃣ Testing screen access...');
    try {
        const screenTest = execSync(`powershell -Command "
            try {
                Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
                $screen = [System.Windows.Forms.Screen]::PrimaryScreen
                $bounds = $screen.Bounds
                Write-Host 'SUCCESS: Screen' $bounds.Width 'x' $bounds.Height
            } catch {
                Write-Host 'ERROR: ' + $_.Exception.Message
            }
        "`, { encoding: 'utf8', timeout: 10000 });
        
        console.log('   Result:', screenTest.trim());
        
        if (screenTest.includes('SUCCESS')) {
            console.log('✅ Screen access works');
        } else {
            console.log('❌ Screen access failed');
        }
    } catch (error) {
        console.log('❌ Screen test failed:', error.message);
    }
    
    // Test 4: Simple screenshot attempt
    console.log('\n4️⃣ Testing simple screenshot...');
    const testPath = path.join(__dirname, 'debug-screenshot.png');
    
    try {
        const screenshotTest = execSync(`powershell -ExecutionPolicy Bypass -NoProfile -Command "
            try {
                Add-Type -AssemblyName System.Windows.Forms
                Add-Type -AssemblyName System.Drawing
                
                $screen = [System.Windows.Forms.Screen]::PrimaryScreen
                $bounds = $screen.Bounds
                
                $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
                $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
                $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
                
                $savePath = '${testPath.replace(/\\/g, '\\\\')}'
                $bitmap.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)
                
                $graphics.Dispose()
                $bitmap.Dispose()
                
                if (Test-Path $savePath) {
                    $fileInfo = Get-Item $savePath
                    Write-Host 'SUCCESS:' $fileInfo.Length
                } else {
                    Write-Host 'ERROR: File not created'
                }
            } catch {
                Write-Host 'ERROR: ' + $_.Exception.Message
                Write-Host 'STACK: ' + $_.Exception.StackTrace
            }
        "`, { encoding: 'utf8', timeout: 25000 });
        
        console.log('   Result:', screenshotTest.trim());
        
        if (screenshotTest.includes('SUCCESS:') && fs.existsSync(testPath)) {
            const stats = fs.statSync(testPath);
            console.log(`✅ Screenshot created: ${stats.size} bytes`);
            console.log(`   Saved to: ${testPath}`);
            
            // Clean up
            try { fs.unlinkSync(testPath); } catch(e) {}
        } else {
            console.log('❌ Screenshot creation failed');
        }
        
    } catch (error) {
        console.log('❌ Screenshot test failed:', error.message);
        if (error.stderr) {
            console.log('   PowerShell stderr:', error.stderr.toString());
        }
    }
    
    // Test 5: Python PIL availability
    console.log('\n5️⃣ Testing Python PIL availability...');
    try {
        const pythonTest = execSync('python -c "from PIL import ImageGrab; print(\\"SUCCESS: PIL available\\"); screenshot = ImageGrab.grab(); print(f\\"Screenshot: {screenshot.size}\\")"', {
            encoding: 'utf8',
            timeout: 15000
        });
        
        console.log('   Result:', pythonTest.trim());
        
        if (pythonTest.includes('SUCCESS')) {
            console.log('✅ Python PIL is available');
        } else {
            console.log('❌ Python PIL failed');
        }
    } catch (error) {
        console.log('❌ Python PIL test failed:', error.message);
    }
    
    console.log('\n📊 DEBUG SUMMARY:');
    console.log('=================');
    console.log('This debug info will help identify why screenshot methods are failing.');
    console.log('The Enhanced OCR should work with at least one working screenshot method.');
}

// Run the debug if called directly
if (require.main === module) {
    debugPowerShell()
        .then(() => {
            console.log('\n🔍 PowerShell debug completed');
        })
        .catch(error => {
            console.error('\n💥 Debug script failed:', error);
        });
}

module.exports = debugPowerShell;
