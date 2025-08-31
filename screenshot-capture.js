// screenshot-capture.js - Enhanced screenshot capture with DXGI error handling
const { desktopCapturer, screen } = require('electron');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

class EnhancedScreenshotCapture {
    constructor() {
        this.captureMethod = 'electron'; // electron, powershell, python
        this.lastSuccessfulMethod = null;
    }

    async captureScreen(retryCount = 3) {
        console.log('📸 Starting enhanced screenshot capture...');
        
        // Try multiple methods in order of preference
        const methods = ['electron', 'powershell', 'python'];
        
        for (const method of methods) {
            try {
                console.log(`🔄 Trying capture method: ${method}`);
                const result = await this.captureWithMethod(method);
                
                if (result.success) {
                    console.log(`✅ Screenshot captured successfully with ${method}`);
                    this.lastSuccessfulMethod = method;
                    return result;
                }
            } catch (error) {
                console.log(`❌ Method ${method} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('All screenshot capture methods failed');
    }

    async captureWithMethod(method) {
        switch (method) {
            case 'electron':
                return await this.captureWithElectron();
            case 'powershell':
                return await this.captureWithPowerShell();
            case 'python':
                return await this.captureWithPython();
            default:
                throw new Error(`Unknown capture method: ${method}`);
        }
    }

    async captureWithElectron() {
        try {
            console.log('📱 Using Electron desktopCapturer...');
            
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: this.captureResolution || { width: 1920, height: 1080 }
            });

            if (sources.length > 0) {
                const screenshot = sources[0].thumbnail;
                const buffer = screenshot.toPNG();
                
                // Validate the buffer
                if (!buffer || buffer.length === 0) {
                    throw new Error('Empty screenshot buffer from Electron');
                }
                
                console.log(`📊 Electron screenshot: ${buffer.length} bytes`);
                
                return {
                    success: true,
                    buffer: buffer,
                    method: 'electron',
                    width: screenshot.getSize().width,
                    height: screenshot.getSize().height
                };
            } else {
                throw new Error('No screen sources available');
            }
        } catch (error) {
            // Check specifically for DXGI errors
            if (error.message && (
                error.message.includes('DXGI') || 
                error.message.includes('IDXGIDuplicateOutput') ||
                error.message.includes('format')
            )) {
                console.log('🔧 DXGI format error detected - display using 10-bit HDR instead of 8-bit RGBA');
                throw new Error('DXGI_FORMAT_INCOMPATIBLE');
            }
            throw error;
        }
    }

    async captureWithPowerShell() {
        return new Promise((resolve, reject) => {
            console.log('🖥️ Using PowerShell screenshot...');
            
            const timestamp = Date.now();
            const tempPath = path.join(__dirname, 'temp', `ps-screenshot-${timestamp}.png`);
            
            // Ensure temp directory exists
            const tempDir = path.dirname(tempPath);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            // Enhanced PowerShell script for better compatibility
            const powershellScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bounds = $screen.Bounds

$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bitmap.Save("${tempPath.replace(/\\/g, '\\\\')}", [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "SUCCESS:${tempPath}:$($bounds.Width):$($bounds.Height)"
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
} finally {
    $graphics.Dispose()
    $bitmap.Dispose()
}
`;
            
            const psProcess = spawn('powershell', [
                '-WindowStyle', 'Hidden',
                '-ExecutionPolicy', 'Bypass',
                '-Command', powershellScript
            ], {
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let output = '';
            
            psProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            psProcess.stderr.on('data', (data) => {
                console.error('PowerShell stderr:', data.toString());
            });
            
            psProcess.on('close', async (code) => {
                try {
                    if (code === 0 && output.includes('SUCCESS:')) {
                        const parts = output.trim().split(':');
                        const filePath = parts[1];
                        const width = parseInt(parts[2]);
                        const height = parseInt(parts[3]);
                        
                        if (fs.existsSync(filePath)) {
                            const buffer = fs.readFileSync(filePath);
                            
                            // Clean up temp file
                            try {
                                fs.unlinkSync(filePath);
                            } catch (e) {
                                console.warn('Could not delete temp file:', e.message);
                            }
                            
                            console.log(`📊 PowerShell screenshot: ${buffer.length} bytes, ${width}x${height}`);
                            
                            resolve({
                                success: true,
                                buffer: buffer,
                                method: 'powershell',
                                width: width,
                                height: height
                            });
                        } else {
                            reject(new Error('PowerShell screenshot file not created'));
                        }
                    } else {
                        reject(new Error(`PowerShell screenshot failed: ${output}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
            
            psProcess.on('error', (error) => {
                reject(new Error(`PowerShell process error: ${error.message}`));
            });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                psProcess.kill();
                reject(new Error('PowerShell screenshot timeout'));
            }, 10000);
        });
    }

    async captureWithPython() {
        return new Promise((resolve, reject) => {
            console.log('🐍 Using Python PIL screenshot...');
            
            const timestamp = Date.now();
            const tempPath = path.join(__dirname, 'temp', `py-screenshot-${timestamp}.png`);
            
            // Ensure temp directory exists
            const tempDir = path.dirname(tempPath);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            // Python script for screenshot
            const pythonScript = `
import sys
try:
    from PIL import ImageGrab
    import os
    
    screenshot = ImageGrab.grab()
    screenshot.save("${tempPath.replace(/\\/g, '/')}")
    print(f"SUCCESS:{tempPath}:{screenshot.width}:{screenshot.height}")
except ImportError:
    print("ERROR:PIL not installed")
except Exception as e:
    print(f"ERROR:{str(e)}")
`;
            
            const pythonProcess = spawn('python', ['-c', pythonScript], {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let output = '';
            
            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            pythonProcess.stderr.on('data', (data) => {
                console.error('Python stderr:', data.toString());
            });
            
            pythonProcess.on('close', async (code) => {
                try {
                    if (code === 0 && output.includes('SUCCESS:')) {
                        const parts = output.trim().split(':');
                        const filePath = parts[1];
                        const width = parseInt(parts[2]);
                        const height = parseInt(parts[3]);
                        
                        if (fs.existsSync(filePath)) {
                            const buffer = fs.readFileSync(filePath);
                            
                            // Clean up temp file
                            try {
                                fs.unlinkSync(filePath);
                            } catch (e) {
                                console.warn('Could not delete temp file:', e.message);
                            }
                            
                            console.log(`📊 Python screenshot: ${buffer.length} bytes, ${width}x${height}`);
                            
                            resolve({
                                success: true,
                                buffer: buffer,
                                method: 'python',
                                width: width,
                                height: height
                            });
                        } else {
                            reject(new Error('Python screenshot file not created'));
                        }
                    } else {
                        reject(new Error(`Python screenshot failed: ${output}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
            
            pythonProcess.on('error', (error) => {
                reject(new Error(`Python process error: ${error.message}`));
            });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                pythonProcess.kill();
                reject(new Error('Python screenshot timeout'));
            }, 10000);
        });
    }

    // Helper method to save debug screenshot
    async saveDebugScreenshot(buffer, prefix = 'debug') {
        const timestamp = Date.now();
        const screenshotPath = path.join(__dirname, 'screenshots', `${prefix}-${timestamp}.png`);
        
        const screenshotDir = path.dirname(screenshotPath);
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
        
        fs.writeFileSync(screenshotPath, buffer);
        console.log(`💾 Debug screenshot saved: ${screenshotPath}`);
        
        return screenshotPath;
    }

    // Method to get screenshot with area extraction
    async captureScreenArea(area) {
        const fullScreenshot = await this.captureScreen();
        
        try {
            // Extract the specific area using sharp
            const areaBuffer = await sharp(fullScreenshot.buffer)
                .extract({
                    left: Math.max(0, Math.floor(area.x)),
                    top: Math.max(0, Math.floor(area.y)),
                    width: Math.min(fullScreenshot.width - Math.floor(area.x), Math.floor(area.width)),
                    height: Math.min(fullScreenshot.height - Math.floor(area.y), Math.floor(area.height))
                })
                .png()
                .toBuffer();
            
            return {
                success: true,
                buffer: areaBuffer,
                method: fullScreenshot.method,
                area: area,
                fullScreenWidth: fullScreenshot.width,
                fullScreenHeight: fullScreenshot.height
            };
        } catch (extractError) {
            console.error('Area extraction error:', extractError);
            throw new Error(`Area extraction failed: ${extractError.message}`);
        }
    }
}

module.exports = EnhancedScreenshotCapture;
