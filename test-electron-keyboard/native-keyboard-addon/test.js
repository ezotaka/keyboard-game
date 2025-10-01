#!/usr/bin/env node

const { KeyboardDetector } = require('./index.js');

console.log('=== Native Keyboard Detection Test ===');

async function runTest() {
    const detector = new KeyboardDetector();

    console.log('\n1. Testing initialization...');
    const initialized = detector.initialize();

    if (!initialized) {
        console.error('❌ Failed to initialize keyboard detector');
        console.error('This might be due to:');
        console.error('  1. Missing permissions (Input Monitoring)');
        console.error('  2. macOS security restrictions');
        console.error('  3. Native addon build issues');
        process.exit(1);
    }

    console.log('✅ Keyboard detector initialized successfully');

    console.log('\n2. Testing keyboard scan...');
    const keyboards = detector.scanKeyboards();

    console.log(`\n3. Results:`);
    console.log(`   Found ${keyboards.length} keyboard(s)`);

    if (keyboards.length === 0) {
        console.log('\n⚠️ No keyboards detected. This could be due to:');
        console.log('   1. macOS security restrictions (Input Monitoring permission)');
        console.log('   2. Missing entitlements in the application');
        console.log('   3. IOHIDManager configuration issues');

        console.log('\n🔧 Debugging steps:');
        console.log('   1. Check System Preferences > Security & Privacy > Input Monitoring');
        console.log('   2. Ensure Terminal or your app has permission');
        console.log('   3. Try running with sudo (for testing only)');
        console.log('   4. Connect an external USB keyboard for testing');
    } else {
        console.log('\n✅ Keyboards detected successfully:');
        keyboards.forEach((kbd, index) => {
            console.log(`\nKeyboard ${index + 1}:`);
            console.log(`  📱 Name: ${kbd.name}`);
            console.log(`  🏭 Manufacturer: ${kbd.manufacturer}`);
            console.log(`  🔢 Vendor ID: 0x${kbd.vendorId.toString(16).toUpperCase()}`);
            console.log(`  🆔 Product ID: 0x${kbd.productId.toString(16).toUpperCase()}`);
            console.log(`  📍 Location ID: 0x${kbd.locationId.toString(16).toUpperCase()}`);
        });
    }

    console.log('\n4. Testing keyboard count...');
    const count = detector.getKeyboardCount();
    console.log(`   Count verification: ${count}`);

    console.log('\n=== Test Complete ===');

    if (keyboards.length > 0) {
        console.log('🎉 Success! Multiple keyboard detection is working.');
    } else {
        console.log('⚠️ No keyboards detected. Check permissions and setup.');
    }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
    console.error('\n❌ Uncaught Exception:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the test
runTest().catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
});