/* ui.js
   Utilidades de interfaz compartidas.
*/

export const createButton = (text, onClick) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
};
