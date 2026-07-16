(function() {
    /* pdf.js
       Generación básica de PDF con datos de la aplicación.
       Usa la API de impresión del navegador para descargar un PDF.
    */

    const pdfFormatCurrency = (value) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(value);
    };

const pdfGetConfig = () => {
    try {
        const raw = localStorage.getItem('cuentaCobro_config');
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
};

const pdfGetCalendarState = () => {
    try {
        const raw = localStorage.getItem('cuentaCobro_calendar');
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        return {};
    }
};

const pdfGetRoutes = () => {
    if (typeof window.loadRutas === 'function') return window.loadRutas();
    try {
        const raw = localStorage.getItem('cuentaCobro_rutas');
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
};

const ADDITIONAL_OPTIONS = [
    { id: 'add_galapa', label: 'viaje a Galapa', value: 15000 },
    { id: 'add_cienaga', label: 'viaje a Ciénaga', value: 25000 },
    { id: 'add_lomita', label: 'viaje a Lomita de Arena', value: 25000 },
    { id: 'add_davita', label: 'viaje a Davita', value: 40000 }
];

const getRouteName = (routeId, routes) => {
    const route = routes.find((item) => item.id === routeId);
    if (route) return route.nombre || route.id;
    return routeId.replace(/route_/i, '').replace(/_/g, ' ');
};

const getAdditionLabel = (additionId) => {
    const option = ADDITIONAL_OPTIONS.find((item) => item.id === additionId);
    return option ? option.label : additionId;
};

const parseLocalDate = (isoDate) => {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const formatDateLabel = (isoDate) => {
    const date = parseLocalDate(isoDate);
    return date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
};

const pdfNumberToWords = (value) => {
    const number = Math.floor(Math.abs(Number(value) || 0));
    if (number === 0) return 'cero pesos';

    const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    const convertUnderHundred = (n) => {
        if (n < 10) return units[n];
        if (n < 20) return teens[n - 10];
        if (n < 30) {
            return n === 20 ? 'veinte' : `veinti${units[n - 20]}`;
        }
        const ten = Math.floor(n / 10);
        const unit = n % 10;
        return unit === 0 ? tens[ten] : `${tens[ten]} y ${units[unit]}`;
    };

    const convertUnderThousand = (n) => {
        if (n === 0) return '';
        if (n === 100) return 'cien';
        const hundred = Math.floor(n / 100);
        const remainder = n % 100;
        const hundredText = hundred > 0 ? `${hundreds[hundred]}${remainder === 0 ? '' : ' '}` : '';
        return `${hundredText}${convertUnderHundred(remainder)}`.trim();
    };

    const millions = Math.floor(number / 1000000);
    const thousands = Math.floor((number % 1000000) / 1000);
    const remainder = number % 1000;
    const parts = [];

    if (millions > 0) {
        parts.push(millions === 1 ? 'un millón' : `${convertUnderThousand(millions)} millones`);
    }
    if (thousands > 0) {
        parts.push(thousands === 1 ? 'mil' : `${convertUnderThousand(thousands)} mil`);
    }
    if (remainder > 0) {
        parts.push(convertUnderThousand(remainder));
    }

    return `${parts.join(' ').trim()} pesos`;
};

const pdfBuildConceptLine = (date, record, routes) => {
    if (record.status === 'rest') {
        const motivo = record.motivo?.trim() || 'Sin motivo indicado';
        return `${formatDateLabel(date)}: Dia faltado - ${motivo} = ${pdfFormatCurrency(0)}`;
    }

    if (record.status !== 'worked') {
        return null;
    }

    const routeNames = (record.routes || []).map((id) => getRouteName(id, routes));
    const additionNames = (record.adicionales || []).map((item) => getAdditionLabel(item.id));
    const hoursText = Number(record.horasExtras?.cantidad || 0) > 0 ? `${record.horasExtras.cantidad} horas extras` : '';

    const items = [...routeNames, ...additionNames, hoursText].filter(Boolean);
    const description = items.join(' + ');
    return `${formatDateLabel(date)}: ${description} = ${pdfFormatCurrency(Number(record.totalDia) || 0)}`;
};

const pdfBuildContent = () => {
    const config = pdfGetConfig() || {};
    const calendarState = pdfGetCalendarState();
    const routes = pdfGetRoutes();
    const today = new Date();
    const issueDate = today.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const entries = Object.entries(calendarState).sort(([a], [b]) => a.localeCompare(b));
    const registeredEntries = entries.filter(([, record]) => record.status === 'worked' || record.status === 'rest');
    const earned = entries.reduce((sum, [, record]) => sum + (Number(record.totalDia) || 0), 0);
    const conceptLines = registeredEntries
        .map(([date, record]) => pdfBuildConceptLine(date, record, routes))
        .filter(Boolean);

    return {
        issueDate,
        config,
        totalText: pdfFormatCurrency(earned),
        totalTextWords: pdfNumberToWords(earned),
        conceptLines,
        earned
    };
};

const pdfEscapeText = (text) => {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
};

const pdfBuildTextLines = () => {
    const { issueDate, config, totalText, totalTextWords, conceptLines } = pdfBuildContent();
    const lines = [
        'CUENTA DE COBRO',
        `Fecha: ${issueDate}`,
        '',
        'EMPRESA:',
        `${config.empresa || 'Empresa no definida'}`,
        `NIT: ${config.nit || 'N/A'}`,
        '',
        'DEBE A:',
        `${config.nombre || 'Nombre no definido'}`,
        `C.C. ${config.cedula || 'N/A'}`,
        '',
        'LA SUMA DE:',
        `${totalText}`,
        `${totalTextWords}`,
        '',
        'REGISTRO DE DIAS:',
        ...conceptLines,
        '',
        'TOTAL:',
        `${totalText}`,
        '',
        'Cordialmente,',
        `${config.nombre || '---'}`,
        `C.C. ${config.cedula || '---'}`,
        `Nro. Cuenta ${config.numeroCuenta || '---'}`,
        `Tipo de cuenta: ${config.tipoCuenta || '---'}`
    ];
    return lines.map(pdfEscapeText);
};

const pdfCreateBlob = (lines) => {
    const content = [
        'BT',
        '/F1 10 Tf',
        '14 TL',
        '50 780 Td',
        ...lines.map((line) => `(${line}) Tj T*`),
        'ET'
    ].join('\n');

    const header = '%PDF-1.3\n%âãÏÓ\n';
    const objects = [];
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    objects.push('2 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n');
    objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
    objects.push('4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>\nendobj\n');
    objects.push(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

    const encoder = new TextEncoder();
    const parts = [header];
    const offsets = [];
    let byteOffset = encoder.encode(header).length;

    objects.forEach((obj) => {
        offsets.push(byteOffset);
        const encoded = encoder.encode(obj);
        byteOffset += encoded.length;
        parts.push(obj);
    });

    const xrefStart = byteOffset;
    let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach((offset) => {
        xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });

    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    parts.push(xref, trailer);

    return new Blob(parts.map((part) => typeof part === 'string' ? encoder.encode(part) : part), { type: 'application/pdf' });
};

const pdfGenerateInvoice = () => {
    const lines = pdfBuildTextLines();
    const blob = pdfCreateBlob(lines);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cuenta-de-cobro.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

window.generateInvoicePDF = pdfGenerateInvoice;
})();
