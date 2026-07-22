/* calendario.js
   Módulo para el calendario mensual con registro de días trabajados.
*/

const STORAGE_KEY = 'cuentaCobro_calendar';
const WEEK_LOCK_KEY = 'cuentaCobro_weekLocks';
const MONTH_LOCK_KEY = 'cuentaCobro_monthLocks';

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

const getWeekLocks = () => {
    return calendarSafeGet(WEEK_LOCK_KEY, {});
};

const saveWeekLocks = (locks) => {
    try {
        localStorage.setItem(WEEK_LOCK_KEY, JSON.stringify(locks));
    } catch (err) {
        console.warn('Failed to save week locks', err);
    }
};

const getWeekLockKey = (year, month, weekIndex) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-week-${weekIndex}`;
};

const isWeekLocked = (year, month, weekIndex) => {
    const locks = getWeekLocks();
    const key = getWeekLockKey(year, month, weekIndex);
    return locks[key]?.locked || false;
};

const lockWeek = (year, month, weekIndex, invoiceNumber) => {
    const locks = getWeekLocks();
    const key = getWeekLockKey(year, month, weekIndex);
    locks[key] = {
        locked: true,
        invoiceNumber: invoiceNumber,
        lockedAt: new Date().toISOString()
    };
    saveWeekLocks(locks);
};

const unlockWeek = (year, month, weekIndex) => {
    const locks = getWeekLocks();
    const key = getWeekLockKey(year, month, weekIndex);
    if (locks[key]) {
        delete locks[key];
        saveWeekLocks(locks);
    }
};

const getMonthLocks = () => {
    return calendarSafeGet(MONTH_LOCK_KEY, {});
};

const saveMonthLocks = (locks) => {
    try {
        localStorage.setItem(MONTH_LOCK_KEY, JSON.stringify(locks));
    } catch (err) {
        console.warn('Failed to save month locks', err);
    }
};

const getMonthLockKey = (year, month) => {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
};

const isMonthLocked = (year, month) => {
    const locks = getMonthLocks();
    const key = getMonthLockKey(year, month);
    return locks[key]?.locked || false;
};

const lockMonth = (year, month, invoiceNumber) => {
    const locks = getMonthLocks();
    const key = getMonthLockKey(year, month);
    locks[key] = {
        locked: true,
        invoiceNumber: invoiceNumber,
        lockedAt: new Date().toISOString()
    };
    saveMonthLocks(locks);
};

const unlockMonth = (year, month) => {
    const locks = getMonthLocks();
    const key = getMonthLockKey(year, month);
    if (locks[key]) {
        delete locks[key];
        saveMonthLocks(locks);
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
let invoiceType = 'monthly';
let selectedWeek = null;

// Asegurarse de que currentDate siempre esté en el mes actual al inicializar
currentDate = new Date();

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

const getInvoicedStatus = (date) => {
    const key = getDateKey(date);
    return calendarState[key]?.invoiced || false;
};

const getWeeksInMonth = (year, month) => {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let current = new Date(firstDay);
    const dayOfWeek = current.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    current.setDate(current.getDate() + mondayOffset);
    
    while (current <= lastDay) {
        const monday = new Date(current);
        const sunday = new Date(current);
        sunday.setDate(sunday.getDate() + 6);
        
        if (monday.getMonth() === month || sunday.getMonth() === month) {
            weeks.push({
                start: new Date(monday),
                end: new Date(sunday),
                label: `${monday.getDate()} ${monday.toLocaleDateString('es-CO', { month: 'short' })} - ${sunday.getDate()} ${sunday.toLocaleDateString('es-CO', { month: 'short' })}`
            });
        }
        
        current.setDate(current.getDate() + 7);
    }
    
    return weeks;
};

const getWeekIndexForDate = (date, year, month) => {
    const weeks = getWeeksInMonth(year, month);
    for (let i = 0; i < weeks.length; i++) {
        const week = weeks[i];
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const weekStart = new Date(week.start);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(week.end);
        weekEnd.setHours(23, 59, 59, 999);
        
        if (checkDate >= weekStart && checkDate <= weekEnd) {
            return i;
        }
    }
    return -1;
};

const populateWeekSelector = () => {
    const weekSelect = document.getElementById('weekSelect');
    if (!weekSelect) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const weeks = getWeeksInMonth(year, month);
    
    weekSelect.innerHTML = '';
    weeks.forEach((week, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Semana ${index + 1}: ${week.label}`;
        weekSelect.appendChild(option);
    });
    
    if (weeks.length > 0) {
        // Auto-seleccionar la semana que contiene la fecha actual
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar la fecha actual
        let currentWeekIndex = 0;
        
        for (let i = 0; i < weeks.length; i++) {
            const week = weeks[i];
            const weekStart = new Date(week.start);
            const weekEnd = new Date(week.end);
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(23, 59, 59, 999);
            
            if (today >= weekStart && today <= weekEnd) {
                currentWeekIndex = i;
                break;
            }
        }
        
        selectedWeek = currentWeekIndex;
        weekSelect.value = currentWeekIndex;
    }
    
    updateUnlockWeekButton();
};

const updateUnlockWeekButton = () => {
    const unlockBtn = document.getElementById('unlockWeekBtn');
    const weekSelect = document.getElementById('weekSelect');
    if (!unlockBtn || !weekSelect) return;
    
    const weekIndex = parseInt(weekSelect.value);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (isWeekLocked(year, month, weekIndex)) {
        unlockBtn.classList.remove('hidden');
    } else {
        unlockBtn.classList.add('hidden');
    }
};

const handleUnlockWeek = () => {
    const weekSelect = document.getElementById('weekSelect');
    if (!weekSelect) return;
    
    const weekIndex = parseInt(weekSelect.value);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (!isWeekLocked(year, month, weekIndex)) {
        alert('Esta semana no está bloqueada.');
        return;
    }
    
    const locks = getWeekLocks();
    const lockKey = getWeekLockKey(year, month, weekIndex);
    const invoiceNumber = locks[lockKey]?.invoiceNumber || 'esta cuenta de cobro';
    
    if (confirm(`⚠️ ¿Estás seguro de desbloquear la semana ${weekIndex + 1}?\n\nEsta acción permitirá editar los días de esta semana que fue facturada como "${invoiceNumber}".\n\nEl desbloqueo no elimina el registro de facturación, solo permite modificaciones.`)) {
        unlockWeek(year, month, weekIndex);
        updateUnlockWeekButton();
        renderCalendar();
        alert('Semana desbloqueada correctamente. Ahora puedes editar los días de esta semana.');
    }
};

const updateUnlockMonthButton = () => {
    const unlockBtn = document.getElementById('unlockMonthBtn');
    if (!unlockBtn) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (isMonthLocked(year, month)) {
        unlockBtn.classList.remove('hidden');
    } else {
        unlockBtn.classList.add('hidden');
    }
};

const handleUnlockMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (!isMonthLocked(year, month)) {
        alert('Este mes no está bloqueado.');
        return;
    }
    
    const locks = getMonthLocks();
    const lockKey = getMonthLockKey(year, month);
    const invoiceNumber = locks[lockKey]?.invoiceNumber || 'esta cuenta de cobro mensual';
    
    if (confirm(`⚠️ ¿Estás seguro de desbloquear el mes ${year}-${String(month + 1).padStart(2, '0')}?\n\nEsta acción permitirá editar los días de este mes que fue facturado como "${invoiceNumber}".\n\nEl desbloqueo no elimina el registro de facturación, solo permite modificaciones.`)) {
        unlockMonth(year, month);
        updateUnlockMonthButton();
        renderCalendar();
        alert('Mes desbloqueado correctamente. Ahora puedes editar los días de este mes.');
    }
};

const markDaysAsInvoiced = (startDate, endDate, invoiceNumber, invoiceType = 'monthly') => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = getDateKey(d);
        if (calendarState[key]) {
            calendarState[key].invoiced = true;
            calendarState[key].invoiceNumber = invoiceNumber;
            calendarState[key].invoiceType = invoiceType;
        }
    }
    
    calendarSaveCalendarState(calendarState);
    
    // Si es factura semanal, bloquear la semana
    if (invoiceType === 'weekly') {
        const weekSelect = document.getElementById('weekSelect');
        if (weekSelect) {
            const currentWeekIndex = parseInt(weekSelect.value);
            lockWeek(currentDate.getFullYear(), currentDate.getMonth(), currentWeekIndex, invoiceNumber);
            
            const weeks = getWeeksInMonth(currentDate.getFullYear(), currentDate.getMonth());
            
            if (currentWeekIndex < weeks.length - 1) {
                weekSelect.value = currentWeekIndex + 1;
                selectedWeek = currentWeekIndex + 1;
                weekSelect.dispatchEvent(new Event('change'));
            }
        }
    }
    
    renderCalendar();
};

window.markDaysAsInvoiced = markDaysAsInvoiced;

const markDaysAsInvoicedMonthly = (startDate, endDate, invoiceNumber, includeWeekly) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = getDateKey(d);
        if (calendarState[key]) {
            // Solo marcar como mensual si no está facturado semanalmente o si el usuario quiere incluir semanales
            if (!calendarState[key].invoiced || includeWeekly || calendarState[key].invoiceType !== 'weekly') {
                calendarState[key].invoiced = true;
                calendarState[key].invoiceNumber = invoiceNumber;
                calendarState[key].invoiceType = 'monthly';
            }
        }
    }
    
    calendarSaveCalendarState(calendarState);
    
    // Bloquear el mes automáticamente
    const year = start.getFullYear();
    const month = start.getMonth();
    lockMonth(year, month, invoiceNumber);
    
    renderCalendar();
};

window.markDaysAsInvoicedMonthly = markDaysAsInvoicedMonthly;

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

    const key = getDateKey(date);
    if (calendarState[key]?.invoiced) {
        const invoiceType = calendarState[key].invoiceType || 'monthly';
        if (invoiceType === 'weekly') {
            button.classList.add('calendar-day--invoiced-weekly');
        } else {
            button.classList.add('calendar-day--invoiced-monthly');
        }
    }

    // Verificar bloqueos - el semanal tiene prioridad visual sobre el mensual
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Primero aplicar bloqueo mensual si existe
    if (isMonthLocked(year, month)) {
        button.classList.add('calendar-day--month-locked');
    }
    
    // Luego aplicar bloqueo semanal si existe (tendrá prioridad visual)
    const weekIndex = getWeekIndexForDate(date, year, month);
    if (weekIndex >= 0 && isWeekLocked(year, month, weekIndex)) {
        button.classList.add('calendar-day--week-locked');
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

    if (invoiceType === 'weekly') {
        populateWeekSelector();
    }

    const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
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
    { id: 'add_davita', label: 'Davita', value: 40000 },
    { id: 'add_sabana_larga', label: 'Sabana Larga', value: 80000 }
];
const DEFAULT_ROUTES = [
    { id: 'route_barranquilla_completo', nombre: 'Barranquilla día completo', valor: 100000 },
    { id: 'route_barranquilla_medio', nombre: 'Barranquilla medio día', valor: 50000 }
];
const HOURLY_RATE = 8000;

const getRouteOptions = (storedRoutes) => {
    const allRoutes = [...DEFAULT_ROUTES, ...storedRoutes];
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

    // Verificar si la semana está bloqueada
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const weekIndex = getWeekIndexForDate(date, year, month);
    if (weekIndex >= 0 && isWeekLocked(year, month, weekIndex)) {
        const locks = getWeekLocks();
        const lockKey = getWeekLockKey(year, month, weekIndex);
        const invoiceNumber = locks[lockKey]?.invoiceNumber || 'esta cuenta de cobro';
        
        if (!confirm(`⚠️ Esta semana ya fue facturada (${invoiceNumber}).\n\nPara editar este día necesitas desbloquear la semana primero.\n\n¿Deseas desbloquear esta semana y continuar con la edición?`)) {
            return;
        }
        
        // Desbloquear la semana si el usuario confirma
        unlockWeek(year, month, weekIndex);
        renderCalendar();
    }
    
    // Verificar si el mes está bloqueado (sistema separado)
    if (isMonthLocked(year, month)) {
        const locks = getMonthLocks();
        const lockKey = getMonthLockKey(year, month);
        const invoiceNumber = locks[lockKey]?.invoiceNumber || 'esta cuenta de cobro mensual';
        
        if (!confirm(`⚠️ Este mes ya fue facturado (${invoiceNumber}).\n\nPara editar este día necesitas desbloquear el mes primero.\n\n¿Deseas desbloquear este mes y continuar con la edición?`)) {
            return;
        }
        
        // Desbloquear el mes si el usuario confirma
        unlockMonth(year, month);
        renderCalendar();
    }

    // Verificar si el día está facturado
    if (record.invoiced) {
        const invoiceNumber = record.invoiceNumber || 'cuenta de cobro';
        if (!confirm(`Este día ya está incluido en ${invoiceNumber}. ¿Quieres editar esta cuenta de cobro del día ${date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}?`)) {
            return;
        }
    }

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
    
    // Validación: debe haber al menos una ruta, adicional o horas extras
    if (selectedRoutes.length === 0 && selectedAdditions.length === 0 && extraHours === 0) {
        alert('Debes seleccionar al menos una ruta, adicional o horas extras para guardar el día trabajado.');
        return;
    }
    
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
    document.getElementById('prevMonth')?.addEventListener('click', () => { 
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1); 
        renderCalendar(); 
        updateUnlockMonthButton();
    });
    document.getElementById('nextMonth')?.addEventListener('click', () => { 
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1); 
        renderCalendar(); 
        updateUnlockMonthButton();
    });
    
    document.querySelectorAll('input[name="invoiceType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            invoiceType = e.target.value;
            const weekSelector = document.getElementById('weekSelector');
            const monthlyOptions = document.getElementById('monthlyOptions');
            
            if (weekSelector) {
                weekSelector.classList.toggle('hidden', invoiceType !== 'weekly');
                if (invoiceType === 'weekly') {
                    populateWeekSelector();
                }
            }
            
            if (monthlyOptions) {
                monthlyOptions.classList.toggle('hidden', invoiceType !== 'monthly');
            }
        });
    });
    
    document.getElementById('weekSelect')?.addEventListener('change', (e) => {
        selectedWeek = parseInt(e.target.value);
        updateUnlockWeekButton();
    });
    
    document.getElementById('unlockWeekBtn')?.addEventListener('click', handleUnlockWeek);
    document.getElementById('unlockMonthBtn')?.addEventListener('click', handleUnlockMonth);

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
    
    // Asegurar que currentDate esté en el mes actual
    currentDate = new Date();
    
    calendarState = calendarLoadCalendarState();
    bindCalendarEvents();
    renderCalendarSummary();
    renderCalendar();
    updateUnlockMonthButton();
};

window.initCalendar = initCalendar;
window.currentDate = currentDate;
window.getWeeksInMonth = getWeeksInMonth;
window.addEventListener('DOMContentLoaded', initCalendar);
