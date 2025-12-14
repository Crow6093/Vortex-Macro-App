const HID = require('node-hid');

const VID = 0xfeed;
const PID = 0x6060;

console.log('Scanning for devices with VID:', VID.toString(16), 'PID:', PID.toString(16));

const devices = HID.devices();
const matching = devices.filter(d => d.vendorId === VID && d.productId === PID);

console.log('Found', matching.length, 'matching devices.');

matching.forEach((d, i) => {
    console.log(`\nDevice ${i}:`);
    console.log('  Path:', d.path);
    console.log('  Usage Page:', d.usagePage, '(0x' + d.usagePage.toString(16) + ')');
    console.log('  Usage:', d.usage);
    console.log('  Interface:', d.interface);

    // Try to open
    try {
        const device = new HID.HID(d.path);
        console.log('  Opened successfully.');

        // Try writing a simple Static Color packet (RED)
        // Try 32 bytes size (plus report ID) -> 33
        try {
            const data = new Array(33).fill(0);
            data[0] = 0x00; // Report ID
            data[1] = 0x01; // Command Static
            data[2] = 255;  // R
            data[3] = 0;    // G
            data[4] = 0;    // B

            device.write(data);
            console.log('  Sent 33-byte packet (Standard QMK 32).');
        } catch (err) {
            console.log('  Failed to send 33-byte packet:', err.message);
        }

        // Try 64 bytes size (plus report ID) -> 65
        try {
            const data64 = new Array(65).fill(0);
            data64[0] = 0x00;
            data64[1] = 0x01;
            data64[2] = 0;
            data64[3] = 255; // Green
            data64[4] = 0;

            device.write(data64);
            console.log('  Sent 65-byte packet (Large QMK 64).');
        } catch (err) {
            console.log('  Failed to send 65-byte packet:', err.message);
        }

        device.close();
    } catch (e) {
        console.log('  Could not open:', e.message);
    }
});

if (matching.length === 0) {
    console.log('\nAll detected devices:');
    devices.forEach(d => {
        console.log(`VID: ${d.vendorId.toString(16)} PID: ${d.productId.toString(16)} Path: ${d.path}`);
    });
}
