const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, shell, dialog, systemPreferences } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../utils/config');
const Automation = require('./automation');

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (!mainWindow.isVisible()) mainWindow.show();
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    if (require('electron-squirrel-startup')) {
        app.quit();
    }

    let mainWindow;
    let tray;
    let isQuitting = false;

    // Cleanup on Quit
    app.on('before-quit', () => {
        if (cachedDevice) {
            try { cachedDevice.close(); } catch (e) { }
        }
    });

    // Device Detection (Real)
    const MACROPAD_VID = 0xfeed;
    const MACROPAD_PID = 0x6060;

    let HID;
    try {
        HID = require('node-hid');
    } catch (e) {
        console.error('Failed to load node-hid:', e);
    }

    // HID Device Request Cache
    let cachedDevice = null;

    const checkDevice = () => {
        if (!HID) return false;
        try {
            // Re-use logic to check availability
            return getAllDevices().length > 0;
        } catch (e) {
            console.error('Error scanning devices:', e);
            return false;
        }
    };

    setInterval(() => {
        const isConnected = checkDevice();
        if (mainWindow) mainWindow.webContents.send('device-status', isConnected);
    }, 2000);

    // Helper for Cross-Platform Icons
    const getIconPath = (forTray = false) => {
        if (process.platform === 'linux') return path.join(__dirname, '../../assets/icon.png');
        if (process.platform === 'darwin') {
            // macOS Tray usually is a template image, but we use png/icns for now based on context
            // Tray: png/template is better. App: icns is required.
            if (forTray) return path.join(__dirname, '../../assets/icon.png');
            return path.join(__dirname, '../../assets/icon.icns');
        }
        return path.join(__dirname, '../../assets/icono.ico');
    };

    const createWindow = () => {
        mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            minWidth: 800,
            minHeight: 600,
            frame: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
            icon: getIconPath(false),
            autoHideMenuBar: true,
        });

        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

        mainWindow.on('close', (event) => {
            if (!isQuitting) {
                event.preventDefault();
                mainWindow.hide();
                return false;
            }
            const bounds = mainWindow.getBounds();
            store.set('windowState', { width: bounds.width, height: bounds.height });
        });

        mainWindow.webContents.on('did-finish-load', () => {
            const macros = store.get('macros');
            const theme = store.get('theme');
            const language = store.get('language') || 'en';
            const led = store.get('led') || {};
            mainWindow.webContents.send('init-config', { macros, theme, language, led });

            // Restore Knob Config on Startup
            // Default to 'volume' type and active=false (Software Intercept Mode) if not set.
            const knobMacro = macros['knob_right'] || { type: 'volume', active: false };
            setTimeout(() => sendKnobConfig(knobMacro), 2000); // Wait for connection
        });
    };

    const registerShortcuts = () => {
        globalShortcut.unregisterAll();
        const macros = store.get('macros');

        for (let i = 13; i <= 24; i++) {
            const key = `F${i}`;
            const macro = macros[key];

            if (macro && macro.type !== 'none' && macro.active !== false) {
                // Register User Macro
                globalShortcut.register(key, () => {
                    console.log(`${key} pressed, executing macro...`);
                    Automation.execute(macro);
                    if (mainWindow) mainWindow.webContents.send('macro-triggered', key);
                });
            } else if (process.platform === 'darwin' && (key === 'F14' || key === 'F15')) {
                // macOS FIX: Force register F14/F15 as "no-op" to consume the key
                // and prevent it from triggering the default Brightness Up/Down.
                globalShortcut.register(key, () => {
                    console.log(`${key} blocked (consumed to prevent system default).`);

                    if (mainWindow && mainWindow.isFocused()) {
                        mainWindow.webContents.send('externally-selected-key', key);
                    }
                });
            }
        }

        // Knob Auto-Open Logic (Unassigned)
        const knobMacro = macros['knob_right'];
        const isKnobActive = knobMacro && knobMacro.active !== false && knobMacro.type === 'volume';

        if (!isKnobActive) {
            // Register Volume Shortcuts to intercept and trigger UI
            ['VolumeUp', 'VolumeDown', 'VolumeMute'].forEach(volKey => {
                try {
                    globalShortcut.register(volKey, () => {
                        console.log(`${volKey} intercepted (Knob Auto-Open).`);
                        if (mainWindow && mainWindow.isFocused()) {
                            mainWindow.webContents.send('externally-selected-knob');
                        }
                    });
                } catch (e) {
                    console.error('Failed to register volume shortcut:', e);
                }
            });
        }
    };

    const createTray = () => {
        const iconPath = getIconPath(true); // For tray
        tray = new Tray(iconPath);
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Show App', click: () => mainWindow.show() },
            { type: 'separator' },
            {
                label: 'Quit', click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);
        tray.setToolTip('VortexMacroApp');
        tray.setContextMenu(contextMenu);
        tray.on('double-click', () => mainWindow.show());
    };

    // Permission Check Helper
    const checkSystemPermissions = () => {
        // macOS: Accessibility
        if (process.platform === 'darwin') {
            const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
            if (!isTrusted) {
                const warn = dialog.showMessageBoxSync({
                    type: 'warning',
                    title: 'Accessibility Permission Needed',
                    message: 'To block default F14/F15 brightness keys, this app needs Accessibility permissions.',
                    detail: 'Click "Open Settings" to grant permission. You may need to restart the app afterwards.',
                    buttons: ['Open Settings', 'Cancel'],
                    defaultId: 0
                });
                if (warn === 0) {
                    systemPreferences.isTrustedAccessibilityClient(true);
                }
            }
        }

        // Linux: Check HID Access (udev)
        if (process.platform === 'linux') {
            try {
                // Just try to list devices. If we don't have permissions to /dev/hidraw*, 
                // node-hid might return empty or throw depending on the backend.
                // Usually it returns devices but we can't open them. 
                // We'll rely on the runtime error in open() but we can warn if HID is missing.
                if (!HID) {
                    dialog.showErrorBox('Dependency Error', 'node-hid failed to load. Check your system libraries (libusb).');
                }
            } catch (e) {
                console.error('Linux Permission Check:', e);
            }
        }
    };

    app.whenReady().then(() => {
        checkSystemPermissions();

        createWindow();
        createTray();
        registerShortcuts();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            if (isQuitting) app.quit();
        }
    });

    ipcMain.on('window-min', () => mainWindow.minimize());
    ipcMain.on('window-max', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });
    ipcMain.on('window-close', () => mainWindow.close());

    ipcMain.on('save-macro', (event, data) => {
        const macros = store.get('macros');
        macros[data.key] = data;
        store.set('macros', macros);
        registerShortcuts();
        console.log('Macro saved:', data);

        // Firmware Integration for Knob
        if (data.key === 'knob_right') {
            sendKnobConfig(data);
        }

        event.reply('macro-saved-success', data);
    });

    ipcMain.on('save-theme', (event, theme) => {
        store.set('theme', theme);
    });

    ipcMain.on('save-language', (event, lang) => {
        store.set('language', lang);
    });

    ipcMain.on('save-led-config', (event, data) => {
        store.set('led', data);
    });

    // New Helper: Get All Device Interfaces
    const getAllDevices = () => {
        if (!HID) {
            console.error('HID not loaded');
            return [];
        }
        try {
            const devices = HID.devices();
            // Filter all interfaces for this VID/PID
            const matches = devices.filter(d =>
                d.vendorId === MACROPAD_VID &&
                d.productId === MACROPAD_PID
            );

            if (matches.length > 0) {
                // Prioritize the Usage Page 0xFF60 (Raw HID)
                matches.sort((a, b) => {
                    const isRawA = (a.usagePage === 0xFF60 && a.usage === 0x61);
                    const isRawB = (b.usagePage === 0xFF60 && b.usage === 0x61);
                    if (isRawA && !isRawB) return -1;
                    if (!isRawA && isRawB) return 1;
                    return 0;
                });

                console.log(`[HID Scan] Found ${matches.length} interfaces. Selected: Path=${matches[0].path}, UsagePage=${matches[0].usagePage}`);
                return matches;
            } else {
                console.warn('No devices found with VID 0xFEED PID 0x6060');
            }
        } catch (e) { console.error('Error scanning devices:', e); }
        return [];
    };

    // New Helper: Broadcast Batch of Packets (Persistent Connection)
    const writeBatch = (packets) => {
        // Validation Packets
        if (!packets || packets.length === 0) return;

        // 1. Try Cached Device first
        if (cachedDevice) {
            try {
                for (const data of packets) {
                    try {
                        const packet33 = [0x00, ...data];
                        while (packet33.length < 33) packet33.push(0x00);
                        cachedDevice.write(packet33);
                    } catch (e1) {
                        const packet65 = [0x00, ...data];
                        while (packet65.length < 65) packet65.push(0x00);
                        cachedDevice.write(packet65);
                    }
                }
                return; // Success
            } catch (err) {
                console.error('[Write Error] Cached write failed, closing:', err.message);
                try { cachedDevice.close(); } catch (e) { }
                cachedDevice = null;
            }
        }

        // 2. If no cache or failed, scan for device (Reconnection Logic)
        const matches = getAllDevices();
        if (matches.length === 0) return;

        try {
            // Open first match
            console.log(`[HID Open] Opening device: ${matches[0].path}`);
            cachedDevice = new HID.HID(matches[0].path);

            // --- DATA DEBUGGING LISTENER ---
            cachedDevice.on('data', (data) => {
                // Log incoming data to debug Knob events
                // Data is a Buffer
                const hex = data.toString('hex');
                const array = [...data];
                console.log(`[HID Data Received] Hex: ${hex} | Array: ${array.join(', ')}`);

                // If this is a knob event, we'll see it here.
                // We'll process it later for Software Volume.
            });

            cachedDevice.on('error', (err) => {
                console.error('[HID Device Error]', err);
                try { cachedDevice.close(); } catch (e) { }
                cachedDevice = null;
            });
            // -------------------------------

            // Retry Write
            for (const data of packets) {
                try {
                    const packet33 = [0x00, ...data];
                    while (packet33.length < 33) packet33.push(0x00);
                    cachedDevice.write(packet33);
                } catch (e1) {
                    const packet65 = [0x00, ...data];
                    while (packet65.length < 65) packet65.push(0x00);
                    cachedDevice.write(packet65);
                }
            }
        } catch (err) {
            console.error('[HID Open/Write Failed]:', err);
            if (cachedDevice) {
                try { cachedDevice.close(); } catch (e) { }
                cachedDevice = null;
            }
        }
    };

    // New Helper: Send Knob Configuration (Command 0x04 & 0x06)
    const sendKnobConfig = (knobData) => {
        // Even if knobData is missing or active=false, we generally want the firmware to SEND the keys
        // so we can intercept them in software (to show the menu).
        // If we sent '0', the firmware would go silent (or Raw), and our globalShortcuts wouldn't trigger.
        // So we ALWAYS enable the hardware keys (1), and manage the "Disable" state by Intercepting them in `registerShortcuts`.

        try {
            const vol = 1; // Always Enable HW Keys
            const mute = 1; // Always Enable HW Keys

            console.log(`Sending Knob Config: Vol=${vol} (Cmd 0x04), Mute=${mute} (Cmd 0x06) (Force Enabled for App Control)`);

            // Send both packets in one batch
            writeBatch([
                [0x04, vol],
                [0x06, mute]
            ]);
        } catch (e) {
            console.error('Error sending knob config:', e);
        }
    };

    // State for Software Animations
    let animationInterval = null;
    let animationTick = 0;
    let lastLedData = null;

    const startAnimation = (data) => {
        if (animationInterval) clearInterval(animationInterval);
        animationTick = 0;
        let step = 0; // Initialize step for breathing

        // Parse Color and Brightness for Breathing Mode
        let r = 0, g = 0, b = 0;
        if (data.color) {
            r = parseInt(data.color.substr(1, 2), 16);
            g = parseInt(data.color.substr(3, 2), 16);
            b = parseInt(data.color.substr(5, 2), 16);
        }
        const brightness = (data.brightness !== undefined) ? data.brightness : 100;
        const baseScale = brightness / 100;
        const sr = Math.floor(r * baseScale);
        const sg = Math.floor(g * baseScale);
        const sb = Math.floor(b * baseScale);

        // Run at ~20 FPS for smoothness
        const FPS = 20;
        const intervalMs = 1000 / FPS;

        animationInterval = setInterval(() => {
            animationTick++;

            // --- VORTEX MODE ---
            if (data.mode === 'vortex') {
                const tick = animationTick;
                // ... (existing Vortex Logic but simplified for context) ...
                // Recalculate colors for this frame
                let c1 = data.color || '#ff0000';
                let c2 = data.color || '#0000ff';
                if (data.gradient && data.gradient.start && data.gradient.end) {
                    c1 = data.gradient.start;
                    c2 = data.gradient.end;
                } else if (data.color1 && data.color2) {
                    c1 = data.color1;
                    c2 = data.color2;
                }

                const hex2rgb = (hex) => {
                    const r = parseInt(hex.substr(1, 2), 16);
                    const g = parseInt(hex.substr(3, 2), 16);
                    const b = parseInt(hex.substr(5, 2), 16);
                    return { r, g, b };
                };
                const rgb1 = hex2rgb(c1);
                const rgb2 = hex2rgb(c2);

                const scale = brightness / 100; // Use local brightness

                let ledColors = [];
                for (let i = 0; i < 12; i++) {
                    const angle = (i * (Math.PI / 6)) + (tick * 0.1);
                    const t = (Math.sin(angle) + 1) / 2;
                    const lerp = (a, b, t) => Math.round(a + (b - a) * t);
                    ledColors.push({
                        r: Math.floor(lerp(rgb1.r, rgb2.r, t) * scale),
                        g: Math.floor(lerp(rgb1.g, rgb2.g, t) * scale),
                        b: Math.floor(lerp(rgb1.b, rgb2.b, t) * scale)
                    });
                }
                const p1 = [0x03, 0, 9];
                for (let k = 0; k < 9; k++) p1.push(ledColors[k].r, ledColors[k].g, ledColors[k].b);
                const p2 = [0x03, 9, 3];
                for (let k = 9; k < 12; k++) p2.push(ledColors[k].r, ledColors[k].g, ledColors[k].b);
                writeBatch([p1, p2]);
            }

            // --- BREATHING MODE (Software) ---
            if (data.mode === 'breathing') {
                step += 0.08; // Increment phase

                // Calculate brightness using Sine wave (0 to 1)
                const wave = (Math.sin(step) + 1) / 2;
                const currentScale = 0.1 + (wave * 0.9);

                // Apply scale to base colors (sr, sg, sb calculated above)
                const br = Math.floor(sr * currentScale);
                const bg = Math.floor(sg * currentScale);
                const bb = Math.floor(sb * currentScale);

                // Send Static Color Command (0x01)
                try {
                    const packet = [0x01, br, bg, bb];
                    writeBatch([packet]);
                } catch (err) {
                    console.error('Animation Error:', err);
                    clearInterval(animationInterval);
                }
            }

        }, 20); // 20ms = 50fps for smoothness
    };

    const processLedUpdate = async (data) => {
        // Stop any existing animation if switching modes
        if (data.mode !== 'vortex' && animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }

        const brightness = (data.brightness !== undefined) ? data.brightness : 100;
        const scale = brightness / 100;

        let r = 0, g = 0, b = 0;
        if (data.color) {
            r = parseInt(data.color.substr(1, 2), 16);
            g = parseInt(data.color.substr(3, 2), 16);
            b = parseInt(data.color.substr(5, 2), 16);
        }

        // Apply Brightness Scaling for Static/CMD 0x01
        const sr = Math.floor(r * scale);
        const sg = Math.floor(g * scale);
        const sb = Math.floor(b * scale);

        // --- MODE HANDLING ---

        // 1. Static Color -> Command 0x01
        if (data.mode === 'static') {
            writeBatch([[0x01, sr, sg, sb]]);
            return;
        }

        // 2. Pre-defined Modes -> Command 0x02
        // Mappings based on C code: 0=Off, 1=Static(internal), 2=Breathing, 3=RainbowSwirl
        if (['rainbow', 'off', 'cycle', 'reactive'].includes(data.mode)) {
            let mid = 1; // Default to Static if unknown
            if (data.mode === 'off') mid = 0;
            if (data.mode === 'breathing') mid = 2; // This line is now redundant as breathing is handled by software
            if (data.mode === 'rainbow') mid = 3;
            if (data.mode === 'cycle') mid = 3; // Fallback to Rainbow
            if (data.mode === 'reactive') mid = 1; // Fallback to Static

            // Send Command 0x02 with Mode AND Color (Atomic Update)
            // Even for Rainbow/Cycle which might ignore it, it's safe to send.
            writeBatch([[0x02, mid, sr, sg, sb]]);
            return;
        }

        // 3. Animation Modes (Vortex, Breathing)
        if (data.mode === 'vortex' || data.mode === 'breathing') {
            writeBatch([[0x02, 1, 0, 0, 0]]); // Set Static Mode
            startAnimation(data); // Start Loop
            return;
        }

        // 4. Split Mode (Static Half-Half)
        if (data.mode === 'split') {
            // Stop animation if running
            if (animationInterval) {
                clearInterval(animationInterval);
                animationInterval = null;
            }

            // Set Firmware to Static Mode (Command 0x02, 1)
            // But we send 0s for color so it doesn't override our manual LED update?
            // Actually, Command 0x03 overrides Command 0x01/0x02 colors in firmware if raw_hid_active set.
            // We set Mode 1 to ensure standard behavior is 'on' but controllable.
            writeBatch([[0x02, 1, 0, 0, 0]]);

            // Colors
            const hex2rgb = (hex) => {
                if (!hex) return { r: 0, g: 0, b: 0 };
                const r = parseInt(hex.substr(1, 2), 16);
                const g = parseInt(hex.substr(3, 2), 16);
                const b = parseInt(hex.substr(5, 2), 16);
                return { r, g, b };
            };

            const c1 = hex2rgb(data.color1 || '#0000FF');
            const c2 = hex2rgb(data.color2 || '#FF00FF');
            const brightness = (data.brightness !== undefined) ? data.brightness : 100;
            const scale = brightness / 100;

            const r1 = Math.floor(c1.r * scale);
            const g1 = Math.floor(c1.g * scale);
            const b1 = Math.floor(c1.b * scale);

            const r2 = Math.floor(c2.r * scale);
            const g2 = Math.floor(c2.g * scale);
            const b2 = Math.floor(c2.b * scale);

            // Construct 12 LED array: 0-5 = c1, 6-11 = c2
            // Packet 1: [0x03, 0, 9, ...LEDs 0-8]
            const p1 = [0x03, 0, 9];
            for (let i = 0; i < 6; i++) p1.push(r1, g1, b1); // 0-5 (6 leds)
            for (let i = 0; i < 3; i++) p1.push(r2, g2, b2); // 6-8 (3 leds)

            // Packet 2: [0x03, 9, 3, ...LEDs 9-11]
            const p2 = [0x03, 9, 3];
            for (let i = 0; i < 3; i++) p2.push(r2, g2, b2); // 9-11 (3 leds)

            writeBatch([p1, p2]);
        }
    };

    // Heartbeat: Re-apply LED state every 4 seconds to ensure connection
    // Only for Static mode. Re-applying animation modes causes restart/flicker.
    setInterval(() => {
        if (lastLedData && lastLedData.mode === 'static') {
            processLedUpdate(lastLedData);
        }
    }, 4000);

    ipcMain.on('update-led-color', async (event, data) => {
        lastLedData = data;
        processLedUpdate(data);
    });

    // Backward compat
    const sendToDevice = (data) => writeBatch([data]);

    ipcMain.on('select-file', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile']
        });
        if (!result.canceled && result.filePaths.length > 0) {
            event.reply('file-selected', result.filePaths[0]);
        }
    });

    ipcMain.on('set-auto-launch', (event, enable) => {
        app.setLoginItemSettings({
            openAtLogin: enable,
            path: app.getPath('exe')
        });
    });

    ipcMain.on('export-profile', async (event) => {
        const macros = store.get('macros');
        const theme = store.get('theme');
        const profileData = { macros, theme, version: '1.0' };
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Export Profile',
            defaultPath: 'vortex-profile.json',
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        if (filePath) {
            fs.writeFileSync(filePath, JSON.stringify(profileData, null, 2));
            event.reply('profile-export-success');
        }
    });

    ipcMain.on('import-profile', async (event) => {
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Import Profile',
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
        });
        if (filePaths && filePaths.length > 0) {
            try {
                const data = fs.readFileSync(filePaths[0], 'utf-8');
                const profile = JSON.parse(data);
                if (profile.macros) store.set('macros', profile.macros);
                if (profile.theme) store.set('theme', profile.theme);
                app.relaunch();
                app.exit(0);
            } catch (err) {
                console.error('Failed to import profile:', err);
            }
        }
    });

    ipcMain.handle('get-installed-programs', async () => {
        const platform = process.platform;
        let programs = [];
        try {
            if (platform === 'win32') {
                const startMenuCommon = path.join(process.env.ProgramData, 'Microsoft/Windows/Start Menu/Programs');
                const startMenuUser = path.join(process.env.APPDATA, 'Microsoft/Windows/Start Menu/Programs');

                // Async Recursive Scan
                const scanDirAsync = async (dir) => {
                    try {
                        await fs.promises.access(dir);
                        const files = await fs.promises.readdir(dir);

                        const tasks = files.map(async (file) => {
                            const fullPath = path.join(dir, file);
                            try {
                                const stat = await fs.promises.stat(fullPath);
                                if (stat.isDirectory()) {
                                    await scanDirAsync(fullPath);
                                } else if (file.endsWith('.lnk') || file.endsWith('.url')) {
                                    programs.push({
                                        name: file.replace(/\.(lnk|url)$/, ''),
                                        path: fullPath,
                                        type: 'file'
                                    });
                                }
                            } catch (e) { /* ignore individual file errors */ }
                        });

                        await Promise.all(tasks);
                    } catch (e) { /* ignore dir access errors */ }
                };

                await Promise.all([
                    scanDirAsync(startMenuCommon),
                    scanDirAsync(startMenuUser)
                ]);

            } else if (platform === 'darwin') { /* ... Mac ... */ }
            else if (platform === 'linux') { /* ... Linux ... */ }
        } catch (e) {
            console.error('Error scanning programs:', e);
        }
        return programs.sort((a, b) => a.name.localeCompare(b.name));
    });

    ipcMain.on('check-auto-launch', (event) => {
        const settings = app.getLoginItemSettings();
        event.reply('auto-launch-status', settings.openAtLogin);
    });
}
