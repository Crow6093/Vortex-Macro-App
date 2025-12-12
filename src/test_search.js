
const automation = {
    execute: (macro) => {
        if (!macro || !macro.type) return;

        console.log(`Executing Macro: ${macro.type}`, macro);

        switch (macro.type) {
            case 'web':
                if (macro.url) {
                    let target = macro.url.trim();
                    // COPY OF LOGIC FROM automation.js
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

                    console.log(`[OPEN] ${target}`);
                }
                break;
        }
    }
};

// Test Cases
const testCases = [
    { type: 'web', url: 'https://google.com' }, // Expected: https://google.com
    { type: 'web', url: 'google.com' },         // Expected: https://google.com
    { type: 'web', url: 'funny cats' },         // Expected: https://www.google.com/search?q=funny%20cats
    { type: 'web', url: 'www.example.com' },    // Expected: https://www.example.com
    { type: 'web', url: 'ftp://something' },    // Expected: search query properly (regex expects http/https or domain) -> actually my regex might treat this as domain if it has dots? Let's see. 
    // Wait, ftp://something doesn't match http/https start. 
    // Does it match domain regex? ^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$ 
    // "ftp://something" has special chars : / which are not in the char class [a-zA-Z0-9-.] (if we exclude :/)
    // So it should be treated as search "ftp://something" -> google search.
    { type: 'web', url: 'http://localhost:3000' } // Expected: http://localhost:3000
];

testCases.forEach(tc => automation.execute(tc));
