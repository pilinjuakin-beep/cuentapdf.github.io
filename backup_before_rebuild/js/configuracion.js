/* configuracion.js
   Funciones para manejar la primera configuración de usuario.
*/

const STORAGE_KEY_CONFIG = 'cuentaCobro_config';

const loadConfig = () => {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    return raw ? JSON.parse(raw) : null;
};

const saveConfig = (config) => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
};

const isConfigPage = () => window.location.pathname.includes('configuracion.html');
const isEditMode = () => new URLSearchParams(window.location.search).get('edit') === 'true';

const fillForm = (config) => {
    if (!config) return;
    const form = document.getElementById('configForm');
    if (!form) return;

    Object.entries(config).forEach(([key, value]) => {
        const field = form.elements.namedItem(key);
        if (field) {
            field.value = value;
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

        saveConfig(config);
        showMessage('Configuración guardada. Redirigiendo al calendario...');

        setTimeout(() => {
            window.location.href = new URL('calendario.html', window.location.href).href;
        }, 900);
    });
};

const initConfiguration = () => {
    const config = loadConfig();

    if (!config && !isConfigPage()) {
        window.location.href = 'pages/configuracion.html';
        return;
    }

    if (isConfigPage()) {
        if (config && !isEditMode()) {
            window.location.href = 'calendario.html';
            return;
        }

        fillForm(config);
        bindForm();
    }
};

document.addEventListener('DOMContentLoaded', initConfiguration);
