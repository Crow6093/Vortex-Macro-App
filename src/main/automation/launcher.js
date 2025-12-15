const { shell } = require('electron');

module.exports = {
    execute: (macro) => {
        if (!macro.path) return;

        // Check if it's an executable or file
        // shell.openPath is safer/easier for general files, exec/spawn for specific args
        shell.openPath(macro.path).then((err) => {
            if (err) console.error('Failed to open path:', err);
        });
    }
};
