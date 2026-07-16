/* configuracion.js
   Funciones para manejar la primera configuración de usuario.
*/

const STORAGE_KEY_CONFIG = 'cuentaCobro_config';

// Use storage helpers exposed by `js/storage.js` when available,
// otherwise fallback to localStorage directly.
const getConfig = () => {
    if (typeof window.loadConfig === 'function') return window.loadConfig();
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    try { return raw ? JSON.parse(raw) : null; } catch (e) { localStorage.removeItem(STORAGE_KEY_CONFIG); return null; }
};

const setConfig = (config) => {
    if (typeof window.saveConfig === 'function') return window.saveConfig(config);
    try { localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config)); } catch (e) { console.warn('saveConfig failed', e); }
};

const isConfigPage = () => window.location.pathname.includes('configuracion.html');
const isEditMode = () => new URLSearchParams(window.location.search).get('edit') === 'true';

const fillForm = (config) => {
    if (!config) {
        console.log('[config] fillForm called but config is empty');
        return;
    }
    const form = document.getElementById('configForm');
    if (!form) {
        console.log('[config] fillForm: no form element found');
        return;
    }
    console.log('[config] fillForm with', config);

    Object.entries(config).forEach(([key, value]) => {

        const field = form.elements.namedItem(key);
        if (!field) {
            console.log(`[config] no field for key: ${key}`);
            return;
        }

        // If multiple elements (e.g., radio NodeList), set appropriately
        if (typeof field.length === 'number' && field.length > 1) {
            console.log(`[config] setting collection for ${key}, length=${field.length}`);
            Array.from(field).forEach(f => {
                if (f.type === 'radio' || f.type === 'checkbox') {
                    f.checked = (String(f.value) === String(value));
                } else {
                    try { f.value = value; } catch (e) { console.warn('set value failed', e); }
                }
            });
            return;
        }

        try {
            // Single element (Input, Select, Textarea)
            field.value = value;
            console.log(`[config] set ${key} =`, value);
        } catch (e) {
            console.warn(`[config] failed to set field ${key}`, e);
        }
    });
};

const showMessage = (text) => {
    const message = document.getElementById('configMessage');
    if (message) {
        message.textContent = text;
    }
};

const bindForm = () => {
    const form = document.getElementById('configForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const config = {
            nombre: formData.get('nombre')?.toString().trim() || '',
            cedula: formData.get('cedula')?.toString().trim() || '',
            correo: formData.get('correo')?.toString().trim() || '',
            telefono: formData.get('telefono')?.toString().trim() || '',
            banco: formData.get('banco')?.toString().trim() || '',
            tipoCuenta: formData.get('tipoCuenta')?.toString().trim() || '',
            numeroCuenta: formData.get('numeroCuenta')?.toString().trim() || '',
            empresa: formData.get('empresa')?.toString().trim() || '',
            nit: formData.get('nit')?.toString().trim() || '',
            direccion: formData.get('direccion')?.toString().trim() || '',
            ciudad: formData.get('ciudad')?.toString().trim() || '',
        };

        const existing = getConfig();
        console.log('[config] saving config, existing:', existing, 'new:', config);
        setConfig(config);
        console.log('[config] saved. localStorage:', localStorage.getItem(STORAGE_KEY_CONFIG));
        // Always refill the form with saved values so the inputs don't appear blank
        fillForm(config);
        showMessage('Configuración guardada.');

        // After saving, redirect user to the calendario (home) so they continue to the app
        const target = new URL('calendario.html', window.location.href).href;
        console.log('[config] redirect scheduled to', target);
        setTimeout(() => {
            try {
                console.log('[config] performing redirect to', target);
                window.location.assign(target);
            } catch (e) {
                console.warn('[config] redirect failed, setting href directly', e);
                window.location.href = target;
            }
        }, 700);
        // Fallback: force replace after 3s if still on same page
        setTimeout(() => {
            if (window.location.href === document.location.href) {
                try { window.location.replace(target); } catch (e) { window.location.href = target; }
            }
        }, 3000);
    });
};

const initConfiguration = () => {
    const config = getConfig();
    const form = document.getElementById('configForm');

    console.log('[config] initConfiguration config:', config, 'formPresent:', !!form, 'isEditMode:', isEditMode());

    // If the form exists on this page, always fill it with stored values (if any)
    if (form) {
        fillForm(config);
        bindForm();
        return;
    }

    // If there's no form on the page and no saved config, redirect to configuration
    if (!config) {
        window.location.href = 'pages/configuracion.html';
    }
};

// Expose helpers for debugging/editing from console
window.initConfiguration = initConfiguration;
window.fillConfigForm = fillForm;

// Ensure init runs whether DOMContentLoaded already fired or will fire
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConfiguration);
} else {
    // If the script is loaded after DOMContentLoaded, run immediately
    initConfiguration();
}

