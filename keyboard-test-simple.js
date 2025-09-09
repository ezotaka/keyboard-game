// 複数キーボード入力テスト用シンプルデモ
const HID = require('node-hid');

console.log('🎹 複数キーボード入力分離テスト開始');
console.log('=====================================');
console.log('');

// HIDスキャンコードから文字へのマッピング
const scanCodeMap = new Map([
  // Letters a-z (scan codes 0x04-0x1D)
  [0x04, 'a'], [0x05, 'b'], [0x06, 'c'], [0x07, 'd'], [0x08, 'e'],
  [0x09, 'f'], [0x0A, 'g'], [0x0B, 'h'], [0x0C, 'i'], [0x0D, 'j'],
  [0x0E, 'k'], [0x0F, 'l'], [0x10, 'm'], [0x11, 'n'], [0x12, 'o'],
  [0x13, 'p'], [0x14, 'q'], [0x15, 'r'], [0x16, 's'], [0x17, 't'],
  [0x18, 'u'], [0x19, 'v'], [0x1A, 'w'], [0x1B, 'x'], [0x1C, 'y'],
  [0x1D, 'z'],
  
  // Numbers 1-0 (scan codes 0x1E-0x27)
  [0x1E, '1'], [0x1F, '2'], [0x20, '3'], [0x21, '4'], [0x22, '5'],
  [0x23, '6'], [0x24, '7'], [0x25, '8'], [0x26, '9'], [0x27, '0'],
  
  // Special keys
  [0x28, 'enter'], [0x29, 'escape'], [0x2A, 'backspace'], [0x2B, 'tab'],
  [0x2C, 'space'], [0x2D, '-'], [0x2E, '='], [0x2F, '['], [0x30, ']'],
  [0x31, '\\'], [0x33, ';'], [0x34, "'"], [0x35, '`'], [0x36, ','],
  [0x37, '.'], [0x38, '/']
]);

function mapScanCodeToKey(scanCode) {
  return scanCodeMap.get(scanCode) || 'unknown';
}

// キーボードデバイスを検知
console.log('🔍 キーボードデバイスを検知しています...');
const devices = HID.devices();
const keyboards = devices.filter(device => 
  device.usage === 6 && device.usagePage === 1  // Keyboard usage
);

if (keyboards.length === 0) {
  console.log('❌ キーボードデバイスが見つかりませんでした');
  console.log('💡 キーボードデバイスへのアクセス権限が不足している可能性があります。udevルールの設定やデバイスファイルの権限を確認してください。');
  process.exit(1);
}

console.log(`✅ ${keyboards.length}台のキーボードを検知しました:`);
keyboards.forEach((keyboard, index) => {
  const manufacturer = keyboard.manufacturer || 'Unknown';
  const product = keyboard.product || 'Unknown';
  const vendorHex = `0x${keyboard.vendorId.toString(16).padStart(4, '0')}`;
  const productHex = `0x${keyboard.productId.toString(16).padStart(4, '0')}`;
  console.log(`   ${index + 1}. ${manufacturer} ${product} (${vendorHex}:${productHex}) [${keyboard.path}]`);
});
console.log('');

// 各キーボードに接続して入力を監視
const connections = [];
const inputCounts = new Map();

// カラー表示用のANSIエスケープコード
const colors = [
  '\x1b[31m', // 赤
  '\x1b[32m', // 緑  
  '\x1b[33m', // 黄
  '\x1b[34m', // 青
  '\x1b[35m', // マゼンタ
  '\x1b[36m', // シアン
];
const reset = '\x1b[0m';

console.log('👂 入力監視を開始します...');

try {
  keyboards.forEach((keyboardInfo, index) => {
    try {
      const device = new HID.HID(keyboardInfo.path);
      const keyboardIndex = index + 1;
      const color = colors[index % colors.length];
      
      device.on('data', (data) => {
        // HID keyboard data format: [modifier, reserved, key1, key2, key3, key4, key5, key6]
        if (data.length >= 3) {
          const scanCode = data[2];
          
          // Ignore key release events (scanCode = 0)
          if (scanCode === 0) {
            return;
          }

          const key = mapScanCodeToKey(scanCode);
          const timestamp = new Date();
          const timeString = timestamp.toLocaleTimeString('ja-JP', { hour12: false }) 
            + '.' + String(timestamp.getMilliseconds()).padStart(3, '0');
          
          // 入力回数カウント
          const countKey = `keyboard-${keyboardIndex}`;
          const currentCount = inputCounts.get(countKey) || 0;
          inputCounts.set(countKey, currentCount + 1);
          
          // 入力表示
          console.log(
            `${color}[キーボード${keyboardIndex}]${reset} ` +
            `キー: "${key}" | ` +
            `時刻: ${timeString} | ` +
            `回数: ${currentCount + 1} | ` +
            `デバイス: ${keyboardInfo.path.split('/').pop()}`
          );
        }
      });

      device.on('error', (error) => {
        console.error(`❌ キーボード${keyboardIndex}エラー:`, error.message);
      });

      connections.push({ device, keyboardIndex, keyboardInfo });
      
    } catch (error) {
      console.error(`❌ キーボード${index + 1}への接続に失敗:`, error.message);
    }
  });

  if (connections.length === 0) {
    console.log('❌ どのキーボードにも接続できませんでした');
    console.log('💡 管理者権限で実行してください: sudo node keyboard-test-simple.js');
    process.exit(1);
  }

  console.log(`✅ ${connections.length}台のキーボードで入力監視を開始しました`);
  console.log('');
  console.log('📋 テスト方法:');
  console.log('   1. 複数のキーボードから文字を入力してください');
  console.log('   2. 同じキーを同時に押して入力分離を確認してください');
  console.log('   3. 各キーボードが異なる色で表示されることを確認してください');
  console.log('   4. Ctrl+C で終了します');
  console.log('');
  console.log('🎮 入力テスト開始 - キーを押してください!');
  console.log('=====================================');
  console.log('');

} catch (error) {
  console.error('❌ 初期化エラー:', error.message);
  process.exit(1);
}

// 終了処理
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 テストを終了しています...');
  
  // 統計表示
  console.log('');
  console.log('📊 入力統計:');
  console.log('=====================================');
  
  let totalInputs = 0;
  connections.forEach(({ keyboardIndex, keyboardInfo }) => {
    const count = inputCounts.get(`keyboard-${keyboardIndex}`) || 0;
    totalInputs += count;
    
    const manufacturer = keyboardInfo.manufacturer || 'Unknown';
    const product = keyboardInfo.product || 'Unknown';
    console.log(`   キーボード${keyboardIndex}: ${count}回入力 [${manufacturer} ${product}]`);
  });
  
  console.log(`   合計: ${totalInputs}回入力`);
  
  if (totalInputs > 0) {
    console.log('');
    console.log('✅ 複数キーボード入力分離テスト成功!');
  }
  
  // クリーンアップ
  connections.forEach(({ device }) => {
    try {
      device.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  console.log('✅ テスト終了完了');
  process.exit(0);
});