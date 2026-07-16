/* rutas.js
    Script para administrar rutas en la aplicación Cuenta de Cobro (no módulo).
*/

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(value);
};

const createRouteCard = (route) => {
    const card = document.createElement('article');
    card.className = 'route-card';
    card.innerHTML = `
        <div>
            <strong>${route.nombre}</strong>
            <p>${formatCurrency(route.valor)}</p>
        </div>
        <div class="route-actions">
            <button class="btn btn-secondary btn-small" data-action="edit" data-id="${route.id}">Editar</button>
            <button class="btn btn-ghost btn-small btn-danger" data-action="delete" data-id="${route.id}">Eliminar</button>
        </div>
    `;
    return card;
};

const renderRoutes = () => {
    const routes = loadRutas();
    const list = document.getElementById('routeList');
    const summary = document.getElementById('routeSummary');

    if (!list || !summary) return;

    list.innerHTML = '';
    if (routes.length === 0) {
        list.innerHTML = '<p class="empty-state">No hay rutas agregadas aún. Agrega tu primera ruta.</p>';
    } else {
        routes.forEach((route) => list.appendChild(createRouteCard(route)));
    }

    summary.textContent = `${routes.length} ruta${routes.length === 1 ? '' : 's'} guardada${routes.length === 1 ? '' : 's'}`;
};

const resetForm = () => {
    const form = document.getElementById('routeForm');
    if (!form) return;
    form.reset();
    form.elements.namedItem('routeId').value = '';
    document.getElementById('routeSubmit').textContent = 'Agregar ruta';
};

const setRouteEditing = (route) => {
    const form = document.getElementById('routeForm');
    if (!form) return;

    form.elements.namedItem('rutaNombre').value = route.nombre;
    form.elements.namedItem('rutaValor').value = route.valor;
    form.elements.namedItem('routeId').value = route.id;
    document.getElementById('routeSubmit').textContent = 'Actualizar ruta';
};

const handleFormSubmit = (event) => {
    event.preventDefault();

    const form = event.target;
    const nombre = form.rutaNombre.value.trim();
    const valor = Number(form.rutaValor.value) || 0;
    const routeId = form.routeId.value;

    if (!nombre || valor <= 0) {
        alert('Por favor completa el nombre y el valor de la ruta.');
        return;
    }

    const routes = loadRutas();

    if (routeId) {
        const updatedRoutes = routes.map((route) =>
            route.id === routeId ? { ...route, nombre, valor } : route
        );
        saveRutas(updatedRoutes);
    } else {
        const newRoute = {
            id: `route_${Date.now()}`,
            nombre,
            valor
        };
        saveRutas([...routes, newRoute]);
    }

    resetForm();
    renderRoutes();
};

const handleRouteAction = (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;
    const routes = loadRutas();

    if (action === 'edit') {
        const route = routes.find((item) => item.id === id);
        if (route) {
            setRouteEditing(route);
        }
        return;
    }

    if (action === 'delete') {
        const confirmed = confirm('¿Eliminar esta ruta? Esta acción no se puede deshacer.');
        if (!confirmed) return;

        const filteredRoutes = routes.filter((item) => item.id !== id);
        saveRutas(filteredRoutes);
        renderRoutes();
    }
};

const initRouteAdmin = () => {
    const form = document.getElementById('routeForm');
    const list = document.getElementById('routeList');
    const clear = document.getElementById('routeClear');

    if (!form || !list) return;

    form.addEventListener('submit', handleFormSubmit);
    list.addEventListener('click', handleRouteAction);
    if (clear) {
        clear.addEventListener('click', resetForm);
    }

    renderRoutes();
};

const init = () => {
    if (document.body.dataset.page === 'rutas') {
        initRouteAdmin();
    }
};

window.addEventListener('DOMContentLoaded', init);
