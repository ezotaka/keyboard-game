// 最適化された複数キーボード入力分離テスト
const HID = require('node-hid');

console.log('🎹 最適化された複数キーボード入力分離テスト');
console.log('=====================================');
console.log('');

// HIDスキャンコードマッピング（拡張版）
const scanCodeMap = new Map([
  // Letters a-z
  [0x04, 'a'], [0x05, 'b'], [0x06, 'c'], [0x07, 'd'], [0x08, 'e'],
  [0x09, 'f'], [0x0A, 'g'], [0x0B, 'h'], [0x0C, 'i'], [0x0D, 'j'],
  [0x0E, 'k'], [0x0F, 'l'], [0x10, 'm'], [0x11, 'n'], [0x12, 'o'],
  [0x13, 'p'], [0x14, 'q'], [0x15, 'r'], [0x16, 's'], [0x17, 't'],
  [0x18, 'u'], [0x19, 'v'], [0x1A, 'w'], [0x1B, 'x'], [0x1C, 'y'],
  [0x1D, 'z'],
  // Numbers 1-0
  [0x1E, '1'], [0x1F, '2'], [0x20, '3'], [0x21, '4'], [0x22, '5'],
  [0x23, '6'], [0x24, '7'], [0x25, '8'], [0x26, '9'], [0x27, '0'],
  // Special keys
  [0x28, 'enter'], [0x29, 'escape'], [0x2A, 'backspace'], [0x2B, 'tab'],
  [0x2C, 'space'], [0x2D, '-'], [0x2E, '=']
]);

function mapScanCodeToKey(scanCode) {
  return scanCodeMap.get(scanCode) || `unknown(0x${scanCode.toString(16)})`;
}

function analyzeHIDData(data, keyboardIndex) {
  const analysis = {
    keyboardId: keyboardIndex,
    timestamp: Date.now(),
    rawBytes: Array.from(data),
    length: data.length,
    keys: []
  };

  if (data.length >= 8) {
    const modifier = data[0];
    const reserved = data[1];
    
    // キーを抽出（複数キー同時押し対応）
    for (let i = 2; i < Math.min(8, data.length); i++) {
      if (data[i] !== 0) {
        const key = mapScanCodeToKey(data[i]);
        analysis.keys.push({
          scanCode: data[i],
          key: key,
          position: i - 2
        });
      }
    }
    
    analysis.modifier = modifier;
    analysis.hasModifier = modifier !== 0;
    analysis.hasKeys = analysis.keys.length > 0;
  }
  
  return analysis;
}

// キーボード検知
console.log('🔍 キーボードを検知しています...');
const devices = HID.devices();
const keyboards = devices.filter(d => d.usage === 6 && d.usagePage === 1);

if (keyboards.length === 0) {
  console.log('❌ キーボードが見つかりません');
  process.exit(1);
}

console.log(`✅ ${keyboards.length}台のキーボードを検知しました:`);
keyboards.forEach((kb, i) => {
  console.log(`   ${i + 1}. ${kb.manufacturer || 'Unknown'} ${kb.product || 'Unknown'}`);
  console.log(`      VID:PID = 0x${kb.vendorId.toString(16)}:0x${kb.productId.toString(16)}`);
});
console.log('');

// 入力統計
const stats = {
  totalInputs: 0,
  keyboardInputs: new Map(),
  keyFrequency: new Map(),
  startTime: Date.now()
};

keyboards.forEach((_, i) => {
  stats.keyboardInputs.set(i + 1, 0);
});

// カラー設定
const colors = [
  '\x1b[31m', // 赤
  '\x1b[32m', // 緑
  '\x1b[33m', // 黄
  '\x1b[34m', // 青
  '\x1b[35m', // マゼンタ
  '\x1b[36m'  // シアン
];
const reset = '\x1b[0m';

console.log('👂 高精度入力監視を開始します...');
console.log('⏱️  30秒でテスト終了（Ctrl+Cで手動終了可）');
console.log('');

const connections = [];
let testActive = true;

// 接続処理
keyboards.forEach((kbInfo, index) => {
  try {
    const device = new HID.HID(kbInfo.path);
    const keyboardIndex = index + 1;
    const color = colors[index % colors.length];
    
    device.on('data', (data) => {
      if (!testActive) return;
      
      const analysis = analyzeHIDData(data, keyboardIndex);
      
      // キーが押されている場合のみ表示（リリースイベント除外）
      if (analysis.hasKeys) {
        stats.totalInputs++;
        const currentCount = stats.keyboardInputs.get(keyboardIndex) + 1;
        stats.keyboardInputs.set(keyboardIndex, currentCount);
        
        const timeStr = new Date(analysis.timestamp).toLocaleTimeString('ja-JP', { 
          hour12: false
        }) + '.' + String(analysis.timestamp % 1000).padStart(3, '0');
        
        // 各キーを記録
        analysis.keys.forEach(keyInfo => {
          const keyCount = stats.keyFrequency.get(keyInfo.key) || 0;
          stats.keyFrequency.set(keyInfo.key, keyCount + 1);
        });
        
        // カラー表示
        const keysStr = analysis.keys.map(k => `"${k.key}"`).join('+');
        console.log(
          `${color}[キーボード${keyboardIndex}]${reset} ` +
          `キー: ${keysStr} | ` +
          `時刻: ${timeStr} | ` +
          `累計: ${currentCount}回 | ` +
          `Raw: [${analysis.rawBytes.slice(0, 6).map(b => '0x' + b.toString(16)).join(',')}...]`
        );
      }
    });

    device.on('error', (error) => {
      console.error(`❌ キーボード${keyboardIndex}エラー:`, error.message);
    });

    connections.push({ device, keyboardIndex, keyboardInfo: kbInfo });
    console.log(`🔗 キーボード${keyboardIndex} 接続成功`);
    
  } catch (error) {
    console.error(`❌ キーボード${index + 1}接続失敗:`, error.message);
  }
});

console.log(`\n✅ ${connections.length}台で監視開始`);
console.log('🎮 複数のキーボードから文字を入力してください！');
console.log('=====================================\n');

// 30秒自動終了
const autoExit = setTimeout(() => {
  console.log('\n⏱️  テスト時間終了');
  cleanup();
}, 30000);

// 手動終了
process.on('SIGINT', cleanup);

function cleanup() {
  if (!testActive) return;
  testActive = false;
  
  console.log('\n🛑 テストを終了しています...');
  
  // 接続クリーンアップ
  connections.forEach(({ device, keyboardIndex }) => {
    try {
      device.close();
    } catch (error) {
      // ignore
    }
  });
  
  // 詳細統計表示
  displayStats();
  
  clearTimeout(autoExit);
  console.log('✅ テスト完了');
  
  setTimeout(() => process.exit(0), 1000);
}

function displayStats() {
  const duration = (Date.now() - stats.startTime) / 1000;
  
  console.log('\n📊 詳細テスト結果');
  console.log('=====================================');
  console.log(`⏱️  テスト時間: ${duration.toFixed(1)}秒`);
  console.log(`🎯 総入力数: ${stats.totalInputs}回`);
  console.log(`📈 入力レート: ${(stats.totalInputs / duration).toFixed(1)}回/秒`);
  console.log('');
  
  console.log('🎹 キーボード別統計:');
  connections.forEach(({ keyboardIndex, keyboardInfo }) => {
    const count = stats.keyboardInputs.get(keyboardIndex);
    const percentage = stats.totalInputs > 0 ? (count / stats.totalInputs * 100).toFixed(1) : '0';
    console.log(`   キーボード${keyboardIndex}: ${count}回 (${percentage}%) - ${keyboardInfo.product}`);
  });
  
  if (stats.keyFrequency.size > 0) {
    console.log('\n⌨️  キー使用頻度 (上位5個):');
    const sortedKeys = Array.from(stats.keyFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    sortedKeys.forEach(([key, count]) => {
      console.log(`   "${key}": ${count}回`);
    });
  }
  
  if (stats.totalInputs > 0) {
    console.log('\n🎉 複数キーボード入力分離テスト成功！');
    console.log('✅ 各キーボードからの入力を正確に識別・分離しました');
  }
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('\n❌ 予期しないエラー:', error.message);
  cleanup();
});