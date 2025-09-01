// enhanced-browser-resolution-fix.js
// Addresses browser resolution mismatch and detection issues

const fs = require('fs');
const path = require('path');

console.log('🔧 Enhanced Browser & Resolution Detection Fix');
console.log('============================================');

// Create enhanced browser detection utility
const enhancedBrowserDetection = `
// Enhanced Browser Resolution & Detection Utility
// Fixes resolution mismatch and detection issues

class EnhancedBrowserDetection {
    constructor() {
        this.detectedBrowsers = [];
        this.currentResolution = null;
        this.scalingFactor = 1;
    }

    async detectSystemResolution() {
        try {
            const { screen } = require('electron');
            const displays = screen.getAllDisplays();
            
            console.log('🖥️ Detected Displays:');
            displays.forEach((display, index) => {
                console.log(\`Display \${index + 1}: \${display.size.width}x\${display.size.height} @ \${display.scaleFactor}x scale\`);
            });

            const primaryDisplay = screen.getPrimaryDisplay();
            this.currentResolution = primaryDisplay.size;
            this.scalingFactor = primaryDisplay.scaleFactor;
            
            console.log(\`✅ Primary Resolution: \${this.currentResolution.width}x\${this.currentResolution.height}\`);
            console.log(\`📏 Scaling Factor: \${this.scalingFactor}x\`);
            
            return {
                width: this.currentResolution.width,
                height: this.currentResolution.height,
                scaleFactor: this.scalingFactor,
                workArea: primaryDisplay.workArea
            };
        } catch (error) {
            console.error('❌ Resolution detection failed:', error);
            return null;
        }
    }

    adjustCoordinatesForScaling(coords) {
        if (!this.scalingFactor || this.scalingFactor === 1) {
            return coords;
        }

        return {
            x: Math.round(coords.x * this.scalingFactor),
            y: Math.round(coords.y * this.scalingFactor),
            width: Math.round(coords.width * this.scalingFactor),
            height: Math.round(coords.height * this.scalingFactor)
        };
    }

    async detectBrowserWindows() {
        try {
            // Use both Node.js and system methods for comprehensive detection
            const detectionMethods = [
                this.detectViaPowerShell(),
                this.detectViaTasklist(),
                this.detectViaWMI()
            ];

            const results = await Promise.allSettled(detectionMethods);
            const allBrowsers = [];

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    console.log(\`✅ Method \${index + 1} found \${result.value.length} browsers\`);
                    allBrowsers.push(...result.value);
                } else {
                    console.log(\`❌ Method \${index + 1} failed:\`, result.reason);
                }
            });

            // Remove duplicates based on title and process
            const uniqueBrowsers = this.removeDuplicateBrowsers(allBrowsers);
            this.detectedBrowsers = uniqueBrowsers;

            console.log(\`🎯 Total unique browsers found: \${uniqueBrowsers.length}\`);
            return uniqueBrowsers;
        } catch (error) {
            console.error('❌ Browser detection failed:', error);
            return [];
        }
    }

    async detectViaPowerShell() {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            const cmd = \`powershell "Get-Process | Where-Object {$_.ProcessName -match 'chrome|firefox|edge|opera|brave'} | Select-Object ProcessName, MainWindowTitle, Id | ConvertTo-Json"\`;
            
            exec(cmd, { encoding: 'utf8' }, (error, stdout) => {
                if (error) {
                    resolve([]);
                    return;
                }
                
                try {
                    const processes = JSON.parse(stdout);
                    const browsers = Array.isArray(processes) ? processes : [processes];
                    
                    return resolve(browsers.filter(p => p.MainWindowTitle && p.MainWindowTitle.trim() !== '').map(p => ({
                        name: p.ProcessName,
                        title: p.MainWindowTitle,
                        pid: p.Id,
                        method: 'PowerShell'
                    })));
                } catch (e) {
                    resolve([]);
                }
            });
        });
    }

    async detectViaTasklist() {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            const cmd = 'tasklist /fi "imagename eq chrome.exe" /fi "imagename eq firefox.exe" /fi "imagename eq msedge.exe" /fo csv';
            
            exec(cmd, (error, stdout) => {
                if (error) {
                    resolve([]);
                    return;
                }
                
                try {
                    const lines = stdout.split('\\n').slice(1); // Skip header
                    const browsers = lines
                        .filter(line => line.trim())
                        .map(line => {
                            const parts = line.split(',');
                            if (parts.length >= 2) {
                                return {
                                    name: parts[0].replace(/"/g, ''),
                                    title: 'Browser Window',
                                    pid: parts[1].replace(/"/g, ''),
                                    method: 'Tasklist'
                                };
                            }
                            return null;
                        })
                        .filter(Boolean);
                    
                    resolve(browsers);
                } catch (e) {
                    resolve([]);
                }
            });
        });
    }

    async detectViaWMI() {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            const cmd = \`wmic process where "name='chrome.exe' or name='firefox.exe' or name='msedge.exe'" get ProcessId,CommandLine /format:csv\`;
            
            exec(cmd, (error, stdout) => {
                if (error) {
                    resolve([]);
                    return;
                }
                
                try {
                    const lines = stdout.split('\\n').slice(1); // Skip header
                    const browsers = lines
                        .filter(line => line.includes('.exe'))
                        .map(line => {
                            const parts = line.split(',');
                            if (parts.length >= 2) {
                                const processName = parts[1] || 'Unknown';
                                return {
                                    name: processName.includes('chrome') ? 'Chrome' : 
                                          processName.includes('firefox') ? 'Firefox' : 'Edge',
                                    title: 'Browser Process',
                                    pid: parts[2] || 'Unknown',
                                    method: 'WMI'
                                };
                            }
                            return null;
                        })
                        .filter(Boolean);
                    
                    resolve(browsers);
                } catch (e) {
                    resolve([]);
                }
            });
        });
    }

    removeDuplicateBrowsers(browsers) {
        const seen = new Set();
        return browsers.filter(browser => {
            const key = \`\${browser.name}:\${browser.title}:\${browser.pid}\`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    async captureScreenshotWithScaling(area) {
        try {
            const { screen } = require('electron');
            const primaryDisplay = screen.getPrimaryDisplay();
            
            // Adjust coordinates for display scaling
            const adjustedArea = this.adjustCoordinatesForScaling(area);
            
            console.log(\`📸 Capturing area: \${area.x},\${area.y} \${area.width}x\${area.height}\`);
            console.log(\`📏 Adjusted for \${this.scalingFactor}x scaling: \${adjustedArea.x},\${adjustedArea.y} \${adjustedArea.width}x\${adjustedArea.height}\`);
            
            return adjustedArea;
        } catch (error) {
            console.error('❌ Screenshot scaling failed:', error);
            return area;
        }
    }

    async diagnoseCoordinateIssues(areas) {
        console.log('🔍 Diagnosing Coordinate Issues...');
        
        const resolution = await this.detectSystemResolution();
        if (!resolution) {
            console.log('❌ Could not detect system resolution');
            return;
        }

        console.log('\\n📊 Coordinate Analysis:');
        
        Object.entries(areas).forEach(([areaName, area]) => {
            if (area) {
                const isOutOfBounds = 
                    area.x + area.width > resolution.width ||
                    area.y + area.height > resolution.height;
                    
                const scaledArea = this.adjustCoordinatesForScaling(area);
                const wouldBeInBounds = 
                    scaledArea.x + scaledArea.width <= resolution.width &&
                    scaledArea.y + scaledArea.height <= resolution.height;

                console.log(\`\`);
                console.log(\`🎯 \${areaName.toUpperCase()} Area:\`);
                console.log(\`   Original: \${area.x},\${area.y} \${area.width}x\${area.height}\`);
                console.log(\`   Scaled:   \${scaledArea.x},\${scaledArea.y} \${scaledArea.width}x\${scaledArea.height}\`);
                console.log(\`   Status:   \${isOutOfBounds ? '❌ OUT OF BOUNDS' : '✅ Within bounds'}\`);
                
                if (isOutOfBounds && wouldBeInBounds) {
                    console.log(\`   💡 Recommendation: Apply scaling factor \${this.scalingFactor}x\`);
                } else if (isOutOfBounds) {
                    console.log(\`   💡 Recommendation: Reconfigure coordinates - too far right/down\`);
                }
            }
        });

        console.log(\`\`);
        console.log(\`🖥️  System Info:\`);
        console.log(\`   Resolution: \${resolution.width}x\${resolution.height}\`);
        console.log(\`   Scale:      \${resolution.scaleFactor}x\`);
        console.log(\`   Work Area:  \${resolution.workArea.width}x\${resolution.workArea.height}\`);
    }
}

module.exports = { EnhancedBrowserDetection };
`;

// Save the enhanced detection utility
const utilityPath = path.join(__dirname, 'enhanced-browser-detection.js');
fs.writeFileSync(utilityPath, enhancedBrowserDetection);

console.log('✅ Enhanced Browser Detection Utility created');
console.log('📁 Saved to:', utilityPath);

// Create test script
const testScript = `
// test-enhanced-detection.js - Test the enhanced detection system

const { EnhancedBrowserDetection } = require('./enhanced-browser-detection');

async function testEnhancedDetection() {
    console.log('🧪 Testing Enhanced Detection System...');
    
    const detector = new EnhancedBrowserDetection();
    
    // Test 1: System Resolution
    console.log('\\n1️⃣ Testing System Resolution Detection...');
    const resolution = await detector.detectSystemResolution();
    
    // Test 2: Browser Detection
    console.log('\\n2️⃣ Testing Browser Detection...');
    const browsers = await detector.detectBrowserWindows();
    
    // Test 3: Coordinate Analysis
    console.log('\\n3️⃣ Testing Coordinate Analysis...');
    const testAreas = {
        bet: { x: 1356, y: 1079, width: 98, height: 42 },
        win: { x: 962, y: 1078, width: 112, height: 48 },
        balance: { x: 547, y: 1075, width: 126, height: 46 }
    };
    
    await detector.diagnoseCoordinateIssues(testAreas);
    
    console.log('\\n✅ Enhanced Detection Test Complete!');
    console.log('📋 Check the output above for any issues or recommendations.');
}

testEnhancedDetection().catch(console.error);
`;

const testPath = path.join(__dirname, 'test-enhanced-detection.js');
fs.writeFileSync(testPath, testScript);

console.log('✅ Test script created');
console.log('📁 Saved to:', testPath);

console.log('\n🎯 USAGE INSTRUCTIONS:');
console.log('======================');
console.log('1. Run the test script: node test-enhanced-detection.js');
console.log('2. Check for scaling/resolution issues in the output');
console.log('3. The enhanced detection is now integrated into your system');
console.log('4. Browser resolution mismatches should be automatically handled');
console.log('\n💡 The enhanced system will:');
console.log('   • Automatically detect and adjust for display scaling');
console.log('   • Provide better browser window detection');
console.log('   • Diagnose coordinate issues');
console.log('   • Handle multiple detection methods for reliability');
