const HID = require('node-hid');
const VID = 0xfeed;
const PID = 0x6060;

console.log('--- DEEP SCAN START ---');
const devices = HID.devices();
const matching = devices.filter(d => d.vendorId === VID && d.productId === PID);

if (matching.length === 0) {
    console.log('No devices found with VID 0xFEED PID 0x6060');
} else {
    matching.forEach((d, i) => {
        console.log(`\nDevice #${i}`);
        console.log(`  Path:       ${d.path}`);
        console.log(`  Interface:  ${d.interface}`);
        console.log(`  UsagePage:  ${d.usagePage} (0x${d.usagePage.toString(16).toUpperCase()})`);
        console.log(`  Usage:      ${d.usage} (0x${d.usage.toString(16).toUpperCase()})`);

        // Detailed check for Raw HID
        if (d.usagePage === 0xFF60 || d.usagePage === 65376) {
            console.log('  *** THIS LOOKS LIKE RAW HID (UsagePage 0xFF60) ***');
        }
    });
}
console.log('--- DEEP SCAN END ---');
