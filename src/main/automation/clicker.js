const { spawn } = require('child_process');

module.exports = {
    execute: (macro) => {
        console.log(`Auto Clicker triggered - Clicks: ${macro.clicks || 1}, Delay: ${macro.delay || 100}ms (${process.platform})`);

        const clicks = parseInt(macro.clicks) || 1;
        const delay = parseInt(macro.delay) || 100;
        let command, args;

        if (process.platform === 'win32') {
            // Windows: PowerShell + user32.dll
            const psScript = `
$code = '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);'
$type = Add-Type -MemberDefinition $code -Name "Win32MouseEvent" -Namespace Win32Functions -PassThru
for ($i=0; $i -lt ${clicks}; $i++) {
    $type::mouse_event(0x0002, 0, 0, 0, 0); # DOWN
    $type::mouse_event(0x0004, 0, 0, 0, 0); # UP
    if ($i -lt ${clicks} - 1) { Start-Sleep -Milliseconds ${delay} }
}
`;
            command = 'powershell.exe';
            args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript];

        } else if (process.platform === 'darwin') {
            // macOS: JXA (JavaScript for Automation) using CoreGraphics
            // This is native and reliable, avoiding the need for 'cliclick' or broken 'System Events'
            const delaySeconds = delay / 1000;
            const jxaScript = `
ObjC.import('CoreGraphics');
ObjC.import('Foundation');

var clicks = ${clicks};
var delay = ${delaySeconds};

for (var i = 0; i < clicks; i++) {
    var loc = $.CGEventGetLocation($.CGEventCreate($.nil));
    
    // Left Mouse Down (1)
    var down = $.CGEventCreateMouseEvent($.nil, 1, loc, 0);
    $.CGEventPost(0, down);
    
    // Tiny delay for press registration
    $.NSThread.sleepForTimeInterval(0.02);
    
    // Left Mouse Up (2)
    var up = $.CGEventCreateMouseEvent($.nil, 2, loc, 0);
    $.CGEventPost(0, up);
    
    if (i < clicks - 1) {
        $.NSThread.sleepForTimeInterval(delay);
    }
}
`;
            command = 'osascript';
            args = ['-l', 'JavaScript', '-e', jxaScript];

        } else if (process.platform === 'linux') {
            // Linux: xdotool
            // Requires: sudo apt-get install xdotool
            command = 'xdotool';
            // xdotool click --repeat REPEAT --delay DELAY BUTTON
            args = ['click', '--repeat', clicks.toString(), '--delay', delay.toString(), '1'];
        }

        if (command) {
            const child = spawn(command, args);
            child.stderr.on('data', (data) => console.error(`Clicker Error: ${data}`));
            child.on('error', (err) => {
                if (process.platform === 'linux' && err.code === 'ENOENT') {
                    console.error('Error: xdotool not found. Please install it (e.g., sudo apt-get install xdotool) to use auto-clicker on Linux.');
                }
            });
            child.on('close', (code) => {
                if (code !== 0) console.log(`Clicker exited with code ${code}.`);
            });
        } else {
            console.error('Auto Clicker not supported on this platform without additional configuration.');
        }
    }
};
