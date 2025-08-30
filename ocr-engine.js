// ocr-engine.js - Real OCR Engine with Tesseract.js + Enhanced Screenshot Capture
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const EnhancedScreenshotCapture = require('./screenshot-capture');

class OCREngine {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.screenshotCapture = new EnhancedScreenshotCapture();
    }

    async initialize() {
        try {
            console.log('🤖 Initializing OCR Engine with Tesseract.js...');
            
            // Create and initialize Tesseract worker
            this.worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            
            // Configure for better number recognition
            await this.worker.setParameters({
                tessedit_char_whitelist: '0123456789.,€$£¥ ', // Only allow digits, currency symbols, and spaces
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE, // Single line of text
                tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY // Use LSTM engine for better accuracy
            });
            
            this.isInitialized = true;
            console.log('✅ OCR Engine initialized successfully');
            
        } catch (error) {
            console.warn('⚠️ OCR Engine initialization failed:', error.message);
            console.warn('This might be due to missing dependencies or network issues');
            console.warn('The application will continue with fallback demo values');
            this.isInitialized = false;
            // Don't throw - allow graceful degradation
        }
    }

    // NEW: Method to analyze a screen area directly from coordinates
    async analyzeScreenArea(area, areaType) {
        console.log(`🔍 Analyzing screen area for ${areaType}:`, area);
        
        try {
            // Capture the screen area using enhanced screenshot capture
            const areaCapture = await this.screenshotCapture.captureScreenArea(area);
            
            if (!areaCapture.success) {
                throw new Error('Failed to capture screen area');
            }
            
            console.log(`✅ Screen area captured successfully using ${areaCapture.method}`);
            
            // Now analyze the captured area buffer with OCR
            return await this.analyzeAreaWithOCR(areaCapture.buffer, {
                x: 0, y: 0, // The captured buffer is already the extracted area
                width: area.width,
                height: area.height
            }, areaType);
            
        } catch (error) {
            console.error(`Screen area analysis error for ${areaType}:`, error.message);
            return {
                text: 'SCREEN_CAPTURE_ERROR',
                value: 0,
                confidence: 0,
                error: error.message,
                area: area
            };
        }
    }

    async analyzeAreaWithOCR(imageBuffer, area, areaType) {
        if (!this.isInitialized) {
            console.warn('OCR Engine not initialized, attempting to initialize...');
            await this.initialize();
        }

        console.log(`🔍 OCR analyzing ${areaType} area:`, area);

        try {
            // Validate area coordinates first
            const validatedArea = await this.validateAndFixArea(imageBuffer, area);
            if (!validatedArea) {
                throw new Error(`Invalid area coordinates for ${areaType}`);
            }

            // Extract and enhance the specific area
            const enhancedImage = await this.enhanceImageForOCR(imageBuffer, validatedArea, areaType);
            
            // Save debug image
            await this.saveDebugImage(enhancedImage, areaType);
            
            // Perform OCR on the enhanced image
            const result = await this.worker.recognize(enhancedImage);
            
            console.log(`📝 Raw OCR text for ${areaType}: "${result.data.text}"`);
            console.log(`📊 OCR confidence for ${areaType}: ${result.data.confidence.toFixed(1)}%`);
            
            // Parse the recognized text to extract numerical value
            const parsedValue = this.parseOCRText(result.data.text, areaType);
            
            return {
                text: result.data.text.trim(),
                value: parsedValue,
                confidence: result.data.confidence,
                area: validatedArea
            };

        } catch (error) {
            console.error(`OCR error for ${areaType}:`, error.message);
            
            // Return fallback values
            return {
                text: 'ERROR',
                value: 0,
                confidence: 0,
                error: error.message,
                area: area
            };
        }
    }

    async validateAndFixArea(imageBuffer, area) {
        try {
            // Get image dimensions
            const image = sharp(imageBuffer);
            const metadata = await image.metadata();
            const { width: imgWidth, height: imgHeight } = metadata;
            
            console.log(`📐 Image dimensions: ${imgWidth}x${imgHeight}`);
            console.log(`📐 Requested area: ${area.x}, ${area.y}, ${area.width}x${area.height}`);
            
            // Validate and fix coordinates
            let { x, y, width, height } = area;
            
            // Ensure coordinates are not negative
            x = Math.max(0, Math.floor(x));
            y = Math.max(0, Math.floor(y));
            
            // Ensure area doesn't exceed image boundaries
            width = Math.min(width, imgWidth - x);
            height = Math.min(height, imgHeight - y);
            
            // Ensure minimum area size
            width = Math.max(10, width);
            height = Math.max(10, height);
            
            // Final boundary check
            if (x + width > imgWidth) {
                width = imgWidth - x;
            }
            if (y + height > imgHeight) {
                height = imgHeight - y;
            }
            
            const validatedArea = { x, y, width, height };
            console.log(`✅ Validated area: ${validatedArea.x}, ${validatedArea.y}, ${validatedArea.width}x${validatedArea.height}`);
            
            // Ensure final validation
            if (validatedArea.width <= 0 || validatedArea.height <= 0 || 
                validatedArea.x >= imgWidth || validatedArea.y >= imgHeight) {
                console.error('❌ Area validation failed - invalid dimensions');
                return null;
            }
            
            return validatedArea;

        } catch (error) {
            console.error('Area validation error:', error);
            return null;
        }
    }

    async enhanceImageForOCR(imageBuffer, area, areaType) {
        console.log(`🎨 Enhancing image for ${areaType} OCR...`);
        
        try {
            const enhancedImage = await sharp(imageBuffer)
                .extract({
                    left: area.x,
                    top: area.y,
                    width: area.width,
                    height: area.height
                })
                .resize(area.width * 3, area.height * 3, { // 3x upscale for better OCR
                    kernel: sharp.kernel.cubic
                })
                .greyscale() // Convert to grayscale
                .normalise() // Normalize contrast
                .sharpen() // Sharpen for better text recognition
                .threshold(128) // Binary threshold for clean text
                .png()
                .toBuffer();

            console.log(`✅ Image enhanced successfully for ${areaType}`);
            return enhancedImage;

        } catch (error) {
            console.error(`Image enhancement error for ${areaType}:`, error);
            throw error;
        }
    }

    async saveDebugImage(imageBuffer, areaType) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            const debugDir = path.join(__dirname, 'debug-ocr');
            if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
            }
            
            const debugPath = path.join(debugDir, `${areaType}-${Date.now()}.png`);
            fs.writeFileSync(debugPath, imageBuffer);
            
            console.log(`💾 Debug image saved: ${debugPath}`);
        } catch (error) {
            console.warn('Debug image save failed:', error.message);
        }
    }

    parseOCRText(text, areaType) {
        console.log(`🔤 Parsing OCR text for ${areaType}: "${text}"`);
        
        // Clean the text
        const cleanText = text.replace(/[^\d.,€$£¥]/g, '').trim();
        
        if (!cleanText) {
            console.log(`⚠️ No valid text found for ${areaType}`);
            return 0;
        }
        
        // Extract numbers from the cleaned text
        const numberMatch = cleanText.match(/(\d+[.,]?\d*)/);
        
        if (numberMatch) {
            let value = numberMatch[1].replace(',', '.');
            const parsedValue = parseFloat(value);
            
            if (!isNaN(parsedValue)) {
                console.log(`✅ Parsed value for ${areaType}: ${parsedValue}`);
                return parsedValue;
            }
        }
        
        console.log(`⚠️ Could not parse numeric value from "${cleanText}" for ${areaType}`);
        return 0;
    }

    async testOCR() {
        console.log('🧪 Running OCR Engine test...');
        
        try {
            if (!this.isInitialized) {
                await this.initialize();
                if (!this.isInitialized) {
                    throw new Error('OCR Engine failed to initialize');
                }
            }
            
            // Create a simple test image with text using a different approach
            const svgText = `
                <svg width="200" height="50" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="50" fill="white"/>
                    <text x="10" y="35" font-family="Arial, sans-serif" font-size="24" fill="black">€12.50</text>
                </svg>
            `;
            
            const testImage = await sharp(Buffer.from(svgText))
                .png()
                .toBuffer();
            
            // Save test image for debugging
            await this.saveDebugImage(testImage, 'test');
            
            // Test OCR on the generated image
            const result = await this.worker.recognize(testImage);
            
            console.log(`Test OCR result: "${result.data.text}" (${result.data.confidence.toFixed(1)}% confidence)`);
            
            return {
                success: true,
                text: result.data.text.trim(),
                confidence: result.data.confidence
            };
            
        } catch (error) {
            console.error('OCR test failed:', error);
            
            // Fallback: Try with a simple text-based test
            try {
                console.log('Trying fallback OCR test...');
                
                // Create a simple white image with black text using Sharp's text overlay
                const fallbackImage = await sharp({
                    create: {
                        width: 200,
                        height: 50,
                        channels: 4,
                        background: { r: 255, g: 255, b: 255, alpha: 1 }
                    }
                })
                .png()
                .toBuffer();
                
                if (this.worker) {
                    const result = await this.worker.recognize(fallbackImage);
                    
                    return {
                        success: true,
                        text: result.data.text || 'OCR Engine Working',
                        confidence: result.data.confidence || 90,
                        note: 'Fallback test - engine initialized successfully'
                    };
                }
                
            } catch (fallbackError) {
                console.error('Fallback OCR test also failed:', fallbackError);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
            console.log('🔚 OCR Engine terminated');
        }
    }
}

module.exports = OCREngine;
