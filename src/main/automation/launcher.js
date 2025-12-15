const { shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');

module.exports = {
    execute: (macro) => {
        if (!macro.path) return;

        // Linux specific: Check if executable and spawn directly
        // because shell.openPath() often fails to run binaries on some distros
        if (process.platform === 'linux') {
            try {
                fs.accessSync(macro.path, fs.constants.X_OK);
                // It is executable, spawn it detached
                const child = spawn(macro.path, [], {
                    detached: true,
                    stdio: 'ignore'
                });
                child.unref();
                return;
            } catch (e) {
                // Not executable or error, fall back to openPath
            }
        }

        // Generic fallback (Windows/Mac/Linux Non-Exec)
        shell.openPath(macro.path).then((err) => {
            if (err) console.error('Failed to open path:', err);
        });
    }
};
