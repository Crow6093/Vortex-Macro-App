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
        macroRecorder: "Grabar Teclas"
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
        macroRecorder: "Record Keys"
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
        // We can access options by value or index
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

        keys.forEach(k => k.classList.remove('active'));
        key.classList.add('active');
        selectedKey = key.dataset.key;

        openConfigPanel(selectedKey, e.target);
    });
});

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

function getMacroDataFromForm() {
    // Deprecated by inline logic above or keep for cleanliness
    return {};
}

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
    });
}

if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
        settingsPanel.classList.remove('open');
    });
}

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
setTimeout(checkEmptyState, 500);
