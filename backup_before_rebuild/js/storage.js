/* storage.js
   Helper de almacenamiento local para la aplicación.
*/

const STORAGE_KEYS = {
    config: 'cuentaCobro_config',
    rutas: 'cuentaCobro_rutas',
    calendar: 'cuentaCobro_calendar',
};

const safeGetItem = (key) => {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`LocalStorage inaccesible para ${key}:`, error);
        return null;
    }
};

const safeSetItem = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn(`No se pudo escribir LocalStorage para ${key}:`, error);
    }
};

const safeParse = (raw, fallback) => {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn('JSON inválido en LocalStorage, usando valor por defecto.', error);
        return fallback;
    }
};

const loadConfig = () => {
    return safeParse(safeGetItem(STORAGE_KEYS.config), null);
};

const saveConfig = (config) => {
    safeSetItem(STORAGE_KEYS.config, JSON.stringify(config));
};

const loadRutas = () => {
    return safeParse(safeGetItem(STORAGE_KEYS.rutas), []);
};

const saveRutas = (rutas) => {
    safeSetItem(STORAGE_KEYS.rutas, JSON.stringify(rutas));
};

const loadCalendarState = () => {
    return safeParse(safeGetItem(STORAGE_KEYS.calendar), {});
};

const saveCalendarState = (state) => {
    safeSetItem(STORAGE_KEYS.calendar, JSON.stringify(state));
};

// Expose helpers to global scope for non-module usage
window.loadConfig = loadConfig;
window.saveConfig = saveConfig;
window.loadRutas = loadRutas;
window.saveRutas = saveRutas;
window.loadCalendarState = loadCalendarState;
window.saveCalendarState = saveCalendarState;