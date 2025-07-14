/**
 * Ultra-optimized utility functions for maximum performance
 * ES Module exports for optimal tree-shaking
 * 
 * Performance optimizations:
 * - Tab caching to reduce API calls
 * - Regex-based URL parsing (faster than URL constructor)
 * - Input validation for robustness
 */

// Performance constants
const CONFIG = {
    TAB_CACHE_DURATION: 200, // 200ms cache - optimal for extensions
    MAX_URL_LENGTH: 2000, // Maximum URL length to process
    DOMAIN_REGEX: /^https?:\/\/([^\/\?#:]+)/
};

// Cached tab query for better performance
let cachedActiveTab = null;
let tabCacheTime = 0;

/**
 * Ultra-fast active tab retrieval with intelligent caching and error handling
 * @returns {Promise<chrome.tabs.Tab|null>} Active tab with caching, null on error
 * @throws {Error} When chrome.tabs API is not available
 */
export async function getActiveTab() {
    // Validate chrome.tabs API availability
    if (!chrome?.tabs?.query) {
        throw new Error('Chrome tabs API not available');
    }
    
    const now = Date.now();
    
    // Return cached tab if still valid
    if (cachedActiveTab && (now - tabCacheTime) < CONFIG.TAB_CACHE_DURATION) {
        return cachedActiveTab;
    }
    
    try {
        // Fetch new tab and cache
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab) {
            cachedActiveTab = tab;
            tabCacheTime = now;
        }
        
        return tab || null;
    } catch (error) {
        console.error('Failed to get active tab:', error);
        // Return cached tab as fallback, or null
        return cachedActiveTab;
    }
}

/**
 * Lightning-fast domain extraction without URL constructor overhead
 * Enhanced with input validation and length limits
 * @param {string} url - The URL to parse
 * @returns {string|null} Domain or null if invalid
 */
export function getDomainFromUrl(url) {
    // Enhanced input validation
    if (!url || typeof url !== 'string') {
        return null;
    }
    
    // Length validation to prevent performance issues
    if (url.length > CONFIG.MAX_URL_LENGTH) {
        console.warn('URL exceeds maximum length, skipping domain extraction');
        return null;
    }
    
    // Fast regex extraction (much faster than URL constructor)
    const match = url.match(CONFIG.DOMAIN_REGEX);
    
    if (!match || !match[1]) {
        return null;
    }
    
    const domain = match[1];
    
    // Additional domain validation
    if (domain.length === 0 || domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
        return null;
    }
    
    return domain.toLowerCase(); // Normalize to lowercase
}

/**
 * Clear cached tab data (useful for testing or memory management)
 * @returns {void}
 */
export function clearTabCache() {
    cachedActiveTab = null;
    tabCacheTime = 0;
}

/**
 * Get cache status for debugging
 * @returns {Object} Cache status information
 */
export function getCacheStatus() {
    return {
        hasCachedTab: !!cachedActiveTab,
        cacheAge: cachedActiveTab ? Date.now() - tabCacheTime : 0,
        isValid: cachedActiveTab && (Date.now() - tabCacheTime) < CONFIG.TAB_CACHE_DURATION
    };
}
