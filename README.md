# 🛡️ Pagy Blocker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/)

**Der schnellste und smarteste Adblocker für Chrome - entwickelt für maximale Performance und Benutzerfreundlichkeit.**

## 🚀 Was macht Pagy Blocker besonders?

Pagy Blocker ist kein gewöhnlicher Adblocker. Während andere Extensions JavaScript verwenden und dadurch langsam werden, nutzt Pagy Blocker Chromes native `declarativeNetRequest` API für blitzschnelle Blockierung direkt im Browser-Kernel.

### 🎯 Das Alleinstellungsmerkmal: Per-Tab-Kontrolle

**Endlich!** Ein Adblocker, der versteht, dass du manchmal Werbung auf bestimmten Websites sehen möchtest, ohne die komplette Extension zu deaktivieren.

- **Ein Klick** - Adblocker nur für die aktuelle Website deaktivieren
- **Automatischer Reload** - Die Seite lädt sich automatisch neu
- **Keine Auswirkungen** auf andere Tabs oder Websites

## ⚡ Performance-Vergleich

| Feature | Pagy Blocker | uBlock Origin | AdBlock Plus |
|---------|-------------|---------------|--------------|
| **Blockierung** | Browser-Kernel | JavaScript | JavaScript |
| **Performance** | 🟢 Extrem schnell | 🟡 Schnell | 🔴 Langsam |
| **Ressourcenverbrauch** | 🟢 Minimal | 🟡 Mittel | 🔴 Hoch |
| **Per-Tab-Kontrolle** | ✅ Ja | ❌ Nein | ❌ Nein |
| **Auto-Reload** | ✅ Ja | ❌ Nein | ❌ Nein |
| **Manifest V3** | ✅ Nativ | ⚠️ Portiert | ⚠️ Portiert |

## 🛠️ Installation

### Für Entwickler
```bash
# Repository klonen
git clone https://github.com/rujbi/pagy-blocker.git
cd pagy-blocker

# Chrome Extensions öffnen
# chrome://extensions/

# Entwicklermodus aktivieren
# "Entpackte Erweiterung laden" → Ordner auswählen
```

### Für Enduser
*Bald verfügbar im Chrome Web Store!*

## 🎮 Bedienung

### Basis-Funktionen
1. **Extension-Icon** in der Toolbar anklicken
2. **Toggle-Switch** verwenden:
   - **Ein**: Adblocker aktiv für diese Website
   - **Aus**: Adblocker deaktiviert für diese Website
3. **Automatischer Reload** - Die Seite wird automatisch neu geladen

### Advanced Features
- **Aktualisieren-Button**: Statistiken manuell aktualisieren
- **Domain-Anzeige**: Siehst sofort für welche Domain der Status gilt
- **Regel-Counter**: Zeigt die Anzahl aktiver Filterregeln

## 🔧 Technische Details

### Architektur
- **Manifest V3** - Zukunftssicher und sicher
- **Service Worker** - Effiziente Hintergrundverarbeitung
- **declarativeNetRequest** - Native Browser-Blockierung
- **Session Rules** - Dynamische Per-Domain-Kontrolle

### Filterregeln
- **91 optimierte Regeln** - Sorgfältig ausgewählt und getestet
- **Statische Filterregeln** - Für maximale Performance
- **Bekannte Ad-Netzwerke**: Google Ads, DoubleClick, Facebook, Amazon und viele mehr

### Performance-Optimierungen
- **Kernel-Level Blocking** - Werbung wird blockiert bevor sie geladen wird
- **Smart Caching** - 1-Sekunden-Cache für sofortige Antworten
- **Minimaler Overhead** - Keine JavaScript-Parsing-Schleifen
- **Parallele Verarbeitung** - Mehrere Requests gleichzeitig

## 🆚 Warum Pagy Blocker statt andere?

### vs. uBlock Origin
- **Schneller**: Kernel-Level vs. JavaScript-Processing
- **Smarter**: Per-Tab-Kontrolle vs. Alles-oder-Nichts
- **Einfacher**: Ein Toggle vs. komplexe Menüs

### vs. AdBlock Plus
- **Moderner**: Nativ V3 vs. V2-Portierung
- **Leichter**: Minimaler Ressourcenverbrauch vs. Memory-Hunger
- **Transparenter**: Open Source vs. "Acceptable Ads"

### vs. Ghostery
- **Fokussierter**: Nur Ads vs. Tracking+Ads+Analytics
- **Schneller**: Statische Regeln vs. Dynamische Updates
- **Benutzerfreundlicher**: Ein Klick vs. Dutzende Einstellungen

## 🛡️ Sicherheit & Privatsphäre

- **Keine Datensammlung** - Alles läuft lokal
- **Keine Telemetrie** - Keine Verbindungen zu externen Servern
- **Open Source** - Komplett einsehbarer Code
- **Minimal Permissions** - Nur die nötigsten Berechtigungen

## 🐛 Bekannte Limitationen

- **Cosmetic Filtering**: Derzeit nicht unterstützt (geplant für v2.3)
- **Custom Filter Lists**: Nur vordefinierte Regeln (geplant für v2.4)
- **Firefox Support**: Nur Chrome/Edge (Manifest V3 Limitation)

## 🔮 Roadmap

### Version 2.3 (Q1 2025)
- [ ] Cosmetic Filtering für versteckte Ads
- [ ] Whitelist-Management
- [ ] Erweiterte Statistiken

### Version 2.4 (Q2 2025)
- [ ] Custom Filter Lists
- [ ] Import/Export Einstellungen
- [ ] Sync zwischen Geräten

### Version 3.0 (Q3 2025)
- [ ] Machine Learning für Ad-Erkennung
- [ ] Predictive Blocking
- [ ] Advanced Analytics

## 🤝 Beitragen

Contributions sind willkommen! Bitte:

1. **Fork** das Repository
2. **Branch** erstellen: `git checkout -b feature/AmazingFeature`
3. **Commit** changes: `git commit -m 'Add AmazingFeature'`
4. **Push** to branch: `git push origin feature/AmazingFeature`
5. **Pull Request** öffnen

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

## 🏆 Credits

- **Entwickler**: [rujbi](https://github.com/rujbi)
- **Inspiration**: uBlock Origin, AdBlock Plus
- **Filter Lists**: EasyList Community
- **Performance**: Chrome Team für declarativeNetRequest API

## 📞 Support

- **GitHub Issues**: [Problem melden](https://github.com/rujbi/pagy-blocker/issues)
- **Discussions**: [Feature Request](https://github.com/rujbi/pagy-blocker/discussions)
- **Email**: support@pagy-blocker.com

---

**⭐ Gefällt dir Pagy Blocker? Gib uns einen Stern auf GitHub!**

*Entwickelt mit ❤️ für eine werbefreie Zukunft.*