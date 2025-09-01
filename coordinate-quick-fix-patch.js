
// QUICK FIX: Manuelle Koordinaten-Korrektur für "etwas oben und links" Problem
function quickFixCoordinateOffset(area, offsetX = 20, offsetY = 30) {
    // User-Problem: Erfassung ist "etwas nach oben und links versetzt"
    // Lösung: Koordinaten nach unten und rechts verschieben
    
    const corrected = {
        x: area.x + offsetX,  // Nach rechts verschieben
        y: area.y + offsetY,  // Nach unten verschieben  
        width: area.width,
        height: area.height
    };
    
    console.log(`🔧 Quick-Fix Offset: ${JSON.stringify(area)} → ${JSON.stringify(corrected)}`);
    return corrected;
}

// Überschreibe die scaleCoordinatesIfNeeded Funktion mit Quick-Fix
const originalScaleCoordinates = scaleCoordinatesIfNeeded;
scaleCoordinatesIfNeeded = function(area) {
    // Erst die normale Skalierung
    let scaled = originalScaleCoordinates(area);
    
    // Dann den Quick-Fix Offset anwenden
    scaled = quickFixCoordinateOffset(scaled, 20, 30); // Anpassbare Werte
    
    return scaled;
};
