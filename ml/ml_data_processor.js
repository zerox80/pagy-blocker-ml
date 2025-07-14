/**
 * ML Data Processor - Verarbeitet gesammelte Daten für Machine Learning
 * 
 * Dieses Modul nimmt die rohen Daten aus der Extension und bereitet sie
 * für das Training von ML-Modellen vor. Es extrahiert Features, 
 * normalisiert Daten und erstellt Trainingsdatensätze.
 */

class MLDataProcessor {
    constructor() {
        this.processedData = [];
        this.features = new Map();
        this.labels = new Map();
        this.statistics = {
            totalSamples: 0,
            adSamples: 0,
            legitimateSamples: 0,
            processingTime: 0
        };
    }

    // Hauptverarbeitungsfunction
    async processRawData(rawData) {
        const startTime = Date.now();
        
        try {
            // Daten nach Typ gruppieren
            const groupedData = this.groupDataByType(rawData);
            
            // Features für jede Gruppe extrahieren
            const extractedFeatures = await this.extractFeatures(groupedData);
            
            // Labels generieren
            const labeledData = this.generateLabels(extractedFeatures);
            
            // Daten normalisieren
            const normalizedData = this.normalizeData(labeledData);
            
            // Trainingsdatensatz erstellen
            const trainingDataset = this.createTrainingDataset(normalizedData);
            
            // Statistiken aktualisieren
            this.updateStatistics(trainingDataset, Date.now() - startTime);
            
            return trainingDataset;
            
        } catch (error) {
            console.error('Fehler bei ML-Datenverarbeitung:', error);
            throw error;
        }
    }

    // Gruppiert Daten nach Typ
    groupDataByType(rawData) {
        const groups = {
            dom_analysis: [],
            network_request: [],
            storage_operation: [],
            third_party_script: [],
            js_function_call: [],
            dom_event: [],
            timer: []
        };

        rawData.forEach(item => {
            if (groups[item.type]) {
                groups[item.type].push(item);
            }
        });

        return groups;
    }

    // Extrahiert Features aus gruppierten Daten
    async extractFeatures(groupedData) {
        const features = {};

        for (const [type, data] of Object.entries(groupedData)) {
            switch (type) {
                case 'dom_analysis':
                    features.domFeatures = this.extractDOMFeatures(data);
                    break;
                case 'network_request':
                    features.networkFeatures = this.extractNetworkFeatures(data);
                    break;
                case 'storage_operation':
                    features.storageFeatures = this.extractStorageFeatures(data);
                    break;
                case 'third_party_script':
                    features.scriptFeatures = this.extractScriptFeatures(data);
                    break;
                case 'js_function_call':
                    features.jsFeatures = this.extractJSFeatures(data);
                    break;
                case 'dom_event':
                    features.eventFeatures = this.extractEventFeatures(data);
                    break;
                case 'timer':
                    features.timerFeatures = this.extractTimerFeatures(data);
                    break;
            }
        }

        return features;
    }

    // Extrahiert DOM Features
    extractDOMFeatures(data) {
        const features = [];

        data.forEach(item => {
            const domData = item.data?.features;
            if (!domData) return;

            const feature = {
                // Geometrische Features
                width: domData.width || 0,
                height: domData.height || 0,
                area: (domData.width || 0) * (domData.height || 0),
                aspectRatio: domData.width && domData.height ? domData.width / domData.height : 0,
                
                // Position Features
                isVisible: domData.width > 0 && domData.height > 0,
                
                // Content Features
                hasText: domData.textContent && domData.textContent.length > 0,
                textLength: domData.textContent ? domData.textContent.length : 0,
                
                // Attribute Features
                hasId: domData.id && domData.id.length > 0,
                hasClass: domData.className && domData.className.length > 0,
                hasSrc: domData.src && domData.src.length > 0,
                hasHref: domData.href && domData.href.length > 0,
                
                // Tag Features
                tagName: domData.tagName || '',
                
                // Suspiciousness Score
                suspiciousScore: domData.suspiciousScore || 0,
                
                // Context Features
                domain: item.domain || '',
                timestamp: item.timestamp || Date.now()
            };

            // Zusätzliche berechnete Features
            feature.isAdSize = this.isCommonAdSize(feature.width, feature.height);
            feature.hasAdKeywords = this.hasAdKeywords(domData.className + ' ' + domData.id);
            feature.isInAdDomain = this.isAdDomain(feature.domain);

            features.push(feature);
        });

        return features;
    }

    // Extrahiert Network Features
    extractNetworkFeatures(data) {
        const features = [];

        data.forEach(item => {
            const networkData = item.data?.features;
            if (!networkData) return;

            const feature = {
                // URL Features
                urlLength: networkData.url ? networkData.url.length : 0,
                domainLength: networkData.domain ? networkData.domain.length : 0,
                pathLength: networkData.path ? networkData.path.length : 0,
                queryLength: networkData.queryParams ? networkData.queryParams.length : 0,
                
                // Domain Features
                domain: networkData.domain || '',
                tld: this.extractTLD(networkData.domain),
                subdomainCount: this.countSubdomains(networkData.domain),
                
                // Request Features
                method: networkData.method || 'GET',
                requestType: networkData.type || 'other',
                
                // Pattern Features
                hasTrackingParams: this.hasTrackingParams(networkData.queryParams),
                hasAdPath: this.hasAdPath(networkData.path),
                urlEntropy: this.calculateEntropy(networkData.url),
                
                // Suspiciousness Score
                suspiciousScore: networkData.suspiciousScore || 0,
                
                // Context Features
                referrer: item.data?.referrer || '',
                timestamp: item.timestamp || Date.now()
            };

            // Zusätzliche berechnete Features
            feature.isAdDomain = this.isAdDomain(feature.domain);
            feature.isTrackingRequest = this.isTrackingRequest(networkData);
            feature.isThirdParty = this.isThirdPartyRequest(item.domain, feature.domain);

            features.push(feature);
        });

        return features;
    }

    // Extrahiert Storage Features
    extractStorageFeatures(data) {
        const features = [];

        data.forEach(item => {
            const storageData = item.data?.features;
            if (!storageData) return;

            const feature = {
                // Storage Type
                storageType: storageData.storageType || 'unknown',
                operation: storageData.operation || 'unknown',
                
                // Key Features
                key: storageData.key || '',
                keyLength: storageData.key ? storageData.key.length : 0,
                
                // Value Features
                valueLength: storageData.valueLength || 0,
                
                // Pattern Features
                hasTrackingKey: this.hasTrackingKey(storageData.key),
                keyEntropy: this.calculateEntropy(storageData.key),
                
                // Suspiciousness Score
                suspiciousScore: storageData.suspiciousScore || 0,
                
                // Context Features
                domain: item.domain || '',
                timestamp: item.timestamp || Date.now()
            };

            features.push(feature);
        });

        return features;
    }

    // Extrahiert Script Features
    extractScriptFeatures(data) {
        const features = [];

        data.forEach(item => {
            const scriptData = item.data?.features;
            if (!scriptData) return;

            const feature = {
                // Script Source
                src: scriptData.src || '',
                domain: scriptData.domain || '',
                
                // Script Attributes
                isAsync: scriptData.async || false,
                isDefer: scriptData.defer || false,
                hasCrossOrigin: scriptData.crossOrigin || false,
                
                // Pattern Features
                srcLength: scriptData.src ? scriptData.src.length : 0,
                isAdScript: this.isAdScript(scriptData.src),
                isTrackingScript: this.isTrackingScript(scriptData.src),
                
                // Suspiciousness Score
                suspiciousScore: scriptData.suspiciousScore || 0,
                
                // Context Features
                loadingDomain: item.domain || '',
                timestamp: item.timestamp || Date.now()
            };

            // Zusätzliche berechnete Features
            feature.isThirdParty = this.isThirdPartyScript(item.domain, feature.domain);
            feature.isKnownAdProvider = this.isKnownAdProvider(feature.domain);

            features.push(feature);
        });

        return features;
    }

    // Extrahiert JS Features
    extractJSFeatures(data) {
        const features = [];

        data.forEach(item => {
            const jsData = item.data;
            if (!jsData) return;

            const feature = {
                // Function Info
                functionName: jsData.function || '',
                argCount: jsData.args || 0,
                
                // Timing
                timestamp: item.timestamp || Date.now(),
                
                // Context
                domain: item.domain || '',
                
                // Pattern Features
                isSuspiciousFunction: this.isSuspiciousFunction(jsData.function),
                hasStack: jsData.stack && jsData.stack.length > 0
            };

            features.push(feature);
        });

        return features;
    }

    // Extrahiert Event Features
    extractEventFeatures(data) {
        const features = [];

        data.forEach(item => {
            const eventData = item.data;
            if (!eventData) return;

            const feature = {
                // Event Info
                eventType: eventData.event || '',
                targetTag: eventData.target || '',
                targetClass: eventData.className || '',
                
                // Timing
                timestamp: item.timestamp || Date.now(),
                
                // Context
                domain: item.domain || '',
                
                // Pattern Features
                isAdEvent: this.isAdEvent(eventData.event, eventData.className)
            };

            features.push(feature);
        });

        return features;
    }

    // Extrahiert Timer Features
    extractTimerFeatures(data) {
        const features = [];

        data.forEach(item => {
            const timerData = item.data;
            if (!timerData) return;

            const feature = {
                // Timer Info
                timerType: timerData.type || '',
                delay: timerData.delay || 0,
                
                // Timing
                timestamp: item.timestamp || Date.now(),
                
                // Context
                domain: item.domain || '',
                
                // Pattern Features
                isLongDelay: timerData.delay > 10000,
                isShortDelay: timerData.delay < 100
            };

            features.push(feature);
        });

        return features;
    }

    // Generiert Labels für Features
    generateLabels(features) {
        const labeledData = [];

        for (const [featureType, featureList] of Object.entries(features)) {
            featureList.forEach(feature => {
                const label = this.determineLabel(feature, featureType);
                
                labeledData.push({
                    features: feature,
                    label: label,
                    type: featureType,
                    confidence: this.calculateLabelConfidence(feature, label)
                });
            });
        }

        return labeledData;
    }

    // Bestimmt Label für Feature
    determineLabel(feature, type) {
        switch (type) {
            case 'domFeatures':
                return this.labelDOMFeature(feature);
            case 'networkFeatures':
                return this.labelNetworkFeature(feature);
            case 'storageFeatures':
                return this.labelStorageFeature(feature);
            case 'scriptFeatures':
                return this.labelScriptFeature(feature);
            default:
                return this.labelGenericFeature(feature);
        }
    }

    // Labelt DOM Features
    labelDOMFeature(feature) {
        // Hohe Confidence für bekannte Ad-Größen
        if (feature.isAdSize && feature.hasAdKeywords) {
            return 'ad';
        }
        
        // Verdächtige Scores
        if (feature.suspiciousScore > 0.8) {
            return 'ad';
        }
        
        // Ad-Domains
        if (feature.isInAdDomain) {
            return 'ad';
        }
        
        // Default: legitimate
        return 'legitimate';
    }

    // Labelt Network Features
    labelNetworkFeature(feature) {
        // Bekannte Ad-Domains
        if (feature.isAdDomain) {
            return 'ad';
        }
        
        // Tracking Requests
        if (feature.isTrackingRequest) {
            return 'tracker';
        }
        
        // Hohe Suspiciousness Scores
        if (feature.suspiciousScore > 0.7) {
            return 'suspicious';
        }
        
        // Default: legitimate
        return 'legitimate';
    }

    // Labelt Storage Features
    labelStorageFeature(feature) {
        // Tracking Keys
        if (feature.hasTrackingKey) {
            return 'tracker';
        }
        
        // Hohe Suspiciousness Scores
        if (feature.suspiciousScore > 0.6) {
            return 'suspicious';
        }
        
        // Default: legitimate
        return 'legitimate';
    }

    // Labelt Script Features
    labelScriptFeature(feature) {
        // Bekannte Ad-Provider
        if (feature.isKnownAdProvider) {
            return 'ad';
        }
        
        // Tracking Scripts
        if (feature.isTrackingScript) {
            return 'tracker';
        }
        
        // Hohe Suspiciousness Scores
        if (feature.suspiciousScore > 0.5) {
            return 'suspicious';
        }
        
        // Default: legitimate
        return 'legitimate';
    }

    // Labelt Generic Features
    labelGenericFeature(feature) {
        if (feature.suspiciousScore > 0.7) {
            return 'suspicious';
        }
        
        return 'legitimate';
    }

    // Berechnet Label Confidence
    calculateLabelConfidence(feature, label) {
        // Confidence basierend auf Suspiciousness Score
        const scoreConfidence = feature.suspiciousScore || 0;
        
        // Zusätzliche Confidence-Faktoren
        let confidence = scoreConfidence;
        
        // Erhöhe Confidence für bekannte Patterns
        if (feature.isAdDomain || feature.isAdSize || feature.hasAdKeywords) {
            confidence += 0.2;
        }
        
        // Normalisiere auf 0-1 Bereich
        return Math.min(confidence, 1);
    }

    // Normalisiert Daten
    normalizeData(labeledData) {
        const normalizedData = [];

        labeledData.forEach(item => {
            const normalizedFeatures = this.normalizeFeatures(item.features, item.type);
            
            normalizedData.push({
                features: normalizedFeatures,
                label: item.label,
                type: item.type,
                confidence: item.confidence
            });
        });

        return normalizedData;
    }

    // Normalisiert Features
    normalizeFeatures(features, type) {
        const normalized = { ...features };

        // Numerische Features normalisieren
        const numericFields = ['width', 'height', 'area', 'aspectRatio', 'urlLength', 'domainLength', 'pathLength', 'queryLength', 'suspiciousScore'];

        numericFields.forEach(field => {
            if (normalized[field] !== undefined) {
                normalized[field] = this.normalizeValue(normalized[field], field);
            }
        });

        // Kategorische Features zu Numbers
        if (normalized.tagName) {
            normalized.tagNameEncoded = this.encodeTag(normalized.tagName);
        }

        if (normalized.method) {
            normalized.methodEncoded = this.encodeMethod(normalized.method);
        }

        return normalized;
    }

    // Normalisiert einzelne Werte
    normalizeValue(value, field) {
        // Einfache Min-Max Normalisierung
        const ranges = {
            width: [0, 2000],
            height: [0, 2000],
            area: [0, 4000000],
            aspectRatio: [0, 10],
            urlLength: [0, 1000],
            domainLength: [0, 100],
            pathLength: [0, 500],
            queryLength: [0, 500],
            suspiciousScore: [0, 1]
        };

        const range = ranges[field];
        if (!range) return value;

        const [min, max] = range;
        return (value - min) / (max - min);
    }

    // Kodiert Tag Namen
    encodeTag(tagName) {
        const tagMap = {
            'DIV': 1, 'SPAN': 2, 'IMG': 3, 'A': 4, 'SCRIPT': 5,
            'IFRAME': 6, 'VIDEO': 7, 'CANVAS': 8, 'SVG': 9, 'OBJECT': 10
        };
        
        return tagMap[tagName.toUpperCase()] || 0;
    }

    // Kodiert HTTP Methods
    encodeMethod(method) {
        const methodMap = {
            'GET': 1, 'POST': 2, 'PUT': 3, 'DELETE': 4, 'OPTIONS': 5
        };
        
        return methodMap[method.toUpperCase()] || 0;
    }

    // Erstellt Trainingsdatensatz
    createTrainingDataset(normalizedData) {
        const dataset = {
            features: [],
            labels: [],
            metadata: {
                createdAt: Date.now(),
                sampleCount: normalizedData.length,
                featureCount: 0,
                labelDistribution: {}
            }
        };

        normalizedData.forEach(item => {
            // Features als Array
            const featureArray = this.featuresToArray(item.features);
            dataset.features.push(featureArray);
            
            // Labels als kategoriale Werte
            const labelEncoded = this.encodeLabel(item.label);
            dataset.labels.push(labelEncoded);
            
            // Label-Verteilung
            if (!dataset.metadata.labelDistribution[item.label]) {
                dataset.metadata.labelDistribution[item.label] = 0;
            }
            dataset.metadata.labelDistribution[item.label]++;
        });

        dataset.metadata.featureCount = dataset.features.length > 0 ? dataset.features[0].length : 0;

        return dataset;
    }

    // Konvertiert Features zu Array
    featuresToArray(features) {
        const featureArray = [];
        
        // Numerische Features
        const numericFields = [
            'width', 'height', 'area', 'aspectRatio', 'urlLength', 'domainLength', 
            'pathLength', 'queryLength', 'suspiciousScore', 'textLength', 'keyLength',
            'valueLength', 'srcLength', 'argCount', 'delay', 'subdomainCount', 'urlEntropy'
        ];

        numericFields.forEach(field => {
            featureArray.push(features[field] || 0);
        });

        // Boolean Features
        const booleanFields = [
            'isVisible', 'hasText', 'hasId', 'hasClass', 'hasSrc', 'hasHref',
            'isAdSize', 'hasAdKeywords', 'isInAdDomain', 'hasTrackingParams',
            'hasAdPath', 'isAdDomain', 'isTrackingRequest', 'isThirdParty',
            'hasTrackingKey', 'isAsync', 'isDefer', 'hasCrossOrigin', 'isAdScript',
            'isTrackingScript', 'isKnownAdProvider', 'isSuspiciousFunction',
            'hasStack', 'isAdEvent', 'isLongDelay', 'isShortDelay'
        ];

        booleanFields.forEach(field => {
            featureArray.push(features[field] ? 1 : 0);
        });

        // Kodierte Features
        const encodedFields = ['tagNameEncoded', 'methodEncoded'];
        encodedFields.forEach(field => {
            featureArray.push(features[field] || 0);
        });

        return featureArray;
    }

    // Kodiert Labels
    encodeLabel(label) {
        const labelMap = {
            'legitimate': 0,
            'ad': 1,
            'tracker': 2,
            'suspicious': 3
        };
        
        return labelMap[label] || 0;
    }

    // Aktualisiert Statistiken
    updateStatistics(dataset, processingTime) {
        this.statistics.totalSamples = dataset.metadata.sampleCount;
        this.statistics.adSamples = dataset.metadata.labelDistribution['ad'] || 0;
        this.statistics.legitimateSamples = dataset.metadata.labelDistribution['legitimate'] || 0;
        this.statistics.processingTime = processingTime;
    }

    // Hilfsfunktionen
    isCommonAdSize(width, height) {
        const adSizes = [
            [300, 250], [728, 90], [320, 50], [160, 600], [320, 100],
            [300, 600], [320, 480], [468, 60], [234, 60], [125, 125]
        ];
        
        return adSizes.some(([w, h]) => width === w && height === h);
    }

    hasAdKeywords(text) {
        const adKeywords = ['ad', 'banner', 'promo', 'sponsor', 'advertisement', 'adsense'];
        return adKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }

    isAdDomain(domain) {
        const adDomains = [
            'doubleclick.net', 'googlesyndication.com', 'adsystem.google.com',
            'amazon-adsystem.com', 'googletagmanager.com', 'googletagservices.com',
            'facebook.com', 'analytics.google.com'
        ];
        
        return adDomains.some(adDomain => domain.includes(adDomain));
    }

    extractTLD(domain) {
        if (!domain) return '';
        const parts = domain.split('.');
        return parts[parts.length - 1];
    }

    countSubdomains(domain) {
        if (!domain) return 0;
        const parts = domain.split('.');
        return Math.max(0, parts.length - 2);
    }

    hasTrackingParams(queryString) {
        const trackingParams = ['utm_', 'gclid', 'fbclid', 'ref=', 'src=', 'campaign='];
        return trackingParams.some(param => queryString && queryString.includes(param));
    }

    hasAdPath(path) {
        const adPaths = ['/ads/', '/ad/', '/banner/', '/promo/', '/sponsor/', '/track/', '/analytics/', '/pixel/'];
        return adPaths.some(adPath => path && path.includes(adPath));
    }

    calculateEntropy(str) {
        if (!str) return 0;
        
        const frequencies = {};
        for (const char of str) {
            frequencies[char] = (frequencies[char] || 0) + 1;
        }
        
        let entropy = 0;
        const length = str.length;
        
        for (const char in frequencies) {
            const p = frequencies[char] / length;
            entropy -= p * Math.log2(p);
        }
        
        return entropy;
    }

    isTrackingRequest(networkData) {
        return networkData.type === 'ping' || networkData.type === 'beacon' || 
               this.hasTrackingParams(networkData.queryParams);
    }

    isThirdPartyRequest(firstPartyDomain, requestDomain) {
        return firstPartyDomain !== requestDomain;
    }

    hasTrackingKey(key) {
        const trackingKeys = ['_ga', '_gid', '_fbp', '_gcl_', 'utm_', 'ad_', 'track_'];
        return trackingKeys.some(trackingKey => key && key.includes(trackingKey));
    }

    isAdScript(src) {
        const adScriptPatterns = ['ads.js', 'adsense', 'doubleclick', 'googlesyndication'];
        return adScriptPatterns.some(pattern => src && src.includes(pattern));
    }

    isTrackingScript(src) {
        const trackingPatterns = ['analytics', 'gtag', 'gtm', 'track'];
        return trackingPatterns.some(pattern => src && src.includes(pattern));
    }

    isThirdPartyScript(hostDomain, scriptDomain) {
        return hostDomain !== scriptDomain;
    }

    isKnownAdProvider(domain) {
        const adProviders = [
            'googlesyndication.com', 'doubleclick.net', 'amazon-adsystem.com',
            'facebook.com', 'googletagmanager.com', 'googletagservices.com'
        ];
        
        return adProviders.some(provider => domain.includes(provider));
    }

    isSuspiciousFunction(functionName) {
        const suspiciousFunctions = ['eval', 'Function', 'setTimeout', 'setInterval'];
        return suspiciousFunctions.includes(functionName);
    }

    isAdEvent(eventType, className) {
        const adEvents = ['click', 'mouseover'];
        const adClasses = ['ad', 'banner', 'promo'];
        
        return adEvents.includes(eventType) && 
               adClasses.some(cls => className && className.includes(cls));
    }

    // Exportiert Trainingsdaten
    exportTrainingData(dataset, format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(dataset, null, 2);
            case 'csv':
                return this.toCSV(dataset);
            default:
                return dataset;
        }
    }

    // Konvertiert zu CSV
    toCSV(dataset) {
        const headers = ['features', 'label'];
        const rows = [];

        dataset.features.forEach((features, index) => {
            const row = [features.join(','), dataset.labels[index]];
            rows.push(row.join(','));
        });

        return [headers.join(','), ...rows].join('\n');
    }

    // Gibt Statistiken zurück
    getStatistics() {
        return { ...this.statistics };
    }
}

// Export für Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MLDataProcessor;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.MLDataProcessor = MLDataProcessor;
}