// test-fixed-browser-detection.js - Test the updated browser detection with fallback

const BrowserWindowOCR = require('./browser-window-ocr');

async function testFixedBrowserDetection() {
    console.log('🧪 Testing Fixed Browser Detection (with Fallback Support)\n');
    
    const browserOCR = new BrowserWindowOCR();
    
    try {
        console.log('🔍 Starting browser detection...');
        const windows = await browserOCR.detectBrowserWindows();
        
        console.log('\n📊 DETECTION RESULTS:\n');
        
        if (windows.length === 0) {
            console.log('❌ No browser windows detected');
            console.log('\n🔧 This could mean:');
            console.log('• No browsers are currently open');
            console.log('• All browsers are minimized');
            console.log('• System security is blocking all detection methods');
            console.log('\n💡 Try opening Firefox/Chrome and make sure it\'s not minimized');
            return;
        }
        
        console.log(`✅ SUCCESS! Found ${windows.length} browser windows:\n`);
        
        let detectionSummary = {
            Firefox: 0,
            Chrome: 0,
            Edge: 0,
            Other: 0
        };
        
        windows.forEach((win, index) => {
            const browserType = win.BrowserType || win.ProcessName;
            console.log(`${index + 1}. 🌐 ${browserType}`);
            console.log(`   Process: ${win.ProcessName} (PID: ${win.ProcessId})`);
            console.log(`   Title: ${win.Title}`);
            console.log(`   Window: ${win.Width}×${win.Height} at (${win.X}, ${win.Y})`);
            
            // Count browser types
            if (browserType.includes('Firefox')) {
                detectionSummary.Firefox++;
            } else if (browserType.includes('Chrome')) {
                detectionSummary.Chrome++;
            } else if (browserType.includes('Edge')) {
                detectionSummary.Edge++;
            } else {
                detectionSummary.Other++;
            }
            
            console.log('   ✅ Ready for OCR targeting!');
            console.log('');
        });
        
        // Summary
        console.log('📈 Browser Detection Summary:');
        if (detectionSummary.Firefox > 0) console.log(`  🦊 Firefox: ${detectionSummary.Firefox} windows detected`);
        if (detectionSummary.Chrome > 0) console.log(`  🌐 Chrome: ${detectionSummary.Chrome} windows detected`);
        if (detectionSummary.Edge > 0) console.log(`  🔷 Edge: ${detectionSummary.Edge} windows detected`);
        if (detectionSummary.Other > 0) console.log(`  🔧 Other browsers: ${detectionSummary.Other} windows detected`);
        
        console.log('\\n🎯 NEXT STEPS:');
        console.log('1. Your browser detection is now working!');
        console.log('2. Test your original quick-test-browser-ocr.js script');
        console.log('3. The OCR system should now target browser windows correctly');
        console.log('4. No more taskbar reading issues!');
        
        // Test browser selection
        if (windows.length > 0) {
            console.log('\\n🧪 Testing browser window selection...');
            const selectedWindow = browserOCR.selectBrowserWindow(0);
            
            if (selectedWindow) {
                console.log(`✅ Successfully selected: ${selectedWindow.BrowserType || selectedWindow.ProcessName}`);
                console.log(`   Title: ${selectedWindow.Title}`);
                console.log('   This window is ready for OCR area configuration!');
            } else {
                console.log('❌ Failed to select browser window');
            }
        }
        
    } catch (error) {
        console.error('❌ Browser detection test failed:', error.message);
        console.log('\\n🔧 This indicates a system-level issue:');
        console.log('• Antivirus blocking all process enumeration');
        console.log('• Windows security policy preventing access');
        console.log('• PowerShell completely disabled');
        console.log('\\n💡 Try running as Administrator or checking antivirus settings');
    }
}

// Run the comprehensive test
testFixedBrowserDetection();