/**
 * popup.js - Das UI für den Pagy Blocker
 *
 * Hier passiert die ganze Interaktion mit dem User. Hab versucht es schnell zu machen:
 * - Kein DOM-Caching Overhead (direkter Zugriff ist eh schneller)
 * - Sofortige UI-Reaktion (kein Debouncing)
 * - Einfache Error-Behandlung (niemand mag komplizierte Fehler)
 * - Behält die guten Sachen: Zahlen-Formatierung, smooth Animationen
 */

// Konfiguration für verschiedene Timeouts
const KONFIGURATION = {
    TOGGLE_TIMEOUT: 3000,
    MAX_RETRY_ATTEMPTS: 2,
    ANIMATION_DURATION: 300 // Passt zu den CSS-Übergängen
};

// Globale Variablen um Chaos zu vermeiden
let gerade_am_togglen = false;
let aktuellerTab = null;

// Direkte DOM-Zugriffe sind performanter


// Kleine Hilfsfunktion für schönere Zahlen-Anzeige
function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

/**
 * Hilfsfunktion für Nachrichten an den Background-Worker mit Timeout
 * Spart mir viel doppelten Code und macht alles stabiler
 */
function createTimeoutMessage(nachrichtenDaten, timeoutMs = 2000) {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        if (controller.signal.aborted) {
            reject(new Error(`Timeout nach ${timeoutMs}ms`));
            return;
        }
        
        controller.signal.addEventListener('abort', () => {
            reject(new Error(`Timeout nach ${timeoutMs}ms`));
        });
        
        chrome.runtime.sendMessage(nachrichtenDaten, (response) => {
            clearTimeout(timeoutId);
            
            if (controller.signal.aborted) return;
            
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

/**
 * Holt und zeigt die aktuellen Stats an
 */
async function refreshStats() {
    const statsDisplay = document.getElementById('stats-display');
    
    try {
        // Loading-Anzeige damit der User weiß dass was passiert
        statsDisplay.textContent = 'Lade...';
        
        // Vereinfachte Nachricht über unsere Hilfsfunktion
        const response = await createTimeoutMessage({ type: 'getStats' }, 2000);
        
        if (response && response.rulesCount !== undefined) {
            // Stats schön anzeigen
            const formatierteAnzahl = formatNumber(response.rulesCount);
            let statsText = `Aktive Filterregeln: ${formatierteAnzahl}`;
            
            // Cache-Status anzeigen wenn verfügbar
            if (response.cacheStatus === 'active') {
                statsText += ' ⚡';
            }
            
            // Direkte DOM-Aktualisierung - schneller als requestAnimationFrame für simplen Text
            statsDisplay.textContent = statsText;
            
        } else {
            // Fallback mit gecachten Daten
            const regelAnzahl = response?.rulesCount || 0;
            const formatierteAnzahl = formatNumber(regelAnzahl);
            
            statsDisplay.textContent = `Filterregeln: ${formatierteAnzahl}`;
        }
        
    } catch (error) {
        console.error('Stats-Fehler:', error);
        
        // Fallback wenn alles schief geht
        statsDisplay.textContent = 'Statistiken werden geladen...';
    }
}

/**
 * Aktualisiert die UI je nach Status (per-Tab oder global)
 */
function updateStatusUI(istAktiviert, domain = null) {
    const enableSwitch = document.getElementById('enable-switch');
    const statusText = document.getElementById('status-text');
    
    // Direkte DOM-Updates - Browser bündelt das automatisch
    enableSwitch.checked = istAktiviert;
    
    if (domain) {
        statusText.textContent = istAktiviert ? 
            `Aktiviert für ${domain}` : 
            `Deaktiviert für ${domain}`;
    } else {
        statusText.textContent = istAktiviert ? 'Aktiviert' : 'Deaktiviert';
    }
    
    document.body.classList.toggle('disabled', !istAktiviert);
}

/**
 * Hauptinitialisierung des Popups - hier startet alles
 */
async function initializePopup() {
    console.log('🚀 Popup wird initialisiert...');
    
    try {
        // Erst mal schauen welcher Tab gerade aktiv ist
        try {
            aktuellerTab = await createTimeoutMessage({ type: 'getCurrentTab' }, 2000);
        } catch (error) {
            console.warn('Konnte aktuellen Tab nicht laden:', error);
            aktuellerTab = null;
        }
        
        // Storage-Daten laden (mit error handling)
        let storageResult;
        try {
            storageResult = await chrome.storage.local.get(['isEnabled', 'rulesCount', 'lastUpdate', 'version']);
        } catch (error) {
            console.warn('Storage-Zugriff fehlgeschlagen, nutze Fallback:', error);
            storageResult = { isEnabled: true, rulesCount: 0 };
        }
        
        // UI-Status setzen - per-Tab falls verfügbar
        let istAktiviert = storageResult.isEnabled !== false;
        let domain = null;
        
        if (aktuellerTab && aktuellerTab.domain) {
            istAktiviert = aktuellerTab.isEnabledForDomain;
            domain = aktuellerTab.domain;
        }
        
        updateStatusUI(istAktiviert, domain);
        
        // Stats vorab anzeigen wenn verfügbar
        if (typeof storageResult.rulesCount === 'number' && storageResult.rulesCount > 0) {
            const statsDisplay = document.getElementById('stats-display');
            statsDisplay.textContent = `Filter Rules: ${formatNumber(storageResult.rulesCount)} ⚡`;
        }
        
        // Event Listener für den Toggle-Switch
        const enableSwitch = document.getElementById('enable-switch');
        enableSwitch.addEventListener('change', async () => {
            if (gerade_am_togglen) {
                console.log('Toggle läuft bereits');
                return;
            }
            
            gerade_am_togglen = true;
            const neuerStatus = enableSwitch.checked;
            
            try {
                // UI sofort aktualisieren damit es responsive wirkt
                updateStatusUI(neuerStatus, aktuellerTab?.domain);
                
                // Toggle-Nachricht vorbereiten - per-Tab falls verfügbar
                const toggleNachricht = { 
                    type: 'toggleBlocking', 
                    isEnabled: neuerStatus 
                };
                
                // Per-Tab Info hinzufügen wenn verfügbar
                if (aktuellerTab && aktuellerTab.domain) {
                    toggleNachricht.domain = aktuellerTab.domain;
                    toggleNachricht.tabId = aktuellerTab.tabId;
                }
                
                await createTimeoutMessage(toggleNachricht, KONFIGURATION.TOGGLE_TIMEOUT);
                
                // Stats sofort aktualisieren
                await refreshStats();
                
            } catch (error) {
                console.error('Toggle fehlgeschlagen:', error);
                // UI bei Fehler zurücksetzen
                updateStatusUI(!neuerStatus, aktuellerTab?.domain);
                
                // User-Feedback anzeigen
                const statsDisplay = document.getElementById('stats-display');
                const originalText = statsDisplay.textContent;
                statsDisplay.textContent = 'Toggle fehlgeschlagen - bitte nochmal versuchen';
                // requestAnimationFrame für bessere Performance als setTimeout
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        statsDisplay.textContent = originalText;
                    }, 2000);
                });
            } finally {
                gerade_am_togglen = false;
            }
        });

        // Refresh-Button mit Rate-Limiting (gegen Spam-Clicks)
        const refreshButton = document.getElementById('refresh-button');
        refreshButton.addEventListener('click', () => {
            // Schnelle Klicks verhindern
            if (refreshButton.disabled) return;
            
            refreshButton.disabled = true;
            
            // CSS-Animation für visuelles Feedback
            refreshButton.classList.add('rotating');
            
            refreshStats().finally(() => {
                // transitionend event für bessere Performance als setTimeout
                const handleTransitionEnd = () => {
                    refreshButton.classList.remove('rotating');
                    refreshButton.disabled = false;
                    refreshButton.removeEventListener('transitionend', handleTransitionEnd);
                };
                
                // Event Listener für CSS-Transition Ende
                refreshButton.addEventListener('transitionend', handleTransitionEnd);
                
                // Fallback timeout falls transitionend nicht feuert
                setTimeout(() => {
                    handleTransitionEnd();
                }, KONFIGURATION.ANIMATION_DURATION + 50);
            });
        });

        // Stats initial laden
        await refreshStats();
        
        console.log('🚀 Popup erfolgreich initialisiert');
        
    } catch (error) {
        console.error('Popup-Initialisierung fehlgeschlagen:', error);
        
        // Vereinfachter Fallback
        updateStatusUI(true);
        const statsDisplay = document.getElementById('stats-display');
        if (statsDisplay) {
            statsDisplay.textContent = 'Initialisierungsfehler - bitte Extension neu laden';
            statsDisplay.title = error.message;
        }
    }
}

// DOMContentLoaded Event Listener
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePopup);
} else {
    // Dokument bereits geladen
    initializePopup();
}