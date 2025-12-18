const web = require('./web');
const launcher = require('./launcher');
const clicker = require('./clicker');
const recorder = require('./recorder');
const volume = require('./volume');

const Automation = {
    execute: (macro) => {
        if (!macro || !macro.type) return;

        console.log(`Executing Macro: ${macro.type}`, macro);

        switch (macro.type) {
            case 'web':
                web.execute(macro);
                break;
            case 'launch':
                launcher.execute(macro);
                break;
            case 'clicker':
                clicker.execute(macro);
                break;
            case 'recorder':
                recorder.execute(macro);
                break;
            case 'volume':
                volume.execute(macro);
                break;
            default:
                console.warn(`Unknown macro type: ${macro.type}`);
        }
    }
};

module.exports = Automation;
