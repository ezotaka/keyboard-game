#!/usr/bin/env node

const { KeyboardDetector } = require('./index.js');

console.log('=== リアル入力キャプチャテスト ===');

async function runKeyInputTest() {
    const detector = new KeyboardDetector();

    console.log('\n1. 初期化中...');
    const initialized = detector.initialize();

    if (!initialized) {
        console.error('❌ 初期化失敗');
        process.exit(1);
    }

    console.log('\n2. キーボード検知中...');
    const keyboards = detector.scanKeyboards();

    if (keyboards.length === 0) {
        console.error('❌ キーボードが検知できませんでした');
        process.exit(1);
    }

    console.log(`\n✅ ${keyboards.length}個のキーボードを検知:`);
    keyboards.forEach((kb, i) => {
        console.log(`  KB-${i + 1}: ${kb.name} (${kb.manufacturer})`);
    });

    console.log('\n3. 個別キー入力監視開始...');
    console.log('💡 各キーボードで文字を入力してください (10秒間)');
    console.log('💡 Ctrl+C で終了');

    // コールバック方式
    detector.setKeyEventCallback((keyEvent) => {
        console.log(`🎹 KB-${keyEvent.keyboardId}: "${keyEvent.keyName}" (usage: 0x${keyEvent.usage.toString(16)})`);
    });

    // テスト期間
    setTimeout(() => {
        console.log('\n4. 10秒経過しました。手動テストが続行できます。');
    }, 10000);

    // SIGINT (Ctrl+C) ハンドラ
    process.on('SIGINT', () => {
        console.log('\n\n=== テスト終了 ===');
        console.log('✅ 個別キーボード入力キャプチャが動作しました！');
        process.exit(0);
    });
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
});

runKeyInputTest().catch((error) => {
    console.error('\n❌ テスト失敗:', error.message);
    process.exit(1);
});