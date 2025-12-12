const Store = require('electron-store');

const schema = {
    macros: {
        type: 'object',
        default: {}
        // Structure: { "F13": { type: "web", url: "..." }, "F14": ... }
    },
    theme: {
        type: 'string',
        default: 'dark'
    },
    language: {
        type: 'string',
        default: 'en'
    },
    profiles: {
        type: 'array',
        default: []
    }
};

const store = new Store({ schema });

module.exports = store;
