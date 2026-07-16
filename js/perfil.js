/* perfil.js - muestra los datos guardados y permite editarlos */

const populateProfile = () => {
    const cfg = (typeof loadConfig === 'function') ? loadConfig() : null;
    if (!cfg) {
        // If no config exists, send user to initial configuration
        window.location.href = 'configuracion.html';
        return;
    }

    const map = {
        nombre: 'p-nombre',
        cedula: 'p-cedula',
        correo: 'p-correo',
        telefono: 'p-telefono',
        banco: 'p-banco',
        tipoCuenta: 'p-tipoCuenta',
        numeroCuenta: 'p-numeroCuenta',
        empresa: 'p-empresa',
        nit: 'p-nit',
        direccion: 'p-direccion',
        ciudad: 'p-ciudad',
    };

    Object.entries(map).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = (cfg[key] !== undefined && cfg[key] !== null) ? cfg[key] : '';
    });

    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            window.location.href = 'configuracion.html?edit=true';
        });
    }
};

document.addEventListener('DOMContentLoaded', populateProfile);
