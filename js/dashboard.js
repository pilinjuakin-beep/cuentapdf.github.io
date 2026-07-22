/* dashboard.js
    Script para mostrar las métricas iniciales del tablero (no módulo).
*/

const WEEK_LOCK_KEY = 'cuentaCobro_weekLocks';
const MONTH_LOCK_KEY = 'cuentaCobro_monthLocks';

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

const safeParseJSON = (raw, fallback) => {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch (error) {
        return fallback;
    }
};

const getMonthKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const countWorkingDaysInMonth = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day);
        if (date.getDay() !== 0) {
            workingDays += 1;
        }
    }

    return workingDays;
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
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < weeks.length; i += 1) {
        const weekStart = new Date(weeks[i].start);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weeks[i].end);
        weekEnd.setHours(23, 59, 59, 999);

        if (checkDate >= weekStart && checkDate <= weekEnd) {
            return i;
        }
    }

    return -1;
};

const getMonthEntries = (calendarState, year, month) => {
    const monthKey = getMonthKey(new Date(year, month, 1));
    return Object.entries(calendarState).filter(([key]) => key.startsWith(monthKey));
};

const computeTotalInvoiced = (calendarState) => {
    return Object.values(calendarState).reduce((sum, record) => {
        if (!record.invoiced || record.status !== 'worked') {
            return sum;
        }
        return sum + (Number(record.totalDia) || 0);
    }, 0);
};

const countTotalInvoicedDays = (calendarState) => {
    return Object.values(calendarState).filter(
        (record) => record.invoiced && record.status === 'worked'
    ).length;
};

const computeInvoiceStats = (calendarState, year, month) => {
    const monthEntries = getMonthEntries(calendarState, year, month);
    const weeklyByInvoice = {};
    let monthlyMoney = 0;
    let monthlyDays = 0;
    const monthlyWeeks = new Set();

    monthEntries.forEach(([key, record]) => {
        if (!record.invoiced || record.status !== 'worked') {
            return;
        }

        const [entryYear, entryMonth, entryDay] = key.split('-').map(Number);
        const date = new Date(entryYear, entryMonth - 1, entryDay);
        const amount = Number(record.totalDia) || 0;
        const invoiceNumber = record.invoiceNumber || 'Sin nombre';

        if (record.invoiceType === 'weekly') {
            if (!weeklyByInvoice[invoiceNumber]) {
                weeklyByInvoice[invoiceNumber] = {
                    invoiceNumber,
                    money: 0,
                    days: 0,
                    weekIndex: getWeekIndexForDate(date, year, month)
                };
            }
            weeklyByInvoice[invoiceNumber].money += amount;
            weeklyByInvoice[invoiceNumber].days += 1;
            return;
        }

        monthlyMoney += amount;
        monthlyDays += 1;
        const weekIndex = getWeekIndexForDate(date, year, month);
        if (weekIndex >= 0) {
            monthlyWeeks.add(weekIndex);
        }
    });

    const weekLocks = safeParseJSON(localStorage.getItem(WEEK_LOCK_KEY), {});
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-week-`;
    const weeks = getWeeksInMonth(year, month);

    Object.entries(weekLocks).forEach(([lockKey, lockData]) => {
        if (!lockKey.startsWith(monthPrefix)) {
            return;
        }

        const weekIndex = Number(lockKey.replace(monthPrefix, ''));
        const invoiceNumber = lockData.invoiceNumber || `Semana ${weekIndex + 1}`;

        if (!weeklyByInvoice[invoiceNumber]) {
            weeklyByInvoice[invoiceNumber] = {
                invoiceNumber,
                money: 0,
                days: 0,
                weekIndex
            };
        } else {
            weeklyByInvoice[invoiceNumber].weekIndex = weekIndex;
        }
    });

    const weeklyList = Object.values(weeklyByInvoice)
        .sort((a, b) => {
            if (a.weekIndex >= 0 && b.weekIndex >= 0) {
                return a.weekIndex - b.weekIndex;
            }
            return a.invoiceNumber.localeCompare(b.invoiceNumber, 'es');
        })
        .map((item) => {
            const weekLabel = item.weekIndex >= 0 && weeks[item.weekIndex]
                ? `Semana ${item.weekIndex + 1}: ${weeks[item.weekIndex].label}`
                : item.invoiceNumber;

            return {
                ...item,
                weekLabel
            };
        });

    const monthLocks = safeParseJSON(localStorage.getItem(MONTH_LOCK_KEY), {});
    const monthLock = monthLocks[getMonthKey(new Date(year, month, 1))] || null;

    return {
        monthly: {
            money: monthlyMoney,
            days: monthlyDays,
            weeks: monthlyWeeks.size,
            generated: Boolean(monthLock?.locked),
            invoiceNumber: monthLock?.invoiceNumber || null
        },
        weekly: weeklyList
    };
};

const renderWeeklyInvoiceList = (weeklyStats) => {
    const container = document.getElementById('weeklyInvoiceList');
    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!weeklyStats.length) {
        container.innerHTML = '<p class="muted-text invoice-empty">No hay semanas facturadas este mes.</p>';
        return;
    }

    weeklyStats.forEach((week) => {
        const item = document.createElement('div');
        item.className = 'weekly-invoice-item';
        item.innerHTML = `
            <span class="weekly-invoice-name">${week.weekLabel}</span>
            <span class="weekly-invoice-days">${week.days} día${week.days === 1 ? '' : 's'}</span>
            <span class="weekly-invoice-money">${formatCurrency(week.money)}</span>
        `;
        container.appendChild(item);
    });
};

const renderInvoiceStats = (calendarState, now) => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthLabel = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    const stats = computeInvoiceStats(calendarState, year, month);

    updateText('#invoiceMonthTitle', `Mes actual · ${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)}`);
    updateText('#invoiceMonthSubtitle', 'Resumen de cuentas de cobro generadas en el mes.');
    updateText('#monthlyInvoicedTotal', formatCurrency(stats.monthly.money));
    updateText('#monthlyInvoicedDays', String(stats.monthly.days));
    updateText('#monthlyInvoicedWeeks', String(stats.monthly.weeks));
    updateText('#weeklyCountBadge', `${stats.weekly.length} semana${stats.weekly.length === 1 ? '' : 's'}`);

    const weeklyTotalMoney = stats.weekly.reduce((sum, week) => sum + week.money, 0);
    const weeklyTotalDays = stats.weekly.reduce((sum, week) => sum + week.days, 0);
    updateText('#weeklyInvoicedTotal', formatCurrency(weeklyTotalMoney));
    updateText('#weeklyInvoicedDays', String(weeklyTotalDays));

    const monthlyBadge = document.getElementById('monthlyInvoiceBadge');
    if (monthlyBadge) {
        monthlyBadge.textContent = stats.monthly.generated ? 'Generada' : 'Pendiente';
        monthlyBadge.classList.toggle('invoice-badge--generated', stats.monthly.generated);
    }

    const monthlyNote = document.getElementById('monthlyInvoiceNote');
    if (monthlyNote) {
        if (stats.monthly.generated) {
            monthlyNote.textContent = stats.monthly.invoiceNumber
                ? `Cuenta generada: ${stats.monthly.invoiceNumber}.`
                : 'Cuenta mensual generada.';
        } else if (stats.monthly.days > 0) {
            monthlyNote.textContent = 'Hay días marcados como mensuales, pero la cuenta mensual aún no se ha generado.';
        } else {
            monthlyNote.textContent = 'Aún no has generado la cuenta mensual.';
        }
    }

    renderWeeklyInvoiceList(stats.weekly);
};

const renderDashboard = () => {
    const config = loadConfig();
    const routes = loadRutas();
    const calendarState = loadCalendarState();

    const routeCount = routes.length;

    const now = new Date();
    const monthEntries = getMonthEntries(calendarState, now.getFullYear(), now.getMonth());
    const earned = monthEntries.reduce((sum, [, record]) => {
        const recordTotal = Number(record.totalDia) || 0;
        return sum + recordTotal;
    }, 0);

    const workedDays = monthEntries.filter(([, record]) => record.status === 'worked').length;
    const restDays = monthEntries.filter(([, record]) => record.status === 'rest').length;
    const average = workedDays ? Math.round(earned / workedDays) : 0;
    const workingDaysInMonth = countWorkingDaysInMonth(now.getFullYear(), now.getMonth());
    const projection = Math.round(average * workingDaysInMonth);
    const totalInvoiced = computeTotalInvoiced(calendarState);
    const totalInvoicedDays = countTotalInvoicedDays(calendarState);

    updateText('[data-metric="earned"]', formatCurrency(earned));
    updateText('[data-metric="workedDays"]', String(workedDays));
    updateText('[data-metric="restDays"]', String(restDays));
    updateText('[data-metric="dailyAverage"]', formatCurrency(average));
    updateText('[data-metric="projection"]', formatCurrency(projection));
    updateText('#totalInvoiced', formatCurrency(totalInvoiced));
    updateText(
        '#totalInvoicedLabel',
        totalInvoicedDays
            ? `${totalInvoicedDays} día${totalInvoicedDays === 1 ? '' : 's'} facturado${totalInvoicedDays === 1 ? '' : 's'} en total`
            : 'Todas las cuentas facturadas'
    );

    const welcomeTitle = config ? `Hola, ${config.nombre.split(' ')[0]}` : 'Hola';
    updateText('#welcomeTitle', welcomeTitle);
    updateText('#routeInfo', `Tienes ${routeCount} ruta${routeCount === 1 ? '' : 's'} guardada${routeCount === 1 ? '' : 's'}.`);

    renderInvoiceStats(calendarState, now);
};

const initDashboard = () => {
    if (document.body.dataset.page !== 'home') {
        return;
    }

    renderDashboard();
};

document.addEventListener('DOMContentLoaded', initDashboard);
