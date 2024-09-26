// config.js
const { ipcRenderer } = require('electron');

// Obtener referencias a los elementos del DOM
const lineaPremioInput = document.getElementById('linea-premio');
const dosLineasPremioInput = document.getElementById('dos-lineas-premio');
const bingoCompletoPremioInput = document.getElementById('bingo-completo-premio');
const segundosModoAutomaticoInput = document.getElementById('segundos-modo-automatico');
const guardarConfigBtn = document.getElementById('guardar-config');

// Función para cargar la configuración guardada (si existe)
function cargarConfiguracion() {
    const configGuardada = JSON.parse(localStorage.getItem('bingoConfig'));
    if (configGuardada) {
        lineaPremioInput.value = configGuardada.lineaPremio || '';
        dosLineasPremioInput.value = configGuardada.dosLineasPremio || '';
        bingoCompletoPremioInput.value = configGuardada.bingoCompletoPremio || '';
        segundosModoAutomaticoInput.value = configGuardada.segundosModoAutomatico || 3; // Valor por defecto si no hay configuración previa
    }
}

// Función para guardar la configuración en localStorage y enviar al main.js
function guardarConfiguracion() {
    const nuevaConfig = {
        lineaPremio: lineaPremioInput.value,
        dosLineasPremio: dosLineasPremioInput.value,
        bingoCompletoPremio: bingoCompletoPremioInput.value,
        segundosModoAutomatico: parseInt(segundosModoAutomaticoInput.value, 10) || 3
    };

    // Guardar en localStorage
    localStorage.setItem('bingoConfig', JSON.stringify(nuevaConfig));

    // Enviar la configuración al proceso principal
    ipcRenderer.send('guardar-configuracion', nuevaConfig);  // Envía la configuración

    // Mostrar mensaje de confirmación
    alert('Configuración guardada correctamente');
}

// Evento para el botón de guardar
guardarConfigBtn.addEventListener('click', guardarConfiguracion);

// Cargar la configuración existente al abrir la página de configuración
cargarConfiguracion();

// Recibir la actualización del modo oscuro desde el proceso principal
ipcRenderer.on('actualizar-modo-oscuro', (event, modoOscuroActivado) => {
    if (modoOscuroActivado) {
        document.body.classList.add('modo-oscuro');
    } else {
        document.body.classList.remove('modo-oscuro');
    }
});

// Comprobar el estado del modo oscuro al cargar la ventana
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem('modoOscuro') === 'true') {
        document.body.classList.add('modo-oscuro');
    }
});
