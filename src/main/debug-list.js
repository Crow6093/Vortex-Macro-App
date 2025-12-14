const HID = require('node-hid');
const VID = 0xfeed;
const PID = 0x6060;
const devices = HID.devices().filter(d => d.vendorId === VID && d.productId === PID);
console.log(JSON.stringify(devices, null, 2));
