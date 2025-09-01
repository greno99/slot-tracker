// spin-edit-feature.js
// Adds edit and delete functionality for individual spins

const fs = require('fs');
const path = require('path');

console.log('✏️ Adding Spin Edit & Delete Feature');
console.log('=====================================');

function addSpinEditFeature() {
    const overlayJsPath = path.join(__dirname, 'renderer', 'overlay.js');
    const overlayHtmlPath = path.join(__dirname, 'renderer', 'overlay.html');
    
    if (!fs.existsSync(overlayJsPath)) {
        console.log('❌ overlay.js not found');
        return false;
    }
    
    // Backup files
    const jsBackup = overlayJsPath + '.backup-spin-edit-' + Date.now();
    fs.copyFileSync(overlayJsPath, jsBackup);
    console.log('📦 JavaScript backup created:', path.basename(jsBackup));
    
    // Add edit functionality to overlay.js
    let jsContent = fs.readFileSync(overlayJsPath, 'utf8');
    
    // Add edit mode property to constructor
    jsContent = jsContent.replace(
        /(this\.autoDetectActive = false;.*)/,
        `$1
        this.editMode = false; // NEW: Edit mode for spins`
    );
    
    // Add edit methods before the last part of the class
    const editMethods = `
    
    // ===== SPIN EDIT & DELETE FUNCTIONALITY =====
    
    toggleEditMode() {
        this.editMode = !this.editMode;
        const btn = document.getElementById('editModeBtn');
        const modeIndicator = document.getElementById('editModeIndicator');
        
        if (this.editMode) {
            btn.textContent = '✅ Edit Mode';
            btn.classList.add('btn-active');
            modeIndicator.style.display = 'block';
            modeIndicator.textContent = '✏️ Edit Mode Active';
            this.showNotification('Edit Mode aktiviert - Klicke auf Spins zum Bearbeiten', 'info');
        } else {
            btn.textContent = '✏️ Edit Spins';
            btn.classList.remove('btn-active');
            modeIndicator.style.display = 'none';
            this.showNotification('Edit Mode deaktiviert', 'info');
        }
        
        // Update the spins display
        this.updateSpinsHistory();
    }
    
    editSpin(spinIndex) {
        if (spinIndex >= this.sessionData.spinsHistory.length) {
            this.showNotification('Spin nicht gefunden!', 'error');
            return;
        }
        
        const spin = this.sessionData.spinsHistory[spinIndex];
        const time = new Date(spin.time).toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Create edit dialog
        const newBet = prompt(
            \`Spin bearbeiten (\${time}):\\n\\nNeuer Einsatz:\`, 
            spin.bet.toFixed(2)
        );
        
        if (newBet === null) return; // User cancelled
        
        const newWin = prompt(
            \`Spin bearbeiten (\${time}):\\n\\nNeuer Gewinn:\`, 
            spin.win.toFixed(2)
        );
        
        if (newWin === null) return; // User cancelled
        
        // Validate input
        const betAmount = parseFloat(newBet);
        const winAmount = parseFloat(newWin);
        
        if (isNaN(betAmount) || betAmount < 0) {
            this.showNotification('Ungültiger Einsatz!', 'error');
            return;
        }
        
        if (isNaN(winAmount) || winAmount < 0) {
            this.showNotification('Ungültiger Gewinn!', 'error');
            return;
        }
        
        // Update spin and recalculate totals
        this.updateSpin(spinIndex, betAmount, winAmount);
    }
    
    updateSpin(spinIndex, newBet, newWin) {
        const oldSpin = this.sessionData.spinsHistory[spinIndex];
        
        // Subtract old values from totals
        this.sessionData.totalBet -= oldSpin.bet;
        this.sessionData.totalWin -= oldSpin.win;
        
        // Update the spin
        oldSpin.bet = newBet;
        oldSpin.win = newWin;
        
        // Add new values to totals
        this.sessionData.totalBet += newBet;
        this.sessionData.totalWin += newWin;
        
        // Recalculate best win
        this.recalculateBestWin();
        
        // Update UI and save
        this.updateUI();
        this.saveData();
        
        this.showNotification(\`Spin aktualisiert: €\${newBet.toFixed(2)} → €\${newWin.toFixed(2)}\`, 'success');
    }
    
    deleteSpin(spinIndex) {
        if (spinIndex >= this.sessionData.spinsHistory.length) {
            this.showNotification('Spin nicht gefunden!', 'error');
            return;
        }
        
        const spin = this.sessionData.spinsHistory[spinIndex];
        const time = new Date(spin.time).toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const confirmed = confirm(
            \`Spin löschen (\${time})?\\n\\nEinsatz: €\${spin.bet.toFixed(2)}\\nGewinn: €\${spin.win.toFixed(2)}\\n\\nDies kann nicht rückgängig gemacht werden!\`
        );
        
        if (!confirmed) return;
        
        // Remove spin from history
        this.sessionData.spinsHistory.splice(spinIndex, 1);
        
        // Update totals
        this.sessionData.spins--;
        this.sessionData.totalBet -= spin.bet;
        this.sessionData.totalWin -= spin.win;
        
        // Recalculate best win
        this.recalculateBestWin();
        
        // Update UI and save
        this.updateUI();
        this.saveData();
        
        this.showNotification(\`Spin gelöscht (\${time}): €\${spin.bet.toFixed(2)} → €\${spin.win.toFixed(2)}\`, 'success');
    }
    
    recalculateBestWin() {
        this.sessionData.bestWin = 0;
        this.sessionData.spinsHistory.forEach(spin => {
            if (spin.win > this.sessionData.bestWin) {
                this.sessionData.bestWin = spin.win;
            }
        });
    }
    
    // Enhanced version of updateSpinsHistory with edit buttons
    updateSpinsHistoryWithEdit() {
        const container = document.getElementById('lastSpins');
        container.innerHTML = '';
        
        // Show more spins when in edit mode
        const maxSpins = this.editMode ? 20 : 10;
        const recentSpins = this.sessionData.spinsHistory.slice(-maxSpins).reverse();
        
        recentSpins.forEach((spin, displayIndex) => {
            // Calculate actual index in the array (since we reversed it)
            const actualIndex = this.sessionData.spinsHistory.length - 1 - displayIndex;
            
            const div = document.createElement('div');
            div.className = 'spin-item' + (this.editMode ? ' edit-mode' : '');
            
            const time = new Date(spin.time).toLocaleTimeString('de-DE', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const multiplier = spin.bet > 0 ? (spin.win / spin.bet) : 0;
            const multiplierClass = multiplier >= 1 ? 'profit-positive' : 'profit-negative';
            
            let spinContent = \`
                <span class="spin-time">\${time}</span>
                <div class="spin-amounts">
                    <span>€\${spin.bet.toFixed(2)}</span>
                    <span class="\${multiplierClass}">€\${spin.win.toFixed(2)}</span>
                    <span class="\${multiplierClass}">\${multiplier.toFixed(1)}x</span>
                </div>
            \`;
            
            // Add edit buttons if in edit mode
            if (this.editMode) {
                spinContent += \`
                    <div class="spin-edit-buttons">
                        <button class="spin-edit-btn edit-btn" onclick="tracker.editSpin(\${actualIndex})" title="Bearbeiten">
                            ✏️
                        </button>
                        <button class="spin-edit-btn delete-btn" onclick="tracker.deleteSpin(\${actualIndex})" title="Löschen">
                            🗑️
                        </button>
                    </div>
                \`;
            }
            
            div.innerHTML = spinContent;
            container.appendChild(div);
        });
        
        // Add edit mode info if active
        if (this.editMode && recentSpins.length > 0) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'edit-mode-info';
            infoDiv.innerHTML = \`
                <small>✏️ Edit Mode: Zeige \${recentSpins.length} Spins • Klicke ✏️ zum Bearbeiten oder 🗑️ zum Löschen</small>
            \`;
            container.appendChild(infoDiv);
        }
    }`;
    
    // Replace the updateSpinsHistory method with the enhanced version
    jsContent = jsContent.replace(
        /updateSpinsHistory\(\) \{[\s\S]*?^\s*\}/m,
        'updateSpinsHistory() {\n        this.updateSpinsHistoryWithEdit();\n    }'
    );
    
    // Insert edit methods before the calculateStats method
    jsContent = jsContent.replace(
        /(calculateStats\(sessions\))/,
        editMethods + '\n    $1'
    );
    
    fs.writeFileSync(overlayJsPath, jsContent);
    console.log('✅ Edit functionality added to overlay.js');
    
    // Add edit button and styling to HTML
    if (fs.existsSync(overlayHtmlPath)) {
        const htmlBackup = overlayHtmlPath + '.backup-spin-edit-' + Date.now();
        fs.copyFileSync(overlayHtmlPath, htmlBackup);
        console.log('📦 HTML backup created:', path.basename(htmlBackup));
        
        let htmlContent = fs.readFileSync(overlayHtmlPath, 'utf8');
        
        // Add edit mode button in the session controls
        htmlContent = htmlContent.replace(
            /(<button class="btn" id="exportBtn">Export<\/button>)/,
            `$1
                <button class="btn" id="editModeBtn" onclick="tracker.toggleEditMode()">✏️ Edit Spins</button>`
        );
        
        // Add edit mode indicator
        htmlContent = htmlContent.replace(
            /(<div id="lastSpins">)/,
            `<div id="editModeIndicator" style="display: none; background: rgba(255,193,7,0.2); color: #ffc107; padding: 5px; text-align: center; font-size: 10px; border-radius: 3px; margin-bottom: 5px;"></div>
            $1`
        );
        
        // Add CSS for edit functionality
        const editCSS = `
        
        /* Edit Mode Styles */
        .spin-item.edit-mode {
            position: relative;
            padding-right: 60px;
        }
        
        .spin-edit-buttons {
            position: absolute;
            right: 5px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            gap: 3px;
        }
        
        .spin-edit-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 3px;
            width: 24px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 10px;
            transition: all 0.2s ease;
        }
        
        .edit-btn:hover {
            background: rgba(0,123,255,0.3);
            border-color: #007bff;
        }
        
        .delete-btn:hover {
            background: rgba(220,53,69,0.3);
            border-color: #dc3545;
        }
        
        .edit-mode-info {
            text-align: center;
            margin-top: 8px;
            opacity: 0.7;
            font-size: 9px;
        }
        
        .btn-active {
            background: rgba(0,255,0,0.2) !important;
            border-color: #28a745 !important;
        }
        `;
        
        // Add the CSS to the existing style section
        htmlContent = htmlContent.replace(
            /(<\/style>)/,
            editCSS + '\n        $1'
        );
        
        fs.writeFileSync(overlayHtmlPath, htmlContent);
        console.log('✅ Edit UI added to overlay.html');
    }
    
    return true;
}

// Apply the feature
const success = addSpinEditFeature();

if (success) {
    console.log('\n🎉 SPIN EDIT & DELETE FEATURE ADDED!');
    console.log('=====================================');
    
    console.log('\n✨ New Features:');
    console.log('• ✏️ Edit Mode toggle button');
    console.log('• ✏️ Edit individual spins (bet + win amounts)');
    console.log('• 🗑️ Delete individual spins');
    console.log('• 🔄 Automatic recalculation of all totals');
    console.log('• 📊 Shows more spins (20) in edit mode');
    console.log('• ⚠️ Confirmation dialogs for safety');
    
    console.log('\n🚀 How to Use:');
    console.log('1. Restart your app');
    console.log('2. In overlay, click "✏️ Edit Spins" button');
    console.log('3. Edit Mode shows ✏️ and 🗑️ buttons on each spin');
    console.log('4. Click ✏️ to edit bet/win amounts');
    console.log('5. Click 🗑️ to delete a spin completely');
    console.log('6. All totals are automatically recalculated');
    console.log('7. Click "✅ Edit Mode" again to exit edit mode');
    
    console.log('\n💡 Benefits:');
    console.log('• Fix accidental wrong entries');
    console.log('• Remove duplicate spins');
    console.log('• Correct typos in amounts');
    console.log('• Keep accurate session data');
    console.log('• Safe with confirmation dialogs');
    
} else {
    console.log('\n❌ Failed to add edit feature - check file paths');
}
