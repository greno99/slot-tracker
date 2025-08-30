# Casino Tracker - OCR Setup & Troubleshooting

## 🎯 Fixed OCR Issues

The application now includes a fully functional OCR engine using Tesseract.js for real casino screen reading.

### ✅ What's Fixed

1. **Real OCR Implementation**: Complete OCR engine with Tesseract.js
2. **Area Validation**: Proper coordinate validation before OCR processing  
3. **Error Handling**: Graceful handling of invalid areas and OCR failures
4. **Debug Support**: Enhanced logging and debug image saving

### 🚀 Quick Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Test OCR Engine**:
   ```bash
   node test-ocr.js
   ```

3. **Configure Areas**:
   - Open the Detection Setup window
   - Click "Setup starten" to calibrate spin button
   - Configure OCR areas for bet, win, and balance
   - Test with "OCR testen"

### 🔧 Troubleshooting

#### "bad extract area" Error
**Fixed!** This error occurred when:
- Area coordinates were outside screenshot boundaries
- Width/height were negative or zero
- Area object was invalid

**Solution**: Enhanced validation now prevents invalid areas from reaching the OCR engine.

#### OCR Returns 0.00 for Everything
**Possible causes**:
- Areas don't contain visible numbers
- Text is too small or blurry
- Wrong area selection (selected decorative elements instead of numbers)

**Solutions**:
- Select smaller, more precise areas around actual numbers
- Ensure the numbers are clearly visible on screen
- Check debug images in `/debug-ocr/` folder
- Try different area sizes (minimum 10x5, maximum 1000x200)

#### OCR Engine Initialization Failed
**Possible causes**:
- Missing tesseract.js dependency
- Network issues (Tesseract downloads language data)

**Solutions**:
- Run `npm install tesseract.js` 
- Check internet connection
- Try running `node test-ocr.js` to diagnose

### 📊 OCR Best Practices

1. **Area Selection**:
   - Select tight areas around numbers only
   - Avoid including decorative borders or icons
   - Typical good size: 50-200 pixels wide, 15-30 pixels tall

2. **Screen Conditions**:
   - Ensure good contrast between text and background
   - Avoid selecting areas with animations or moving elements
   - Full screen casino works better than windowed mode

3. **Testing**:
   - Always test OCR areas before live detection
   - Check debug images to see what OCR is analyzing
   - Adjust areas if confidence is consistently below 50%

### 🛠️ Development/Debug Commands

```bash
# Test OCR engine only
node test-ocr.js

# Start app with detailed logging
npm start

# Check dependencies
npm list tesseract.js sharp
```

### 📁 Important Files

- `ocr-engine.js` - Main OCR implementation
- `test-ocr.js` - Standalone OCR test
- `/debug-ocr/` - Debug images from OCR analysis
- `/screenshots/` - Full screenshots for debugging

### 🎯 Detection Flow

1. **Mouse Click Detected** → Global mouse tracking detects spin button click
2. **Screenshot Taken** → Full screen capture via Electron
3. **Area Validation** → Check coordinates are valid before OCR
4. **Image Enhancement** → Extract area, upscale, enhance contrast
5. **OCR Processing** → Tesseract.js reads text from enhanced image
6. **Value Parsing** → Extract numbers from OCR text
7. **Data Reporting** → Send values to overlay for tracking

### 📋 Validation Rules

**Area Coordinates**:
- All values must be numbers (x, y, width, height)
- No negative coordinates
- Minimum size: 10x5 pixels
- Maximum size: 1000x200 pixels  
- Must be within screenshot boundaries

**OCR Results**:
- Confidence threshold: > 30% for acceptance
- Text parsing: Numbers and currency symbols only
- Fallback: Returns 0.00 if parsing fails

### 💡 Tips for Better OCR

1. **Casino Selection**: Games with clear, large numbers work best
2. **Display Settings**: Higher resolution = better OCR accuracy
3. **Area Precision**: Smaller, tighter areas = better results
4. **Lighting**: Consistent lighting improves text recognition
5. **Font Style**: Simple, sans-serif fonts are easier to read

## 🐛 Still Having Issues?

1. Check the debug console in Detection Setup
2. Review debug images in `/debug-ocr/` folder
3. Test with `node test-ocr.js` to isolate OCR engine issues
4. Verify area coordinates are reasonable and within screen bounds
5. Try reconfiguring areas with more precise selections
