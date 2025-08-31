// test-firefox-detection.js - Simple test to verify Firefox detection is working

const BrowserWindowOCR = require('./browser-window-ocr');

async function testFirefoxDetection() {
    console.log('🦊 Testing Firefox Detection\n');
    
    const browserOCR = new BrowserWindowOCR();
    
    try {
        console.log('Detecting browser windows with improved detection...');
        const windows = await browserOCR.detectBrowserWindows();
        
        if (windows.length === 0) {
            console.log('❌ No browser windows found!');
            console.log('\n🔧 Troubleshooting steps:');
            console.log('1. Make sure Firefox is open and visible (not minimized)');
            console.log('2. Try opening a new Firefox tab');
            console.log('3. Make sure Firefox window is at least 300×200 pixels');
            console.log('4. Check that Firefox is not running in private/incognito mode');
            return;
        }
        
        console.log(`✅ SUCCESS! Found ${windows.length} browser windows:\n`);
        
        let firefoxFound = false;
        let chromeFound = false;
        let edgeFound = false;
        
        windows.forEach((win, index) => {
            const browserType = win.BrowserType || win.ProcessName;
            console.log(`${index + 1}. ${browserType} (Process: ${win.ProcessName})`);
            console.log(`   Title: ${win.Title.substring(0, 70)}...`);
            console.log(`   Size: ${win.Width}×${win.Height} at (${win.X}, ${win.Y})`);
            console.log(`   Process ID: ${win.ProcessId}`);
            
            if (browserType.toLowerCase().includes('firefox')) {
                firefoxFound = true;
                console.log('   🦊 Firefox detected successfully!');
            } else if (browserType.toLowerCase().includes('chrome')) {
                chromeFound = true;
                console.log('   🌐 Chrome detected successfully!');
            } else if (browserType.toLowerCase().includes('edge')) {
                edgeFound = true;
                console.log('   🔷 Edge detected successfully!');
            }
            console.log('');
        });
        
        // Summary
        console.log('🎉 Browser Detection Summary:');
        if (firefoxFound) console.log('✅ Firefox: Working');
        if (chromeFound) console.log('✅ Chrome: Working');  
        if (edgeFound) console.log('✅ Edge: Working');
        
        if (firefoxFound) {
            console.log('\n🎯 Your Firefox should now be detected properly!');
            console.log('The "no browser found" issue has been resolved.');
        }
        
    } catch (error) {
        console.error('❌ Browser detection test failed:', error.message);
        console.log('\nThis might be due to:');
        console.log('• PowerShell execution policy restrictions');
        console.log('• Antivirus software blocking the detection script');
        console.log('• Windows permissions issues');
        console.log('\n💡 Try running the command prompt as Administrator and test again.');
    }
}

// Run the Firefox detection test
testFirefoxDetection();