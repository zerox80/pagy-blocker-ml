# Pagy Blocker ML - Machine Learning Components

Dieses Verzeichnis enthält alle Machine Learning-Komponenten für die automatische Ad- und Tracker-Erkennung in Pagy Blocker.

## 🧠 Übersicht

Das ML-System sammelt automatisch Daten über verdächtige Webelemente, analysiert sie und bereitet sie für das Training von ML-Modellen vor. Das System ist ähnlich zu Privacy Badger aufgebaut, aber mit verbesserter Technologie.

## 📁 Dateien

### Core Components
- `ml_data_processor.js` - Hauptprocessor für Feature-Extraktion und Datenverarbeitung
- `data_export.js` - Export-System für Trainingsdaten
- `export_cli.js` - Command-Line Interface für Datenexport

### Configuration
- `package.json` - Node.js Package-Konfiguration
- `README.md` - Diese Dokumentation

## 🚀 Installation

```bash
cd ml/
npm install
```

## 💻 Verwendung

### CLI Export Tool

```bash
# Interaktives CLI starten
node export_cli.js

# Oder mit npm
npm run export
```

### Programmatische Verwendung

```javascript
const MLDataProcessor = require('./ml_data_processor.js');
const DataExporter = require('./data_export.js');

// Datenverarbeitung
const processor = new MLDataProcessor();
const processedData = await processor.processRawData(rawData);

// Datenexport
const exporter = new DataExporter();
const result = await exporter.exportAllData('json');
```

## 🎯 Features

### Datensammlung
- **DOM-Analyse**: Erkennt verdächtige HTML-Elemente
- **Network-Monitoring**: Überwacht HTTP-Requests
- **Storage-Tracking**: Monitort Cookies und LocalStorage
- **Script-Analyse**: Analysiert Third-Party-Scripts
- **JavaScript-Verhalten**: Tracked verdächtige JS-Funktionen

### Feature-Extraktion
- **Geometrische Features**: Elementgröße, Position, Seitenverhältnis
- **URL-Pattern**: Domain-Analyse, Pfad-Patterns, Query-Parameter
- **Request-Fingerprinting**: Header-Analyse, Timing-Patterns
- **Content-Features**: Text-Analyse, HTML-Attribute
- **Behavioral Features**: Event-Tracking, Function-Calls

### Datenverarbeitung
- **Normalisierung**: Min-Max Scaling, Z-Score Normalisierung
- **Encoding**: Kategorische Variablen zu numerischen Werten
- **Labeling**: Automatische Label-Generierung mit Confidence-Scores
- **Balancing**: Sampling für ausgewogene Datensätze

### Export-Formate
- **JSON**: Strukturierte Daten für JavaScript/Python
- **CSV**: Tabellenformat für Excel/R/Python
- **TensorFlow.js**: Direktes Format für TensorFlow.js Training
- **NumPy**: Python-kompatibles Array-Format

## 📊 Datenstrukturen

### Rohdaten
```javascript
{
  type: 'dom_analysis',
  data: {
    features: {
      tagName: 'DIV',
      width: 300,
      height: 250,
      className: 'ad-banner',
      suspiciousScore: 0.85
    }
  },
  domain: 'example.com',
  timestamp: 1640995200000
}
```

### Verarbeitete Features
```javascript
{
  features: [
    300,      // width
    250,      // height 
    75000,    // area
    1.2,      // aspectRatio
    1,        // isVisible
    0,        // hasText
    1,        // hasClass
    0.85      // suspiciousScore
    // ... weitere Features
  ],
  label: 1,   // 0=legitimate, 1=ad, 2=tracker, 3=suspicious
  confidence: 0.85
}
```

## 🔧 Konfiguration

### Threshold-Werte
```javascript
// In ml_data_processor.js anpassen
const THRESHOLDS = {
  DOM_SUSPICIOUS: 0.5,
  NETWORK_SUSPICIOUS: 0.4,
  STORAGE_SUSPICIOUS: 0.7,
  SCRIPT_SUSPICIOUS: 0.6
};
```

### Export-Einstellungen
```javascript
// In data_export.js anpassen
const EXPORT_CONFIG = {
  MAX_SAMPLES: 5000,
  CLEANUP_AGE: 7 * 24 * 60 * 60 * 1000, // 7 Tage
  SAMPLE_SIZE: 1000
};
```

## 📈 Metriken

### Datenqualität
- **Accuracy**: Anteil korrekt klassifizierter Samples
- **Precision**: Anteil richtig positive von allen positiven Predictions
- **Recall**: Anteil richtig positive von allen tatsächlich positiven
- **F1-Score**: Harmonisches Mittel aus Precision und Recall

### Performance
- **Verarbeitungszeit**: Zeit für Feature-Extraktion
- **Speicherverbrauch**: RAM-Nutzung während Processing
- **Dateigröße**: Größe der exportierten Datensätze

## 🧪 Testing

```bash
# Datenqualität testen
node -e "
const processor = new (require('./ml_data_processor.js'))();
const testData = [{type: 'dom_analysis', data: {features: {suspiciousScore: 0.9}}}];
processor.processRawData(testData).then(result => {
  console.log('Test erfolgreich:', result.features.length > 0);
});
"

# Export testen
node -e "
const exporter = new (require('./data_export.js'))();
exporter.getDataOverview().then(overview => {
  console.log('Export-Test erfolgreich:', overview.totalSamples >= 0);
});
"
```

## 🔍 Debugging

### Logs aktivieren
```javascript
// In Extension Console
chrome.storage.local.get(null, data => {
  console.log('Alle ML-Daten:', data);
});

// Feature-Extraktion debuggen
const processor = new MLDataProcessor();
processor.debugMode = true;
```

### Dateninspektion
```bash
# CLI für Datenübersicht
node export_cli.js
# Option 1 wählen für Übersicht
```

## 📋 Roadmap

### Phase 1 ✅ (Aktuell)
- [x] Datensammlung-Framework
- [x] Feature-Extraktion
- [x] Export-System
- [x] CLI-Tool

### Phase 2 (Geplant)
- [ ] TensorFlow.js Integration
- [ ] Online-Learning
- [ ] Model-Training Pipeline
- [ ] Performance-Optimierung

### Phase 3 (Zukunft)
- [ ] AutoML für Hyperparameter-Tuning
- [ ] Federated Learning
- [ ] Real-time Model Updates
- [ ] A/B Testing Framework

## 🤝 Contributing

1. Fork das Repository
2. Erstelle Feature Branch: `git checkout -b feature/AmazingFeature`
3. Commit Changes: `git commit -m 'Add AmazingFeature'`
4. Push to Branch: `git push origin feature/AmazingFeature`
5. Öffne Pull Request

## 📄 License

MIT License - siehe [LICENSE](../LICENSE) für Details.

## 🆘 Support

- GitHub Issues: [Problem melden](https://github.com/rujbi/pagy-blocker/issues)
- Email: ml@pagy-blocker.com

---

**Entwickelt mit ❤️ für eine werbefreie Zukunft!**