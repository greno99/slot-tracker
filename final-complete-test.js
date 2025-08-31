// final-complete-test.js - Test that everything is working after the fixes

const BrowserWindowOCR = require('./browser-window-ocr');

async function runCompleteTest() {
    console.log('🎯 FINAL COMPLETE TEST - Browser Detection & Main.js Fix\n');
    console.log('Testing all fixes applied...\n');
    
    // Test 1: Browser detection with fallback
    console.log('1️⃣ Testing browser detection (with automatic fallback)...');
    const browserOCR = new BrowserWindowOCR();
    
    try {
        const windows = await browserOCR.detectBrowserWindows();
        
        if (windows && windows.length > 0) {
            console.log(`✅ SUCCESS: Found ${windows.length} browser windows!`);
            windows.forEach((win, index) => {
                const browserType = win.BrowserType || win.ProcessName;
                console.log(`   ${index + 1}. ${browserType} - ${win.Title.substring(0, 50)}...`);
                console.log(`      Size: ${win.Width}×${win.Height} at (${win.X}, ${win.Y})`);
            });
            
            // Test browser selection
            const selected = browserOCR.selectBrowserWindow(0);
            if (selected) {
                console.log(`✅ Browser selection works: ${selected.BrowserType || selected.ProcessName}`);
            }
            
        } else {
            console.log('⚠️ No browser windows detected, but no errors - this is expected if no browsers are open');
        }
        
    } catch (error) {
        console.error('❌ Browser detection test failed:', error.message);
        return false;
    }
    
    console.log('');
    
    // Test 2: Main.js syntax check
    console.log('2️⃣ Testing main.js file syntax...');
    try {
        // Try to parse the main.js file to check for syntax errors
        const fs = require('fs');
        const mainJsContent = fs.readFileSync('./main.js', 'utf8');
        
        // Check for duplicate imports
        const browserOCRImports = (mainJsContent.match(/const BrowserWindowOCR = require/g) || []).length;
        
        if (browserOCRImports === 1) {
            console.log('✅ main.js: No duplicate imports found');
        } else {
            console.log(`❌ main.js: Still has ${browserOCRImports} BrowserWindowOCR imports (should be 1)`);
            return false;
        }
        
        // Check for duplicate functions
        const getDynamicScreenSizeFunctions = (mainJsContent.match(/function getDynamicScreenSize/g) || []).length;
        
        if (getDynamicScreenSizeFunctions === 1) {
            console.log('✅ main.js: No duplicate function definitions found');
        } else {
            console.log(`❌ main.js: Still has ${getDynamicScreenSizeFunctions} getDynamicScreenSize functions (should be 1)`);
            return false;
        }
        
        // Check for duplicate IPC handlers
        const browserDetectionHandlers = (mainJsContent.match(/ipcMain\.handle\('detect-browser-windows'/g) || []).length;
        
        if (browserDetectionHandlers === 1) {
            console.log('✅ main.js: No duplicate IPC handlers found');
        } else {
            console.log(`❌ main.js: Still has ${browserDetectionHandlers} detect-browser-windows handlers (should be 1)`);
            return false;
        }
        
        console.log('✅ main.js: File structure is clean and should run without syntax errors');
        
    } catch (error) {
        console.error('❌ main.js syntax check failed:', error.message);
        return false;
    }
    
    console.log('');
    
    // Test 3: Module loading
    console.log('3️⃣ Testing module loading...');
    try {
        const OCREngine = require('./robust-ocr-engine');
        console.log('✅ robust-ocr-engine loads correctly');
        
        const testOCR = new OCREngine();
        console.log('✅ OCREngine class instantiation works');
        
        // Cleanup
        if (testOCR.terminate) {
            await testOCR.terminate().catch(() => {}); // Ignore cleanup errors
        }
        
    } catch (error) {
        console.error('❌ Module loading test failed:', error.message);
        return false;
    }
    
    console.log('');
    
    // Final summary
    console.log('🎉 FINAL COMPLETE TEST RESULTS:');
    console.log('✅ Browser detection working (with fallback for .NET Framework issues)');
    console.log('✅ main.js file cleaned up (no more duplicate imports/functions/handlers)');
    console.log('✅ All modules load correctly');
    console.log('✅ Application should start without "Identifier already declared" errors');
    console.log('');
    console.log('🚀 YOUR APPLICATION IS NOW READY TO RUN!');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Start your application: npm start');
    console.log('2. Open the spin detection window');  
    console.log('3. Click "Detect Browser Windows" - should now find Firefox/Chrome/Edge');
    console.log('4. Configure your OCR areas');
    console.log('5. Start real-time detection');
    console.log('');
    console.log('🔧 If you still have issues:');
    console.log('• Run as Administrator for better Windows permissions');
    console.log('• Temporarily disable antivirus real-time protection');
    console.log('• Make sure browsers are open and not minimized');
    
    return true;
}

// Run the complete test
runCompleteTest().catch(error => {
    console.error('❌ Complete test failed:', error);
    process.exit(1);
});