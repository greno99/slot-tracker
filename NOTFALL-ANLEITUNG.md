# 🆘 NOTFALL-ANLEITUNG: Screenshot viel zu hoch

## ⚡ SOFORT AUSFÜHREN (der Reihe nach):

### 1. ALTEN CODE ENTFERNEN
Entferne den Offset-Fix Code aus main.js (die applyOffsetFix Funktion)

### 2. BROWSER-FENSTER FIX ANWENDEN
```bash
node BROWSER-FENSTER-FIX.js
```
Den Code aus dieser Datei in main.js einfügen (vor app.whenReady)

### 3. BROWSER VORBEREITEN  
- Casino im Browser öffnen
- F11 drücken (Vollbild-Modus)
- Sicherstellen dass "casino" oder "bet" im Browser-Titel steht

### 4. APP NEUSTARTEN
Casino Tracker komplett schließen und neu starten

### 5. NEUE OCR-BEREICHE ERSTELLEN
- Spin Detection öffnen
- Alle alten Bereiche LÖSCHEN  
- Neue Bereiche mit Maus markieren
- OCR testen

## 🔍 FALLS IMMER NOCH PROBLEME:

### DIAGNOSE AUSFÜHREN:
```bash
node coordinate-diagnostic-tool.js
```

Schau dir die Debug-Screenshots im coordinate-debug Ordner an!
Diese zeigen GENAU wo der Screenshot landet vs. wo er sein sollte.

### VISUELLEN PROBLEMLÖSER ÖFFNEN:
```bash
start VISUELLER-PROBLEMLÖSER.html  
```

## ✅ ERFOLGSKONTROLLE:

Du weißt dass es funktioniert wenn:
- Console zeigt: "🌐 Browser-Fenster gefunden"
- OCR liest echte Werte (nicht 0.00)
- Screenshots landen genau auf den Casino-Bereichen

## 🆘 BEI WEITEREN PROBLEMEN:

Das Problem ist dann wahrscheinlich:
- Multi-Monitor Setup  
- DPI-Skalierung Problem
- Casino-Titel wird nicht erkannt
- Browser nicht richtig maximiert

Die Diagnose zeigt dir genau was das Problem ist!