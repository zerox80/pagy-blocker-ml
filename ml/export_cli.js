#!/usr/bin/env node

/**
 * CLI Tool für ML-Datenexport
 * 
 * Einfaches Command-Line Interface zum Exportieren der ML-Daten
 * aus der Pagy Blocker Extension.
 * 
 * Usage: node export_cli.js [options]
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Simuliere Chrome API für CLI-Umgebung
const chrome = {
    storage: {
        local: {
            get: (keys, callback) => {
                // Lade Daten aus lokaler Datei (Mock für CLI)
                const dataPath = path.join(__dirname, '..', 'data', 'ml_storage.json');
                
                if (fs.existsSync(dataPath)) {
                    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                    callback(data);
                } else {
                    callback({});
                }
            },
            remove: (keys, callback) => {
                console.log('🗑️ Daten entfernt:', keys.length);
                callback();
            }
        }
    }
};

// Mache Chrome API global verfügbar
global.chrome = chrome;

// Lade ML-Module
const MLDataProcessor = require('./ml_data_processor.js');
const DataExporter = require('./data_export.js');

class ExportCLI {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.exporter = new DataExporter();
        this.processor = new MLDataProcessor();
    }

    // Startet CLI
    async start() {
        console.log('🚀 Pagy Blocker ML Data Export Tool');
        console.log('=====================================\n');
        
        await this.showMainMenu();
    }

    // Zeigt Hauptmenü
    async showMainMenu() {
        console.log('Verfügbare Optionen:');
        console.log('1. 📊 Datenübersicht anzeigen');
        console.log('2. 📁 Alle Daten exportieren');
        console.log('3. 🎯 Daten nach Typ exportieren');
        console.log('4. 🏷️ Annotation-Daten exportieren');
        console.log('5. ⚖️ Balancierten Datensatz exportieren');
        console.log('6. 🗑️ Alte Daten bereinigen');
        console.log('7. ❌ Beenden\n');
        
        const choice = await this.askQuestion('Wähle eine Option (1-7): ');
        
        switch (choice) {
            case '1':
                await this.showDataOverview();
                break;
            case '2':
                await this.exportAllData();
                break;
            case '3':
                await this.exportByType();
                break;
            case '4':
                await this.exportAnnotationData();
                break;
            case '5':
                await this.exportBalancedDataset();
                break;
            case '6':
                await this.cleanupOldData();
                break;
            case '7':
                console.log('👋 Auf Wiedersehen!');
                this.rl.close();
                return;
            default:
                console.log('❌ Ungültige Option. Bitte wähle 1-7.');
                await this.showMainMenu();
        }
    }

    // Zeigt Datenübersicht
    async showDataOverview() {
        console.log('\n📊 Lade Datenübersicht...');
        
        const overview = await this.exporter.getDataOverview();
        
        if (!overview) {
            console.log('❌ Keine Daten verfügbar.');
            await this.returnToMenu();
            return;
        }
        
        console.log('\n=== DATENÜBERSICHT ===');
        console.log(`📈 Gesamtanzahl Samples: ${overview.totalSamples}`);
        console.log(`🔍 Verdächtige Samples: ${overview.suspicious}`);
        console.log(`✅ Legitime Samples: ${overview.legitimate}`);
        
        console.log('\n📋 Datentypen:');
        for (const [type, count] of Object.entries(overview.dataTypes)) {
            console.log(`  • ${type}: ${count}`);
        }
        
        console.log('\n🌐 Top Domains:');
        const topDomains = Object.entries(overview.domains)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        for (const [domain, count] of topDomains) {
            console.log(`  • ${domain}: ${count}`);
        }
        
        if (overview.timeRange.oldest && overview.timeRange.newest) {
            console.log('\n⏰ Zeitbereich:');
            console.log(`  • Ältester Eintrag: ${new Date(overview.timeRange.oldest).toLocaleString()}`);
            console.log(`  • Neuester Eintrag: ${new Date(overview.timeRange.newest).toLocaleString()}`);
        }
        
        await this.returnToMenu();
    }

    // Exportiert alle Daten
    async exportAllData() {
        console.log('\n📁 Exportiere alle Daten...');
        
        const format = await this.askQuestion('Format (json/csv/tensorflow/numpy): ');
        
        if (!['json', 'csv', 'tensorflow', 'numpy'].includes(format)) {
            console.log('❌ Ungültiges Format. Unterstützt: json, csv, tensorflow, numpy');
            await this.returnToMenu();
            return;
        }
        
        const result = await this.exporter.exportAllData(format);
        
        if (result.success) {
            console.log('✅ Export erfolgreich!');
            console.log(`📊 Exportierte Samples: ${result.stats.totalSamples}`);
            console.log(`⏱️ Verarbeitungszeit: ${result.stats.exportTime}ms`);
            console.log(`📦 Dateigröße: ${(result.stats.fileSize / 1024).toFixed(2)} KB`);
            
            // Speichere in Datei
            const filename = `ml_export_${Date.now()}.${format}`;
            fs.writeFileSync(filename, result.data);
            console.log(`💾 Gespeichert als: ${filename}`);
        } else {
            console.log('❌ Export fehlgeschlagen:', result.error);
        }
        
        await this.returnToMenu();
    }

    // Exportiert nach Typ
    async exportByType() {
        console.log('\n🎯 Exportiere nach Datentyp...');
        
        const types = [
            'dom_analysis',
            'network_request', 
            'storage_operation',
            'third_party_script',
            'js_function_call',
            'dom_event',
            'timer'
        ];
        
        console.log('Verfügbare Typen:');
        types.forEach((type, index) => {
            console.log(`${index + 1}. ${type}`);
        });
        
        const choice = await this.askQuestion('Wähle Typ (1-7): ');
        const typeIndex = parseInt(choice) - 1;
        
        if (typeIndex < 0 || typeIndex >= types.length) {
            console.log('❌ Ungültiger Typ.');
            await this.returnToMenu();
            return;
        }
        
        const dataType = types[typeIndex];
        const format = await this.askQuestion('Format (json/csv/tensorflow/numpy): ');
        
        if (!['json', 'csv', 'tensorflow', 'numpy'].includes(format)) {
            console.log('❌ Ungültiges Format.');
            await this.returnToMenu();
            return;
        }
        
        const result = await this.exporter.exportByType(dataType, format);
        
        if (result.success) {
            console.log('✅ Export erfolgreich!');
            console.log(`📊 Exportierte Samples: ${result.count}`);
            
            const filename = `ml_export_${dataType}_${Date.now()}.${format}`;
            fs.writeFileSync(filename, result.data);
            console.log(`💾 Gespeichert als: ${filename}`);
        } else {
            console.log('❌ Export fehlgeschlagen:', result.error);
        }
        
        await this.returnToMenu();
    }

    // Exportiert Annotation-Daten
    async exportAnnotationData() {
        console.log('\n🏷️ Exportiere Annotation-Daten...');
        
        const format = await this.askQuestion('Format (json/csv): ');
        
        if (!['json', 'csv'].includes(format)) {
            console.log('❌ Ungültiges Format. Unterstützt: json, csv');
            await this.returnToMenu();
            return;
        }
        
        const result = await this.exporter.exportForAnnotation(format);
        
        if (result.success) {
            console.log('✅ Export erfolgreich!');
            console.log(`📊 Exportierte Samples: ${result.count}`);
            
            const filename = `ml_annotation_${Date.now()}.${format}`;
            fs.writeFileSync(filename, result.data);
            console.log(`💾 Gespeichert als: ${filename}`);
            console.log('💡 Tipp: Diese Datei kann für manuelle Annotation verwendet werden.');
        } else {
            console.log('❌ Export fehlgeschlagen:', result.error);
        }
        
        await this.returnToMenu();
    }

    // Exportiert balancierten Datensatz
    async exportBalancedDataset() {
        console.log('\n⚖️ Exportiere balancierten Datensatz...');
        
        const sampleSize = await this.askQuestion('Gesamtanzahl Samples (default: 1000): ');
        const size = parseInt(sampleSize) || 1000;
        
        const format = await this.askQuestion('Format (json/csv/tensorflow/numpy): ');
        
        if (!['json', 'csv', 'tensorflow', 'numpy'].includes(format)) {
            console.log('❌ Ungültiges Format.');
            await this.returnToMenu();
            return;
        }
        
        const result = await this.exporter.exportBalancedDataset(size, format);
        
        if (result.success) {
            console.log('✅ Export erfolgreich!');
            console.log(`📊 Exportierte Samples: ${result.count}`);
            console.log('📈 Verteilung:');
            
            for (const [label, count] of Object.entries(result.distribution)) {
                console.log(`  • ${label}: ${count}`);
            }
            
            const filename = `ml_balanced_${Date.now()}.${format}`;
            fs.writeFileSync(filename, result.data);
            console.log(`💾 Gespeichert als: ${filename}`);
        } else {
            console.log('❌ Export fehlgeschlagen:', result.error);
        }
        
        await this.returnToMenu();
    }

    // Bereinigt alte Daten
    async cleanupOldData() {
        console.log('\n🗑️ Bereinige alte Daten...');
        
        const days = await this.askQuestion('Maximales Alter in Tagen (default: 7): ');
        const maxAge = (parseInt(days) || 7) * 24 * 60 * 60 * 1000;
        
        const removedCount = await this.exporter.cleanupOldData(maxAge);
        
        console.log(`✅ ${removedCount} alte Datensätze entfernt.`);
        
        await this.returnToMenu();
    }

    // Kehrt zum Hauptmenü zurück
    async returnToMenu() {
        console.log('\n---');
        await this.askQuestion('Drücke Enter um zum Hauptmenü zurückzukehren...');
        console.clear();
        await this.showMainMenu();
    }

    // Stellt eine Frage und wartet auf Antwort
    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }

    // Beendet CLI
    close() {
        this.rl.close();
    }
}

// Startet CLI nur wenn direkt aufgerufen
if (require.main === module) {
    const cli = new ExportCLI();
    
    cli.start().catch(error => {
        console.error('❌ Fehler beim Start:', error);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Auf Wiedersehen!');
        cli.close();
        process.exit(0);
    });
}

module.exports = ExportCLI;