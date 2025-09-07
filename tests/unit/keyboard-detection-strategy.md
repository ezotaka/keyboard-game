# キーボード検知テスト戦略

## テスト階層

### 1. Unit Tests（単体テスト）
**対象**: 各クラス・関数の個別動作
**環境**: Mock HID デバイス

```typescript
// キーボードエンティティのテスト
describe('Keyboard Entity', () => {
  test('should create keyboard with valid properties')
  test('should validate keyboard ID uniqueness')
  test('should handle keyboard connection state')
});

// キーボード検知サービスのテスト  
describe('KeyboardDetectionService', () => {
  test('should detect multiple keyboards from mock HID data')
  test('should filter out non-keyboard devices')
  test('should handle device connection/disconnection events')
});
```

### 2. Integration Tests（統合テスト）
**対象**: コンポーネント間の連携
**環境**: 実際のnode-hidライブラリ + Mock

```typescript
describe('Keyboard Detection Integration', () => {
  test('should integrate with real node-hid library')
  test('should persist keyboard state across detection cycles')
  test('should emit proper events on device changes')
});
```

### 3. E2E Tests（エンドツーエンドテスト）
**対象**: 実機での動作確認
**環境**: 実際のUSBキーボード複数台

```typescript
describe('Real Device Detection', () => {
  test('should detect actual USB keyboards', async () => {
    // 手動テスト: 複数USBキーボード接続状態で実行
    // 自動テスト: CI環境では skip
  });
});
```

## テスト用Mock戦略

### HID デバイス Mock データ
```typescript
const MOCK_HID_DEVICES = [
  // Apple Magic Keyboard
  {
    vendorId: 0x05ac,
    productId: 0x0267,
    path: '/dev/hidraw0',
    manufacturer: 'Apple Inc.',
    product: 'Magic Keyboard',
    interface: 0
  },
  // Generic USB Keyboard
  {
    vendorId: 0x1234,
    productId: 0x5678, 
    path: '/dev/hidraw1',
    manufacturer: 'Generic',
    product: 'USB Keyboard',
    interface: 0
  },
  // Mouse (should be filtered out)
  {
    vendorId: 0x046d,
    productId: 0xc077,
    path: '/dev/hidraw2', 
    manufacturer: 'Logitech',
    product: 'USB Mouse',
    interface: 0
  }
];
```

### イベント Mock
```typescript
const mockKeyboardEvents = {
  keydown: { key: 'a', keyCode: 65, devicePath: '/dev/hidraw0' },
  keyup: { key: 'a', keyCode: 65, devicePath: '/dev/hidraw0' },
  deviceConnect: { devicePath: '/dev/hidraw3' },
  deviceDisconnect: { devicePath: '/dev/hidraw1' }
};
```

## 実機テスト手順

### 開発環境での検証
1. **複数キーボード準備**
   - USB キーボード 2-3台
   - 異なるメーカー・モデル推奨
   
2. **接続パターンテスト**
   - 段階的接続（1台→2台→3台）
   - 同時接続
   - 接続・切断の繰り返し

3. **入力識別テスト**
   - 各キーボードからの同時入力
   - キー識別の正確性確認
   - 入力の重複・漏れチェック

### CI/CDでの自動テスト
```yaml
# GitHub Actions example
test-keyboard-detection:
  strategy:
    matrix:
      os: [ubuntu-latest, macos-latest, windows-latest]
  steps:
    - run: npm test -- --testPathPattern="keyboard.*test"
    - run: npm run test:integration
    # 実機テストは手動実行のみ（CI環境では物理デバイス不可）
```

## テスト用ユーティリティ

### MockHIDProvider
```typescript
class MockHIDProvider {
  private devices: HIDDevice[] = [];
  
  addDevice(device: HIDDevice): void
  removeDevice(path: string): void  
  simulateInput(path: string, input: KeyInput): void
  getConnectedDevices(): HIDDevice[]
}
```

### KeyboardTestHelper
```typescript
class KeyboardTestHelper {
  static createMockKeyboard(overrides?: Partial<KeyboardProperties>): Keyboard
  static simulateKeySequence(keyboard: Keyboard, keys: string[]): Promise<void>
  static waitForKeyboardDetection(timeout = 5000): Promise<Keyboard[]>
}
```

## テストシナリオ

### 正常系
- [x] 単一キーボード検知
- [x] 複数キーボード同時検知  
- [x] キーボード動的追加・削除
- [x] 各キーボードからの独立入力

### 異常系
- [x] HIDライブラリエラー処理
- [x] 無効なデバイス情報の処理
- [x] デバイス切断中の入力処理
- [x] メモリリーク防止（リスナー解放）

### パフォーマンス
- [x] 大量デバイス検知時の応答時間（< 100ms）
- [x] 連続入力処理の遅延測定
- [x] メモリ使用量監視