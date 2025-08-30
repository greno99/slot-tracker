// test-ocr.js - Simple OCR Engine Test
const OCREngine = require('./ocr-engine');

async function testOCREngine() {
    console.log('🧪 Starting OCR Engine test...');
    
    const ocrEngine = new OCREngine();
    
    try {
        console.log('⚡ Initializing OCR Engine...');
        await ocrEngine.initialize();
        
        console.log('✅ OCR Engine initialized successfully!');
        
        console.log('🧪 Running basic OCR test...');
        const result = await ocrEngine.testOCR();
        
        if (result.success) {
            console.log('✅ OCR Test PASSED!');
            console.log(`📝 Recognized: "${result.text}"`);
            console.log(`📊 Confidence: ${result.confidence.toFixed(1)}%`);
        } else {
            console.log('❌ OCR Test FAILED!');
            console.log(`Error: ${result.error}`);
        }
        
        console.log('🧽 Cleaning up...');
        await ocrEngine.terminate();
        
        console.log('✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error(error.stack);
        
        // Cleanup on error
        try {
            await ocrEngine.terminate();
        } catch (cleanupError) {
            console.warn('⚠️ Cleanup warning:', cleanupError.message);
        }
    }
}

// Run the test
testOCREngine().then(() => {
    console.log('🎯 Test execution completed');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Unhandled test error:', error);
    process.exit(1);
});
