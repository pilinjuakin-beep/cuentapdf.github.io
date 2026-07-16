/* calendario.js
   Módulo para el calendario mensual con registro de días trabajados.
*/

const STORAGE_KEY = 'cuentaCobro_calendar';

const calendarSafeGet = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
        console.warn(`LocalStorage parse error for ${key}, resetting.`, err);
        try { localStorage.removeItem(key); } catch (e) {}
        return fallback;
    }
};

const calendarLoadRutas = () => {
    if (typeof window.loadRutas === 'function') return window.loadRutas();
    return calendarSafeGet('cuentaCobro_rutas', []);
};

const calendarLoadCalendarState = () => {
    if (typeof window.loadCalendarState === 'function') return window.loadCalendarState();
    return calendarSafeGet(STORAGE_KEY, {});
};

const calendarSaveCalendarState = (state) => {
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

const getDateLabelFromKey = (dateKey, capitalizeFirst = false) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const label = new Date(year, month - 1, day).toLocaleDateString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    return capitalizeFirst ? label.charAt(0).toUpperCase() + label.slice(1) : label;
};

const setModalTitle = (text) => {
    const title = document.getElementById('modalDayTitle');
    if (title) title.textContent = text;
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

    const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    dayNames.forEach(day => {
        const dayNameCell = document.createElement('div');
        dayNameCell.classList.add('calendar-day', 'day-name');
        dayNameCell.textContent = day;
        grid.appendChild(dayNameCell);
    });

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
    { id: 'add_lomita', label: 'Lomita de Arena', value: 25000 },
    { id: 'add_davita', label: 'Davita', value: 40000 }
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
    const routes = calendarLoadRutas();
    const routeTotal = getSelectedRoutesValue(selectedRouteIds, routes);
    const additionsTotal = selectedAdditions.reduce((sum, item) => sum + Number(item.value), 0);
    const hoursTotal = Number(hours) * HOURLY_RATE;
    return routeTotal + additionsTotal + hoursTotal;
};

const getDaySummary = (record) => {
    if (record.status === 'worked') {
        return `Trabajaste. Total del día: ${formatCurrency(record.totalDia || 0)}`;
    }
    if (record.status === 'rest') {
        const motivo = record.motivo?.trim();
        return motivo ? `Día faltado: ${motivo}` : 'Día faltado registrado.';
    }
    return '';
};

const getRestReasonValue = () => document.getElementById('restReason')?.value?.trim() || '';

const setRestReasonError = (visible) => {
    const restReason = document.getElementById('restReason');
    const error = document.getElementById('restReasonError');
    restReason?.classList.toggle('input-invalid', visible);
    error?.classList.toggle('hidden', !visible);
};

const syncRestSaveState = () => {
    const saveButton = document.getElementById('modalSaveRest');
    const hasMotivo = getRestReasonValue().length > 0;
    if (saveButton) saveButton.disabled = !hasMotivo;
    if (hasMotivo) setRestReasonError(false);
};

const setModalView = (view) => {
    const initial = document.getElementById('modalInitialActions');
    const existing = document.getElementById('modalExistingActions');
    const details = document.getElementById('modalDetails');
    const restDetails = document.getElementById('modalRestDetails');

    initial?.classList.toggle('hidden', view !== 'new');
    existing?.classList.toggle('hidden', view !== 'existing');
    details?.classList.toggle('hidden', view !== 'edit');
    restDetails?.classList.toggle('hidden', view !== 'rest');
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
    routeCheckboxes.innerHTML = '';

    const stored = calendarLoadRutas();
    const opts = getRouteOptions(stored);
    const container = document.createElement('div');
    container.className = 'route-checkbox-grid';
    opts.forEach((r) => {
        const label = document.createElement('label');
        label.className = 'route-checkbox';
        const checked = record.routes?.includes(r.id) ? 'checked' : '';
        label.innerHTML = `<input type="checkbox" value="${r.id}" ${checked}><span>${r.nombre} - ${formatCurrency(r.valor)}</span>`;
        container.appendChild(label);
    });
    routeCheckboxes.appendChild(container);

    additionsCheckboxes.innerHTML = '';
    const containerAdd = document.createElement('div');
    containerAdd.className = 'route-checkbox-grid';
    ADDITIONAL_OPTIONS.forEach((a) => {
        const label = document.createElement('label');
        label.className = 'route-checkbox';
        const checked = record.adicionales?.some((x) => x.id === a.id) ? 'checked' : '';
        label.innerHTML = `<input type="checkbox" value="${a.id}" data-value="${a.value}" ${checked}><span>${a.label} - ${formatCurrency(a.value)}</span>`;
        containerAdd.appendChild(label);
    });
    additionsCheckboxes.appendChild(containerAdd);

    extraHours.value = record.horasExtras?.cantidad || 0;
    hourRate.value = HOURLY_RATE;
    hoursTotal.textContent = formatCurrency((record.horasExtras?.cantidad || 0) * HOURLY_RATE);

    const dayTotal = document.getElementById('dayTotalValue');
    if (dayTotal) dayTotal.textContent = formatCurrency(record.totalDia || 0);

    const updateTotals = () => {
        const selectedRouteIds = Array.from(document.querySelectorAll('#routeCheckboxes input[type="checkbox"]')).filter((i) => i.checked).map((i) => i.value);
        const selectedAdditions = Array.from(document.querySelectorAll('#additionsCheckboxes input[type="checkbox"]')).filter((i) => i.checked).map((i) => ({ id: i.value, value: Number(i.dataset.value || 0) }));
        const hours = Number(document.getElementById('extraHours')?.value) || 0;
        const total = calculateDayTotal({ selectedRouteIds, selectedAdditions, hours });
        if (document.getElementById('hoursTotal')) document.getElementById('hoursTotal').textContent = formatCurrency(hours * HOURLY_RATE);
        if (document.getElementById('dayTotalValue')) document.getElementById('dayTotalValue').textContent = formatCurrency(total);
    };

    container.addEventListener('change', updateTotals);
    containerAdd.addEventListener('change', updateTotals);
    document.getElementById('extraHours')?.addEventListener('input', updateTotals);

    const dateLabel = date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    const hasRecord = record.status === 'worked' || record.status === 'rest';

    if (hasRecord) {
        title.textContent = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
        subtitle.textContent = getDaySummary(record);
        setModalView('existing');
    } else {
        title.textContent = `¿Trabajaste el ${dateLabel}?`;
        subtitle.textContent = 'Selecciona la opción correspondiente para guardar tu jornada.';
        setModalView('new');
    }

    modal.classList.remove('hidden');
};

const handleDayDecision = (worked) => {
    if (!selectedDateKey) return;
    const subtitle = document.getElementById('modalSubtitle');
    const dateLabel = getDateLabelFromKey(selectedDateKey);

    if (worked) {
        setModalTitle(`Registro del ${dateLabel}`);
        setModalView('edit');
        if (subtitle) subtitle.textContent = 'Marca rutas, adicionales y horas extras, luego guarda.';
    } else {
        const restReason = document.getElementById('restReason');
        const record = calendarState[selectedDateKey];
        if (restReason) restReason.value = record?.motivo || '';
        setModalTitle(`No trabajaste el ${dateLabel}`);
        setModalView('rest');
        syncRestSaveState();
        restReason?.focus();
        if (subtitle) subtitle.textContent = 'Indica el motivo por el cual no trabajaste ese día.';
    }
};

const closeDayModal = () => {
    const modal = document.getElementById('dayModal');
    if (!modal) return;
    modal.classList.add('hidden');
    const restReason = document.getElementById('restReason');
    if (restReason) restReason.value = '';
    setRestReasonError(false);
    syncRestSaveState();
    setModalView('new');
    selectedDateKey = '';
};

const handleEditDay = () => {
    if (!selectedDateKey) return;
    const record = calendarState[selectedDateKey];
    const subtitle = document.getElementById('modalSubtitle');
    if (!record || record.status === 'none') return;

    if (record.status === 'worked') {
        setModalTitle(`Registro del ${getDateLabelFromKey(selectedDateKey)}`);
        setModalView('edit');
        if (subtitle) subtitle.textContent = 'Modifica rutas, adicionales y horas extras, luego guarda.';
        return;
    }

    const restReason = document.getElementById('restReason');
    if (restReason) restReason.value = record.motivo || '';
    setModalTitle(`No trabajaste el ${getDateLabelFromKey(selectedDateKey)}`);
    setModalView('rest');
    syncRestSaveState();
    restReason?.focus();
    if (subtitle) subtitle.textContent = 'Modifica el motivo de tu ausencia y guarda.';
};

const deleteDayRecord = () => {
    if (!selectedDateKey) return;
    delete calendarState[selectedDateKey];
    calendarSaveCalendarState(calendarState);
    renderCalendar();
    renderCalendarSummary();
    closeDayModal();
};

const saveRestDayRecord = (event) => {
    event?.preventDefault();
    if (!selectedDateKey) return;

    const motivo = getRestReasonValue();
    if (!motivo) {
        setRestReasonError(true);
        document.getElementById('restReason')?.focus();
        return;
    }

    calendarState[selectedDateKey] = {
        status: 'rest',
        motivo,
        routes: [],
        adicionales: [],
        horasExtras: { cantidad: 0, valorPorHora: HOURLY_RATE },
        totalDia: 0
    };

    calendarSaveCalendarState(calendarState);
    renderCalendar();
    renderCalendarSummary();
    closeDayModal();
};

const saveDayRecord = () => {
    if (!selectedDateKey) return;
    const routeInputs = Array.from(document.querySelectorAll('#routeCheckboxes input[type="checkbox"]'));
    const additionInputs = Array.from(document.querySelectorAll('#additionsCheckboxes input[type="checkbox"]'));
    const extraHours = Number(document.getElementById('extraHours')?.value) || 0;

    const selectedRoutes = routeInputs.filter((i) => i.checked).map((i) => i.value);
    const selectedAdditions = additionInputs.filter((i) => i.checked).map((i) => ({ id: i.value, value: Number(i.dataset.value || 0) }));
    const total = calculateDayTotal({ selectedRouteIds: selectedRoutes, selectedAdditions, hours: extraHours });

    calendarState[selectedDateKey] = {
        status: 'worked',
        routes: selectedRoutes,
        adicionales: selectedAdditions,
        horasExtras: { cantidad: extraHours, valorPorHora: HOURLY_RATE, total: extraHours * HOURLY_RATE },
        totalDia: total
    };

    calendarSaveCalendarState(calendarState);
    renderCalendar();
    renderCalendarSummary();
    closeDayModal();
};

const bindCalendarEvents = () => {
    document.getElementById('prevMonth')?.addEventListener('click', () => { currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1); renderCalendar(); });
    document.getElementById('nextMonth')?.addEventListener('click', () => { currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1); renderCalendar(); });

    document.getElementById('modalYes')?.addEventListener('click', () => handleDayDecision(true));
    document.getElementById('modalNo')?.addEventListener('click', () => handleDayDecision(false));
    document.getElementById('modalEdit')?.addEventListener('click', handleEditDay);
    document.getElementById('modalDelete')?.addEventListener('click', deleteDayRecord);
    document.getElementById('modalCloseExisting')?.addEventListener('click', closeDayModal);
    document.getElementById('restDayForm')?.addEventListener('submit', saveRestDayRecord);
    document.getElementById('restReason')?.addEventListener('input', syncRestSaveState);
    document.getElementById('modalCancelRest')?.addEventListener('click', closeDayModal);
    document.getElementById('modalSave')?.addEventListener('click', saveDayRecord);
    document.getElementById('modalCancel')?.addEventListener('click', closeDayModal);
};

let calendarInitialized = false;

const initCalendar = () => {
    if (document.body.dataset.page !== 'calendar') return;
    if (calendarInitialized) return;
    calendarInitialized = true;
    
    calendarState = calendarLoadCalendarState();
    bindCalendarEvents();
    renderCalendarSummary();
    renderCalendar();
};

window.initCalendar = initCalendar;
window.addEventListener('DOMContentLoaded', initCalendar);
