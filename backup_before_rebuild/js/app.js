/* app.js
   Controlador principal de la aplicación Cuenta de Cobro.
   Aquí se cargan funciones iniciales y se conecta la navegación.
*/

const setupNavigation = () => {
    const navButtons = document.querySelectorAll('[data-navigate]');
    navButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const target = button.dataset.navigate;
            if (target) {
                window.location.href = target;
            }
        });
    });
};

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
});