/**
 * Data Export System - Exportiert ML-Daten für Training
 * 
 * Dieses System holt die gesammelten ML-Daten aus dem Chrome Storage
 * und exportiert sie in verschiedenen Formaten für das Training.
 */

class DataExporter {
    constructor() {
        this.exportedData = [];
        this.exportStats = {
            totalSamples: 0,
            exportTime: 0,
            dataTypes: {},
            fileSize: 0
        };
    }

    // Exportiert alle ML-Daten
    async exportAllData(format = 'json') {
        const startTime = Date.now();
        
        try {
            // Hole alle ML-Daten aus Chrome Storage
            const rawData = await this.getAllMLData();
            
            // Verarbeite Daten mit ML Data Processor
            const processor = new MLDataProcessor();
            const processedData = await processor.processRawData(rawData);
            
            // Exportiere in gewünschtem Format
            const exportedData = this.formatData(processedData, format);
            
            // Aktualisiere Statistiken
            this.updateExportStats(processedData, Date.now() - startTime, format);
            
            // Speichere Export-Datei
            await this.saveExportFile(exportedData, format);
            
            console.log(`✅ ML-Daten exportiert: ${this.exportStats.totalSamples} Samples`);
            
            return {
                success: true,
                data: exportedData,
                stats: this.exportStats
            };
            
        } catch (error) {
            console.error('❌ Fehler beim Datenexport:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Holt alle ML-Daten aus Chrome Storage
    async getAllMLData() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(null, (items) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                
                const mlData = [];
                
                // Filtere ML-Daten
                for (const [key, value] of Object.entries(items)) {
                    if (key.startsWith('ml_data_')) {
                        if (Array.isArray(value)) {
                            mlData.push(...value);
                        } else if (typeof value === 'object' && value !== null) {
                            // Verarbeite gruppierte Daten
                            for (const [groupKey, groupData] of Object.entries(value)) {
                                if (Array.isArray(groupData)) {
                                    mlData.push(...groupData);
                                }
                            }
                        }
                    }
                }
                
                resolve(mlData);
            });
        });
    }

    // Formatiert Daten für Export
    formatData(processedData, format) {
        switch (format) {
            case 'json':
                return JSON.stringify(processedData, null, 2);
            case 'csv':
                return this.toCSV(processedData);
            case 'tensorflow':
                return this.toTensorFlowFormat(processedData);
            case 'numpy':
                return this.toNumPyFormat(processedData);
            default:
                return processedData;
        }
    }

    // Konvertiert zu CSV
    toCSV(data) {
        if (!data.features || data.features.length === 0) {
            return '';
        }

        const headers = [];
        const featureCount = data.features[0].length;
        
        // Feature Headers
        for (let i = 0; i < featureCount; i++) {
            headers.push(`feature_${i}`);
        }
        headers.push('label');
        
        const rows = [headers.join(',')];
        
        // Data Rows
        data.features.forEach((features, index) => {
            const row = [...features, data.labels[index]];
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }

    // Konvertiert zu TensorFlow.js Format
    toTensorFlowFormat(data) {
        return {
            features: data.features,
            labels: data.labels,
            metadata: {
                ...data.metadata,
                format: 'tensorflow',
                shape: {
                    features: [data.features.length, data.features[0]?.length || 0],
                    labels: [data.labels.length]
                }
            }
        };
    }

    // Konvertiert zu NumPy-ähnlichem Format
    toNumPyFormat(data) {
        return {
            X: data.features,
            y: data.labels,
            feature_names: this.generateFeatureNames(data.features[0]?.length || 0),
            target_names: ['legitimate', 'ad', 'tracker', 'suspicious'],
            metadata: data.metadata
        };
    }

    // Generiert Feature Namen
    generateFeatureNames(featureCount) {
        const baseNames = [
            'width', 'height', 'area', 'aspectRatio', 'urlLength', 'domainLength',
            'pathLength', 'queryLength', 'suspiciousScore', 'textLength', 'keyLength',
            'valueLength', 'srcLength', 'argCount', 'delay', 'subdomainCount', 'urlEntropy',
            'isVisible', 'hasText', 'hasId', 'hasClass', 'hasSrc', 'hasHref',
            'isAdSize', 'hasAdKeywords', 'isInAdDomain', 'hasTrackingParams',
            'hasAdPath', 'isAdDomain', 'isTrackingRequest', 'isThirdParty',
            'hasTrackingKey', 'isAsync', 'isDefer', 'hasCrossOrigin', 'isAdScript',
            'isTrackingScript', 'isKnownAdProvider', 'isSuspiciousFunction',
            'hasStack', 'isAdEvent', 'isLongDelay', 'isShortDelay',
            'tagNameEncoded', 'methodEncoded'
        ];

        const names = [];
        for (let i = 0; i < featureCount; i++) {
            names.push(baseNames[i] || `feature_${i}`);
        }
        
        return names;
    }

    // Speichert Export-Datei
    async saveExportFile(data, format) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `ml_training_data_${timestamp}.${format}`;
        
        try {
            // Für Browser-Umgebung: Download-Link erstellen
            if (typeof document !== 'undefined') {
                const blob = new Blob([data], { 
                    type: this.getMimeType(format) 
                });
                
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.click();
                
                URL.revokeObjectURL(url);
            }
            
            // Für Node.js-Umgebung: Datei schreiben
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                fs.writeFileSync(filename, data);
            }
            
            console.log(`📁 Export-Datei gespeichert: ${filename}`);
            
        } catch (error) {
            console.error('❌ Fehler beim Speichern:', error);
        }
    }

    // Gibt MIME-Type für Format zurück
    getMimeType(format) {
        const mimeTypes = {
            'json': 'application/json',
            'csv': 'text/csv',
            'tensorflow': 'application/json',
            'numpy': 'application/json'
        };
        
        return mimeTypes[format] || 'text/plain';
    }

    // Aktualisiert Export-Statistiken
    updateExportStats(data, exportTime, format) {
        this.exportStats = {
            totalSamples: data.features?.length || 0,
            exportTime: exportTime,
            dataTypes: data.metadata?.labelDistribution || {},
            fileSize: JSON.stringify(data).length,
            format: format,
            timestamp: Date.now()
        };
    }

    // Exportiert Daten für spezifischen Typ
    async exportByType(dataType, format = 'json') {
        try {
            const allData = await this.getAllMLData();
            const filteredData = allData.filter(item => item.type === dataType);
            
            const processor = new MLDataProcessor();
            const processedData = await processor.processRawData(filteredData);
            
            const exportedData = this.formatData(processedData, format);
            
            console.log(`📊 ${dataType} Daten exportiert: ${filteredData.length} Samples`);
            
            return {
                success: true,
                data: exportedData,
                type: dataType,
                count: filteredData.length
            };
            
        } catch (error) {
            console.error(`❌ Fehler beim Export von ${dataType}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Exportiert nur Labels für Annotation
    async exportForAnnotation(format = 'json') {
        try {
            const allData = await this.getAllMLData();
            
            const annotationData = allData.map(item => ({
                id: item.timestamp || Date.now(),
                type: item.type,
                data: item.data,
                domain: item.domain,
                url: item.url,
                suggested_label: this.suggestLabel(item),
                confidence: item.data?.features?.suspiciousScore || 0,
                human_label: null,
                notes: ''
            }));
            
            const exportedData = this.formatData(annotationData, format);
            
            console.log(`🏷️ Annotation-Daten exportiert: ${annotationData.length} Samples`);
            
            return {
                success: true,
                data: exportedData,
                count: annotationData.length
            };
            
        } catch (error) {
            console.error('❌ Fehler beim Annotation-Export:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Schlägt Label vor basierend auf Heuristiken
    suggestLabel(item) {
        const features = item.data?.features;
        if (!features) return 'unknown';
        
        const score = features.suspiciousScore || 0;
        
        if (score > 0.8) return 'ad';
        if (score > 0.6) return 'tracker';
        if (score > 0.4) return 'suspicious';
        
        return 'legitimate';
    }

    // Erstellt Datensampling für Balancing
    async exportBalancedDataset(sampleSize = 1000, format = 'json') {
        try {
            const allData = await this.getAllMLData();
            
            // Gruppiere nach vorgeschlagenen Labels
            const grouped = {};
            allData.forEach(item => {
                const label = this.suggestLabel(item);
                if (!grouped[label]) grouped[label] = [];
                grouped[label].push(item);
            });
            
            // Sampling für balancierte Datensätze
            const balancedData = [];
            const samplesPerClass = Math.floor(sampleSize / Object.keys(grouped).length);
            
            for (const [label, items] of Object.entries(grouped)) {
                const sampled = this.randomSample(items, samplesPerClass);
                balancedData.push(...sampled);
            }
            
            // Shuffle
            const shuffled = this.shuffleArray(balancedData);
            
            const processor = new MLDataProcessor();
            const processedData = await processor.processRawData(shuffled);
            
            const exportedData = this.formatData(processedData, format);
            
            console.log(`⚖️ Balancierter Datensatz exportiert: ${shuffled.length} Samples`);
            
            return {
                success: true,
                data: exportedData,
                count: shuffled.length,
                distribution: Object.fromEntries(
                    Object.entries(grouped).map(([label, items]) => [
                        label, 
                        Math.min(samplesPerClass, items.length)
                    ])
                )
            };
            
        } catch (error) {
            console.error('❌ Fehler beim balancierten Export:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Zufälliges Sampling
    randomSample(array, n) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
    }

    // Shuffelt Array
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Bereinigt alte Daten
    async cleanupOldData(maxAge = 7 * 24 * 60 * 60 * 1000) {
        return new Promise((resolve) => {
            chrome.storage.local.get(null, (items) => {
                const cutoff = Date.now() - maxAge;
                const keysToRemove = [];
                
                for (const key in items) {
                    if (key.startsWith('ml_data_')) {
                        const timestamp = parseInt(key.split('_')[2]);
                        if (timestamp < cutoff) {
                            keysToRemove.push(key);
                        }
                    }
                }
                
                if (keysToRemove.length > 0) {
                    chrome.storage.local.remove(keysToRemove, () => {
                        console.log(`🗑️ ${keysToRemove.length} alte Datensätze entfernt`);
                        resolve(keysToRemove.length);
                    });
                } else {
                    resolve(0);
                }
            });
        });
    }

    // Gibt Export-Statistiken zurück
    getExportStats() {
        return { ...this.exportStats };
    }

    // Gibt Datenübersicht zurück
    async getDataOverview() {
        try {
            const allData = await this.getAllMLData();
            
            const overview = {
                totalSamples: allData.length,
                dataTypes: {},
                domains: {},
                timeRange: {
                    oldest: null,
                    newest: null
                },
                suspicious: 0,
                legitimate: 0
            };
            
            allData.forEach(item => {
                // Zähle Datentypen
                overview.dataTypes[item.type] = (overview.dataTypes[item.type] || 0) + 1;
                
                // Zähle Domains
                if (item.domain) {
                    overview.domains[item.domain] = (overview.domains[item.domain] || 0) + 1;
                }
                
                // Zeitbereich
                const timestamp = item.timestamp || Date.now();
                if (!overview.timeRange.oldest || timestamp < overview.timeRange.oldest) {
                    overview.timeRange.oldest = timestamp;
                }
                if (!overview.timeRange.newest || timestamp > overview.timeRange.newest) {
                    overview.timeRange.newest = timestamp;
                }
                
                // Suspiciousness
                const score = item.data?.features?.suspiciousScore || 0;
                if (score > 0.5) {
                    overview.suspicious++;
                } else {
                    overview.legitimate++;
                }
            });
            
            return overview;
            
        } catch (error) {
            console.error('❌ Fehler bei Datenübersicht:', error);
            return null;
        }
    }
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.DataExporter = DataExporter;
}

// Export für Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataExporter;
}