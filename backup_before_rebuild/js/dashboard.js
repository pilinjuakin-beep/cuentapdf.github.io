/* dashboard.js
    Script para mostrar las métricas iniciales del tablero (no módulo).
*/

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(value);
};

const updateText = (selector, text) => {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = text;
    }
};

const renderDashboard = () => {
    const config = loadConfig();
    const routes = loadRutas();
    const calendarState = loadCalendarState();

    const totalRouteValue = routes.reduce((sum, route) => sum + Number(route.valor), 0);
    const routeCount = routes.length;

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthEntries = Object.entries(calendarState).filter(([key]) => key.startsWith(monthKey));
    const earned = monthEntries.reduce((sum, [, record]) => {
        const recordTotal = Number(record.totalDia) || 0;
        return sum + recordTotal;
    }, 0);

    const workedDays = monthEntries.filter(([, record]) => record.status === 'worked').length;
    const restDays = monthEntries.filter(([, record]) => record.status === 'rest').length;
    const average = workedDays ? Math.round(earned / workedDays) : 0;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projection = Math.round(average * daysInMonth);

    updateText('[data-metric="earned"]', formatCurrency(earned));
    updateText('[data-metric="workedDays"]', String(workedDays));
    updateText('[data-metric="restDays"]', String(restDays));
    updateText('[data-metric="dailyAverage"]', formatCurrency(average));
    updateText('[data-metric="projection"]', formatCurrency(projection));
    updateText('#monthTotal', formatCurrency(earned));
    updateText('#monthLabel', now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }));

    const welcomeTitle = config ? `Hola, ${config.nombre.split(' ')[0]}` : 'Hola';
    updateText('#welcomeTitle', welcomeTitle);
    updateText('#routeInfo', `Tienes ${routeCount} ruta${routeCount === 1 ? '' : 's'} guardada${routeCount === 1 ? '' : 's'}.`);
};

const initDashboard = () => {
    if (document.body.dataset.page !== 'home') {
        return;
    }

n    renderDashboard();
};

document.addEventListener('DOMContentLoaded', initDashboard);
