/**
 * Content Script für per-Domain Ad-Blocking Toggle + ML Data Collection
 * Läuft auf allen Seiten und prüft, ob die aktuelle Domain deaktiviert ist
 * + Sammelt Daten für Machine Learning Ad/Tracker Detection
 */

(function() {
    'use strict';
    
    // Get current domain
    const currentDomain = window.location.hostname;
    
    // ML Data Collection System
    const MLDataCollector = {
        collectingEnabled: true,
        collectedData: [],
        
        // Initialize data collection
        init() {
            if (!this.collectingEnabled) return;
            
            this.initDOMAnalysis();
            this.initNetworkMonitoring();
            this.initStorageMonitoring();
            this.initJSBehaviorTracking();
            this.initThirdPartyAnalysis();
            
            // Send collected data periodically
            setInterval(() => this.sendCollectedData(), 30000);
        },
        
        // DOM Analysis for potential ads
        initDOMAnalysis() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                this.analyzeElement(node);
                            }
                        });
                    }
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Analyze existing elements
            this.analyzeExistingElements();
        },
        
        // Analyze element for ad characteristics
        analyzeElement(element) {
            const features = this.extractDOMFeatures(element);
            if (features.suspiciousScore > 0.5) {
                this.collectData('dom_analysis', {
                    element: element.tagName,
                    features: features,
                    timestamp: Date.now(),
                    url: window.location.href
                });
            }
        },
        
        // Extract DOM features for ML
        extractDOMFeatures(element) {
            const features = {
                tagName: element.tagName,
                id: element.id,
                className: element.className,
                width: element.offsetWidth,
                height: element.offsetHeight,
                src: element.src,
                href: element.href,
                textContent: element.textContent?.substring(0, 100),
                suspiciousScore: 0
            };
            
            // Calculate suspiciousness score
            features.suspiciousScore = this.calculateSuspiciousScore(features);
            
            return features;
        },
        
        // Calculate how suspicious an element is
        calculateSuspiciousScore(features) {
            let score = 0;
            
            // Check for ad-like dimensions
            if (features.width === 300 && features.height === 250) score += 0.3; // Banner
            if (features.width === 728 && features.height === 90) score += 0.3;  // Leaderboard
            if (features.width === 320 && features.height === 50) score += 0.3;  // Mobile banner
            
            // Check for ad-related class names
            const adClasses = ['ad', 'banner', 'promo', 'sponsor', 'advertisement'];
            adClasses.forEach(cls => {
                if (features.className.toLowerCase().includes(cls)) score += 0.2;
            });
            
            // Check for ad-related IDs
            const adIds = ['ad', 'banner', 'promo', 'sponsor'];
            adIds.forEach(id => {
                if (features.id.toLowerCase().includes(id)) score += 0.2;
            });
            
            // Check for suspicious domains in src/href
            const suspiciousDomains = ['doubleclick', 'googlesyndication', 'adsystem', 'amazon-adsystem'];
            suspiciousDomains.forEach(domain => {
                if (features.src?.includes(domain) || features.href?.includes(domain)) score += 0.4;
            });
            
            return Math.min(score, 1);
        },
        
        // Analyze existing elements on page
        analyzeExistingElements() {
            const elements = document.querySelectorAll('*');
            elements.forEach(element => {
                if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                    this.analyzeElement(element);
                }
            });
        },
        
        // Network monitoring
        initNetworkMonitoring() {
            // Monitor fetch requests
            const originalFetch = window.fetch;
            window.fetch = (...args) => {
                this.analyzeNetworkRequest('fetch', args[0]);
                return originalFetch.apply(this, args);
            };
            
            // Monitor XHR requests
            const originalXHR = window.XMLHttpRequest;
            window.XMLHttpRequest = function() {
                const xhr = new originalXHR();
                const originalOpen = xhr.open;
                xhr.open = function(method, url, ...args) {
                    MLDataCollector.analyzeNetworkRequest('xhr', url);
                    return originalOpen.apply(this, arguments);
                };
                return xhr;
            };
        },
        
        // Analyze network requests
        analyzeNetworkRequest(type, url) {
            const features = this.extractNetworkFeatures(url);
            if (features.suspiciousScore > 0.4) {
                this.collectData('network_request', {
                    type: type,
                    url: url,
                    features: features,
                    timestamp: Date.now(),
                    referrer: document.referrer
                });
            }
        },
        
        // Extract network request features
        extractNetworkFeatures(url) {
            const features = {
                url: url,
                domain: this.extractDomain(url),
                path: this.extractPath(url),
                queryParams: this.extractQueryParams(url),
                suspicious: false,
                suspiciousScore: 0
            };
            
            features.suspiciousScore = this.calculateNetworkSuspiciousScore(features);
            
            return features;
        },
        
        // Calculate network request suspiciousness
        calculateNetworkSuspiciousScore(features) {
            let score = 0;
            
            // Check for known ad domains
            const adDomains = [
                'doubleclick.net', 'googlesyndication.com', 'adsystem.google.com',
                'amazon-adsystem.com', 'facebook.com/tr', 'analytics.google.com'
            ];
            
            adDomains.forEach(domain => {
                if (features.domain.includes(domain)) score += 0.5;
            });
            
            // Check for tracking parameters
            const trackingParams = ['utm_', 'gclid', 'fbclid', 'ref=', 'src='];
            trackingParams.forEach(param => {
                if (features.url.includes(param)) score += 0.1;
            });
            
            // Check for ad-related paths
            const adPaths = ['/ads/', '/ad/', '/banner/', '/promo/', '/sponsor/'];
            adPaths.forEach(path => {
                if (features.path.includes(path)) score += 0.2;
            });
            
            return Math.min(score, 1);
        },
        
        // Storage monitoring
        initStorageMonitoring() {
            // Monitor localStorage
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = function(key, value) {
                MLDataCollector.analyzeStorageOperation('localStorage', 'set', key, value);
                return originalSetItem.apply(this, arguments);
            };
            
            // Monitor sessionStorage
            const originalSessionSetItem = sessionStorage.setItem;
            sessionStorage.setItem = function(key, value) {
                MLDataCollector.analyzeStorageOperation('sessionStorage', 'set', key, value);
                return originalSessionSetItem.apply(this, arguments);
            };
            
            // Monitor cookies
            this.monitorCookies();
        },
        
        // Analyze storage operations
        analyzeStorageOperation(storageType, operation, key, value) {
            const features = {
                storageType: storageType,
                operation: operation,
                key: key,
                valueLength: value ? value.length : 0,
                suspicious: false,
                suspiciousScore: 0
            };
            
            // Check for tracking-related keys
            const trackingKeys = ['_ga', '_gid', '_fbp', '_gcl_', 'utm_', 'ad_', 'track_'];
            trackingKeys.forEach(trackingKey => {
                if (key.includes(trackingKey)) {
                    features.suspicious = true;
                    features.suspiciousScore += 0.3;
                }
            });
            
            if (features.suspicious) {
                this.collectData('storage_operation', {
                    features: features,
                    timestamp: Date.now(),
                    url: window.location.href
                });
            }
        },
        
        // Monitor cookies
        monitorCookies() {
            const originalCookie = document.cookie;
            
            // Check existing cookies
            document.cookie.split(';').forEach(cookie => {
                const [name, value] = cookie.split('=');
                if (name) {
                    this.analyzeStorageOperation('cookie', 'read', name.trim(), value);
                }
            });
        },
        
        // JavaScript behavior tracking
        initJSBehaviorTracking() {
            // Monitor function calls
            this.monitorGlobalFunctions();
            
            // Monitor DOM events
            this.monitorDOMEvents();
            
            // Monitor timer functions
            this.monitorTimers();
        },
        
        // Monitor global functions
        monitorGlobalFunctions() {
            const suspiciousFunctions = ['eval', 'Function', 'setTimeout', 'setInterval'];
            
            suspiciousFunctions.forEach(funcName => {
                if (window[funcName]) {
                    const originalFunc = window[funcName];
                    window[funcName] = function(...args) {
                        MLDataCollector.collectData('js_function_call', {
                            function: funcName,
                            args: args.length,
                            timestamp: Date.now(),
                            stack: new Error().stack?.substring(0, 500)
                        });
                        return originalFunc.apply(this, args);
                    };
                }
            });
        },
        
        // Monitor DOM events
        monitorDOMEvents() {
            const suspiciousEvents = ['click', 'mouseover', 'scroll', 'resize'];
            
            suspiciousEvents.forEach(eventType => {
                document.addEventListener(eventType, (event) => {
                    if (event.target && this.isElementSuspicious(event.target)) {
                        this.collectData('dom_event', {
                            event: eventType,
                            target: event.target.tagName,
                            className: event.target.className,
                            timestamp: Date.now()
                        });
                    }
                }, true);
            });
        },
        
        // Check if element is suspicious
        isElementSuspicious(element) {
            const features = this.extractDOMFeatures(element);
            return features.suspiciousScore > 0.5;
        },
        
        // Monitor timer functions
        monitorTimers() {
            const originalSetTimeout = window.setTimeout;
            window.setTimeout = function(callback, delay) {
                MLDataCollector.collectData('timer', {
                    type: 'setTimeout',
                    delay: delay,
                    timestamp: Date.now()
                });
                return originalSetTimeout.apply(this, arguments);
            };
        },
        
        // Third-party script analysis
        initThirdPartyAnalysis() {
            // Monitor script loading
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.tagName === 'SCRIPT' && node.src) {
                                this.analyzeThirdPartyScript(node);
                            }
                        });
                    }
                });
            });
            
            observer.observe(document.head, {
                childList: true,
                subtree: true
            });
            
            // Analyze existing scripts
            document.querySelectorAll('script[src]').forEach(script => {
                this.analyzeThirdPartyScript(script);
            });
        },
        
        // Analyze third-party scripts
        analyzeThirdPartyScript(script) {
            const features = {
                src: script.src,
                domain: this.extractDomain(script.src),
                async: script.async,
                defer: script.defer,
                crossOrigin: script.crossOrigin,
                suspiciousScore: 0
            };
            
            // Check for known ad script domains
            const adScriptDomains = [
                'googlesyndication.com', 'doubleclick.net', 'googletagmanager.com',
                'amazon-adsystem.com', 'facebook.com', 'analytics.google.com'
            ];
            
            adScriptDomains.forEach(domain => {
                if (features.domain.includes(domain)) {
                    features.suspiciousScore += 0.5;
                }
            });
            
            if (features.suspiciousScore > 0.3) {
                this.collectData('third_party_script', {
                    features: features,
                    timestamp: Date.now(),
                    url: window.location.href
                });
            }
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
        },
        
        // Collect data for ML training
        collectData(type, data) {
            this.collectedData.push({
                type: type,
                data: data,
                domain: currentDomain,
                timestamp: Date.now()
            });
            
            // Limit collected data size
            if (this.collectedData.length > 1000) {
                this.collectedData = this.collectedData.slice(-500);
            }
        },
        
        // Send collected data to background script
        sendCollectedData() {
            if (this.collectedData.length > 0) {
                chrome.runtime.sendMessage({
                    action: 'ml_data_collected',
                    data: this.collectedData,
                    domain: currentDomain
                });
                
                // Clear sent data
                this.collectedData = [];
            }
        }
    };
    
    // Initialize ML data collection
    MLDataCollector.init();
    
    // Check if blocking is disabled for this domain
    async function checkDomainStatus() {
        try {
            const result = await chrome.storage.local.get(['disabledDomains']);
            const disabledDomains = result.disabledDomains || [];
            
            if (disabledDomains.includes(currentDomain)) {
                console.log(`🚫 Ad blocking disabled for domain: ${currentDomain}`);
                disableBlockingForPage();
            } else {
                console.log(`✅ Ad blocking enabled for domain: ${currentDomain}`);
            }
        } catch (error) {
            console.error('Error checking domain status:', error);
        }
    }
    
    // Disable blocking for this page by preventing network requests from being blocked
    function disableBlockingForPage() {
        // Override fetch to prevent blocking
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            return originalFetch.apply(this, args);
        };
        
        // Override XMLHttpRequest to prevent blocking
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            return xhr;
        };
        
        // Re-enable blocked scripts by creating new script elements
        setTimeout(() => {
            reEnableBlockedElements();
        }, 100);
        
        // Add a marker to indicate blocking is disabled
        document.documentElement.setAttribute('data-pagy-blocker-disabled', 'true');
    }
    
    // Re-enable blocked elements
    function reEnableBlockedElements() {
        // Find and re-enable common ad script sources
        const commonAdSources = [
            'doubleclick.net',
            'googlesyndication.com',
            'adsystem.google.com',
            'googletagmanager.com',
            'googletagservices.com',
            'amazon-adsystem.com',
            'facebook.com/tr',
            'adsystem.amazon.com'
        ];
        
        commonAdSources.forEach(source => {
            // Create script elements for common ad sources
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://${source}/tag/js/gpt.js`;
            script.onerror = () => {
                // Silently fail if script doesn't exist
            };
            document.head.appendChild(script);
        });
        
        // Re-enable Google AdSense
        const adsenseScript = document.createElement('script');
        adsenseScript.async = true;
        adsenseScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        adsenseScript.onerror = () => {};
        document.head.appendChild(adsenseScript);
    }
    
    // Listen for storage changes to update status dynamically
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.disabledDomains) {
            checkDomainStatus();
        }
    });
    
    // Check domain status on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkDomainStatus);
    } else {
        checkDomainStatus();
    }
    
})();