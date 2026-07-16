/* calendario.js
   Módulo para el calendario mensual con registro de días trabajados.
*/

const STORAGE_KEY = 'cuentaCobro_calendar';

const safeGet = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
        console.warn(`LocalStorage parse error for ${key}, resetting.`, err);
        try { localStorage.removeItem(key); } catch (e) {}
        return fallback;
    }
};

const loadRutas = () => {
    if (typeof window.loadRutas === 'function') return window.loadRutas();
    return safeGet('cuentaCobro_rutas', []);
};

const loadCalendarState = () => {
    if (typeof window.loadCalendarState === 'function') return window.loadCalendarState();
    return safeGet(STORAGE_KEY, {});
};

const saveCalendarState = (state) => {
    if (typeof window.saveCalendarState === 'function') return window.saveCalendarState(state || calendarState);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state || calendarState));
    } catch (err) {
        console.warn('Failed to save calendar state', err);
    }
};

let currentDate = new Date();
let calendarState = {};
let selectedDateKey = '';

const getMonthLabel = (date) => {
    return date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
};

const getDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(value);
};

const getDayStatus = (date) => {
    const key = getDateKey(date);
    return calendarState[key]?.status || 'none';
};

const updateText = (selector, text) => {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = text;
    }
};

const renderCalendarSummary = () => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthEntries = Object.entries(calendarState).filter(([key]) => key.startsWith(monthKey));
    const earned = monthEntries.reduce((sum, [, record]) => sum + (Number(record.totalDia) || 0), 0);

    updateText('#monthTotal', formatCurrency(earned));
    updateText('#monthLabel', now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }));
};

const createCalendarCell = (date, isCurrentMonth) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    if (!isCurrentMonth) {
        button.classList.add('calendar-day--disabled');
    }

    const dayNumber = document.createElement('span');
    dayNumber.textContent = date.getDate();
    button.appendChild(dayNumber);

    const status = getDayStatus(date);
    if (status === 'worked') {
        button.classList.add('calendar-day--worked');
    } else if (status === 'rest') {
        button.classList.add('calendar-day--rest');
    }

    if (getDateKey(date) === getDateKey(new Date())) {
        button.classList.add('calendar-day--today');
    }

    button.addEventListener('click', () => {
        if (!isCurrentMonth) return;
        openDayModal(date);
    });

    return button;
};

const renderCalendar = () => {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('calendarMonth');
    if (!grid || !monthLabel) return;

    monthLabel.textContent = getMonthLabel(currentDate);
    grid.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const showDays = [];
    const prevDays = startDay === 0 ? 6 : startDay - 1;
    for (let i = prevDays; i > 0; i -= 1) {
        showDays.push(new Date(year, month, 1 - i));
    }

    for (let i = 1; i <= daysInMonth; i += 1) {
        showDays.push(new Date(year, month, i));
    }

    const remaining = 42 - showDays.length;
    for (let i = 1; i <= remaining; i += 1) {
        showDays.push(new Date(year, month + 1, i));
    }

    showDays.forEach((date) => {
        const isCurrentMonth = date.getMonth() === month;
        grid.appendChild(createCalendarCell(date, isCurrentMonth));
    });
};

const ADDITIONAL_OPTIONS = [
    { id: 'add_galapa', label: 'Galapa', value: 15000 },
    { id: 'add_cienaga', label: 'Ciénaga', value: 25000 },
    { id: 'add_lomita', label: 'Lomita de Arena', value: 25000 }
];
const DEFAULT_ROUTE = { id: 'route_barranquilla', nombre: 'Barranquilla', valor: 100000 };
const HOURLY_RATE = 8000;

const getRouteOptions = (storedRoutes) => {
    const allRoutes = [DEFAULT_ROUTE, ...storedRoutes];
    return allRoutes.reduce((unique, route) => {
        if (!unique.some((item) => item.id === route.id)) {
            unique.push(route);
        }
        return unique;
    }, []);
};

const getSelectedRoutesValue = (selectedRouteIds, storedRoutes) => {
    const options = getRouteOptions(storedRoutes);
    return options.reduce((total, route) => {
        if (selectedRouteIds.includes(route.id)) {
            return total + Number(route.valor);
        }
        return total;
    }, 0);
};

const calculateDayTotal = ({ selectedRouteIds, selectedAdditions, hours }) => {
    const routes = loadRutas();
    const routeTotal = getSelectedRoutesValue(selectedRouteIds, routes);
    const additionsTotal = selectedAdditions.reduce((sum, item) => sum + Number(item.value), 0);
    const hoursTotal = Number(hours) * HOURLY_RATE;
    return routeTotal + additionsTotal + hoursTotal;
};

const openDayModal = (date) => {
    selectedDateKey = getDateKey(date);
    const modal = document.getElementById('dayModal');
    const title = document.getElementById('modalDayTitle');
    const subtitle = document.getElementById('modalSubtitle');
    const details = document.getElementById('modalDetails');
    const routeCheckboxes = document.getElementById('routeCheckboxes');
    const additionsCheckboxes = document.getElementById('additionsCheckboxes');
    const extraHours = document.getElementById('extraHours');
    const hourRate = document.getElementById('hourRate');
    const hoursTotal = document.getElementById('hoursTotal');

    if (!modal || !title || !subtitle || !details || !routeCheckboxes || !additionsCheckboxes || !extraHours || !hourRate || !hoursTotal) return;

    const record = calendarState[selectedDateKey] || {
        status: 'none',
        routes: [],
        adicionales: [],
        horasExtras: { cantidad: 0, valorPorHora: HOURLY_RATE },
    };

    title.textContent = `¿Trabajaste el ${date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}?`;
    subtitle.textContent = 'Selecciona la opción correspondiente para guardar tu jornada.';
    details.classList.add('hidden');
    routeCheckboxes.innerHTML = '';
... (file truncated)