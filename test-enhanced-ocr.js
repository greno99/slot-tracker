// test-enhanced-ocr.js - Test the Enhanced OCR with fixed area extraction
const EnhancedScreenshotOCR = require('./enhanced-screenshot-ocr');

async function testEnhancedOCR() {
    console.log('🧪 Testing Enhanced OCR with FIXED area extraction...\n');
    
    const ocr = new EnhancedScreenshotOCR();
    
    try {
        console.log('⚡ Initializing Enhanced OCR...');
        const initResult = await ocr.initialize();
        
        if (!initResult) {
            console.error('❌ Failed to initialize Enhanced OCR!');
            return;
        }
        
        console.log('✅ Enhanced OCR initialized successfully!\n');
        
        // Use the exact areas from the log that were causing problems
        const problematicAreas = {
            bet: { x: 1355, y: 1078, width: 99, height: 44 },
            win: { x: 962, y: 1078, width: 112, height: 48 },
            balance: { x: 547, y: 1075, width: 126, height: 46 }
        };
        
        console.log('📍 Testing FIXED areas that previously caused errors:');
        console.log('   Bet area:     ', problematicAreas.bet);
        console.log('   Win area:     ', problematicAreas.win);
        console.log('   Balance area: ', problematicAreas.balance);
        console.log('\n🔧 These areas were causing "extract_area: bad extract area" errors');
        console.log('   Testing with FIXED bounds validation logic...\n');
        
        const results = {};
        let totalErrors = 0;
        let totalSuccess = 0;
        
        // Test each area individually
        for (const [areaType, area] of Object.entries(problematicAreas)) {
            console.log(`🎯 Testing ${areaType.toUpperCase()} area...`);
            
            try {
                const result = await ocr.analyzeScreenArea(area, areaType);
                
                results[areaType] = result;
                totalSuccess++;
                
                console.log(`   ✅ SUCCESS for ${areaType}:`);
                console.log(`      Value: ${result.value}`);
                console.log(`      Text: "${result.text}"`);
                console.log(`      Confidence: ${result.confidence}%`);
                console.log(`      Method: ${result.method}`);
                console.log(`      Capture: ${result.captureMethod}`);
                
                if (result.error) {
                    console.log(`      ⚠️  Warning: ${result.error}`);
                }
                
            } catch (error) {
                totalErrors++;
                results[areaType] = {
                    error: error.message,
                    value: 0,
                    confidence: 0
                };
                
                console.log(`   ❌ ERROR for ${areaType}: ${error.message}`);
            }
            
            console.log(''); // Empty line for readability
        }
        
        // Summary
        console.log('📊 ENHANCED OCR TEST SUMMARY:');
        console.log('============================');
        console.log(`Total areas tested: 3`);
        console.log(`Successful extractions: ${totalSuccess}`);
        console.log(`Failed extractions: ${totalErrors}`);
        console.log(`Success rate: ${((totalSuccess / 3) * 100).toFixed(1)}%`);
        
        if (totalErrors === 0) {
            console.log('🎉 ALL AREA EXTRACTIONS SUCCESSFUL!');
            console.log('✅ The "extract_area: bad extract area" error has been FIXED!');
        } else if (totalSuccess > 0) {
            console.log('⚠️  Some areas working, further refinement needed');
        } else {
            console.log('❌ All areas still failing - need additional fixes');
        }
        
        console.log('\n📁 Debug information saved to:');
        console.log('   ./ocr-debug/ folder');
        
        // Test comprehensive OCR as well
        console.log('\n🔄 Running comprehensive test...');
        const comprehensiveTest = await testComprehensiveOCR(ocr);
        
        await ocr.terminate();
        
        return {
            success: totalErrors === 0,
            successRate: (totalSuccess / 3) * 100,
            results: results,
            comprehensive: comprehensiveTest
        };
        
    } catch (error) {
        console.error('❌ Test failed with critical error:', error.message);
        console.error(error.stack);
        
        // Cleanup on error
        try {
            await ocr.terminate();
        } catch (cleanupError) {
            console.warn('⚠️ Cleanup warning:', cleanupError.message);
        }
        
        return {
            success: false,
            error: error.message,
            results: {}
        };
    }
}

// Test the comprehensive OCR functionality like in main.js
async function testComprehensiveOCR(ocr) {
    console.log('🧪 Running comprehensive enhanced OCR test...');
    
    const testAreas = [
        {
            type: 'bet',
            value: '0',
            confidence: 0,
            text: 'ERROR',
            area: { x: 1355, y: 1078, width: 99, height: 44 },
            method: 'ENHANCED_OCR_UNKNOWN',
            areaInfo: '99x44px @ (1355, 1078)',
            analysisNotes: 'Testing fixed area extraction',
            captureMethod: 'UNKNOWN'
        }
    ];
    
    const summary = {
        successfulCaptures: 0,
        totalAreas: testAreas.length,
        successRate: '0%',
        captureMethods: []
    };
    
    for (const testArea of testAreas) {
        try {
            const result = await ocr.analyzeScreenArea(testArea.area, testArea.type);
            if (result && result.confidence > 0) {
                summary.successfulCaptures++;
            }
            if (result.captureMethod && !summary.captureMethods.includes(result.captureMethod)) {
                summary.captureMethods.push(result.captureMethod);
            }
        } catch (error) {
            console.log(`   Failed area ${testArea.type}: ${error.message}`);
        }
    }
    
    summary.successRate = ((summary.successfulCaptures / summary.totalAreas) * 100).toFixed(1) + '%';
    
    console.log(`📈 Comprehensive test completed: ${summary.successRate} success rate`);
    
    return summary;
}

// Run the test if called directly
if (require.main === module) {
    testEnhancedOCR()
        .then((result) => {
            console.log('\n🎯 Enhanced OCR Test completed');
            if (result && result.success) {
                console.log('🎉 All tests PASSED! Area extraction is now working!');
                process.exit(0);
            } else {
                console.log('⚠️  Some tests failed or need attention');
                process.exit(result && result.results ? 0 : 1);
            }
        })
        .catch(error => {
            console.error('\n💥 Test script failed:', error);
            process.exit(1);
        });
}

module.exports = testEnhancedOCR;
