const { spawn } = require('child_process');

const vkMap = {
    'Backspace': { vk: 0x08 }, 'Tab': { vk: 0x09 }, 'Enter': { vk: 0x0D },
    'Shift': { vk: 0x10 }, 'Control': { vk: 0x11 }, 'Alt': { vk: 0x12 },
    'Pause': { vk: 0x13 }, 'CapsLock': { vk: 0x14 }, 'Escape': { vk: 0x1B },
    'Space': { vk: 0x20 },
    'PageUp': { vk: 0x21, ext: true }, 'PageDown': { vk: 0x22, ext: true },
    'End': { vk: 0x23, ext: true }, 'Home': { vk: 0x24, ext: true },
    'ArrowLeft': { vk: 0x25, ext: true }, 'ArrowUp': { vk: 0x26, ext: true },
    'ArrowRight': { vk: 0x27, ext: true }, 'ArrowDown': { vk: 0x28, ext: true },
    'PrintScreen': { vk: 0x2C, ext: true }, 'Insert': { vk: 0x2D, ext: true }, 'Delete': { vk: 0x2E, ext: true },
    'Digit0': { vk: 0x30 }, 'Digit1': { vk: 0x31 }, 'Digit2': { vk: 0x32 }, 'Digit3': { vk: 0x33 }, 'Digit4': { vk: 0x34 },
    'Digit5': { vk: 0x35 }, 'Digit6': { vk: 0x36 }, 'Digit7': { vk: 0x37 }, 'Digit8': { vk: 0x38 }, 'Digit9': { vk: 0x39 },
    'KeyA': { vk: 0x41 }, 'KeyB': { vk: 0x42 }, 'KeyC': { vk: 0x43 }, 'KeyD': { vk: 0x44 }, 'KeyE': { vk: 0x45 }, 'KeyF': { vk: 0x46 },
    'KeyG': { vk: 0x47 }, 'KeyH': { vk: 0x48 }, 'KeyI': { vk: 0x49 }, 'KeyJ': { vk: 0x4A }, 'KeyK': { vk: 0x4B }, 'KeyL': { vk: 0x4C },
    'KeyM': { vk: 0x4D }, 'KeyN': { vk: 0x4E }, 'KeyO': { vk: 0x4F }, 'KeyP': { vk: 0x50 }, 'KeyQ': { vk: 0x51 }, 'KeyR': { vk: 0x52 },
    'KeyS': { vk: 0x53 }, 'KeyT': { vk: 0x54 }, 'KeyU': { vk: 0x55 }, 'KeyV': { vk: 0x56 }, 'KeyW': { vk: 0x57 }, 'KeyX': { vk: 0x58 },
    'KeyY': { vk: 0x59 }, 'KeyZ': { vk: 0x5A },
    'MetaLeft': { vk: 0x5B, ext: true }, 'MetaRight': { vk: 0x5C, ext: true }, 'ContextMenu': { vk: 0x5D, ext: true },
    'Numpad0': { vk: 0x60 }, 'Numpad1': { vk: 0x61 }, 'Numpad2': { vk: 0x62 }, 'Numpad3': { vk: 0x63 }, 'Numpad4': { vk: 0x64 },
    'Numpad5': { vk: 0x65 }, 'Numpad6': { vk: 0x66 }, 'Numpad7': { vk: 0x67 }, 'Numpad8': { vk: 0x68 }, 'Numpad9': { vk: 0x69 },
    'Multiply': { vk: 0x6A }, 'Add': { vk: 0x6B }, 'Separator': { vk: 0x6C }, 'Subtract': { vk: 0x6D }, 'Decimal': { vk: 0x6E }, 'Divide': { vk: 0x6F, ext: true },
    'F1': { vk: 0x70 }, 'F2': { vk: 0x71 }, 'F3': { vk: 0x72 }, 'F4': { vk: 0x73 }, 'F5': { vk: 0x74 }, 'F6': { vk: 0x75 },
    'F7': { vk: 0x76 }, 'F8': { vk: 0x77 }, 'F9': { vk: 0x78 }, 'F10': { vk: 0x79 }, 'F11': { vk: 0x7A }, 'F12': { vk: 0x7B },
    'NumLock': { vk: 0x90, ext: true }, 'ScrollLock': { vk: 0x91 },
    'ShiftLeft': { vk: 0xA0 }, 'ShiftRight': { vk: 0xA1 },
    'ControlLeft': { vk: 0xA2 }, 'ControlRight': { vk: 0xA3, ext: true },
    'AltLeft': { vk: 0xA4 }, 'AltRight': { vk: 0xA5, ext: true },
    'Semicolon': { vk: 0xBA }, 'Equal': { vk: 0xBB }, 'Comma': { vk: 0xBC }, 'Minus': { vk: 0xBD }, 'Period': { vk: 0xBE }, 'Slash': { vk: 0xBF },
    'Backquote': { vk: 0xC0 }, 'BracketLeft': { vk: 0xDB }, 'Backslash': { vk: 0xDC }, 'BracketRight': { vk: 0xDD }, 'Quote': { vk: 0xDE }
};

const getVk = (step) => {
    return vkMap[step.code] || vkMap[step.key] || vkMap[step.key.toUpperCase()] || null;
};

module.exports = {
    execute: (macro) => {
        console.log(`Recorder playback triggered (${process.platform})`);
        if (!macro.sequence || macro.sequence.length === 0) return;

        if (process.platform === 'win32') {
            // Windows: PowerShell + user32.dll keybd_event
            let psScript = `
$code = @'
[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
[DllImport("user32.dll")] public static extern uint MapVirtualKey(uint uCode, uint uMapType);
'@
$type = Add-Type -MemberDefinition $code -Name "Win32Input" -Namespace Win32Functions -PassThru
`;
            macro.sequence.forEach(step => {
                const mapping = getVk(step);
                if (!mapping) return;

                const delay = step.delay > 0 ? step.delay : 0; // minimize delay if 0
                let flags = (step.type === 'up') ? 2 : 0; // 0=Down, 2=Up (KEYEVENTF_KEYUP)
                if (mapping.ext) flags |= 1; // KEYEVENTF_EXTENDEDKEY = 1

                if (delay > 0) {
                    psScript += `[System.Threading.Thread]::Sleep(${delay});\n`;
                } else {
                    psScript += `[System.Threading.Thread]::Sleep(1);\n`;
                }

                // MapVirtualKey lookup in the script loop
                psScript += `$scan = $type::MapVirtualKey(${mapping.vk}, 0);\n`;
                psScript += `$type::keybd_event(${mapping.vk}, $scan, ${flags}, 0);\n`;
            });

            const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript]);
            child.stderr.on('data', (d) => console.error(`Recorder Error: ${d}`));

        } else if (process.platform === 'darwin') {
            // macOS: AppleScript "State Tracking"
            let appleScript = '';
            let heldModifiers = new Set();

            const mapKey = (k) => {
                const map = {
                    'Enter': 36, 'Return': 36, 'Backspace': 51, 'Tab': 48, 'Escape': 53, 'Space': 49,
                    'ArrowUp': 126, 'ArrowDown': 125, 'ArrowLeft': 123, 'ArrowRight': 124, 'Delete': 117,
                    'Home': 115, 'End': 119, 'PageUp': 116, 'PageDown': 121,
                    'F1': 122, 'F2': 120, 'F3': 99, 'F4': 118, 'F5': 96, 'F6': 97, 'F7': 98, 'F8': 100,
                    'F9': 101, 'F10': 109, 'F11': 103, 'F12': 111,
                    '0': 29, '1': 18, '2': 19, '3': 20, '4': 21, '5': 23, '6': 22, '7': 26, '8': 28, '9': 25,
                    'A': 0, 'B': 11, 'C': 8, 'D': 2, 'E': 14, 'F': 3, 'G': 5, 'H': 4, 'I': 34, 'J': 38,
                    'K': 40, 'L': 37, 'M': 46, 'N': 45, 'O': 31, 'P': 35, 'Q': 12, 'R': 15, 'S': 1, 'T': 17,
                    'U': 32, 'V': 9, 'W': 13, 'X': 7, 'Y': 16, 'Z': 6
                };
                return map[k] || map[k.toUpperCase()] || null;
            };

            macro.sequence.forEach(step => {
                const delay = (step.delay > 0 ? step.delay : 5) / 1000;
                appleScript += `delay ${delay}\n`;

                // Identify modifiers
                const keyLower = step.key.toLowerCase();
                const isMod = ['control', 'meta', 'shift', 'alt', 'command', 'option'].some(m => keyLower.includes(m));

                let modName = '';
                if (keyLower.includes('control')) modName = 'control down';
                if (keyLower.includes('meta') || keyLower.includes('command')) modName = 'command down';
                if (keyLower.includes('shift')) modName = 'shift down';
                if (keyLower.includes('alt') || keyLower.includes('option')) modName = 'option down';

                if (isMod && modName) {
                    if (step.type === 'down') heldModifiers.add(modName);
                    if (step.type === 'up') heldModifiers.delete(modName);
                    return;
                }

                if (step.type === 'down') {
                    const modString = heldModifiers.size > 0 ? ` using {${Array.from(heldModifiers).join(', ')}}` : '';
                    const code = mapKey(step.key);

                    if (code !== null) {
                        appleScript += `tell application "System Events" to key code ${code}${modString}\n`;
                    } else {
                        // For regular characters
                        const char = step.key.length === 1 ? step.key.replace(/"/g, '\\"') : null;
                        if (char) {
                            appleScript += `tell application "System Events" to keystroke "${char}"${modString}\n`;
                        }
                    }
                }
            });

            spawn('osascript', ['-e', appleScript]);

        } else if (process.platform === 'linux') {
            // Linux: xdotool
            const args = [];

            // Check for xdotool presence implicitly by catching spawn error or similar? 
            // Better: just try to run it. If it fails, we log.

            macro.sequence.forEach(step => {
                const delay = (step.delay > 0 ? step.delay : 5) / 1000;
                if (delay > 0) args.push('sleep', delay.toString());

                // Map Code/Key to xdotool friendly names
                let k = step.key;
                const map = {
                    'Enter': 'Return', 'Backspace': 'BackSpace', 'Tab': 'Tab', 'Escape': 'Escape', 'Space': 'space',
                    'ArrowUp': 'Up', 'ArrowDown': 'Down', 'ArrowLeft': 'Left', 'ArrowRight': 'Right',
                    'Control': 'Control_L', 'ControlLeft': 'Control_L', 'ControlRight': 'Control_R',
                    'Shift': 'Shift_L', 'ShiftLeft': 'Shift_L', 'ShiftRight': 'Shift_R',
                    'Alt': 'Alt_L', 'AltLeft': 'Alt_L', 'AltRight': 'Alt_R',
                    'Meta': 'Super_L', 'MetaLeft': 'Super_L', 'MetaRight': 'Super_R',
                    'PageUp': 'Page_Up', 'PageDown': 'Page_Down', 'Home': 'Home', 'End': 'End',
                    'Insert': 'Insert', 'Delete': 'Delete', 'CapsLock': 'Caps_Lock',
                    'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4', 'F5': 'F5', 'F6': 'F6',
                    'F7': 'F7', 'F8': 'F8', 'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12'
                };
                if (map[step.code]) k = map[step.code];
                else if (map[step.key]) k = map[step.key];

                // Quote if specialized chars? xdotool handles mostly fine.

                if (step.type === 'down') {
                    args.push('keydown', k);
                } else {
                    args.push('keyup', k);
                }
            });

            const child = spawn('xdotool', args);
            child.on('error', (err) => {
                if (err.code === 'ENOENT') {
                    console.error('Error: xdotool not found. Please install it (e.g., sudo apt-get install xdotool) to use automation on Linux.');
                } else {
                    console.error('xdotool error:', err);
                }
            });
        }
    }
};
