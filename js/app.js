/* app.js - navegación simple */

function setupNavigation() {
    document.querySelectorAll('[data-navigate]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.navigate;
            if (target) window.location.href = target;
        });
    });
}

function setupActions() {
    document.querySelectorAll('[data-action="download-pdf"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (typeof window.generateInvoicePDF !== 'function') {
                alert('Generación de PDF no disponible.');
                return;
            }
            window.generateInvoicePDF();
        });
    });
}

const ensureConfigured = () => {
    try {
        const hasConfig = (typeof loadConfig === 'function') ? !!loadConfig() : !!localStorage.getItem('cuentaCobro_config');
        const inPages = window.location.pathname.includes('/pages/');
        const isConfigPage = window.location.pathname.includes('configuracion.html');
        const isPerfil = window.location.pathname.includes('perfil.html');

        if (!hasConfig && !isConfigPage && !isPerfil) {
            const target = inPages ? 'configuracion.html' : 'pages/configuracion.html';
            console.log('[app] no config found — redirecting to', target);
            window.location.replace(new URL(target, window.location.href).href);
        }
    } catch (e) {
        console.warn('[app] ensureConfigured error', e);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupActions();
    ensureConfigured();
});
