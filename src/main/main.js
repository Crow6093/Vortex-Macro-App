const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, shell, dialog } = require('electron');
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
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (!mainWindow.isVisible()) mainWindow.show();
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    // Handle creating/removing shortcuts on Windows when installing/uninstalling.
    if (require('electron-squirrel-startup')) {
        app.quit();
    }

    let mainWindow;
    let tray;
    let isQuitting = false;

    // Device Detection (Real)
    const MACROPAD_VID = 0xfeed;
    const MACROPAD_PID = 0x6060;

    // Try to require node-hid. If it fails (e.g. build issues), handle gracefully or retry.
    let HID;
    try {
        HID = require('node-hid');
    } catch (e) {
        console.error('Failed to load node-hid:', e);
    }

    const checkDevice = () => {
        if (!HID) return false;
        try {
            const devices = HID.devices();
            return devices.some(d => d.vendorId === MACROPAD_VID && d.productId === MACROPAD_PID);
        } catch (e) {
            console.error('Error scanning devices:', e);
            return false;
        }
    };

    setInterval(() => {
        const isConnected = checkDevice();
        if (mainWindow) mainWindow.webContents.send('device-status', isConnected);
    }, 2000); // Poll every 2 seconds

    const createWindow = () => {

        mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            minWidth: 800,
            minHeight: 600,
            frame: false, // Frameless for custom title bar
            titleBarStyle: 'hidden',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
            icon: path.join(__dirname, '../../assets/icon.ico'), // Using .ico for Windows
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

        // Send initial config to renderer when ready
        mainWindow.webContents.on('did-finish-load', () => {
            const macros = store.get('macros');
            const theme = store.get('theme');
            const language = store.get('language') || 'en';
            mainWindow.webContents.send('init-config', { macros, theme, language });
        });
    };

    const registerShortcuts = () => {
        globalShortcut.unregisterAll();
        const macros = store.get('macros');

        for (let i = 13; i <= 24; i++) {
            const key = `F${i}`;
            const macro = macros[key];

            if (macro && macro.type !== 'none') {
                // Check if macro is explicitly disabled
                if (macro.active === false) return;

                globalShortcut.register(key, () => {
                    console.log(`${key} pressed, executing macro...`);
                    Automation.execute(macro);
                    if (mainWindow) mainWindow.webContents.send('macro-triggered', key);
                });
            }
        }
    };

    const createTray = () => {
        const iconPath = path.join(__dirname, '../../assets/icon.png');
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

    app.whenReady().then(() => {
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

    // IPC Handlers
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
        event.reply('macro-saved-success', data);
    });

    ipcMain.on('save-theme', (event, theme) => {
        store.set('theme', theme);
    });

    ipcMain.on('save-language', (event, lang) => {
        store.set('language', lang);
    });

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
        const profileData = {
            macros,
            theme,
            version: '1.0'
        };

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

                const scanDir = (dir) => {
                    if (!fs.existsSync(dir)) return;
                    const files = fs.readdirSync(dir);
                    for (const file of files) {
                        const fullPath = path.join(dir, file);
                        const stat = fs.statSync(fullPath);
                        if (stat.isDirectory()) {
                            scanDir(fullPath);
                        } else if (file.endsWith('.lnk') || file.endsWith('.url')) {
                            // On Windows, the .lnk IS the launcher usually. resolving it is better but shell.openPath works on .lnk
                            programs.push({
                                name: file.replace(/\.(lnk|url)$/, ''),
                                path: fullPath,
                                type: 'file'
                            });
                        }
                    }
                };

                scanDir(startMenuCommon);
                scanDir(startMenuUser);

            } else if (platform === 'darwin') {
                const appDirs = ['/Applications', path.join(os.homedir(), 'Applications')];
                for (const dir of appDirs) {
                    if (fs.existsSync(dir)) {
                        const files = fs.readdirSync(dir);
                        for (const file of files) {
                            if (file.endsWith('.app')) {
                                programs.push({
                                    name: file.replace('.app', ''),
                                    path: path.join(dir, file)
                                });
                            }
                        }
                    }
                }

            } else if (platform === 'linux') {
                const appDirs = ['/usr/share/applications', path.join(os.homedir(), '.local/share/applications')];
                for (const dir of appDirs) {
                    if (fs.existsSync(dir)) {
                        const files = fs.readdirSync(dir);
                        for (const file of files) {
                            if (file.endsWith('.desktop')) {
                                // Basic parse for Name=
                                const content = fs.readFileSync(path.join(dir, file), 'utf-8');
                                const nameMatch = content.match(/^Name=(.*)$/m);
                                if (nameMatch) {
                                    programs.push({
                                        name: nameMatch[1],
                                        path: path.join(dir, file) // Launching .desktop usually works with gtk-launch or open
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error scanning programs:', e);
        }

        // Sort alphabetically
        return programs.sort((a, b) => a.name.localeCompare(b.name));
    });

    ipcMain.on('check-auto-launch', (event) => {
        const settings = app.getLoginItemSettings();
        event.reply('auto-launch-status', settings.openAtLogin);
    });
}
