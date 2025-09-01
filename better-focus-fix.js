// better-focus-fix.js
// Fixes the aggressive focus management that interrupts typing

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Aggressive Focus Management');
console.log('=====================================');
console.log('Problem: Focus is lost while typing, making UX terrible');
console.log('Solution: Remove aggressive auto-blur, keep only F1 fix');

function fixAggressiveFocusManagement() {
    const overlayJsPath = path.join(__dirname, 'renderer', 'overlay.js');
    
    if (!fs.existsSync(overlayJsPath)) {
        console.log('❌ overlay.js not found');
        return false;
    }
    
    // Create backup
    const backup = overlayJsPath + '.backup-focus-refix-' + Date.now();
    fs.copyFileSync(overlayJsPath, backup);
    console.log('📦 Backup created:', path.basename(backup));
    
    let content = fs.readFileSync(overlayJsPath, 'utf8');
    
    // Remove the overly aggressive focus fix
    console.log('🗑️ Removing aggressive auto-blur functionality...');
    
    // Remove the entire aggressive focus fix section
    content = content.replace(
        /\/\/ ===== FOCUS-BUG FIX =====[\s\S]*?\/\/ Track focus time[\s\S]*?}\);?\s*$/,
        ''
    );
    
    // Add a better, non-intrusive F1 fix
    const betterFocusFix = `

// ===== BETTER F1 FIX (Non-Intrusive) =====
// Only fixes F1 issue without interfering with normal typing

function setupBetterF1Fix() {
    console.log('🎯 Setting up better F1 fix (non-intrusive)...');
    
    // Global F1 handler that works even when input is focused
    // But ONLY for F1, don't interfere with typing
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('⚡ F1 pressed - executing quick spin');
            
            // Only blur if F1 is pressed, don't auto-blur during typing
            const focusedElement = document.activeElement;
            if (focusedElement && focusedElement.tagName === 'INPUT') {
                focusedElement.blur();
                console.log('🚀 F1: Released input focus for quick spin');
            }
            
            // Execute F1 action
            if (typeof tracker !== 'undefined' && tracker.isTracking && !tracker.isPaused) {
                tracker.addQuickSpin();
                console.log('✅ F1 Quick Spin executed');
            } else {
                console.log('⚠️ F1: Session not active or paused');
            }
            
            return false;
        }
    }, true); // Capture phase to ensure it works
    
    // Only auto-blur on Enter key (when user is done typing)
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                // Small delay to let the action complete, then blur
                setTimeout(() => {
                    input.blur();
                    console.log('✅ Auto-blur after Enter in', input.id);
                }, 100);
            }
        });
    });
    
    console.log('✅ Better F1 fix activated - no more typing interruptions!');
}

// Activate the better fix when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupBetterF1Fix);
} else {
    setupBetterF1Fix();
}
`;

    // Add the better fix
    content += betterFocusFix;
    
    fs.writeFileSync(overlayJsPath, content);
    console.log('✅ Better focus fix applied to overlay.js');
    return true;
}

// Apply the fix
const success = fixAggressiveFocusManagement();

if (success) {
    console.log('\n🎉 FOCUS FIX IMPROVED!');
    console.log('======================');
    console.log('✅ Removed aggressive auto-blur timers');
    console.log('✅ F1 still works when input is focused'); 
    console.log('✅ Auto-blur only on Enter key (when user is done)');
    console.log('✅ No more interruptions while typing');
    console.log('\n🚀 Next steps:');
    console.log('1. Restart your app');
    console.log('2. Test typing in input fields - should not lose focus');
    console.log('3. Test F1 after entering win - should still work');
    console.log('4. Much better user experience! 🎯');
} else {
    console.log('\n❌ Fix failed - check file paths');
}
