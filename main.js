const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require('fs');  // Para manipulación de archivos
const XLSX = require('xlsx');
const { spawn } = require('child_process'); // Añadido para ejecutar Python

let mainWindow;
let marcarNumeroWindow;
let configWindow;
let configCartonesWindow;  // Ventana para configurar cartones
let numerosExtraidos = [];  // Inicialización correcta de numerosExtraidos
let modoAutomatico = false; // Estado del modo automático

// Crear ventana para marcar números manualmente
function createMarcarNumeroWindow() {
    marcarNumeroWindow = new BrowserWindow({
        width: 400,
        height: 300,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    marcarNumeroWindow.loadFile(path.join(__dirname, "public", "marcarNumero.html"));

    marcarNumeroWindow.on("closed", () => {
        marcarNumeroWindow = null;
    });
}

// Crear ventana para configurar cartones
function createConfigCartonesWindow() {
    configCartonesWindow = new BrowserWindow({
        width: 600,
        height: 600,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    configCartonesWindow.loadFile(path.join(__dirname, "public", "configCartones.html"));

    configCartonesWindow.on("closed", () => {
        configCartonesWindow = null;
    });
}

// Crear la ventana principal
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    mainWindow.loadFile(path.join(__dirname, "public", "index.html"));

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

app.whenReady().then(createMainWindow);

// Abrir la ventana de configuración de cartones
ipcMain.on('abrir-config-cartones', () => {
    if (!configCartonesWindow) {
        createConfigCartonesWindow();
    }
});

// Nueva implementación para ejecutar el script Python
ipcMain.on('generar-cartones', (event, cantidad) => {
    const bloqueSize = 10;  // Tamaño del bloque a guardar en cada archivo
    const rutaExcel = path.join(__dirname, `cartones_${Date.now()}.xlsx`);

    // Comando para ejecutar el script Python
    const pythonProcess = spawn('python', ['exportCartones.py', cantidad, bloqueSize, rutaExcel]);

    // Capturar la salida del script Python
    pythonProcess.stdout.on('data', (data) => {
        console.log(`Salida del script Python: ${data}`);
        event.sender.send('progreso-cartones', data.toString());
    });

    // Capturar cualquier error en la ejecución del script Python
    pythonProcess.stderr.on('data', (data) => {
        console.error(`Error en el script Python: ${data}`);
        event.sender.send('error', { mensaje: 'Ocurrió un error al generar los cartones.' });
    });

    // Detectar cuando el proceso Python termina
    pythonProcess.on('close', (code) => {
        if (code === 0) {
            console.log(`Cartones generados correctamente en ${rutaExcel}`);
            event.sender.send('cartones-generados', rutaExcel);  // Enviar la ruta del archivo Excel al frontend
        } else {
            console.error(`El script Python terminó con un error. Código: ${code}`);
            event.sender.send('error', { mensaje: 'Error al generar los cartones.' });
        }
    });
});


ipcMain.on('actualizar-ventana-espejo', (event, numerosExtraidos) => {
    if (marcarNumeroWindow) {
        marcarNumeroWindow.webContents.send('estado-actualizado', numerosExtraidos);
    }
});

// Abrir ventana para marcar números manualmente
ipcMain.on("abrir-marcar-numero", () => {
    if (!marcarNumeroWindow) {
        createMarcarNumeroWindow();

        marcarNumeroWindow.webContents.on('did-finish-load', () => {
            marcarNumeroWindow.webContents.send('estado-bingo', {
                numerosExtraidos
            });
        });
    }
});

// Crear la ventana de configuración
function createConfigWindow() {
    if (!configWindow) {
        configWindow = new BrowserWindow({
            width: 500,
            height: 400,
            parent: mainWindow,
            modal: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                preload: path.join(__dirname, "preload.js"),
            },
        });

        configWindow.loadFile(path.join(__dirname, "public", "config.html"));

        configWindow.on("closed", () => {
            configWindow = null;
        });

        // Enviar el estado del modo oscuro a la ventana de configuración cuando se cargue
        configWindow.webContents.on('did-finish-load', () => {
            const modoOscuroActivado = mainWindow.webContents.executeJavaScript(`
                localStorage.getItem('modoOscuro') === 'true';
            `);
            modoOscuroActivado.then((isDarkMode) => {
                configWindow.webContents.send('actualizar-modo-oscuro', isDarkMode);
            });
        });
    }
}

// Abrir ventana de configuración
ipcMain.on("abrir-configuracion", () => {
    if (!configWindow) {
        createConfigWindow();
    }
});

// Recibir la activación o desactivación del modo automático desde la ventana espejo
ipcMain.on('activar-modo-automatico', () => {
    modoAutomatico = !modoAutomatico;
    mainWindow.webContents.send('activar-modo-automatico', modoAutomatico);
});

// Marcar número manualmente desde la ventana espejo
ipcMain.on('marcar-numero-manualmente', (event, numeroInt) => {
    if (!numerosExtraidos.includes(numeroInt)) {
        numerosExtraidos.push(numeroInt);
    }
    mainWindow.webContents.send('marcar-numero-manualmente', numeroInt);
});

// Variables para almacenar la configuración actual
let configuracionPremios = {
    linea: 'No configurado',
    dosLineas: 'No configurado',
    bingoCompleto: 'No configurado'
};
let segundosModoAutomatico = 5;

// Listener para recibir la configuración desde el proceso renderer
ipcMain.on('guardar-configuracion', (event, data) => {
    console.log('Configuración recibida:', data);  // Esto te ayudará a verificar si los datos llegan bien
    
    // Actualiza la configuración de premios y el tiempo del modo automático
    configuracionPremios = {
        linea: data.lineaPremio,
        dosLineas: data.dosLineasPremio,
        bingoCompleto: data.bingoCompletoPremio
    };
    segundosModoAutomatico = data.segundosModoAutomatico;

    // Envía los datos al renderizador para actualizar los premios y los segundos del modo automático
    mainWindow.webContents.send('actualizar-premios', configuracionPremios);
    mainWindow.webContents.send('actualizar-segundos-modo-automatico', segundosModoAutomatico);
});

// Reiniciar el juego
ipcMain.on("reiniciar-bingo", () => {
    numerosExtraidos = [];
    modoAutomatico = false;
    
    mainWindow.webContents.send('reiniciar-juego');

    if (marcarNumeroWindow && marcarNumeroWindow.webContents) {
        marcarNumeroWindow.webContents.send('reiniciar-juego');
    }
});

// Sincronizar el modo oscuro entre ventanas
ipcMain.on('actualizar-modo-oscuro', (event, modoOscuroActivado) => {
    if (marcarNumeroWindow && marcarNumeroWindow.webContents) {
        marcarNumeroWindow.webContents.send('actualizar-modo-oscuro', modoOscuroActivado);
    }
});

// Cargar cartones por serial
ipcMain.on('cargar-cartones', (event, serial) => {
    const serialFolder = path.join(__dirname, 'seriales', serial);
    const jsonFilePath = path.join(serialFolder, `${serial}_cartones_final.json`);
    
    if (fs.existsSync(jsonFilePath)) {
        const cartones = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
        
        console.log(`Cartones cargados exitosamente para el serial: ${serial}`);
        console.log(cartones);  // Aquí se mostrarán los datos de los cartones

        event.sender.send('cartones-cargados', { serial, cartones });
    } else {
        console.log(`Error: No se encontraron cartones con el serial: ${serial}`);
        event.sender.send('error', { mensaje: 'No se encontraron cartones con ese serial.' });
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.disableHardwareAcceleration();

