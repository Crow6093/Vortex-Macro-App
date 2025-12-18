const { exec } = require('child_process');

module.exports = {
    /**
     * Executes the volume control command.
     * @param {Object} macro - The macro object containing 'action' (VolumeUp/Down/Mute).
     */
    execute: (macro) => {
        const action = macro.action; // 'VolumeUp', 'VolumeDown', 'VolumeMute'
        console.log(`[Volume] Executing ${action} on ${process.platform}`);

        if (process.platform === 'darwin') {
            // --- macOS Implementation ---
            // Uses AppleScript (osascript) to interact with system volume.
            // This is required because 'node-hid' cannot inject keys reliably on macOS
            // without Accessibility permissions, and emulating media keys is restricted.
            let script = '';
            if (action === 'VolumeUp') {
                // Increase by ~6% (standard step)
                script = 'set volume output volume ((output volume of (get volume settings)) + 6)';
            } else if (action === 'VolumeDown') {
                script = 'set volume output volume ((output volume of (get volume settings)) - 6)';
            } else if (action === 'VolumeMute') {
                // Toggle Mute
                script = 'set volume output muted (not (output muted of (get volume settings)))';
            }

            if (script) {
                exec(`osascript -e "${script}"`, (error) => {
                    if (error) console.error(`[Volume] Error: ${error.message}`);
                });
            }
        } else if (process.platform === 'win32') {
            // --- Windows Implementation ---
            // Uses PowerShell to invoke user32.dll keybd_event.
            // This injects the actual VK_VOLUME keys (0xAF, 0xAE, 0xAD).

            const psScript = `
$code = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);'
$type = Add-Type -MemberDefinition $code -Name "Win32Vol" -Namespace Win32Functions -PassThru
$VK_VOLUME_MUTE = 0xAD
$VK_VOLUME_DOWN = 0xAE
$VK_VOLUME_UP = 0xAF
$KEYEVENTF_KEYUP = 0x0002

if ("${action}" -eq "VolumeUp") { $type::keybd_event($VK_VOLUME_UP, 0, 0, 0); $type::keybd_event($VK_VOLUME_UP, 0, $KEYEVENTF_KEYUP, 0); }
if ("${action}" -eq "VolumeDown") { $type::keybd_event($VK_VOLUME_DOWN, 0, 0, 0); $type::keybd_event($VK_VOLUME_DOWN, 0, $KEYEVENTF_KEYUP, 0); }
if ("${action}" -eq "VolumeMute") { $type::keybd_event($VK_VOLUME_MUTE, 0, 0, 0); $type::keybd_event($VK_VOLUME_MUTE, 0, $KEYEVENTF_KEYUP, 0); }
`;
            // Execute in background
            const command = 'powershell.exe';
            const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript];
            const child = require('child_process').spawn(command, args);
            child.on('error', (e) => console.error('[Volume] Windows Error:', e));
        }
    }
};
