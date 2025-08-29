# Casino Tracker Desktop - Installationsanleitung

## Überblick
Dieser Desktop Casino Tracker ist eine Electron-App, die Ihrem HTML-Prototyp erweiterte Funktionen hinzufügt:

### Neue Features gegenüber dem Browser-Prototyp:
- **Echte Desktop-App** mit System-Integration
- **Globale Hotkeys** (funktionieren auch wenn andere Apps im Fokus sind)
- **Always-on-Top Overlay** das über anderen Programmen schwebt
- **Datenpersistierung** mit Electron Store
- **Excel/CSV Export** mit erweiterten Statistiken
- **System Tray Integration** 
- **Screenshot-Funktion** für Dokumentation
- **Click-Through Modus** (F9) - Overlay wird transparent für Mausklicks

## Voraussetzungen
- Node.js (Version 16 oder höher)
- npm oder yarn

## Installation

### 1. Projekt-Setup
```bash
# Neuen Ordner erstellen
mkdir casino-tracker-desktop
cd casino-tracker-desktop

# package.json erstellen (verwenden Sie das package.json aus dem Code)
npm init -y

# Abhängigkeiten installieren
npm install electron electron-store node-xlsx
npm install --save-dev electron-builder
```

### 2. Dateien erstellen
Erstellen Sie folgende Ordnerstruktur:
```
casino-tracker-desktop/
├── package.json
├── main.js
├── renderer/
│   ├── main.html
│   └── overlay.html
├── assets/
│   └── icon.png
└── screenshots/
```

### 3. Icon erstellen
Fügen Sie ein Icon hinzu (empfohlen: 256x256 PNG):
- `assets/icon.png` für Linux
- `assets/icon.ico` für Windows  
- `assets/icon.icns` für macOS

### 4. App starten
```bash
# Entwicklung
npm start

# App bauen
npm run build
```

## Verwendung

### Erste Schritte
1. **App starten**: Führen Sie `npm start` aus
2. **Hauptfenster**: Zeigt Statistiken und Session-Übersicht
3. **Overlay aktivieren**: Button "Overlay anzeigen" oder Strg+Shift+O
4. **Session starten**: Im Overlay auf "Start" klicken

### Globale Hotkeys
Diese funktionieren systemweit, auch wenn das Casino im Fokus ist:

- **F1**: Quick Spin (verwendet letzten Einsatz)
- **F2**: Gewinn-Eingabe fokussieren
- **F3**: Spiel-Eingabe fokussieren  
- **F4**: Daten exportieren
- **F5**: Session pausieren/fortsetzen
- **F6**: Screenshot erstellen
- **F7**: Debug-Informationen
- **F8**: Session zurücksetzen
- **F9**: Click-Through Modus (Overlay transparent)
- **Strg+Shift+O**: Overlay ein/ausblenden

### Workflow-Empfehlung

#### Für Online-Casinos:
1. Casino im Browser öffnen
2. Casino Tracker starten
3. Overlay positionieren (sichtbar aber nicht störend)
4. Session starten und Spiel eingeben
5. **Manueller Modus**: Nach jedem Spin F1 drücken, bei Gewinnen F2 + Betrag
6. **Semi-Auto**: Einsätze mit F1, Gewinne manuell nachpflegen

#### Für Live-Casinos:
1. App vor Casino-Besuch starten
2. Diskrete Eingabe über Hotkeys
3. Screenshots für Dokumentation (F6)
4. Export nach Session für Analyse

## Erweiterte Features

### Datenexport
- **Excel**: Detaillierte Tabellen mit Sessions und Spins
- **CSV**: Einfacher Import in andere Tools
- **JSON**: Vollständige Datensicherung

### System Tray
- Minimiert in die Taskleiste
- Schneller Zugriff auf Overlay
- App läuft im Hintergrund

### Click-Through Modus
- F9 drücken: Overlay wird für Mausklicks transparent
- Ermöglicht Interaktion mit darunterliegenden Fenstern
- Hotkeys bleiben aktiv

## Vorteile gegenüber Browser-Version

| Feature | Browser | Desktop App |
|---------|---------|-------------|
| Globale Hotkeys | ❌ | ✅ |
| Always-on-Top | ❌ | ✅ |
| System Integration | ❌ | ✅ |
| Offline-Nutzung | ❌ | ✅ |
| Datenpersistierung | localStorage | Electron Store |
| Export-Funktionen | Basis | Erweitert (Excel, CSV) |
| Screenshots | ❌ | ✅ |
| Multi-Monitor | ❌ | ✅ |

## Technische Details

### Automatisierungsgrad
- **Vollautomatisch**: Nicht möglich ohne Casino-spezifische Integration
- **Semi-automatisch**: 80% - Hotkeys für schnelle Eingabe
- **Intelligent**: Muster-Erkennung, Statistik-Analyse, Smart Defaults

### Sicherheit
- Keine Netzwerk-Kommunikation erforderlich
- Lokale Datenspeicherung
- Keine Casino-Manipulation

### Performance
- Minimaler RAM-Verbrauch (~50-100MB)
- Geringe CPU-Last
- Schnelle Hotkey-Reaktion

## Troubleshooting

### Hotkeys funktionieren nicht
- App als Administrator starten (Windows)
- Sicherheitseinstellungen prüfen (macOS)

### Overlay nicht sichtbar
- Monitor-Setup prüfen
- Always-on-Top Berechtigung gewähren

### Export-Fehler
- Schreibrechte im Zielordner prüfen
- Antivirensoftware temporär deaktivieren

## Weiterentwicklung

### Geplante Features
- Casino-spezifische Templates
- Erweiterte Statistik-Dashboards  
- Cloud-Synchronisation (optional)
- Mobile Companion App
- KI-gestützte Muster-Analyse

### Anpassungen
Die App ist modular aufgebaut und kann leicht erweitert werden:
- Neue Hotkeys in `main.js` registrieren
- UI-Anpassungen in den HTML-Dateien
- Zusätzliche Statistiken in den Renderer-Prozessen

## Rechtlicher Hinweis
Dieses Tool dient ausschließlich der persönlichen Session-Dokumentation und Analyse. Es manipuliert keine Casino-Software und verstößt gegen keine AGB seriöser Anbieter.