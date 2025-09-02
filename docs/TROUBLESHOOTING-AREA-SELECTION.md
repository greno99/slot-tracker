# 🔧 Area Selection Troubleshooting Guide

## 🚨 Common Issues & Solutions

### ❌ **"Area selection not working anymore"**

**Possible Causes:**
1. **Casino website interference** - Some casino sites may block overlays
2. **Browser security policies** - Modern browsers can restrict fullscreen overlays
3. **Windows focus issues** - Area selection window loses focus
4. **Multiple monitor setup** - Overlay appears on wrong screen

**Solutions:**

#### 1. **Test Area Selection Functionality**
```bash
# Run the debug tool to test if area selection works at all
npm run debug-area
```

#### 2. **Check Window Focus**
- The area selection overlay needs focus to capture key events
- Try clicking on the overlay background before using ESC
- If overlay is transparent, click in corners or edges

#### 3. **Alternative Area Selection Method**
- Close the casino website temporarily
- Configure areas on desktop/other application first
- Reopen casino after configuration

#### 4. **Multiple Monitor Issues**
- Area selection always appears on primary monitor
- If casino is on secondary monitor, drag it to primary first
- Or configure areas by coordinates manually

### ❌ **"ESC key not working properly"**

**Possible Causes:**
1. **Focus issues** - Window doesn't have keyboard focus
2. **Event propagation blocked** - Casino site captures key events
3. **Global shortcut conflicts** - Other apps using ESC key
4. **Browser/Electron event handling** - Key events not reaching overlay

**Solutions:**

#### 1. **Multiple ESC Methods (Already Implemented)**
The improved overlay now has:
- ✅ Document-level key listener
- ✅ Window-level key listener  
- ✅ Body-level key listener
- ✅ Global shortcut as fallback
- ✅ Visual feedback when ESC is pressed

#### 2. **Alternative Exit Methods**
- **Right-click** → Should close overlay
- **Alt+F4** → Force close window
- **Task Manager** → Kill area selection process
- **Click outside** → Some implementations support this

#### 3. **Force Close via Main App**
If ESC doesn't work, go back to the Detection Setup window and:
- Close the Detection Setup window (this should clean up area selection)
- Or restart the entire application

### 🎰 **Casino Website Blocking**

**Signs of Casino Interference:**
- Area selection works on desktop but not over casino
- Overlay appears but is unresponsive over casino window
- ESC works elsewhere but not over casino
- Mouse events don't register over casino

**Workarounds:**

#### 1. **Minimize Casino During Configuration**
```bash
1. Open Detection Setup
2. Minimize or move casino window aside
3. Configure areas on empty desktop space
4. Use coordinates that match casino position
5. Restore casino window after configuration
```

#### 2. **Use Screenshots for Reference**
```bash
1. Take screenshot of casino (F6 in app)
2. Open screenshot in image viewer
3. Configure areas on the screenshot image
4. Areas will work on actual casino
```

#### 3. **Windowed Mode**
```bash
1. Switch casino to windowed mode (not fullscreen)
2. Position casino window in specific location
3. Configure areas in windowed mode
4. Switch back to fullscreen if desired
```

### 🛠️ **Debug & Diagnostics**

#### 1. **Test Basic Functionality**
```bash
# Test if area selection works at all
npm run debug-area

# Test OCR engine separately
npm run test-ocr
```

#### 2. **Check Console Logs**
- Open Detection Setup window
- Press F12 to open DevTools
- Check Console tab for error messages
- Look for "Area selection overlay loaded" message

#### 3. **Verify Screen Coordinates**
```javascript
// In Detection Setup DevTools console:
console.log('Screen size:', screen.getPrimaryDisplay().workAreaSize);
console.log('Window position:', window.screenX, window.screenY);
```

#### 4. **Test Different Area Sizes**
- Try very small areas (20x20 pixels) first
- Gradually increase size
- Check if specific coordinates cause issues

### 🔄 **Reset & Recovery**

#### 1. **Clear Configuration**
```bash
# Delete stored configuration
# In Detection Setup DevTools console:
ipcRenderer.invoke('set-store-data', 'spinDetectionConfig', null);
```

#### 2. **Restart Application**
```bash
1. Close all Casino Tracker windows
2. End any remaining processes in Task Manager
3. Restart with: npm start
```

#### 3. **Factory Reset**
```bash
# Clear all stored data (will lose all sessions!)
# In Main App DevTools console:
ipcRenderer.invoke('set-store-data', 'sessions', []);
ipcRenderer.invoke('set-store-data', 'spinDetectionConfig', null);
ipcRenderer.invoke('set-store-data', 'settings', null);
```

## 🎯 **Improved Area Selection Features**

### ✅ **New in Fixed Version:**
- **Multiple ESC handlers** - ESC should work reliably now
- **Visual feedback** - Shows status of selection process
- **Better error messages** - Clear feedback on issues
- **Global shortcut fallback** - ESC works even if overlay loses focus
- **Enhanced validation** - Prevents invalid area configurations
- **Auto-focus management** - Maintains keyboard focus automatically
- **Force close options** - Multiple ways to exit if ESC fails

### 🎮 **New Controls:**
- **ESC** - Close area selection (multiple listeners)
- **Enter** - Complete current selection
- **Mouse drag** - Select area as before
- **Visual hints** - Red ESC hint, status indicators

## 📋 **Step-by-Step Troubleshooting**

### If Area Selection Completely Broken:

1. **Test on Desktop First**
   ```bash
   npm run debug-area
   # Click "Test Fullscreen Overlay"
   # If this fails, it's an app issue
   # If this works, it's casino interference
   ```

2. **Try Alternative Configuration**
   ```bash
   # Close casino website
   # Open Detection Setup  
   # Configure areas on desktop/other apps
   # Test with "OCR testen"
   # Reopen casino for live detection
   ```

3. **Manual Coordinates** (Advanced)
   ```bash
   # If you know exact coordinates, set them manually:
   # In Detection Setup DevTools:
   const areas = {
       bet: {x: 100, y: 200, width: 80, height: 25},
       win: {x: 200, y: 200, width: 80, height: 25},
       balance: {x: 300, y: 50, width: 120, height: 25}
   };
   ipcRenderer.invoke('save-detection-config', {areas: areas});
   ```

4. **Report Issue**
   ```bash
   # If nothing works, check:
   # - Console errors in DevTools
   # - Windows version and display settings  
   # - Antivirus/security software blocking overlays
   # - Casino website URL and type
   ```

The improved area selection should be much more reliable now with multiple ESC handlers and better error handling!
