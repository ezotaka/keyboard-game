import * as HID from 'node-hid';

interface KeyboardInfo {
    id: string;
    name: string;
    vendorId: number;
    productId: number;
    path: string;
}

function getKeyboards(): KeyboardInfo[] {
    try {
        console.log('HIDデバイス検知を開始...');
        const devices = HID.devices();
        console.log(`合計${devices.length}個のHIDデバイスを検知`);
        
        const keyboards = devices
            .filter((device: any) => 
                device.usage === 6 && device.usagePage === 1 // キーボード
            )
            .map((device: any, index: number) => ({
                id: `keyboard-${device.vendorId}-${device.productId}-${index}`,
                name: device.product || `キーボード ${index + 1}`,
                vendorId: device.vendorId || 0,
                productId: device.productId || 0,
                path: device.path || ''
            }));

        console.log(`キーボード検知結果: ${keyboards.length}個`);
        keyboards.forEach((kb, index) => {
            console.log(`  ${index + 1}. ${kb.name} (ID: ${kb.id})`);
        });

        // キーボードが見つからない場合はモックデータを返す
        if (keyboards.length === 0) {
            console.log('実際のキーボードが見つからないため、モックデータを使用');
            return getMockKeyboards();
        }

        return keyboards;
    } catch (error) {
        console.error('キーボード検知エラー:', error);
        console.log('エラーのため、モックデータを使用');
        return getMockKeyboards();
    }
}

function getMockKeyboards(): KeyboardInfo[] {
    return [
        {
            id: 'mock-keyboard-1',
            name: 'Apple Magic Keyboard',
            vendorId: 1452,
            productId: 641,
            path: 'mock-path-1'
        },
        {
            id: 'mock-keyboard-2', 
            name: '外付けキーボード',
            vendorId: 1234,
            productId: 5678,
            path: 'mock-path-2'
        }
    ];
}

// テスト実行
console.log('=== キーボード検知テスト開始 ===');
const detectedKeyboards = getKeyboards();
console.log('\n=== 最終結果 ===');
console.log('検知したキーボード一覧:');
detectedKeyboards.forEach((kb, index) => {
    console.log(`${index + 1}. 名前: ${kb.name}`);
    console.log(`   ID: ${kb.id}`);
    console.log(`   ベンダーID: ${kb.vendorId}`);
    console.log(`   プロダクトID: ${kb.productId}`);
    console.log(`   パス: ${kb.path}`);
    console.log('');
});
console.log('=== テスト終了 ===');