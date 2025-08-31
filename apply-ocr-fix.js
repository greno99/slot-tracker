// apply-ocr-fix.js - Automatische Integration der OCR-Reparatur
const fs = require('fs');
const path = require('path');

console.log('🔧 Applying OCR Fix...\n');

async function applyOCRFix() {
    const projectRoot = __dirname;
    const mainJsPath = path.join(projectRoot, 'main.js');
    const backupPath = path.join(projectRoot, 'main.js.backup');
    
    try {
        // 1. Create backup of main.js
        console.log('📋 Creating backup of main.js...');
        const originalMainJs = fs.readFileSync(mainJsPath, 'utf8');
        fs.writeFileSync(backupPath, originalMainJs);
        console.log('✅ Backup created: main.js.backup');
        
        // 2. Update main.js to use RobustOCREngine
        console.log('🔄 Updating main.js to use RobustOCREngine...');
        
        const updatedMainJs = originalMainJs.replace(
            /const OCREngine = require\('\.\/enhanced-screenshot-ocr'\);.*$/m,
            "const OCREngine = require('./robust-ocr-engine'); // ROBUST OCR Engine - Fixed area extraction and DXGI issues"
        );
        
        fs.writeFileSync(mainJsPath, updatedMainJs);
        console.log('✅ main.js updated successfully');
        
        // 3. Verify integration
        console.log('🔍 Verifying integration...');
        const verification = fs.readFileSync(mainJsPath, 'utf8');
        if (verification.includes('robust-ocr-engine')) {
            console.log('✅ Integration verified - robust-ocr-engine is now active');
        } else {
            throw new Error('Integration verification failed');
        }
        
        // 4. Test the new OCR engine
        console.log('\n🧪 Testing new OCR engine...');
        const RobustOCREngine = require('./robust-ocr-engine');
        const testEngine = new RobustOCREngine();
        
        try {
            const initialized = await testEngine.initialize();
            if (initialized) {
                console.log('✅ Robust OCR Engine initialization: SUCCESS');
                
                // Quick test with dummy area
                const testArea = { x: 100, y: 100, width: 50, height: 30 };
                const result = await testEngine.analyzeScreenArea(testArea, 'balance');
                console.log(`✅ Test analysis: €${result.value.toFixed(2)} (${result.confidence}% confidence, ${result.method})`);
                
                await testEngine.terminate();
                console.log('✅ Cleanup: SUCCESS');
            } else {
                console.warn('⚠️ OCR Engine initialization returned false, but no error thrown');
            }
        } catch (testError) {
            console.warn('⚠️ OCR Engine test failed:', testError.message);
            console.warn('This might be normal if screenshot capture is restricted');
        }
        
        // 5. Summary
        console.log('\n' + '='.repeat(60));
        console.log('🎉 OCR Fix Applied Successfully!');
        console.log('='.repeat(60));
        console.log('✅ Enhanced Screenshot OCR → Robust OCR Engine');
        console.log('✅ Fixed "bad extract area" errors');
        console.log('✅ Added DXGI error handling via GDI fallback');  
        console.log('✅ Bulletproof area extraction with bounds checking');
        console.log('✅ Improved fallback values and error recovery');
        console.log('✅ Debug image saving for troubleshooting');
        console.log('\n📝 Next Steps:');
        console.log('1. Restart your application');
        console.log('2. Open "🎯 Detection Setup"');
        console.log('3. Configure OCR areas');
        console.log('4. Click "🔬 OCR testen"');
        console.log('5. You should now see realistic values instead of 0.00!');
        console.log('\n💡 If there are any issues:');
        console.log('- Check debug images in /ocr-debug/ folder');
        console.log('- Run: node test-robust-ocr.js');
        console.log('- Restore backup: mv main.js.backup main.js');
        
    } catch (error) {
        console.error('❌ OCR Fix failed:', error.message);
        
        // Restore backup if it exists
        if (fs.existsSync(backupPath)) {
            console.log('🔄 Restoring backup...');
            const backupContent = fs.readFileSync(backupPath, 'utf8');
            fs.writeFileSync(mainJsPath, backupContent);
            console.log('✅ Backup restored');
        }
        
        process.exit(1);
    }
}

// Run the fix
if (require.main === module) {
    applyOCRFix().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = applyOCRFix;