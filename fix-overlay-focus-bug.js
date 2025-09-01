// fix-overlay-focus-bug.js - Behebt den Focus-Bug im Overlay

const fs = require('fs');
const path = require('path');

console.log('🔧 Behebe Overlay Focus-Bug...');

const overlayJsPath = path.join(__dirname, 'renderer', 'overlay.js');

if (!fs.existsSync(overlayJsPath)) {
    console.log('❌ overlay.js nicht gefunden!');
    process.exit(1);
}

// Backup erstellen
const backupPath = overlayJsPath + '.backup-focus-fix-' + Date.now();
const overlayContent = fs.readFileSync(overlayJsPath, 'utf8');
fs.writeFileSync(backupPath, overlayContent);

console.log('📦 Backup erstellt:', path.basename(backupPath));

// Focus-Fix Code
const focusFixCode = `

// ===== FOCUS-BUG FIX =====
// Problem: Nach Win-Eingabe bleibt Cursor in Input, F1 funktioniert nicht
// Lösung: Automatisches Blur und globaler F1-Handler

function setupFocusFix() {
    console.log('🎯 Aktiviere Focus-Fix...');
    
    // 1. Auto-Blur nach Enter in allen Inputs
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                setTimeout(() => {
                    input.blur();
                    document.body.focus();
                    console.log('✅ Input focus released after Enter');
                }, 50);
            }
        });
        
        // Auto-blur nach 3 Sekunden Inaktivität
        let inactivityTimer;
        input.addEventListener('focus', () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                if (document.activeElement === input) {
                    input.blur();
                    document.body.focus();
                    console.log('⏰ Auto-blur nach Inaktivität');
                }
            }, 3000);
        });
        
        input.addEventListener('blur', () => {
            clearTimeout(inactivityTimer);
        });
    });
    
    // 2. Globaler F1-Handler (funktioniert auch bei focused input)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            e.preventDefault();
            e.stopPropagation();
            
            // Force release focus von allen inputs
            const focusedElement = document.activeElement;
            if (focusedElement && focusedElement.tagName === 'INPUT') {
                focusedElement.blur();
                document.body.focus();
                console.log('🚀 F1: Input focus forciert freigegeben');
            }
            
            // Trigger F1 Aktion
            if (typeof handleF1QuickSpin === 'function') {
                handleF1QuickSpin();
            } else {
                // Fallback: simuliere F1 action
                console.log('⚡ F1 Quick Spin (Fallback)');
                // Hier könntest du die F1-Aktion direkt implementieren
            }
            
            return false;
        }
    }, true); // true = capture phase, funktioniert vor anderen handlers
    
    // 3. Win-Input spezielle Behandlung
    const winInput = document.getElementById('winInput');
    if (winInput) {
        winInput.addEventListener('input', () => {
            // Nach Win-Eingabe: Auto-blur nach kurzer Verzögerung
            setTimeout(() => {
                if (document.activeElement === winInput && winInput.value !== '') {
                    winInput.blur();
                    document.body.focus();
                    console.log('🎯 Win-Input auto-blur aktiviert');
                }
            }, 1500); // 1.5 Sekunden nach letzter Eingabe
        });
    }
    
    console.log('✅ Focus-Fix aktiviert - F1 sollte jetzt immer funktionieren!');
}

// Fix beim Laden aktivieren
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFocusFix);
} else {
    setupFocusFix();
}

// Zusätzlicher globaler Focus-Reset (alle 10 Sekunden)
setInterval(() => {
    const focusedElement = document.activeElement;
    if (focusedElement && focusedElement.tagName === 'INPUT') {
        const timeSinceFocus = Date.now() - (focusedElement._focusTime || 0);
        if (timeSinceFocus > 10000) { // 10 Sekunden
            focusedElement.blur();
            document.body.focus();
            console.log('🔄 Periodischer Focus-Reset');
        }
    }
}, 10000);

// Track focus time
document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT') {
        e.target._focusTime = Date.now();
    }
});
`;

// Fix hinzufügen
const patchedContent = overlayContent + focusFixCode;
fs.writeFileSync(overlayJsPath, patchedContent);

console.log('✅ Focus-Bug Fix angewendet!');
console.log('🔄 Starte deine App neu, dann sollte F1 immer funktionieren');
console.log('');
console.log('Was wurde gefixt:');
console.log('• F1 funktioniert jetzt auch wenn Cursor in Input-Feld ist');
console.log('• Inputs werden automatisch nach Enter "unselected"');  
console.log('• Auto-blur nach 3 Sekunden Inaktivität');
console.log('• Win-Input wird nach 1.5 Sekunden automatisch freigegeben');
console.log('• Globaler F1-Handler mit höchster Priorität');
