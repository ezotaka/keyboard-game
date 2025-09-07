// HIDデバイス診断テスト
const HID = require('node-hid');

console.log('🔬 HIDデバイス詳細診断');
console.log('=====================================');

// すべてのHIDデバイスを表示
console.log('📋 すべてのHIDデバイス:');
const allDevices = HID.devices();
allDevices.forEach((device, index) => {
  if (device.usage === 6 && device.usagePage === 1) {
    console.log(`\n🎹 キーボード ${index + 1}:`);
    console.log(`   Manufacturer: ${device.manufacturer || 'Unknown'}`);
    console.log(`   Product: ${device.product || 'Unknown'}`);
    console.log(`   VendorID: 0x${device.vendorId.toString(16)}`);
    console.log(`   ProductID: 0x${device.productId.toString(16)}`);
    console.log(`   Path: ${device.path}`);
    console.log(`   Usage: ${device.usage}`);
    console.log(`   UsagePage: ${device.usagePage}`);
    console.log(`   Interface: ${device.interface}`);
    console.log(`   Release: ${device.release}`);
  }
});

console.log('\n🧪 Raw HID データテスト開始...');
console.log('⏱️  5秒間のデータ監視');

const keyboards = allDevices.filter(d => d.usage === 6 && d.usagePage === 1);

if (keyboards.length === 0) {
  console.log('❌ キーボードが見つかりません');
  process.exit(1);
}

let dataReceived = false;
const connections = [];

keyboards.forEach((kbInfo, index) => {
  try {
    console.log(`\n🔌 キーボード${index + 1} (${kbInfo.product}) への接続を試行...`);
    const device = new HID.HID(kbInfo.path);
    
    device.on('data', (data) => {
      dataReceived = true;
      console.log(`📡 キーボード${index + 1} からデータ受信:`);
      console.log(`   Raw bytes: [${Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`);
      console.log(`   Length: ${data.length}`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);
      
      // HID keyboard format analysis
      if (data.length >= 8) {
        console.log(`   Modifier: 0x${data[0].toString(16)}`);
        console.log(`   Reserved: 0x${data[1].toString(16)}`);
        console.log(`   Key1: 0x${data[2].toString(16)} (${data[2] !== 0 ? 'pressed' : 'released'})`);
        console.log(`   Key2: 0x${data[3].toString(16)}`);
      }
      console.log('');
    });

    device.on('error', (error) => {
      console.log(`❌ キーボード${index + 1} エラー: ${error.message}`);
    });

    connections.push({ device, index: index + 1 });
    console.log(`✅ キーボード${index + 1} 接続成功`);

  } catch (error) {
    console.log(`❌ キーボード${index + 1} 接続失敗: ${error.message}`);
  }
});

console.log(`\n🎮 ${connections.length}台接続完了 - キーを押してください！`);
console.log('⏰ 5秒でテスト終了...');

// 5秒後終了
setTimeout(() => {
  console.log('\n⏱️  テスト終了');
  
  if (!dataReceived) {
    console.log('❌ どのキーボードからもデータを受信できませんでした');
    console.log('\n🔍 考えられる原因:');
    console.log('   1. macOSのセキュリティ制限');
    console.log('   2. Input Monitoring権限が必要');
    console.log('   3. BluetoothキーボードのHIDアクセス制限');
    console.log('   4. 内蔵キーボードの特殊な実装');
    
    console.log('\n💡 解決策:');
    console.log('   1. System Preferences > Security & Privacy > Privacy > Input Monitoring');
    console.log('   2. ターミナル（Warp）にInput Monitoring権限を付与');
    console.log('   3. 有線USBキーボードでテスト');
  } else {
    console.log('✅ HIDデータ受信成功！');
  }
  
  // クリーンアップ
  connections.forEach(({ device, index }) => {
    try {
      device.close();
      console.log(`📡 キーボード${index} 切断完了`);
    } catch (error) {
      console.log(`⚠️  キーボード${index} 切断完了`);
    }
  });
  
  console.log('✅ 診断完了');
  process.exit(0);
}, 5000);

// 手動終了
process.on('SIGINT', () => {
  console.log('\n🛑 手動終了...');
  connections.forEach(({ device }) => {
    try { device.close(); } catch (e) {}
  });
  process.exit(0);
});