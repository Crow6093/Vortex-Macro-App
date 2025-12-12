const { shell } = require('electron');

module.exports = {
    execute: (macro) => {
        if (!macro.url) return;

        let target = macro.url.trim();
        // Regex simplistic to detect if it starts with http/https or looks like a domain
        // We'll trust if it starts with http:// or https:// it is a URL.
        // If it doesn't, we check if it has a TLD-like structure (e.g. google.com).
        // If not, we treat it as a search query.

        const isUrl = /^(http|https):\/\/[^ "]+$/.test(target) || /^www\.[^ "]+$/.test(target) || /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(target);

        if (!isUrl) {
            // It's a search term
            target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
        } else {
            // Ensure protocol if missing but looks like a domain
            if (!/^https?:\/\//i.test(target)) {
                target = 'https://' + target;
            }
        }

        shell.openExternal(target);
    }
};
