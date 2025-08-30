// test-quick-fix.js - Test the Quick Fix OCR immediately
const QuickFixOCR = require('./quick-fix-ocr');

async function testQuickFix() {
    console.log('🧪 Testing Quick Fix OCR...\n');
    
    const ocr = new QuickFixOCR();
    
    try {
        await ocr.initialize();
        
        // Your areas from the log
        const areas = {
            bet: { x: 1353, y: 1078, width: 103, height: 43 },
            win: { x: 967, y: 1079, width: 108, height: 47 },
            balance: { x: 556, y: 1075, width: 117, height: 51 }
        };
        
        console.log('📍 Testing these areas from your configuration:');
        console.log('   Bet:', areas.bet);
        console.log('   Win:', areas.win);
        console.log('   Balance:', areas.balance);
        console.log();
        
        const results = await ocr.testAllAreas(areas);
        
        console.log('\n📊 RESULTS SUMMARY:');
        console.log('===================');
        console.log(`Total areas tested: ${results.totalAreas}`);
        console.log(`Successful areas: ${results.successfulAreas}`);
        console.log();
        
        for (const [areaType, result] of Object.entries(results.results)) {
            console.log(`🎯 ${areaType.toUpperCase()}:`);
            console.log(`   Value: €${result.value.toFixed(2)}`);
            console.log(`   Confidence: ${result.confidence}%`);
            console.log(`   Method: ${result.method}`);
            console.log(`   Analysis: ${result.details || 'N/A'}`);
            if (result.imageStats) {
                console.log(`   Area size: ${result.imageStats.width}x${result.imageStats.height}px`);
                console.log(`   Contrast: ${result.imageStats.contrast}`);
            }
            console.log();
        }
        
        console.log('✅ Test completed successfully!');
        console.log('📁 Check the ocr-debug/ folder for:');
        console.log('   - Extracted area images');
        console.log('   - Test report JSON file');
        console.log('   - Full screenshots');
        
        await ocr.terminate();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
if (require.main === module) {
    testQuickFix()
        .then(() => {
            console.log('\n🎉 Test script completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Test script failed:', error);
            process.exit(1);
        });
}

module.exports = testQuickFix;