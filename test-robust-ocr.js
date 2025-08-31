// test-robust-ocr.js - Test the new robust OCR engine
const RobustOCREngine = require('./robust-ocr-engine');

async function testRobustOCR() {
    console.log('🧪 Testing Robust OCR Engine...');
    
    const ocr = new RobustOCREngine();
    
    try {
        // Initialize
        console.log('🚀 Initializing OCR engine...');
        const initialized = await ocr.initialize();
        console.log(`Initialization: ${initialized ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        if (!initialized) {
            throw new Error('OCR engine initialization failed');
        }
        
        // Test areas (using coordinates from your log)
        const testAreas = {
            bet: { x: 1356, y: 1079, width: 98, height: 42 },
            win: { x: 962, y: 1082, width: 110, height: 43 },
            balance: { x: 552, y: 1075, width: 120, height: 48 }
        };
        
        console.log('\n📊 Testing individual areas...');
        console.log('═'.repeat(60));
        
        for (const [type, area] of Object.entries(testAreas)) {
            try {
                console.log(`\n🔍 Testing ${type.toUpperCase()} area: ${area.x},${area.y} ${area.width}x${area.height}`);
                const result = await ocr.analyzeScreenArea(area, type);
                console.log(`   Result: €${result.value.toFixed(2)} (${result.confidence}% confidence)`);
                console.log(`   Method: ${result.method}`);
                console.log(`   Status: ${result.error ? '❌ ' + result.error : '✅ OK'}`);
            } catch (error) {
                console.error(`   ${type.toUpperCase()} FAILED: ${error.message}`);
            }
        }
        
        console.log('\n' + '═'.repeat(60));
        console.log('🔬 Testing all areas together...');
        console.log('═'.repeat(60));
        
        const multiTest = await ocr.testMultipleAreas(testAreas);
        console.log(`\n📋 Multi-test result: ${multiTest.message}`);
        
        if (multiTest.success) {
            console.log('\n📊 Detailed Results:');
            multiTest.areasAnalyzed.forEach(result => {
                const status = result.success ? '✅' : '❌';
                const value = result.success ? `€${result.value.toFixed(2)} (${result.confidence}%)` : result.error;
                console.log(`   ${status} ${result.type.toUpperCase()}: ${value}`);
            });
            
            console.log('\n📈 Summary:');
            console.log(`   Total areas: ${multiTest.summary.total}`);
            console.log(`   Successful: ${multiTest.summary.successful}`);
            console.log(`   Failed: ${multiTest.summary.failed}`);
            const successRate = (multiTest.summary.successful / multiTest.summary.total * 100).toFixed(1);
            console.log(`   Success rate: ${successRate}%`);
        }
        
        // Cleanup
        await ocr.terminate();
        console.log('\n' + '═'.repeat(60));
        console.log('✅ Test completed successfully!');
        console.log('🎯 Next steps:');
        console.log('   1. Replace enhanced-screenshot-ocr.js with robust-ocr-engine.js in main.js');
        console.log('   2. Update import: const RobustOCREngine = require("./robust-ocr-engine");');
        console.log('   3. Update instantiation: const ocrEngine = new RobustOCREngine();');
        console.log('   4. Test OCR in your application');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await ocr.terminate();
        process.exit(1);
    }
}

// Run test if called directly
if (require.main === module) {
    testRobustOCR().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = testRobustOCR;