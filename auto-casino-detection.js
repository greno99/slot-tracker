// auto-casino-detection.js - Automatic Casino Recognition & Calibration
const { desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');

class AutoCasinoDetection {
    constructor() {
        this.casinoProfiles = this.loadCasinoProfiles();
        this.currentCasino = null;
        this.screenAnalysisCache = new Map();
        this.detectionInterval = null;
        this.isAnalyzing = false;
    }
    
    loadCasinoProfiles() {
        // Comprehensive casino profiles with detection patterns
        return {
            'bet365': {
                name: 'Bet365',
                patterns: {
                    url: ['bet365.com', 'bet365.de', 'bet365.co.uk'],
                    title: ['Bet365', 'bet365'],
                    elements: [
                        'div[class*="bet365"]',
                        '.bet365-logo',
                        '[data-testid*="bet365"]'
                    ],
                    colors: ['#00513f', '#ffd100', '#ffffff']
                },
                layout: {
                    spinButton: { relativeX: 0.85, relativeY: 0.7, tolerance: 50 },
                    betArea: { relativeX: 0.2, relativeY: 0.85, width: 80, height: 25 },
                    winArea: { relativeX: 0.5, relativeY: 0.85, width: 100, height: 25 },
                    balanceArea: { relativeX: 0.8, relativeY: 0.1, width: 120, height: 25 }
                },
                textPatterns: {
                    bet: /(?:bet|stake).*?([€$£¥₹]?\\d+[.,]\\d{2})/i,
                    win: /(?:win|won).*?([€$£¥₹]?\\d+[.,]\\d{2})/i,
                    balance: /(?:balance|credit).*?([€$£¥₹]?\\d+[.,]\\d{2})/i
                }
            },
            
            'bwin': {
                name: 'bwin',
                patterns: {
                    url: ['bwin.com', 'bwin.de', 'bwin.at'],
                    title: ['bwin', 'BWIN'],
                    elements: [
                        'div[class*="bwin"]',
                        '.bwin-logo',
                        '[id*="bwin"]'
                    ],
                    colors: ['#ff6b00', '#000000', '#ffffff']
                },
                layout: {
                    spinButton: { relativeX: 0.87, relativeY: 0.65, tolerance: 40 },
                    betArea: { relativeX: 0.15, relativeY: 0.8, width: 70, height: 20 },
                    winArea: { relativeX: 0.45, relativeY: 0.8, width: 90, height: 20 },
                    balanceArea: { relativeX: 0.85, relativeY: 0.08, width: 100, height: 20 }
                },
                textPatterns: {
                    bet: /einsatz.*?([€$£¥₹]?\\d+[.,]\\d{2})/i,
                    win: /gewinn.*?([€$£¥₹]?\\d+[.,]\\d{2})/i,
                    balance: /guthaben.*?([€$£¥₹]?\\d+[.,]\\d{2})/i
                }
            },
            
            'pokerstars': {
                name: 'PokerStars Casino',
                patterns: {
                    url: ['pokerstars.com', 'pokerstars.de', 'pokerstars.eu'],
                    title: ['PokerStars', 'pokerstars'],
                    elements: [
                        'div[class*="pokerstars"]',
                        '.ps-logo',
                        '[data-qa*="pokerstars"]'
                    ],
                    colors: ['#e00', '#000000', '#ffffff']
                },
                layout: {
                    spinButton: { relativeX: 0.83, relativeY: 0.68, tolerance: 45 },
                    betArea: { relativeX: 0.18, relativeY: 0.82, width: 75, height: 22 },
                    winArea: { relativeX: 0.48, relativeY: 0.82, width: 85, height: 22 },
                    balanceArea: { relativeX: 0.82, relativeY: 0.12, width: 110, height: 22 }
                }
            },
            
            'mrgreen': {
                name: 'Mr Green',
                patterns: {
                    url: ['mrgreen.com', 'mrgreen.de'],
                    title: ['Mr Green', 'MrGreen'],
                    elements: [
                        'div[class*="mrgreen"]',
                        '.mr-green-logo',
                        '[data-testid*="green"]'
                    ],
                    colors: ['#00a651', '#ffffff', '#000000']
                },
                layout: {
                    spinButton: { relativeX: 0.86, relativeY: 0.72, tolerance: 35 },
                    betArea: { relativeX: 0.22, relativeY: 0.88, width: 85, height: 28 },
                    winArea: { relativeX: 0.52, relativeY: 0.88, width: 95, height: 28 },
                    balanceArea: { relativeX: 0.78, relativeY: 0.05, width: 130, height: 25 }
                }
            },
            
            'leovegas': {
                name: 'LeoVegas',
                patterns: {
                    url: ['leovegas.com', 'leovegas.de'],
                    title: ['LeoVegas', 'Leo Vegas'],
                    elements: [
                        'div[class*="leovegas"]',
                        '.leo-logo',
                        '[data-qa*="leo"]'
                    ],
                    colors: ['#ff6900', '#1a1a1a', '#ffffff']
                },
                layout: {
                    spinButton: { relativeX: 0.84, relativeY: 0.69, tolerance: 42 },
                    betArea: { relativeX: 0.19, relativeY: 0.84, width: 78, height: 24 },
                    winArea: { relativeX: 0.49, relativeY: 0.84, width: 88, height: 24 },
                    balanceArea: { relativeX: 0.81, relativeY: 0.09, width: 115, height: 24 }
                }
            },
            
            // Generic fallback profile
            'generic': {
                name: 'Generic Casino',
                patterns: {
                    url: [],
                    title: [],
                    elements: [],
                    colors: []
                },
                layout: {
                    spinButton: { relativeX: 0.85, relativeY: 0.7, tolerance: 60 },
                    betArea: { relativeX: 0.2, relativeY: 0.85, width: 100, height: 30 },
                    winArea: { relativeX: 0.5, relativeY: 0.85, width: 100, height: 30 },
                    balanceArea: { relativeX: 0.8, relativeY: 0.1, width: 120, height: 30 }
                }
            }
        };
    }
    
    async detectCurrentCasino() {
        console.log('🔍 Detecting current casino...');
        
        try {
            // Method 1: Check active browser windows
            const browserInfo = await this.getBrowserWindowInfo();
            
            // Method 2: Screenshot analysis
            const screenshot = await this.takeScreenshot();
            const visualInfo = await this.analyzeScreenshotForCasino(screenshot);
            
            // Method 3: Combined scoring
            const detectionResults = await this.scoreCasinoMatches(browserInfo, visualInfo);
            
            const bestMatch = this.selectBestCasinoMatch(detectionResults);
            
            if (bestMatch.confidence > 0.6) {
                this.currentCasino = bestMatch;
                console.log(`✅ Casino detected: ${bestMatch.profile.name} (${(bestMatch.confidence * 100).toFixed(1)}% confidence)`);
                
                await this.applyCasinoProfile(bestMatch.profile);
                return bestMatch;
            } else {
                console.log('⚠️ No casino detected with sufficient confidence, using generic profile');
                this.currentCasino = { 
                    profile: this.casinoProfiles.generic, 
                    confidence: 0.3,
                    method: 'fallback'
                };
                return this.currentCasino;
            }
            
        } catch (error) {
            console.error('❌ Casino detection failed:', error);
            return { profile: this.casinoProfiles.generic, confidence: 0, error: error.message };
        }
    }
    
    async getBrowserWindowInfo() {
        // This would integrate with system APIs to get browser window titles and URLs
        // For now, simulate based on common patterns
        
        const simulatedBrowserData = {
            url: 'https://casino.bet365.com/games',
            title: 'Bet365 Casino - Slots',
            domain: 'bet365.com'
        };
        
        console.log('🌐 Browser info:', simulatedBrowserData);
        return simulatedBrowserData;
    }
    
    async analyzeScreenshotForCasino(screenshot) {
        const cacheKey = `screenshot_${Date.now()}`;
        
        if (this.screenAnalysisCache.has(cacheKey)) {
            return this.screenAnalysisCache.get(cacheKey);
        }
        
        try {
            // Analyze screenshot for casino-specific visual elements
            const analysis = {
                dominantColors: await this.extractDominantColors(screenshot),
                textElements: await this.extractTextElements(screenshot),
                uiElements: await this.detectUIPatterns(screenshot),
                layoutAnalysis: await this.analyzeLayout(screenshot)
            };
            
            this.screenAnalysisCache.set(cacheKey, analysis);
            
            // Clean cache if too large
            if (this.screenAnalysisCache.size > 10) {
                const firstKey = this.screenAnalysisCache.keys().next().value;
                this.screenAnalysisCache.delete(firstKey);
            }
            
            console.log('📊 Visual analysis completed:', analysis);
            return analysis;
            
        } catch (error) {
            console.error('❌ Screenshot analysis failed:', error);
            return { error: error.message };
        }
    }
    
    async extractDominantColors(screenshot) {
        // Simplified color extraction - would use image processing library in production
        const sampleColors = ['#00513f', '#ff6b00', '#e00000', '#00a651', '#ff6900'];
        return sampleColors.slice(0, 3); // Return top 3 colors
    }
    
    async extractTextElements(screenshot) {
        // Simulate text extraction from screenshot
        // In production, would use OCR for casino name/branding detection
        const detectedTexts = [
            'bet365', 'SPIN', 'WIN', 'BALANCE', 'BET', 'TOTAL'
        ];
        
        return detectedTexts;
    }
    
    async detectUIPatterns(screenshot) {
        // Analyze UI layout patterns specific to casinos
        return {
            hasSpinButton: true,
            hasReels: true,
            hasPaytable: true,
            buttonStyle: 'rounded',
            layout: 'standard'
        };
    }
    
    async analyzeLayout(screenshot) {
        // Analyze overall layout structure
        return {
            resolution: { width: 1920, height: 1080 },
            gameAreaRatio: 0.7,
            controlsPosition: 'bottom',
            menuPosition: 'top'
        };
    }
    
    async scoreCasinoMatches(browserInfo, visualInfo) {
        const scores = {};
        
        for (const [casinoId, profile] of Object.entries(this.casinoProfiles)) {
            if (casinoId === 'generic') continue;
            
            let score = 0;
            
            // URL matching (high weight)
            if (browserInfo.url && profile.patterns.url) {
                for (const urlPattern of profile.patterns.url) {
                    if (browserInfo.url.includes(urlPattern)) {
                        score += 0.4;
                        break;
                    }
                }
            }
            
            // Title matching (medium weight)
            if (browserInfo.title && profile.patterns.title) {
                for (const titlePattern of profile.patterns.title) {
                    if (browserInfo.title.toLowerCase().includes(titlePattern.toLowerCase())) {
                        score += 0.2;
                        break;
                    }
                }
            }
            
            // Color matching (low weight)
            if (visualInfo.dominantColors && profile.patterns.colors) {
                const colorMatches = visualInfo.dominantColors.filter(color =>
                    profile.patterns.colors.some(patternColor =>
                        this.colorDistance(color, patternColor) < 30
                    )
                ).length;
                score += (colorMatches / profile.patterns.colors.length) * 0.2;
            }
            
            // Text element matching (medium weight)
            if (visualInfo.textElements && profile.patterns.elements) {
                const textMatches = visualInfo.textElements.filter(text =>
                    text.toLowerCase().includes(profile.name.toLowerCase())
                ).length;
                score += textMatches > 0 ? 0.2 : 0;
            }
            
            scores[casinoId] = {
                profile: profile,
                confidence: Math.min(score, 1.0),
                details: {
                    urlMatch: browserInfo.url && profile.patterns.url.some(p => browserInfo.url.includes(p)),
                    titleMatch: browserInfo.title && profile.patterns.title.some(p => browserInfo.title.includes(p)),
                    visualMatch: visualInfo.dominantColors && profile.patterns.colors.length > 0
                }
            };
        }
        
        return scores;
    }
    
    selectBestCasinoMatch(detectionResults) {
        let bestMatch = { confidence: 0, profile: this.casinoProfiles.generic };
        
        for (const [casinoId, result] of Object.entries(detectionResults)) {
            if (result.confidence > bestMatch.confidence) {
                bestMatch = {
                    ...result,
                    casinoId: casinoId,
                    method: 'automatic_detection'
                };
            }
        }
        
        return bestMatch;
    }
    
    colorDistance(color1, color2) {
        // Simple color distance calculation
        // In production, would use more sophisticated color matching
        if (color1 === color2) return 0;
        return Math.random() * 50; // Simplified for demo
    }
    
    async applyCasinoProfile(profile) {
        console.log(`🎯 Applying casino profile: ${profile.name}`);
        
        try {
            // Calculate absolute positions from relative ones
            const screenSize = await this.getScreenSize();
            const absoluteLayout = this.convertRelativeToAbsolute(profile.layout, screenSize);
            
            // Create configuration object
            const config = {
                casino: profile.name,
                spinButton: absoluteLayout.spinButton,
                areas: {
                    bet: absoluteLayout.betArea,
                    win: absoluteLayout.winArea,
                    balance: absoluteLayout.balanceArea
                },
                textPatterns: profile.textPatterns || {},
                autoApplied: true,
                timestamp: Date.now()
            };
            
            console.log('📋 Generated configuration:', config);
            
            // Send configuration to main process
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('apply-auto-casino-config', config);
            
            if (result.success) {
                console.log('✅ Casino profile applied successfully');
                return config;
            } else {
                console.log(`❌ Failed to apply profile: ${result.error}`);
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('❌ Error applying casino profile:', error);
            throw error;
        }
    }
    
    convertRelativeToAbsolute(relativeLayout, screenSize) {
        const absolute = {};
        
        for (const [element, relative] of Object.entries(relativeLayout)) {
            if (element === 'spinButton') {
                absolute[element] = {
                    x: Math.round(screenSize.width * relative.relativeX),
                    y: Math.round(screenSize.height * relative.relativeY)
                };
            } else {
                absolute[element] = {
                    x: Math.round(screenSize.width * relative.relativeX - relative.width / 2),
                    y: Math.round(screenSize.height * relative.relativeY - relative.height / 2),
                    width: relative.width,
                    height: relative.height
                };
            }
        }
        
        return absolute;
    }
    
    async getScreenSize() {
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        return primaryDisplay.workAreaSize;
    }
    
    async takeScreenshot() {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 }
        });
        
        if (sources.length > 0) {
            return sources[0].thumbnail;
        }
        throw new Error('No screen sources available');
    }
    
    // Continuous monitoring
    startAutoDetection(intervalMs = 30000) {
        console.log(`🔄 Starting auto-detection monitoring (${intervalMs}ms interval)`);
        
        this.detectionInterval = setInterval(async () => {
            if (!this.isAnalyzing) {
                this.isAnalyzing = true;
                
                try {
                    const detection = await this.detectCurrentCasino();
                    
                    // If casino changed, notify
                    if (detection.casinoId !== this.currentCasino?.casinoId) {
                        console.log(`🔄 Casino changed: ${this.currentCasino?.profile.name} -> ${detection.profile.name}`);
                        
                        // Emit casino change event
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('casino-auto-detected', {
                            previousCasino: this.currentCasino?.profile.name,
                            newCasino: detection.profile.name,
                            confidence: detection.confidence
                        });
                    }
                    
                } catch (error) {
                    console.error('Auto-detection error:', error);
                } finally {
                    this.isAnalyzing = false;
                }
            }
        }, intervalMs);
    }
    
    stopAutoDetection() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
            console.log('⏹️ Auto-detection stopped');
        }
    }
    
    // Manual calibration helper
    async calibrateCurrentCasino() {
        console.log('🛠️ Starting manual calibration...');
        
        const screenshot = await this.takeScreenshot();
        const analysis = await this.analyzeScreenshotForCasino(screenshot);
        
        // Save calibration data
        const calibrationData = {
            casino: this.currentCasino?.profile.name || 'Unknown',
            screenshot: screenshot.toPNG(),
            analysis: analysis,
            timestamp: Date.now(),
            manual: true
        };
        
        // Save for future reference
        const calibrationPath = path.join(__dirname, 'casino-calibrations', `${Date.now()}_calibration.json`);
        const calibrationDir = path.dirname(calibrationPath);
        
        if (!fs.existsSync(calibrationDir)) {
            fs.mkdirSync(calibrationDir, { recursive: true });
        }
        
        fs.writeFileSync(calibrationPath, JSON.stringify(calibrationData, null, 2));
        
        console.log(`💾 Calibration saved: ${calibrationPath}`);
        return calibrationData;
    }
    
    // Learning system - improve detection over time
    async learnFromUserCorrection(userSelectedCasino, detectedCasino, screenshot) {
        console.log(`📚 Learning: User selected ${userSelectedCasino}, we detected ${detectedCasino}`);
        
        const learningData = {
            userChoice: userSelectedCasino,
            systemDetection: detectedCasino,
            screenshot: screenshot.toPNG(),
            timestamp: Date.now(),
            improvement: true
        };
        
        // Save learning data for future model improvements
        const learningPath = path.join(__dirname, 'learning-data', `${Date.now()}_correction.json`);
        const learningDir = path.dirname(learningPath);
        
        if (!fs.existsSync(learningDir)) {
            fs.mkdirSync(learningDir, { recursive: true });
        }
        
        fs.writeFileSync(learningPath, JSON.stringify(learningData, null, 2));
        
        // Update the selected profile
        if (this.casinoProfiles[userSelectedCasino]) {
            await this.applyCasinoProfile(this.casinoProfiles[userSelectedCasino]);
        }
        
        return learningData;
    }
}

module.exports = AutoCasinoDetection;

// Usage example in main process:
/*
const AutoCasinoDetection = require('./auto-casino-detection');

const autoCasino = new AutoCasinoDetection();

// Detect casino when user opens detection window
ipcMain.handle('auto-detect-casino', async () => {
    return await autoCasino.detectCurrentCasino();
});

// Apply auto-detected configuration
ipcMain.handle('apply-auto-casino-config', async (event, config) => {
    try {
        // Save the configuration
        store.set('spinDetectionConfig', config);
        
        // Notify detection window
        if (spinDetectionWindow && !spinDetectionWindow.isDestroyed()) {
            spinDetectionWindow.webContents.send('auto-config-applied', config);
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Start auto-detection monitoring
autoCasino.startAutoDetection(30000); // Check every 30 seconds
*/