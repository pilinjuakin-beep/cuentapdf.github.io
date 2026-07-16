/* storage.js
   LocalStorage helpers (robust JSON parsing and global exposure)
*/

const KEYS = {
    config: 'cuentaCobro_config',
    rutas: 'cuentaCobro_rutas',
    calendar: 'cuentaCobro_calendar',
};

function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}

function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { console.warn('LocalStorage write failed', e); }
}

function safeJSONParse(raw, fallback) {
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (e) { console.warn('Invalid JSON in storage, returning fallback', e); return fallback; }
}

function loadConfig() { return safeJSONParse(safeGet(KEYS.config), null); }
function saveConfig(v) { safeSet(KEYS.config, JSON.stringify(v)); }

function loadRutas() { return safeJSONParse(safeGet(KEYS.rutas), []); }
function saveRutas(v) { safeSet(KEYS.rutas, JSON.stringify(v)); }

function loadCalendarState() { return safeJSONParse(safeGet(KEYS.calendar), {}); }
function saveCalendarState(v) { safeSet(KEYS.calendar, JSON.stringify(v)); }

// Expose globally for classic scripts
window.loadConfig = loadConfig;
window.saveConfig = saveConfig;
window.loadRutas = loadRutas;
window.saveRutas = saveRutas;
window.loadCalendarState = loadCalendarState;
window.saveCalendarState = saveCalendarState;
