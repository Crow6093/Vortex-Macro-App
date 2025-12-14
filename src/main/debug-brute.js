const HID = require('node-hid');
const VID = 0xfeed;
const PID = 0x6060;

console.log('--- BRUTE FORCE TEST ---');
const devices = HID.devices().filter(d => d.vendorId === VID && d.productId === PID);

if (devices.length === 0) {
    console.log('No devices found.');
} else {
    devices.forEach((d, i) => {
        console.log(`\nTesting Device #${i} (Interface ${d.interface}, UP: ${d.usagePage}, Usage: ${d.usage})`);
        try {
            const device = new HID.HID(d.path);

            // Try Standard QMK Packet (33 bytes)
            const packet = new Array(33).fill(0);
            packet[0] = 0x00; // Report ID
            packet[1] = 0x01; // CMD Static
            packet[2] = 255;  // R
            packet[3] = 0;    // G
            packet[4] = 0;    // B

            try {
                device.write(packet);
                console.log('  SUCCESS: Wrote 33 bytes to this interface!');
            } catch (err) {
                console.log('  Write Failed (33 bytes): ' + err.message);

                // Try 65 bytes
                try {
                    const packet65 = new Array(65).fill(0);
                    packet65[0] = 0x00;
                    packet65[1] = 0x01;
                    packet65[2] = 0;
                    packet65[3] = 255;
                    device.write(packet65);
                    console.log('  SUCCESS: Wrote 65 bytes to this interface!');
                } catch (e2) {
                    console.log('  Write Failed (65 bytes): ' + e2.message);
                }
            }
            device.close();
        } catch (e) {
            console.log('  Could not open: ' + e.message);
        }
    });
}
console.log('--- END ---');
