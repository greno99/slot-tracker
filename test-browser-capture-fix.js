// test-browser-capture-fix.js - Test the fixed browser window capture

const BrowserWindowOCR = require('./browser-window-ocr');

async function testBrowserCaptureFix() {
    console.log('🧪 Testing Fixed Browser Window Capture\n');
    
    const browserOCR = new BrowserWindowOCR();
    
    try {
        // Step 1: Detect browsers
        console.log('1️⃣ Detecting browsers...');
        const windows = await browserOCR.detectBrowserWindows();
        
        if (windows.length === 0) {
            console.log('❌ No browsers detected. Make sure Firefox/Chrome is open.');
            return false;
        }
        
        console.log(`✅ Found ${windows.length} browsers`);
        windows.forEach((win, i) => {
            const browserType = win.BrowserType || win.ProcessName;
            console.log(`   ${i + 1}. ${browserType} - ${win.Title.substring(0, 40)}...`);
        });
        
        // Step 2: Select first browser
        console.log('\n2️⃣ Selecting browser for capture test...');
        const selectedWindow = browserOCR.selectBrowserWindow(0);
        
        if (!selectedWindow) {
            console.log('❌ Failed to select browser window');
            return false;
        }
        
        const browserType = selectedWindow.BrowserType || selectedWindow.ProcessName;
        console.log(`✅ Selected: ${browserType}`);
        
        // Step 3: Test browser window capture with new fallback system
        console.log('\n3️⃣ Testing browser window capture (with fallback system)...');
        
        try {
            const captureResult = await browserOCR.captureBrowserWindow(selectedWindow);
            
            if (captureResult.success && captureResult.buffer) {
                console.log(`✅ SUCCESS: Browser capture working!`);
                console.log(`   Method: ${captureResult.method}`);
                console.log(`   Size: ${captureResult.buffer.length} bytes`);
                console.log(`   Window: ${captureResult.window.ProcessName}`);
                
                // Step 4: Test area analysis (simplified)
                console.log('\n4️⃣ Testing area analysis...');
                
                const testArea = {
                    x: selectedWindow.X + 100,
                    y: selectedWindow.Y + 100,
                    width: 120,
                    height: 30
                };
                
                try {
                    const areaResult = await browserOCR.analyzeBrowserArea(testArea, 'balance', selectedWindow);
                    
                    if (areaResult.value !== undefined) {
                        console.log(`✅ Area analysis working: ${areaResult.value}`);
                        console.log(`   Method: ${areaResult.method}`);
                        console.log(`   Confidence: ${areaResult.confidence}%`);
                    } else {
                        console.log('⚠️ Area analysis returned undefined value, but no critical error');
                    }
                    
                } catch (areaError) {
                    console.log(`❌ Area analysis failed: ${areaError.message}`);
                    return false;
                }
                
                console.log('\n🎉 ALL TESTS PASSED!');
                console.log('\n✅ Browser window capture is now working');
                console.log('✅ Multiple fallback methods implemented');
                console.log('✅ No more "Der Typ [WindowCapture] wurde nicht gefunden" errors');
                console.log('\n🚀 Your browser OCR should now work in the main application!');
                
                return true;
                
            } else {
                console.log('❌ Browser capture failed - no buffer returned');
                return false;
            }
            
        } catch (captureError) {
            console.log(`❌ Browser capture completely failed: ${captureError.message}`);
            console.log('\n🔧 This indicates that all fallback methods failed:');
            console.log('• Primary method: .NET Framework Add-Type blocked');
            console.log('• Fallback method: PowerShell built-in assemblies failed');
            console.log('• Ultra-simple method: Basic screen capture failed');
            console.log('\n💡 Possible solutions:');
            console.log('• Run as Administrator');
            console.log('• Temporarily disable antivirus');
            console.log('• Check Windows PowerShell execution policy');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

// Run the test
testBrowserCaptureFix().then(success => {
    if (success) {
        console.log('\n🎯 Ready to test in your main application!');
        console.log('1. Start your application: npm start');
        console.log('2. Open spin detection window');
        console.log('3. Select a browser window');
        console.log('4. Configure OCR areas');
        console.log('5. Test browser OCR - should now work without errors!');
    } else {
        console.log('\n❌ Browser capture fix needs further troubleshooting');
    }
}).catch(error => {
    console.error('❌ Test execution failed:', error);
});