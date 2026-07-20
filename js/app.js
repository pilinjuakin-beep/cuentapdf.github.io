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
            
            // Verificar si estamos en la página del calendario
            if (document.body.dataset.page === 'calendar') {
                const invoiceType = document.querySelector('input[name="invoiceType"]:checked')?.value || 'monthly';
                
                if (invoiceType === 'weekly') {
                    const weekSelect = document.getElementById('weekSelect');
                    const weekIndex = parseInt(weekSelect?.value || '0');
                    
                    if (typeof window.getWeeksInMonth === 'function' && typeof window.currentDate !== 'undefined') {
                        const weeks = window.getWeeksInMonth(window.currentDate.getFullYear(), window.currentDate.getMonth());
                        if (weeks[weekIndex]) {
                            const week = weeks[weekIndex];
                            const invoiceNumber = `Semana ${weekIndex + 1} de ${window.currentDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`;
                            window.generateInvoicePDF(week.start, week.end, invoiceNumber);
                            markDaysAsInvoiced(week.start, week.end, invoiceNumber, 'weekly');
                            return;
                        }
                    }
                } else {
                    // Generar cuenta mensual
                    const year = window.currentDate?.getFullYear() || new Date().getFullYear();
                    const month = window.currentDate?.getMonth() || new Date().getMonth();
                    const startDate = new Date(year, month, 1);
                    const endDate = new Date(year, month + 1, 0);
                    const includeWeekly = document.getElementById('includeWeeklyInMonthly')?.checked || false;
                    const invoiceNumber = `Mes de ${window.currentDate?.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }) || new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`;
                    window.generateInvoicePDF(startDate, endDate, invoiceNumber, includeWeekly, true);
                    markDaysAsInvoicedMonthly(startDate, endDate, invoiceNumber, includeWeekly);
                    return;
                }
            }
            
            // Por defecto, generar cuenta mensual (para otras páginas)
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
