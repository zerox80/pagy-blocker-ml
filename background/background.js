/**
 * background.js - Service Worker für Pagy Blocker + ML Data Processing
 * 
 * Das ist das Herzstück der Extension - läuft im Hintergrund und macht die ganze Magie.
 * Hab versucht alles schnell zu halten, weil niemand Lust auf langsame Extensions hat.
 * 
 * Was hier passiert:
 * - Verwaltet die Filterregeln (statisch, damit's schnell geht)
 * - Reagiert auf Nachrichten vom Popup
 * - Speichert welche Domains deaktiviert sind
 * + ML Data Collection und Processing
 * + Network Request Interception für Features
 * + URL-Pattern Analysis
 * + Request Fingerprinting
 */

// ML Data Processing System
const MLDataProcessor = {
    trainingData: [],
    featureCache: new Map(),
    
    // Initialize ML systems
    init() {
        this.initNetworkInterception();
        this.initDataProcessor();
        this.initFeatureExtraction();
        
        // Cleanup old data periodically
        setInterval(() => this.cleanupOldData(), 300000); // 5 minutes
    },
    
    // Network Request Interception
    initNetworkInterception() {
        // Listen for network requests using declarativeNetRequest
        chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((details) => {
            if (details.request) {
                this.processNetworkRequest(details.request);
            }
        });
        
        // Listen for completed requests
        chrome.webRequest.onCompleted.addListener(
            (details) => {
                this.processCompletedRequest(details);
            },
            { urls: ["<all_urls>"] },
            ["responseHeaders"]
        );
        
        // Listen for requests before they're sent
        chrome.webRequest.onBeforeSendHeaders.addListener(
            (details) => {
                this.analyzeRequestHeaders(details);
            },
            { urls: ["<all_urls>"] },
            ["requestHeaders"]
        );
    },
    
    // Process network requests for ML features
    processNetworkRequest(request) {
        const features = this.extractNetworkFeatures(request);
        
        if (features.suspiciousScore > 0.3) {
            this.storeTrainingData('network_intercept', {
                url: request.url,
                method: request.method,
                type: request.type,
                features: features,
                timestamp: Date.now()
            });
        }
    },
    
    // Process completed requests
    processCompletedRequest(details) {
        const features = this.extractResponseFeatures(details);
        
        if (features.suspiciousScore > 0.3) {
            this.storeTrainingData('response_analysis', {
                url: details.url,
                statusCode: details.statusCode,
                responseHeaders: details.responseHeaders,
                features: features,
                timestamp: Date.now()
            });
        }
    },
    
    // Analyze request headers
    analyzeRequestHeaders(details) {
        const features = this.extractHeaderFeatures(details);
        
        if (features.suspiciousScore > 0.3) {
            this.storeTrainingData('header_analysis', {
                url: details.url,
                requestHeaders: details.requestHeaders,
                features: features,
                timestamp: Date.now()
            });
        }
    },
    
    // Extract network features for ML
    extractNetworkFeatures(request) {
        const features = {
            url: request.url,
            domain: this.extractDomain(request.url),
            path: this.extractPath(request.url),
            method: request.method,
            type: request.type,
            queryParams: this.extractQueryParams(request.url),
            suspiciousScore: 0
        };
        
        // Calculate suspiciousness
        features.suspiciousScore = this.calculateNetworkSuspiciousness(features);
        
        return features;
    },
    
    // Extract response features
    extractResponseFeatures(details) {
        const features = {
            url: details.url,
            statusCode: details.statusCode,
            responseSize: details.responseHeaders?.find(h => h.name.toLowerCase() === 'content-length')?.value || 0,
            contentType: details.responseHeaders?.find(h => h.name.toLowerCase() === 'content-type')?.value || '',
            cacheControl: details.responseHeaders?.find(h => h.name.toLowerCase() === 'cache-control')?.value || '',
            setCookie: details.responseHeaders?.filter(h => h.name.toLowerCase() === 'set-cookie').length || 0,
            suspiciousScore: 0
        };
        
        // Calculate suspiciousness based on response characteristics
        features.suspiciousScore = this.calculateResponseSuspiciousness(features);
        
        return features;
    },
    
    // Extract header features
    extractHeaderFeatures(details) {
        const features = {
            url: details.url,
            userAgent: details.requestHeaders?.find(h => h.name.toLowerCase() === 'user-agent')?.value || '',
            referer: details.requestHeaders?.find(h => h.name.toLowerCase() === 'referer')?.value || '',
            accept: details.requestHeaders?.find(h => h.name.toLowerCase() === 'accept')?.value || '',
            origin: details.requestHeaders?.find(h => h.name.toLowerCase() === 'origin')?.value || '',
            customHeaders: details.requestHeaders?.filter(h => h.name.startsWith('x-') || h.name.startsWith('X-')).length || 0,
            suspiciousScore: 0
        };
        
        // Calculate suspiciousness based on headers
        features.suspiciousScore = this.calculateHeaderSuspiciousness(features);
        
        return features;
    },
    
    // Calculate network suspiciousness
    calculateNetworkSuspiciousness(features) {
        let score = 0;
        
        // Known ad domains
        const adDomains = [
            'doubleclick.net', 'googlesyndication.com', 'adsystem.google.com',
            'amazon-adsystem.com', 'facebook.com', 'analytics.google.com',
            'googletagmanager.com', 'googletagservices.com'
        ];
        
        adDomains.forEach(domain => {
            if (features.domain.includes(domain)) score += 0.5;
        });
        
        // Ad-related paths
        const adPaths = ['/ads/', '/ad/', '/banner/', '/track/', '/analytics/', '/pixel/'];
        adPaths.forEach(path => {
            if (features.path.includes(path)) score += 0.3;
        });
        
        // Tracking parameters
        const trackingParams = ['utm_', 'gclid', 'fbclid', 'ref=', 'src=', 'campaign='];
        trackingParams.forEach(param => {
            if (features.queryParams.includes(param)) score += 0.2;
        });
        
        // Suspicious request types
        if (features.type === 'ping' || features.type === 'beacon') score += 0.4;
        
        return Math.min(score, 1);
    },
    
    // Calculate response suspiciousness
    calculateResponseSuspiciousness(features) {
        let score = 0;
        
        // 1x1 pixel images (tracking pixels)
        if (features.contentType.includes('image') && features.responseSize < 100) {
            score += 0.6;
        }
        
        // JavaScript from ad domains
        if (features.contentType.includes('javascript')) {
            const adDomains = ['doubleclick', 'googlesyndication', 'adsystem'];
            adDomains.forEach(domain => {
                if (features.url.includes(domain)) score += 0.4;
            });
        }
        
        // No cache headers (often used for tracking)
        if (features.cacheControl.includes('no-cache') || features.cacheControl.includes('no-store')) {
            score += 0.2;
        }
        
        // Multiple cookies being set
        if (features.setCookie > 2) score += 0.3;
        
        return Math.min(score, 1);
    },
    
    // Calculate header suspiciousness
    calculateHeaderSuspiciousness(features) {
        let score = 0;
        
        // Many custom headers can indicate tracking
        if (features.customHeaders > 3) score += 0.3;
        
        // Referer from ad domains
        const adDomains = ['doubleclick', 'googlesyndication', 'facebook', 'google'];
        adDomains.forEach(domain => {
            if (features.referer.includes(domain)) score += 0.2;
        });
        
        // Cross-origin requests to tracking domains
        if (features.origin && features.url) {
            const originDomain = this.extractDomain(features.origin);
            const requestDomain = this.extractDomain(features.url);
            if (originDomain !== requestDomain) {
                adDomains.forEach(domain => {
                    if (requestDomain.includes(domain)) score += 0.4;
                });
            }
        }
        
        return Math.min(score, 1);
    },
    
    // URL Pattern Analyzer
    analyzeURLPatterns(url) {
        const patterns = {
            domain: this.extractDomain(url),
            path: this.extractPath(url),
            query: this.extractQueryParams(url),
            entropy: this.calculateEntropy(url),
            subdomains: this.extractSubdomains(url),
            tld: this.extractTLD(url),
            suspiciousScore: 0
        };
        
        // Calculate pattern suspiciousness
        patterns.suspiciousScore = this.calculatePatternSuspiciousness(patterns);
        
        return patterns;
    },
    
    // Calculate URL entropy
    calculateEntropy(str) {
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
    },
    
    // Extract subdomains
    extractSubdomains(url) {
        try {
            const hostname = new URL(url).hostname;
            const parts = hostname.split('.');
            return parts.length > 2 ? parts.slice(0, -2) : [];
        } catch {
            return [];
        }
    },
    
    // Extract TLD
    extractTLD(url) {
        try {
            const hostname = new URL(url).hostname;
            const parts = hostname.split('.');
            return parts[parts.length - 1];
        } catch {
            return '';
        }
    },
    
    // Calculate pattern suspiciousness
    calculatePatternSuspiciousness(patterns) {
        let score = 0;
        
        // High entropy URLs (often obfuscated)
        if (patterns.entropy > 4) score += 0.3;
        
        // Many subdomains (often used for tracking)
        if (patterns.subdomains.length > 2) score += 0.2;
        
        // Suspicious TLDs
        const suspiciousTLDs = ['tk', 'ml', 'ga', 'cf'];
        if (suspiciousTLDs.includes(patterns.tld)) score += 0.4;
        
        // Long query strings (often tracking parameters)
        if (patterns.query.length > 100) score += 0.2;
        
        return Math.min(score, 1);
    },
    
    // Request Fingerprinting
    generateRequestFingerprint(request) {
        const fingerprint = {
            domainPattern: this.getDomainPattern(request.url),
            pathPattern: this.getPathPattern(request.url),
            queryPattern: this.getQueryPattern(request.url),
            timingPattern: this.getTimingPattern(request),
            sizePattern: this.getSizePattern(request),
            headerPattern: this.getHeaderPattern(request)
        };
        
        return fingerprint;
    },
    
    // Get domain pattern
    getDomainPattern(url) {
        const domain = this.extractDomain(url);
        const parts = domain.split('.');
        
        // Anonymize while preserving structure
        return parts.map((part, index) => {
            if (index === parts.length - 1) return part; // Keep TLD
            return part.length > 3 ? part.substring(0, 3) + '*' : part;
        }).join('.');
    },
    
    // Get path pattern
    getPathPattern(url) {
        const path = this.extractPath(url);
        const segments = path.split('/');
        
        // Anonymize path segments
        return segments.map(segment => {
            if (segment.length === 0) return segment;
            if (/^\d+$/.test(segment)) return '[NUMBER]';
            if (segment.length > 10) return '[LONG]';
            return segment;
        }).join('/');
    },
    
    // Get query pattern
    getQueryPattern(url) {
        const query = this.extractQueryParams(url);
        const params = new URLSearchParams(query);
        
        const patterns = [];
        for (const [key, value] of params) {
            let pattern = key;
            if (value.length > 20) pattern += '=[LONG]';
            else if (/^\d+$/.test(value)) pattern += '=[NUMBER]';
            else pattern += '=[STRING]';
            patterns.push(pattern);
        }
        
        return patterns.sort().join('&');
    },
    
    // Get timing pattern
    getTimingPattern(request) {
        const now = Date.now();
        const hour = new Date(now).getHours();
        
        return {
            hourOfDay: hour,
            dayOfWeek: new Date(now).getDay(),
            timestamp: now
        };
    },
    
    // Get size pattern
    getSizePattern(request) {
        return {
            urlLength: request.url.length,
            pathLength: this.extractPath(request.url).length,
            queryLength: this.extractQueryParams(request.url).length
        };
    },
    
    // Get header pattern
    getHeaderPattern(request) {
        return {
            hasReferer: request.referer ? true : false,
            hasOrigin: request.origin ? true : false,
            requestType: request.type,
            method: request.method
        };
    },
    
    // Data Collection Pipeline
    initDataProcessor() {
        // Process collected data every 60 seconds
        setInterval(() => this.processCollectedData(), 60000);
    },
    
    // Process and analyze collected data
    processCollectedData() {
        if (this.trainingData.length === 0) return;
        
        // Group data by type
        const groupedData = {};
        this.trainingData.forEach(item => {
            if (!groupedData[item.type]) groupedData[item.type] = [];
            groupedData[item.type].push(item);
        });
        
        // Analyze patterns in each group
        for (const [type, data] of Object.entries(groupedData)) {
            this.analyzeDataPatterns(type, data);
        }
        
        // Store processed data
        this.storeProcessedData(groupedData);
    },
    
    // Analyze patterns in data
    analyzeDataPatterns(type, data) {
        const patterns = {
            type: type,
            count: data.length,
            domains: {},
            suspicious: 0,
            timestamp: Date.now()
        };
        
        data.forEach(item => {
            // Count domains
            if (item.domain) {
                patterns.domains[item.domain] = (patterns.domains[item.domain] || 0) + 1;
            }
            
            // Count suspicious items
            if (item.data?.features?.suspiciousScore > 0.5) {
                patterns.suspicious++;
            }
        });
        
        // Store patterns for ML training
        this.storeTrainingData('pattern_analysis', patterns);
    },
    
    // Store processed data
    storeProcessedData(data) {
        chrome.storage.local.set({
            [`ml_data_${Date.now()}`]: data
        });
    },
    
    // Feature Extraction Engine
    initFeatureExtraction() {
        // Extract features from URLs periodically
        setInterval(() => this.extractFeatures(), 120000); // 2 minutes
    },
    
    // Extract features from collected data
    extractFeatures() {
        const features = {
            urlPatterns: [],
            domainFeatures: [],
            requestFeatures: [],
            timeFeatures: [],
            timestamp: Date.now()
        };
        
        // Extract URL patterns
        this.trainingData.forEach(item => {
            if (item.data?.url) {
                const urlFeatures = this.analyzeURLPatterns(item.data.url);
                features.urlPatterns.push(urlFeatures);
            }
        });
        
        // Store extracted features
        this.storeTrainingData('feature_extraction', features);
    },
    
    // Store training data
    storeTrainingData(type, data) {
        this.trainingData.push({
            type: type,
            data: data,
            timestamp: Date.now()
        });
        
        // Limit training data size
        if (this.trainingData.length > 5000) {
            this.trainingData = this.trainingData.slice(-2500);
        }
    },
    
    // Cleanup old data
    cleanupOldData() {
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const cutoff = Date.now() - maxAge;
        
        this.trainingData = this.trainingData.filter(item => 
            item.timestamp > cutoff
        );
        
        // Clean up storage
        chrome.storage.local.get(null, (items) => {
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
                chrome.storage.local.remove(keysToRemove);
            }
        });
    },
    
    // Helper functions
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return '';
        }
    },
    
    extractPath(url) {
        try {
            return new URL(url).pathname;
        } catch {
            return '';
        }
    },
    
    extractQueryParams(url) {
        try {
            return new URL(url).search;
        } catch {
            return '';
        }
    }
};

// Initialize ML systems
MLDataProcessor.init();

// Schaltet die komplette Filterregeln an/aus (globaler Toggle)
async function toggleRuleset(istAktiviert) {
    try {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            enableRulesetIds: istAktiviert ? ['ruleset_1'] : [],
            disableRulesetIds: istAktiviert ? [] : ['ruleset_1']
        });
        
        chrome.storage.local.set({ 
            isEnabled: istAktiviert,
            lastUpdate: Date.now()
        });
        
        console.log(`⚡ Filterregeln ${istAktiviert ? 'aktiviert' : 'deaktiviert'}`);
        
    } catch (error) {
        console.error('Fehler beim Umschalten der Filterregeln:', error);
    }
}

// Das ist die neue coole Funktion - schaltet nur für eine bestimmte Domain um
async function toggleRulesetFuerDomain(domain, istAktiviert) {
    try {
        const result = await chrome.storage.local.get(['disabledDomains']);
        let deaktivierteDomains = result.disabledDomains || [];
        
        if (istAktiviert) {
            // Domain aus der "deaktiviert" Liste entfernen - also wieder blockieren
            deaktivierteDomains = deaktivierteDomains.filter(d => d !== domain);
        } else {
            // Domain zur "deaktiviert" Liste hinzufügen - also Ads wieder erlauben
            if (!deaktivierteDomains.includes(domain)) {
                deaktivierteDomains.push(domain);
            }
        }
        
        await chrome.storage.local.set({ 
            disabledDomains: deaktivierteDomains,
            lastUpdate: Date.now()
        });
        
        // Jetzt die Session-Regeln für diese Domain updaten
        await updateSessionRulesForDomain(domain, istAktiviert);
        
        console.log(`⚡ Domain ${domain} ${istAktiviert ? 'aktiviert' : 'deaktiviert'}`);
        console.log(`📋 Deaktivierte Domains:`, deaktivierteDomains);
        
    } catch (error) {
        console.error('Fehler beim Domain-Toggle:', error);
    }
}

// Hier passiert die eigentliche Magie - Session Rules für eine Domain setzen/entfernen
async function updateSessionRulesForDomain(domain, istAktiviert) {
    try {
        const regelId = hashCode(domain);
        
        if (istAktiviert) {
            // Session-Regel wieder entfernen - bedeutet Ads werden wieder blockiert
            const subdomainRegelId = regelId + 1;
            await chrome.declarativeNetRequest.updateSessionRules({
                removeRuleIds: [regelId, subdomainRegelId]
            });
            console.log(`✅ Allow-Regeln für ${domain} entfernt`);
        } else {
            // Session-Regel hinzufügen die alles von dieser Domain erlaubt
            // Hohe Priorität damit sie über die Block-Regeln gewinnt
            await chrome.declarativeNetRequest.updateSessionRules({
                addRules: [{
                    id: regelId,
                    priority: 100000, // Sehr hohe Priorität
                    action: { type: 'allow' },
                    condition: {
                        initiatorDomains: [domain], // Requests VON dieser Domain
                        resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
                    }
                }]
            });
            
            // Zusätzlich noch eine Regel für Requests ZU dieser Domain
            const subdomainRegelId = regelId + 1;
            await chrome.declarativeNetRequest.updateSessionRules({
                addRules: [{
                    id: subdomainRegelId,
                    priority: 100000,
                    action: { type: 'allow' },
                    condition: {
                        requestDomains: [domain], // Requests ZU dieser Domain
                        resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
                    }
                }]
            });
            
            console.log(`🚫 Allow-Regeln für ${domain} hinzugefügt (ID: ${regelId}, ${subdomainRegelId})`);
        }
    } catch (error) {
        console.error('Fehler beim Session-Rules Update:', error);
    }
}

// Kleine Hilfsfunktion um aus einem String eine Nummer zu machen
// Brauchen wir für eindeutige Rule-IDs
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Zu 32bit Integer konvertieren
    }
    return Math.abs(hash);
}

// Wird beim ersten Start aufgerufen - initialisiert alles
async function initialisieren() {
    console.log('🚀 Pagy Blocker startet...');
    
    chrome.storage.local.set({
        isEnabled: true,
        lastUpdate: Date.now(),
        version: chrome.runtime.getManifest().version
    });
    
    // Statische Filterregeln aktivieren
    await toggleRuleset(true);
    
    console.log('🏆 Pagy Blocker ist bereit!');
}

// Event-Listener - reagiert auf Extension-Events
chrome.runtime.onInstalled.addListener(() => initialisieren());
chrome.runtime.onStartup.addListener(async () => {
    // Beim Browser-Start: Schauen ob wir aktiviert sind und entsprechend handeln
    const result = await chrome.storage.local.get(['isEnabled']);
    const istAktiviert = result.isEnabled !== false;
    await toggleRuleset(istAktiviert);
});

// Performance-Cache damit die Stats schnell geladen werden
let statsCache = null;
let cacheTime = 0;
const STATS_CACHE_DURATION = 1000; // 1 Sekunde Cache für sofortige Antworten

// Message Handler - reagiert auf Nachrichten vom Popup
async function handleToggleBlocking(request, sender) {
    if (typeof request.isEnabled !== 'boolean') {
        return { error: 'Ungültige Anfrage' };
    }
    
    try {
        if (request.domain) {
            // Per-Domain Toggle (das neue Feature!)
            await toggleRulesetFuerDomain(request.domain, request.isEnabled);
            
            // Tab neu laden falls gewünscht
            if (request.tabId) {
                await chrome.tabs.reload(request.tabId);
            }
        } else {
            // Globaler Toggle (alter Stil)
            await toggleRuleset(request.isEnabled);
        }
        
        // Cache ungültig machen wenn sich was ändert
        statsCache = null;
        return { success: true, isEnabled: request.isEnabled };
    } catch (error) {
        return { error: error.message };
    }
}

// Liefert die Statistiken (gecacht für Performance)
async function handleGetStats() {
    // Erst mal schauen ob wir gecachte Daten haben
    const now = Date.now();
    if (statsCache && (now - cacheTime) < STATS_CACHE_DURATION) {
        return statsCache;
    }
    
    try {
        const result = await chrome.storage.local.get(['lastUpdate', 'isEnabled']);
        const enabledRulesets = await chrome.declarativeNetRequest.getEnabledRulesets();
        
        // Statische Anzahl der Regeln (viel schneller als API-Calls)
        let aktuelleRegelanzahl = 0;
        if (enabledRulesets.includes('ruleset_1')) {
            aktuelleRegelanzahl = 91; // Exakte Anzahl aus unserem statischen Ruleset
        }
        
        // Ergebnis cachen für bessere Performance
        statsCache = {
            rulesCount: aktuelleRegelanzahl,
            lastUpdate: result.lastUpdate || Date.now(),
            isEnabled: result.isEnabled !== false
        };
        cacheTime = now;
        
        return statsCache;
    } catch (error) {
        return { error: error.message };
    }
}

// Holt Infos über den aktuellen Tab
async function handleGetCurrentTab() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
            return { error: 'Kein aktiver Tab gefunden' };
        }
        
        const tab = tabs[0];
        const url = new URL(tab.url);
        const domain = url.hostname;
        
        // Schauen ob diese Domain deaktiviert ist
        const result = await chrome.storage.local.get(['disabledDomains']);
        const deaktivierteDomains = result.disabledDomains || [];
        const istAktiviertFuerDomain = !deaktivierteDomains.includes(domain);
        
        return {
            tabId: tab.id,
            domain: domain,
            url: tab.url,
            isEnabledForDomain: istAktiviertFuerDomain
        };
    } catch (error) {
        return { error: error.message };
    }
}

// Handle ML data collection from content script
async function handleMLDataCollection(request, sender) {
    try {
        const { data, domain } = request;
        
        if (!data || !Array.isArray(data)) {
            return { error: 'Ungültige ML-Daten' };
        }
        
        // Process each data item
        data.forEach(item => {
            // Add sender information
            const enrichedItem = {
                ...item,
                tabId: sender.tab?.id,
                url: sender.tab?.url,
                domain: domain,
                timestamp: item.timestamp || Date.now()
            };
            
            // Store in ML data processor
            MLDataProcessor.storeTrainingData(item.type, enrichedItem);
            
            // Perform real-time analysis
            switch (item.type) {
                case 'dom_analysis':
                    analyzeContentDOMData(enrichedItem);
                    break;
                case 'network_request':
                    analyzeContentNetworkData(enrichedItem);
                    break;
                case 'storage_operation':
                    analyzeContentStorageData(enrichedItem);
                    break;
                case 'third_party_script':
                    analyzeContentScriptData(enrichedItem);
                    break;
                default:
                    break;
            }
        });
        
        // Log collection stats
        console.log(`📊 ML Data collected: ${data.length} items from ${domain}`);
        
        return { success: true, processed: data.length };
    } catch (error) {
        console.error('Fehler bei ML-Datenverarbeitung:', error);
        return { error: error.message };
    }
}

// Analyze DOM data from content script
function analyzeContentDOMData(item) {
    const features = item.data?.features;
    if (!features) return;
    
    // Check for high-confidence ad elements
    if (features.suspiciousScore > 0.8) {
        // Potentially add to dynamic filter rules
        console.log(`🎯 High-confidence ad detected: ${features.tagName} with score ${features.suspiciousScore}`);
        
        // Store for potential rule generation
        MLDataProcessor.storeTrainingData('high_confidence_ad', {
            element: features,
            domain: item.domain,
            timestamp: item.timestamp
        });
    }
}

// Analyze network data from content script
function analyzeContentNetworkData(item) {
    const features = item.data?.features;
    if (!features) return;
    
    // Check for high-confidence tracking requests
    if (features.suspiciousScore > 0.8) {
        console.log(`🔍 High-confidence tracker detected: ${features.domain} with score ${features.suspiciousScore}`);
        
        // Store for potential rule generation
        MLDataProcessor.storeTrainingData('high_confidence_tracker', {
            url: features.url,
            domain: features.domain,
            features: features,
            timestamp: item.timestamp
        });
    }
}

// Analyze storage data from content script
function analyzeContentStorageData(item) {
    const features = item.data?.features;
    if (!features) return;
    
    // Check for tracking cookies/storage
    if (features.suspiciousScore > 0.7) {
        console.log(`🍪 Tracking storage detected: ${features.key} with score ${features.suspiciousScore}`);
        
        // Store for analysis
        MLDataProcessor.storeTrainingData('tracking_storage', {
            storageType: features.storageType,
            key: features.key,
            domain: item.domain,
            timestamp: item.timestamp
        });
    }
}

// Analyze script data from content script
function analyzeContentScriptData(item) {
    const features = item.data?.features;
    if (!features) return;
    
    // Check for ad/tracking scripts
    if (features.suspiciousScore > 0.6) {
        console.log(`📜 Suspicious script detected: ${features.domain} with score ${features.suspiciousScore}`);
        
        // Store for analysis
        MLDataProcessor.storeTrainingData('suspicious_script', {
            src: features.src,
            domain: features.domain,
            features: features,
            timestamp: item.timestamp
        });
    }
}

// Message Listener - hier kommen die Nachrichten vom Popup an
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request?.type) {
        sendResponse({ error: 'Ungültige Anfrage' });
        return false;
    }
    
    if (request.type === 'getStats') {
        handleGetStats().then(sendResponse);
        return true;
    }
    
    if (request.type === 'toggleBlocking') {
        handleToggleBlocking(request, sender).then(sendResponse);
        return true;
    }
    
    if (request.type === 'getCurrentTab') {
        handleGetCurrentTab().then(sendResponse);
        return true;
    }
    
    // Handle ML data collection from content script
    if (request.action === 'ml_data_collected') {
        handleMLDataCollection(request, sender).then(sendResponse);
        return true;
    }
    
    sendResponse({ error: 'Unbekannter Nachrichtentyp' });
    return false;
});

// Initialisierung nur über Events für bessere Performance