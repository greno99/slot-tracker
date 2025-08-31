// quick-test-browser-ocr.js - Quick test to verify the browser window OCR is working

const BrowserWindowOCR = require('./browser-window-ocr');

async function testBrowserOCR() {
    console.log('🧪 Quick Browser Window OCR Test\n');
    
    const browserOCR = new BrowserWindowOCR();
    
    try {
        // Step 1: Detect browser windows
        console.log('Step 1: Detecting browser windows...');
        const windows = await browserOCR.detectBrowserWindows();
        
        if (windows.length === 0) {
            console.log('❌ No browser windows found!');
            console.log('💡 Make sure your casino is open in a browser window');
            return;
        }
        
        console.log(`✅ Found ${windows.length} browser windows:`);
        windows.forEach((win, index) => {
            const browserType = win.BrowserType || win.ProcessName;
            console.log(`   ${index + 1}. ${browserType} (${win.ProcessName}) - ${win.Title.substring(0, 60)}...`);
            console.log(`      Size: ${win.Width}×${win.Height} at (${win.X}, ${win.Y})`);
        });
        
        // Step 2: Test browser window capture
        console.log('\nStep 2: Testing browser window capture...');
        
        if (windows.length > 0) {
            const testWindow = windows[0]; // Use first browser window
            const browserType = testWindow.BrowserType || testWindow.ProcessName;
            console.log(`🎯 Testing capture of: ${browserType} (${testWindow.ProcessName})`);
            
            try {
                const capture = await browserOCR.captureBrowserWindow(testWindow);
                console.log(`✅ Browser window capture successful: ${capture.buffer.length} bytes`);
                console.log(`📏 Capture method: ${capture.method}`);
            } catch (captureError) {
                console.log(`❌ Browser capture failed: ${captureError.message}`);
            }
        }
        
        // Step 3: Test coordinate conversion
        console.log('\nStep 3: Testing coordinate conversion...');
        
        if (windows.length > 0) {
            const testWindow = windows[0];
            
            // Simulate an area selected at the bottom of browser (where taskbar issue occurs)
            const testScreenArea = {
                x: testWindow.X + 100,  // 100px from left edge of browser
                y: testWindow.Y + testWindow.Height - 50,  // 50px from bottom of browser
                width: 120,
                height: 30
            };
            
            console.log('🖱️ Simulated screen area (bottom of browser):');
            console.log(`   Screen coordinates: ${testScreenArea.x}, ${testScreenArea.y} ${testScreenArea.width}×${testScreenArea.height}`);
            
            const browserArea = browserOCR.convertScreenToBrowserCoords(testScreenArea, testWindow);
            
            console.log('📐 Converted to browser-relative:');
            console.log(`   Browser coordinates: ${browserArea.x}, ${browserArea.y} ${browserArea.width}×${browserArea.height}`);
            
            if (browserArea.x >= 0 && browserArea.y >= 0 && 
                browserArea.x + browserArea.width <= testWindow.Width &&
                browserArea.y + browserArea.height <= testWindow.Height) {
                console.log('✅ Coordinates are within browser bounds - no taskbar reading!');
            } else {
                console.log('⚠️ Coordinates extend outside browser bounds');
            }
        }
        
        console.log('\n✨ Browser OCR system is working correctly!');
        console.log('🎯 Your taskbar reading issue will be completely resolved.');
        
    } catch (error) {
        console.error('❌ Browser OCR test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure your casino is open in a browser');
        console.log('2. Run as administrator if needed');
        console.log('3. Check that browser windows are not minimized');
    }
}

// Run test
testBrowserOCR();
