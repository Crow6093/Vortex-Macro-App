const { ipcRenderer } = require('electron');

// Window Controls
document.getElementById('min-btn').addEventListener('click', () => ipcRenderer.send('window-min'));
document.getElementById('max-btn').addEventListener('click', () => ipcRenderer.send('window-max'));
document.getElementById('close-btn').addEventListener('click', () => ipcRenderer.send('window-close'));

// State
let selectedKey = null;
let currentMacros = {};

// DOM Elements
const keys = document.querySelectorAll('.key-btn[data-key]');
const configPanel = document.getElementById('config-panel');
const selectedKeyDisplay = document.getElementById('selected-key-display');
const macroTypeSelect = document.getElementById('macro-type');
const saveBtn = document.getElementById('save-macro-btn');

// Initialize Config
ipcRenderer.on('init-config', (event, config) => {
    currentMacros = config.macros || {};
    const language = config.language || 'en';
    const theme = config.theme || 'dark';
    document.body.setAttribute('data-theme', theme);
    const themeSelector = document.getElementById('theme-selector-floating');
    if (themeSelector) themeSelector.value = theme;
    changeLanguage(language);
    updateKeyVisuals();
    checkEmptyState();
});

const textDictionary = {
    es: {
        settingsTitle: "Configuración",
        appearance: "Apariencia",
        theme: "Tema",
        language: "Idioma",
        system: "Sistema",
        autoLaunch: "Inicio automático",
        profiles: "Perfiles",
        export: "Exportar",
        import: "Importar",
        assignMacro: "Asignar Macro",
        clickToStart: "¡Haz clic en una tecla para empezar!",
        connectDevice: "Conecta El Vortex V2.0 para Continuar",
        save: "Guardar",
        loading: "Cargando...",
        customApp: "Aplicación Personalizada...",
        selectProgram: "Seleccionar Programa",
        orCustomPath: "O Ruta Personalizada",
        browse: "Explorar",
        clicks: "Clics",
        delay: "Retraso (ms)",
        record: "Grabar",
        stop: "Parar",
        clearSequence: "Borrar Secuencia",
        keysRecorded: "teclas grabadas",
        recording: "Grabando... (Pulsa teclas)",
        macroNone: "Sin Acción",
        macroWeb: "Búsqueda Web",
        macroLaunch: "Abrir Programa",
        macroClicker: "Auto Clicker",
        macroRecorder: "Grabar Teclas",
        // LED Modes
        ledModeStatic: "Color Estático",
        ledModeRainbow: "Arcoíris",
        ledModeCycle: "Ciclo Espectral",
        ledModeReactive: "Reactivo (Toque)",
        // LED Panel Labels
        ledEffectLabel: "Efecto:",
        ledColorPreview: "COLOR ACTUAL",
        ledUserPresets: "TUS COLORES",
        ledFactoryPresets: "PREDETERMINADOS",
        ledBrightness: "BRILLO",
        ledGradStart: "Inicio",
        ledGradStart: "Inicio",
        ledGradEnd: "Fin",
        // Volume Panel
        volumeTitle: "Control de Volumen",
        volumeEnable: "Activar Control de Volumen",
        volumeDesc: "Al activar, girar esta ruedita ajustará el volumen del sistema.",
        volumeMute: "Click para Mutear",
        volumeMuteDesc: "Presionar la ruedita activará/desactivará el silencio."
    },
    en: {
        settingsTitle: "Settings",
        appearance: "Appearance",
        theme: "Theme",
        language: "Language",
        system: "System",
        autoLaunch: "Auto-launch",
        profiles: "Profiles",
        export: "Export",
        import: "Import",
        assignMacro: "Assign Macro",
        clickToStart: "Click a key to start!",
        connectDevice: "Connect Vortex V2.0 to Continue",
        save: "Save",
        loading: "Loading...",
        customApp: "Custom Application...",
        selectProgram: "Select Program",
        orCustomPath: "Or Custom Path",
        browse: "Browse",
        clicks: "Clicks",
        delay: "Delay (ms)",
        record: "Record",
        stop: "Stop",
        clearSequence: "Clear Sequence",
        keysRecorded: "keys recorded",
        recording: "Recording... (Press keys)",
        macroNone: "No Action",
        macroWeb: "Web Search",
        macroLaunch: "Open Program",
        macroClicker: "Auto Clicker",
        macroRecorder: "Record Keys",
        // LED Modes
        ledModeStatic: "Static Color",
        ledModeRainbow: "Rainbow",
        ledModeCycle: "Spectrum Cycle",
        ledModeReactive: "Reactive (Touch)",
        // LED Panel Labels
        ledEffectLabel: "Effect:",
        ledColorPreview: "CURRENT COLOR",
        ledUserPresets: "YOUR COLORS",
        ledFactoryPresets: "PRESET COLORS",
        ledBrightness: "BRIGHTNESS",
        ledGradStart: "Start",
        ledGradStart: "Start",
        ledGradEnd: "End",
        // Volume Panel
        volumeTitle: "Volume Control",
        volumeEnable: "Enable Volume Control",
        volumeDesc: "When enabled, rotating this knob will adjust the system volume.",
        volumeMute: "Click to Mute",
        volumeMuteDesc: "Pressing the knob will toggle mute."
    }
};

let currentLanguage = 'en';

function changeLanguage(lang) {
    currentLanguage = lang;
    const texts = textDictionary[lang];

    // Update simple text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (texts[key]) el.textContent = texts[key];
    });

    // Update title attributes (Tooltip)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.dataset.i18nTitle;
        if (texts[key]) el.title = texts[key];
    });

    // Update specific elements with placeholders or complex logic
    const instructionBubble = document.getElementById('instruction-bubble');
    if (instructionBubble) instructionBubble.textContent = texts.clickToStart;

    const connectTitle = document.querySelector('#disconnected-overlay h2');
    if (connectTitle) connectTitle.textContent = texts.connectDevice;

    const saveBtn = document.getElementById('save-macro-btn');
    if (saveBtn) saveBtn.textContent = texts.save;

    // Update Macro Types Dropdown
    const macroSelect = document.getElementById('macro-type');
    if (macroSelect) {
        const options = macroSelect.options;
        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            if (opt.value === 'none') opt.text = texts.macroNone;
            if (opt.value === 'web') opt.text = texts.macroWeb;
            if (opt.value === 'launch') opt.text = texts.macroLaunch;
            if (opt.value === 'clicker') opt.text = texts.macroClicker;
            if (opt.value === 'recorder') opt.text = texts.macroRecorder;
        }
    }

    // Update LED Mode Selector
    const ledSelect = document.getElementById('led-mode-selector');
    if (ledSelect) {
        const options = ledSelect.options;
        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            if (opt.value === 'static') opt.text = texts.ledModeStatic;
            if (opt.value === 'rainbow') opt.text = texts.ledModeRainbow;
            if (opt.value === 'cycle') opt.text = texts.ledModeCycle;
            if (opt.value === 'reactive') opt.text = texts.ledModeReactive;
        }
    }

    // Update active flag visual
    document.querySelectorAll('.flag-btn').forEach(btn => {
        if (btn.dataset.lang === lang) {
            btn.style.filter = 'grayscale(0)';
            btn.style.transform = 'scale(1.2)';
        } else {
            btn.style.filter = 'grayscale(1)';
            btn.style.transform = 'scale(1)';
        }
    });

    // Re-render macro settings if open to update labels
    if (configPanel.classList.contains('open') && selectedKey) {
        const type = macroTypeSelect.value;
        const macro = currentMacros[selectedKey] || {};
        renderMacroSettings(type, macro);
    }
}

// Language Flag Listeners
document.querySelectorAll('.flag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        changeLanguage(lang);
        ipcRenderer.send('save-language', lang);
    });
});

const macroIcons = {
    web: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`, // Search
    launch: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>`, // Rocket
    clicker: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path></svg>`, // Mouse/Click
    recorder: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>` // Record/Dot
};

function updateKeyVisuals() {
    keys.forEach(key => {
        const k = key.dataset.key;
        const macro = currentMacros[k];

        // Reset classes
        key.classList.remove('assigned', 'disabled');

        if (macro && macro.type !== 'none') {
            key.classList.add('assigned');
            key.title = `${macro.type}`;

            // Set Icon
            if (macroIcons[macro.type]) {
                key.innerHTML = macroIcons[macro.type];
            } else {
                key.textContent = k; // Fallback
            }

            if (macro.active === false) {
                key.classList.add('disabled');
                key.title += ' (Disabled)';
            }
        } else {
            key.title = 'Empty';
            key.textContent = ''; // Hide key name as requested
        }
    });
}

// Key Selection & Floating Panel positioning
keys.forEach(key => {
    key.addEventListener('click', (e) => {
        // Toggle if same key
        if (selectedKey === key.dataset.key && configPanel.classList.contains('open')) {
            closePanel();
            return;
        }

        // Close other panels
        if (ledPanel) ledPanel.classList.remove('open');
        if (volumePanel) volumePanel.classList.remove('open');
        if (settingsPanel) settingsPanel.classList.remove('open');

        keys.forEach(k => k.classList.remove('active'));
        key.classList.add('active');
        selectedKey = key.dataset.key;

        openConfigPanel(selectedKey, e.target);
    });
});

// Top Right Visual (Volume/Knob) Listener
const topRightVisual = document.getElementById('top-right-visual');
const volumePanel = document.getElementById('volume-panel');
const closeVolumeBtn = document.getElementById('close-volume');
const saveVolumeBtn = document.getElementById('save-volume-btn');
const volumeToggle = document.getElementById('volume-toggle');

const term_knob = document.getElementById('top-right-visual'); // Just reusing var name is fine but let's stick to definition
const volumeMuteToggle = document.getElementById('volume-mute-toggle'); // New Ref

if (topRightVisual) {
    topRightVisual.addEventListener('click', (e) => {
        // Toggle volume panel
        if (volumePanel.classList.contains('open')) {
            volumePanel.classList.remove('open');
            topRightVisual.classList.remove('active');
            return;
        }

        // Close others
        closePanel(); // Close standard macro panel
        if (ledPanel) ledPanel.classList.remove('open');
        if (settingsPanel) settingsPanel.classList.remove('open');

        // Open Volume Panel
        volumePanel.classList.add('open');
        topRightVisual.classList.add('active'); // Add active state for visual feedback

        // Load State
        const knobMacro = currentMacros['knob_right'];
        if (knobMacro && knobMacro.type === 'volume') {
            volumeToggle.checked = knobMacro.active !== false;
            volumeMuteToggle.checked = knobMacro.mute !== false; // Default true if undefined/missing
        } else {
            // Default to enabled if not set
            volumeToggle.checked = true;
            volumeMuteToggle.checked = true;
        }
    });
}

if (closeVolumeBtn) {
    closeVolumeBtn.addEventListener('click', () => {
        volumePanel.classList.remove('open');
        if (topRightVisual) topRightVisual.classList.remove('active');
    });
}

if (saveVolumeBtn) {
    saveVolumeBtn.addEventListener('click', () => {
        const isActive = volumeToggle.checked;
        const isMuteActive = volumeMuteToggle.checked;

        // Save as a macro with type 'volume'
        const data = {
            key: 'knob_right',
            type: 'volume',
            active: isActive,
            mute: isMuteActive
        };

        ipcRenderer.send('save-macro', data);

        // Visual feedback
        volumePanel.classList.remove('open');
        if (topRightVisual) topRightVisual.classList.remove('active');
    });
}

const macroActiveToggle = document.getElementById('macro-active-toggle');
const macroToggleContainer = document.getElementById('macro-toggle-container');

function updateToggleVisibility(type) {
    if (macroToggleContainer) {
        // Use flex to maintain style if needed, or inherited. .toggle-group is flex?
        // Actually the inline style has no display, css has display:flex for .toggle-group.
        // So we should set it to '' (empty) to revert to CSS, or 'flex' explicit.
        macroToggleContainer.style.display = (type === 'none') ? 'none' : 'flex';
    }
}

function openConfigPanel(key, triggerElement) {
    configPanel.classList.add('open');
    selectedKeyDisplay.innerText = textDictionary[currentLanguage].assignMacro;

    // reset/fill
    const macro = currentMacros[key];
    if (macro) {
        macroTypeSelect.value = macro.type;
        macroActiveToggle.checked = macro.active !== false; // Default to true
        updateToggleVisibility(macro.type);
        renderMacroSettings(macro.type, macro);
    } else {
        macroTypeSelect.value = "none";
        macroActiveToggle.checked = true;
        updateToggleVisibility("none");
        renderMacroSettings("none");
    }
}

function closePanel() {
    configPanel.classList.remove('open');
    keys.forEach(k => k.classList.remove('active'));
    selectedKey = null;
    if (selectedKeyDisplay) selectedKeyDisplay.innerText = textDictionary[currentLanguage].assignMacro;
}

document.getElementById('close-panel').addEventListener('click', closePanel);

// Macro Logic
macroTypeSelect.addEventListener('change', (e) => {
    updateToggleVisibility(e.target.value);
    renderMacroSettings(e.target.value);
});

async function renderMacroSettings(type, existingData = {}) {
    const container = document.getElementById('macro-settings-container');
    container.innerHTML = '';

    if (type === 'web') {
        container.innerHTML = `<div class="input-group"><label>URL / Search</label><input type="text" id="macro-url" value="${existingData.url || ''}" placeholder="https://... or Search Query"></div>`;
    } else if (type === 'launch') {
        container.innerHTML = `
            <div class="input-group">
                <label>${textDictionary[currentLanguage].selectProgram}</label>
                <select id="program-select" style="margin-bottom: 10px; width: 100%; padding: 8px; border-radius: 6px; background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border);">
                    <option value="">${textDictionary[currentLanguage].loading}</option>
                </select>
                <label>${textDictionary[currentLanguage].orCustomPath}</label>
                <div class="file-input-wrapper">
                    <input type="text" id="macro-path" value="${existingData.path || ''}" placeholder="C:/...">
                    <button class="secondary-btn" id="browse-btn">${textDictionary[currentLanguage].browse}</button>
                </div>
            </div>`;

        // Fetch programs
        const programs = await ipcRenderer.invoke('get-installed-programs');
        const select = document.getElementById('program-select');
        if (select) {
            select.innerHTML = `<option value="custom">${textDictionary[currentLanguage].customApp}</option>`;

            programs.forEach(prog => {
                const opt = document.createElement('option');
                opt.value = prog.path;
                opt.textContent = prog.name;
                select.appendChild(opt);
            });

            // If existing data matches one of the programs, select it
            if (existingData.path) {
                const match = programs.find(p => p.path === existingData.path);
                if (match) {
                    select.value = existingData.path;
                } else {
                    select.value = "custom";
                }
            } else {
                select.value = "custom";
            }

            // Handle change
            select.addEventListener('change', (e) => {
                const val = e.target.value;
                const pathInput = document.getElementById('macro-path');
                if (val !== 'custom') {
                    pathInput.value = val;
                } else {
                    pathInput.value = '';
                }
            });

            // Re-bind browse
            document.getElementById('browse-btn').addEventListener('click', () => {
                ipcRenderer.send('select-file');
                document.getElementById('program-select').value = 'custom';
            });
        }

    } else if (type === 'clicker') {
        container.innerHTML = `
            <div class="input-group"><label>${textDictionary[currentLanguage].clicks}</label><input type="number" id="macro-clicks" value="${existingData.clicks || 1}"></div>
            <div class="input-group"><label>${textDictionary[currentLanguage].delay}</label><input type="number" id="macro-delay" value="${existingData.delay || 100}"></div>
        `;
    } else if (type === 'recorder') {
        const count = existingData.sequence ? existingData.sequence.length : 0;
        container.innerHTML = `
            <div class="recorder-controls" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                <div style="display: flex; gap: 10px;">
                    <button class="secondary-btn" id="start-rec-btn" style="flex: 1; background: #e74c3c; color: white;">${textDictionary[currentLanguage].record}</button>
                    <button class="secondary-btn" id="stop-rec-btn" style="flex: 1; display: none;">${textDictionary[currentLanguage].stop}</button>
                </div>
                <button class="secondary-btn" id="clear-rec-btn">${textDictionary[currentLanguage].clearSequence}</button>
                <div id="rec-status" style="text-align: center; color: #888; font-size: 0.9rem;">
                    ${count} ${textDictionary[currentLanguage].keysRecorded}
                </div>
            </div>
        `;

        // Setup Rec Controllers
        setTimeout(() => setupRecorderListeners(existingData), 0);
    }
}

// Recorder State
let isRecording = false;
let recordingStartTime = 0;
let lastKeyTime = 0;
let currentSequence = [];

function setupRecorderListeners(existingData) {
    const startBtn = document.getElementById('start-rec-btn');
    const stopBtn = document.getElementById('stop-rec-btn');
    const clearBtn = document.getElementById('clear-rec-btn');
    const status = document.getElementById('rec-status');

    if (existingData && existingData.sequence) {
        currentSequence = [...existingData.sequence];
    } else {
        currentSequence = [];
    }

    startBtn.addEventListener('click', () => {
        isRecording = true;
        currentSequence = []; // Reset on new record
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        status.innerText = textDictionary[currentLanguage].recording;
        status.style.color = '#e74c3c';
        lastKeyTime = Date.now();
    });

    stopBtn.addEventListener('click', () => {
        isRecording = false;
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        status.innerText = `${currentSequence.length} ${textDictionary[currentLanguage].keysRecorded}`;
        status.style.color = '#888';
    });

    clearBtn.addEventListener('click', () => {
        isRecording = false;
        currentSequence = [];
        status.innerText = `0 ${textDictionary[currentLanguage].keysRecorded}`;
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
    });
}

// Global Key Listener for Recording
document.addEventListener('keydown', (e) => {
    if (!isRecording) return;
    if (e.repeat) return; // Ignore repeats, let the playback OS handle the holding effect

    const now = Date.now();
    const delay = now - lastKeyTime;
    lastKeyTime = now;

    // Store both code (physical) and key (logical)
    // We use 'code' for robust mapping if possible, 'key' for text fallback
    currentSequence.push({
        type: 'down',
        code: e.code,
        key: e.key,
        delay: delay
    });

    const status = document.getElementById('rec-status');
    if (status) status.innerText = `${textDictionary[currentLanguage].recording} (${currentSequence.length})`;
});

document.addEventListener('keyup', (e) => {
    if (!isRecording) return;

    const now = Date.now();
    const delay = now - lastKeyTime;
    lastKeyTime = now;

    currentSequence.push({
        type: 'up',
        code: e.code,
        key: e.key,
        delay: delay
    });

    const status = document.getElementById('rec-status');
    if (status) status.innerText = `${textDictionary[currentLanguage].recording} (${currentSequence.length})`;
});

ipcRenderer.on('file-selected', (e, path) => {
    const el = document.getElementById('macro-path');
    if (el) el.value = path;
});

saveBtn.addEventListener('click', () => {
    if (!selectedKey) return;
    const type = macroTypeSelect.value;
    const active = macroActiveToggle.checked;

    let data = { key: selectedKey, type: type, active: active };

    if (type === 'web') data.url = document.getElementById('macro-url').value;
    if (type === 'launch') data.path = document.getElementById('macro-path').value;
    if (type === 'clicker') {
        data.clicks = document.getElementById('macro-clicks').value;
        data.delay = document.getElementById('macro-delay').value;
    }
    if (type === 'recorder') {
        data.sequence = currentSequence;
    }

    ipcRenderer.send('save-macro', data);
});

ipcRenderer.on('macro-saved-success', (event, data) => {
    // data is now the full macro object { key, type, active, ... }
    if (data && data.key) {
        currentMacros[data.key] = data;
        updateKeyVisuals();
        checkEmptyState();
        closePanel();
    }
});



// Device Status Handler
const statusLight = document.getElementById('device-status-light');
const overlay = document.getElementById('disconnected-overlay');

ipcRenderer.on('device-status', (event, isConnected) => {
    const light = statusLight || document.getElementById('device-status-light');

    if (isConnected) {
        if (light) light.classList.add('connected');
        if (overlay) overlay.classList.add('hidden');
    } else {
        if (light) light.classList.remove('connected');
        if (overlay) overlay.classList.remove('hidden');
    }
});

// Settings Logic
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings');
const themeSelectorFloating = document.getElementById('theme-selector-floating');

if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('open');
        // Mutual Exclusivity: Close LED Panel if open
        if (ledPanel) ledPanel.classList.remove('open');
    });
}

if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
        settingsPanel.classList.remove('open');
    });
}

// LED Panel Logic & State
let ledState = {
    mode: 'static',
    color: '#ff0000',
    brightness: 100,
    userPresets: [],
    customGradient: { start: '#ff0000', end: '#0000ff' }
};

// UI Elements
const ledBtn = document.getElementById('led-btn');
const ledPanel = document.getElementById('led-panel');
const closeLedBtn = document.getElementById('close-led');

// Control Elements
const modeSelect = document.getElementById('led-mode-selector');
const colorPicker = document.getElementById('led-color-picker');
const rgbInputs = {
    r: document.getElementById('rgb-r'),
    g: document.getElementById('rgb-g'),
    b: document.getElementById('rgb-b')
};
const colorPreview = document.getElementById('color-preview-display');
const brightnessSlider = document.getElementById('led-brightness');
const gradientControls = document.getElementById('custom-gradient-controls'); // section
const userPresetsGrid = document.getElementById('user-presets-grid');
const addPresetBtn = document.getElementById('add-preset-btn');

// --- Helper Functions ---

function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function updateUIFromState() {
    // Sync UI elements with ledState
    if (modeSelect) modeSelect.value = ledState.mode;

    // Controls visibility
    // Controls visibility
    const isStatic = (ledState.mode === 'static');
    const isBreathing = (ledState.mode === 'breathing');

    if (document.getElementById('static-color-controls')) {
        const isVortex = (ledState.mode === 'circular' || ledState.mode === 'vortex');
        const showColorControls = (isStatic || isBreathing); // Only for single color modes

        document.getElementById('static-color-controls').style.display = showColorControls ? 'flex' : 'none';

        // Show Dual Color Controls if mode is Circular/Vortex
        const dualColorControls = document.getElementById('dual-color-controls');
        if (dualColorControls) {
            dualColorControls.style.display = isVortex ? 'flex' : 'none';
        }

        // Sync Dual Color Inputs if visible
        if (isVortex && ledState.customGradient) {
            const g1 = document.getElementById('grad-color-1');
            const g2 = document.getElementById('grad-color-2');
            if (g1) g1.value = ledState.customGradient.start || '#ff0000';
            if (g2) g2.value = ledState.customGradient.end || '#0000ff';
        }

        // Feature Request: Hide User/Factory Presets in Circular Mode (Vortex)
        const userPresets = document.getElementById('user-presets-section');
        const factoryPresets = document.getElementById('factory-presets-section');
        if (userPresets) userPresets.style.display = isVortex ? 'none' : 'block';
        if (factoryPresets) factoryPresets.style.display = isVortex ? 'none' : 'block';
    }



    if (isStatic || isBreathing || isReactive) {
        const rgb = hexToRgb(ledState.color);
        if (rgb) {
            rgbInputs.r.value = rgb.r;
            rgbInputs.g.value = rgb.g;
            rgbInputs.b.value = rgb.b;
        }
        colorPreview.style.backgroundColor = ledState.color;
    }

    if (brightnessSlider) brightnessSlider.value = ledState.brightness;

    renderUserPresets();
    updateVirtualKeyboardColor();
}

function updateVirtualKeyboardColor() {
    const hex = ledState.color;
    document.documentElement.style.setProperty('--current-led-color', hex);

    // Vortex Gradients
    if ((ledState.mode === 'vortex' || ledState.mode === 'circular') && ledState.customGradient) {
        document.documentElement.style.setProperty('--grad-start', ledState.customGradient.start || '#ff00ff');
        document.documentElement.style.setProperty('--grad-end', ledState.customGradient.end || '#0000ff');
    }

    // Board Decoration (Border Glow)
    let boardGradient = `conic-gradient(from var(--angle), ${hex}, ${hex}40, ${hex})`; // Default Static (Color + Dimmer tail)

    if (ledState.mode === 'rainbow') {
        boardGradient = `conic-gradient(from var(--angle), red, orange, yellow, green, blue, indigo, violet, red)`;
    } else if (ledState.mode === 'vortex' || ledState.mode === 'circular') {
        const c1 = ledState.customGradient?.start || '#ff00ff';
        const c2 = ledState.customGradient?.end || '#0000ff';
        boardGradient = `conic-gradient(from var(--angle), ${c1}, ${c2}, ${c1})`;
    } else if (ledState.mode === 'breathing') {
        // for breathing, maybe we can't easily animate the gradient string in JS without perf hit, 
        // but the existing breathing animation on opacity/shadow might be enough? 
        // Let's just match the static color logic but maybe standard solid?
        boardGradient = `conic-gradient(from var(--angle), ${hex}, ${hex})`;
    }

    // Apply to key-grid via CSS Variable
    const keyGrid = document.querySelector('.key-grid');
    if (keyGrid) {
        keyGrid.style.setProperty('--board-gradient', boardGradient);
        // Also update the underglow opacity/color if needed?
        // The ::after uses opacity 0.7 and blur. adjusting its background might be hard via var on pseudo 
        // unless we used currentcolor or another var.
        // Actually ::after content allows background inheritance if we set it? 
        // Let's stick to the border for now as requested.
    }

    const keys = document.querySelectorAll('.key-btn');
    keys.forEach(key => {
        // Reset Styles
        key.style.borderColor = '';
        key.style.boxShadow = '';
        key.classList.remove('anim-breathing', 'anim-rainbow', 'anim-vortex');

        if (ledState.mode === 'rainbow') {
            key.classList.add('anim-rainbow');
        } else if (ledState.mode === 'breathing') {
            key.classList.add('anim-breathing');
        } else if (ledState.mode === 'vortex' || ledState.mode === 'circular') {
            key.classList.add('anim-vortex');
        } else {
            // Static Default
            key.style.borderColor = hex;
            key.style.boxShadow = `0 0 8px ${hex}40`;
        }
    });
}

// ... existing state ...

// Debounce Timer
let ledUpdateTimer = null;

function sendLedUpdate() {
    // Immediate UI update for responsiveness
    // But throttle HID commands
    if (ledUpdateTimer) clearTimeout(ledUpdateTimer);

    ledUpdateTimer = setTimeout(() => {
        // Map 'circular' mode to 'vortex' for backend compatibility
        const modeToSend = ledState.mode === 'circular' ? 'vortex' : ledState.mode;

        ipcRenderer.send('update-led-color', {
            mode: modeToSend,
            color: ledState.color,
            brightness: parseInt(ledState.brightness),
            gradient: ledState.customGradient
        });
        saveLedConfig();
    }, 50); // 50ms debounce (approx 20fps max)
}

// Update ledState definition reference implicitly by adding activePresetIndex property usage
// But first, let's update the state object initiation or just assign it.
// We'll trust ledState exists.

// Add activePresetIndex to state tracking (not saved to config, just runtime)
if (typeof ledState.activePresetIndex === 'undefined') {
    ledState.activePresetIndex = null;
}

function renderUserPresets() {
    userPresetsGrid.innerHTML = ''; // Clear all

    for (let i = 0; i < 7; i++) {
        const color = ledState.userPresets[i];
        const btn = document.createElement('button');
        btn.className = 'preset-slot';

        // Active State Styling
        if (ledState.activePresetIndex === i) {
            btn.classList.add('active');
        }

        if (color) {
            btn.style.backgroundColor = color;
            btn.title = `Preset ${i + 1}: ${color} (Click to Edit)`;
            btn.classList.add('assigned');
        } else {
            btn.style.backgroundColor = '#333';
            btn.title = `Empty Slot ${i + 1} (Click to Edit/Save)`;
            btn.classList.remove('assigned');
        }

        // Logic: Click to Select (Edit Mode)
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent deselecting immediately if we add document click later

            if (ledState.activePresetIndex === i) {
                // Deselect if already active
                ledState.activePresetIndex = null;
                renderUserPresets();
            } else {
                // Select this slot
                ledState.activePresetIndex = i;
                renderUserPresets();

                // If it has a color, load it to the wheel
                if (color) {
                    applyColor(color);
                } else {
                    // It's empty. Save current wheel color to it immediately?
                    // Or wait for user to move wheel?
                    // User request: "click to edit changing its color" implies we start editing.
                    // Let's save current color to it to initialize it, or leave it empty?
                    // Better validation: If empty, fill with active color.
                    saveColorToSlot(i);
                }
            }
        });

        // Right Click: Clear slot (or overwrite/reset)
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm('Clear this preset slot?')) {
                ledState.userPresets[i] = null;
                if (ledState.activePresetIndex === i) ledState.activePresetIndex = null;
                saveLedConfig();
                renderUserPresets();
            }
        });

        userPresetsGrid.appendChild(btn);
    }
}

function saveColorToSlot(index) {
    ledState.userPresets[index] = ledState.color;
    saveLedConfig();
    renderUserPresets();
}

// Hook into applyColor
function applyColor(hex, send = true, updateActiveSlot = true) {
    ledState.color = hex;

    // Only switch to static if we are currently OFF or in a mode that doesn't support single color
    const allowedModes = ['static', 'breathing', 'reactive'];
    if (!allowedModes.includes(ledState.mode)) {
        ledState.mode = 'static';
    }

    // User Fix: If a User Preset is actively selected for editing,
    // applying a color (e.g. from Factory Preset or Paste) should update it ONLY if updateActiveSlot is true.
    if (ledState.activePresetIndex !== null && updateActiveSlot) {
        ledState.userPresets[ledState.activePresetIndex] = hex;
        saveLedConfig();
        // Update visual slot but avoid recursively selecting it invalidly? 
        // renderUserPresets handles re-rendering checks.
        renderUserPresets();
    }

    updateUIFromState(); // This updates inputs
    if (send) {
        sendLedUpdate();
    }
}

// Updated Input Handler (for Wheel/RGB inputs to auto-update active preset)
function handleColorInputChanged(newHex) {
    ledState.color = newHex;

    // Keep current mode if allowed, otherwise static
    const allowedModes = ['static', 'breathing', 'reactive', 'vortex'];
    if (!allowedModes.includes(ledState.mode)) {
        ledState.mode = 'static';
    }

    // If Vortex Mode, also update the first gradient input to match wheel
    if (ledState.mode === 'vortex') {
        if (!ledState.customGradient) ledState.customGradient = { start: newHex, end: '#0000FF' };
        ledState.customGradient.start = newHex;
        // Update input element if exists
        const grad1 = document.getElementById('grad-color-1');
        if (grad1) grad1.value = newHex;
    }

    // If a preset is active, update it live!
    if (ledState.activePresetIndex !== null) {
        ledState.userPresets[ledState.activePresetIndex] = newHex;
        saveLedConfig();
        renderUserPresets();
    }

    updateUIFromState();
    sendLedUpdate();
}

// We need to route existing inputs to `handleColorInputChanged`
// Override previous listeners... or update them.
// We can't easy replace listeners without context. 
// We'll update `pickColorFromCanvas` and `handleRgbInput` to call this new handler.




function saveLedConfig() {
    ipcRenderer.send('save-led-config', {
        brightness: parseInt(ledState.brightness),
        userPresets: ledState.userPresets,
        lastMode: ledState.mode,
        lastColor: ledState.color,
        gradient: ledState.customGradient
    });
}

// --- Event Listeners ---

if (ledBtn) {
    ledBtn.addEventListener('click', () => {
        ledPanel.classList.toggle('open');
        // Mutual Exclusivity: Close Settings Panel if open
        if (settingsPanel) settingsPanel.classList.remove('open');
        closePanel(); // Closes main macro panel?
    });
}

if (closeLedBtn) {
    closeLedBtn.addEventListener('click', () => ledPanel.classList.remove('open'));
}

// Mode Selector
if (modeSelect) {
    modeSelect.addEventListener('change', (e) => {
        ledState.mode = e.target.value;
        updateUIFromState();
        sendLedUpdate();
    });
}

// Color Wheel Canvas Logic
const colorCanvas = document.getElementById('color-wheel-canvas');
let ctx = null;
let isDraggingWheel = false;

if (colorCanvas) {
    ctx = colorCanvas.getContext('2d');
    drawColorWheel();

    // Mouse Events
    colorCanvas.addEventListener('mousedown', (e) => {
        isDraggingWheel = true;
        pickColorFromCanvas(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDraggingWheel) {
            // Need bounding rect relative to canvas
            const rect = colorCanvas.getBoundingClientRect();
            // Check if mouse is near canvas or we just track generally? 
            // Better to pass the event relative to canvas if possible, or calculate:
            // But 'e' is global mousemove. We act if isDraggingWheel is true.

            // Re-calculate x,y relative to canvas
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            pickColorFromCanvas({ offsetX: x, offsetY: y });
        }
    });

    document.addEventListener('mouseup', () => {
        isDraggingWheel = false;
    });
}

function drawColorWheel() {
    if (!ctx) return;
    const width = colorCanvas.width;
    const height = colorCanvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = width / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw Conic Gradient (Hue)
    for (let angle = 0; angle < 360; angle += 1) {
        let startAngle = (angle - 2) * Math.PI / 180;
        let endAngle = (angle + 1) * Math.PI / 180;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
        ctx.fill();
    }

    // Draw Radial Gradient (Saturation/Lightness overlay) - White center to transparent
    const gradWhite = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradWhite.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradWhite.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradWhite;
    ctx.fill();

    // NOTE: This creates a pastel center. For full black access, we'd need a brightness slider or black overlay.
    // Given we have a brightness slider separate, this HSV-like wheel (Hue/Sat) is good. 
}

function pickColorFromCanvas(e) {
    if (!ctx) return;

    // Coordinates
    const x = e.offsetX;
    const y = e.offsetY;

    // Read pixel
    // Note: this can be slow if done every move, but usually fine for small canvas
    const p = ctx.getImageData(x, y, 1, 1).data;

    // Check if transparent (outside circle) - rough check
    // Our drawing fills circle, but corners are transparent.
    if (p[3] === 0) return;

    // Set Color
    const hex = rgbToHex(p[0], p[1], p[2]);

    // Update Text Inputs
    rgbInputs.r.value = p[0];
    rgbInputs.g.value = p[1];
    rgbInputs.b.value = p[2];

    // Use new handler to propagate changes
    handleColorInputChanged(hex);
}

// Override updateUIFromState to handle canvas if needed? No, standard RGB inputs update is fine.
// But we might want to show a "selector" dot on the wheel in future. For now, direct pick is asked.

// Remove old colorPicker listener if it exists or keep it for the fallback input if we left it?
// The previous code block was:
/*
if (colorPicker) {
    colorPicker.addEventListener('input', (e) => { ... })
}
*/
// Since we removed 'led-color-picker' from DOM in HTML step (replaced with canvas), that ID won't match or we removed it. 
// If we kept a hidden input, we can sync it.
// The task said "Directly in the wheel", so canvas click logic above handles it.


// RGB Inputs
function handleRgbInput() {
    let r = parseInt(rgbInputs.r.value) || 0;
    let g = parseInt(rgbInputs.g.value) || 0;
    let b = parseInt(rgbInputs.b.value) || 0;

    // Clamp
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    const hex = rgbToHex(r, g, b);

    // Use new handler
    handleColorInputChanged(hex);
}

Object.values(rgbInputs).forEach(input => {
    if (input) input.addEventListener('input', handleRgbInput);
});

// Brightness
if (brightnessSlider) {
    brightnessSlider.addEventListener('input', (e) => {
        ledState.brightness = e.target.value;
        sendLedUpdate(); // Debouncing could be added here if HID is slow
    });
}

// Add Preset


// Factory Presets logic
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        if (color) {
            applyColor(color, true, false); // False = Don't overwrite active user slot
        } else if (btn.dataset.mode) {
            // Special mode presets

            if (btn.dataset.mode === 'split-blue-lilac') {
                // CUSTOM SPLIT MODE: Half Lilac (#FF00FF), Half Blue (#0000FF)
                ledState.mode = 'split';
                ledState.color1 = '#FF00FF'; // Lilac First
                ledState.color2 = '#0000FF'; // Blue Second
                ledState.color = '#FF00FF'; // Primary visual
            }
            else if (btn.dataset.mode === 'vortex') {
                ledState.mode = 'vortex';
                // Default Vortex behavior (Gradient)
                // ... potentially keep existing logic or reset defaults ...
                ledState.color = '#0000FF';
            }
            else {
                ledState.mode = btn.dataset.mode;
            }

            // Sync with UI
            updateUIFromState();
            sendLedUpdate();
        }
    });
});

// Custom Gradient Inputs
const grad1 = document.getElementById('grad-color-1');
const grad2 = document.getElementById('grad-color-2');
if (grad1 && grad2) {
    const updateGrad = () => {
        if (!ledState.customGradient) ledState.customGradient = {};
        ledState.customGradient.start = grad1.value;
        ledState.customGradient.end = grad2.value;

        // Update visualizer or whatever else
        updateVirtualKeyboardColor();
        sendLedUpdate();
    };
    grad1.addEventListener('input', updateGrad);
    grad2.addEventListener('input', updateGrad);
}

// Init Config Hook
ipcRenderer.on('init-config', (event, config) => {
    // Existing config loading...
    currentMacros = config.macros || {};
    const language = config.language || 'en';
    const theme = config.theme || 'dark';

    // LED State Loading
    if (config.led) {
        // Migration: If userPresets was dynamic array, pad it or slice it
        let presets = config.led.userPresets || [];
        if (!Array.isArray(presets)) presets = [];

        // Ensure size 7
        ledState.userPresets = new Array(7).fill(null).map((_, i) => presets[i] || null);

        ledState.brightness = config.led.brightness !== undefined ? config.led.brightness : 100;
        // Optionally restore last color/mode
        if (config.led.lastColor) ledState.color = config.led.lastColor;
        if (config.led.lastMode) ledState.mode = config.led.lastMode;
        if (config.led.gradient) ledState.customGradient = config.led.gradient;
    } else {
        // Default init
        ledState.userPresets = new Array(7).fill(null);
    }

    document.body.setAttribute('data-theme', theme);
    const themeSelector = document.getElementById('theme-selector-floating');
    if (themeSelector) themeSelector.value = theme;

    changeLanguage(language);
    updateKeyVisuals();
    checkEmptyState();
    updateUIFromState(); // Sync LED controls
});


// Theme update from settings
if (themeSelectorFloating) {
    themeSelectorFloating.addEventListener('change', (e) => {
        const theme = e.target.value;
        document.body.setAttribute('data-theme', theme);
        ipcRenderer.send('save-theme', theme);
    });
}

// Profile Logic
const exportBtn = document.getElementById('export-profile-btn');
const importBtn = document.getElementById('import-profile-btn');

if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        ipcRenderer.send('export-profile');
    });
}

if (importBtn) {
    importBtn.addEventListener('click', () => {
        ipcRenderer.send('import-profile');
    });
}

ipcRenderer.on('profile-export-success', () => {
    alert('Profile exported successfully!');
});

// Auto-launch Logic
const autoLaunchToggle = document.getElementById('auto-launch-toggle');
if (autoLaunchToggle) {
    // Request initial status
    ipcRenderer.send('check-auto-launch');

    // Handle status reply
    ipcRenderer.on('auto-launch-status', (e, isEnabled) => {
        autoLaunchToggle.checked = isEnabled;
    });

    // Handle user toggle
    autoLaunchToggle.addEventListener('change', (e) => {
        ipcRenderer.send('set-auto-launch', e.target.checked);
    });
}


ipcRenderer.on('macro-triggered', (e, key) => {
    const btn = document.querySelector(`.key-btn[data-key="${key}"]`);
    if (btn) {
        btn.classList.add('active-trigger');
        setTimeout(() => btn.classList.remove('active-trigger'), 200);
    }
});

// Instruction Bubble Logic
const instructionBubble = document.getElementById('instruction-bubble');

function checkEmptyState() {
    // Check if any macro is assigned and not 'none'
    const hasMacros = Object.values(currentMacros).some(m => m && m.type && m.type !== 'none');
    if (instructionBubble) {
        instructionBubble.style.display = hasMacros ? 'none' : 'block';
    }
}

// Initial check
setTimeout(() => {
    checkEmptyState();
    // Ensure presets grid is rendered even before config loads (shows gray slots)
    // If config comes later, it will re-render with saved colors.
    if (userPresetsGrid && userPresetsGrid.children.length === 0) {
        // Initialize with nulls if empty array
        if (ledState.userPresets.length === 0) ledState.userPresets = new Array(7).fill(null);
        renderUserPresets();
    }
}, 100);
