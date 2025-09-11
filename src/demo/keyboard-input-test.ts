import * as HID from 'node-hid';

// ANSI カラーコード
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
};

const availableColors = [colors.red, colors.green, colors.yellow, colors.blue, colors.magenta, colors.cyan];

interface KeyboardDevice {
    id: string;
    name: string;
    device: HID.HID;
    path: string;
    color: string;
}

class KeyboardInputTester {
    private keyboards: KeyboardDevice[] = [];
    private isRunning = false;

    constructor() {
        // より確実な終了処理
        const exitHandler = () => {
            if (this.isRunning) {
                console.log('\n終了処理中...');
                this.stop();
            }
            process.exit(0);
        };
        
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', (key) => {
            // Ctrl+C (03) を検知
            if (key[0] === 3) {
                exitHandler();
            }
        });
        
        process.on('SIGINT', exitHandler);
        process.on('SIGTERM', exitHandler);
    }

    async initialize(): Promise<void> {
        console.log('=== 複数キーボード入力区別テスト ===');
        console.log('キーボードデバイスを検索中...');

        try {
            const devices = HID.devices();
            const keyboardDevices = devices.filter(device => 
                device.usage === 6 && device.usagePage === 1 && device.path
            );

            console.log(`${keyboardDevices.length}個のキーボードデバイスを発見:`);

            for (let i = 0; i < keyboardDevices.length; i++) {
                const device = keyboardDevices[i];
                try {
                    const hid = new HID.HID(device.path!);
                    const assignedColor = availableColors[i % availableColors.length];
                    const keyboard: KeyboardDevice = {
                        id: `keyboard-${i + 1}`,
                        name: device.product || `キーボード ${i + 1}`,
                        device: hid,
                        path: device.path!,
                        color: assignedColor
                    };
                    
                    this.keyboards.push(keyboard);
                    console.log(`  ${assignedColor}${keyboard.id}: ${keyboard.name}${colors.reset}`);
                    
                } catch (error) {
                    console.log(`  スキップ: ${device.product} (アクセス権限なし)`);
                }
            }

            if (this.keyboards.length === 0) {
                console.log('使用可能なキーボードが見つかりません。');
                console.log('管理者権限で実行してみてください: sudo npx ts-node keyboard-input-test.ts');
                return;
            }

            console.log(`\n${this.keyboards.length}個のキーボードで入力監視を開始します。`);
            console.log('各キーボードでキーを押して、どのキーボードからの入力か区別できるかテストしてください。');
            console.log('終了するには Ctrl+C を押してください。\n');

        } catch (error) {
            console.error('初期化エラー:', error);
            throw error;
        }
    }

    start(): void {
        this.isRunning = true;
        
        this.keyboards.forEach(keyboard => {
            keyboard.device.on('data', (data: Buffer) => {
                if (!this.isRunning) return;
                
                const timestamp = new Date().toLocaleTimeString();
                const keyData = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
                
                console.log(`${keyboard.color}[${timestamp}] ${keyboard.id} (${keyboard.name}): ${keyData}${colors.reset}`);
                
                // 特定のキーコードを解析
                this.analyzeKeyPress(keyboard, data);
            });

            keyboard.device.on('error', (error) => {
                console.error(`${keyboard.id} エラー:`, error);
            });
        });
    }

    private analyzeKeyPress(keyboard: KeyboardDevice, data: Buffer): void {
        // 修飾キーの解析 (バイト0)
        const modifiers = data[0];
        const modifierKeys: string[] = [];
        
        if (modifiers & 0x01) modifierKeys.push('Left Ctrl');
        if (modifiers & 0x02) modifierKeys.push('Left Shift'); 
        if (modifiers & 0x04) modifierKeys.push('Left Alt');
        if (modifiers & 0x08) modifierKeys.push('Left GUI');
        if (modifiers & 0x10) modifierKeys.push('Right Ctrl');
        if (modifiers & 0x20) modifierKeys.push('Right Shift');
        if (modifiers & 0x40) modifierKeys.push('Right Alt');
        if (modifiers & 0x80) modifierKeys.push('Right GUI');

        // 通常キーの解析 (バイト2以降)
        const pressedKeys: string[] = [];
        for (let i = 2; i < Math.min(data.length, 8); i++) {
            const keyCode = data[i];
            if (keyCode !== 0) {
                const keyName = this.getKeyName(keyCode);
                if (keyName) {
                    pressedKeys.push(keyName);
                }
            }
        }

        // 何かキーが押された場合のみ詳細表示
        if (modifierKeys.length > 0 || pressedKeys.length > 0) {
            let keyInfo = `${keyboard.color}  ▶ ${keyboard.id}で検出: `;
            if (modifierKeys.length > 0) {
                keyInfo += `修飾キー:[${modifierKeys.join(', ')}] `;
            }
            if (pressedKeys.length > 0) {
                keyInfo += `キー:[${pressedKeys.join(', ')}]`;
            }
            keyInfo += colors.reset;
            console.log(keyInfo);
        }
    }

    private getKeyName(keyCode: number): string | null {
        const keyMap: { [key: number]: string } = {
            0x04: 'A', 0x05: 'B', 0x06: 'C', 0x07: 'D', 0x08: 'E', 0x09: 'F',
            0x0A: 'G', 0x0B: 'H', 0x0C: 'I', 0x0D: 'J', 0x0E: 'K', 0x0F: 'L',
            0x10: 'M', 0x11: 'N', 0x12: 'O', 0x13: 'P', 0x14: 'Q', 0x15: 'R',
            0x16: 'S', 0x17: 'T', 0x18: 'U', 0x19: 'V', 0x1A: 'W', 0x1B: 'X',
            0x1C: 'Y', 0x1D: 'Z',
            0x1E: '1', 0x1F: '2', 0x20: '3', 0x21: '4', 0x22: '5',
            0x23: '6', 0x24: '7', 0x25: '8', 0x26: '9', 0x27: '0',
            0x28: 'Enter', 0x29: 'Escape', 0x2A: 'Backspace', 0x2B: 'Tab',
            0x2C: 'Space', 0x39: 'CapsLock'
        };
        
        return keyMap[keyCode] || `Unknown(${keyCode.toString(16)})`;
    }

    stop(): void {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        // stdin を復元
        try {
            if (process.stdin.setRawMode) {
                process.stdin.setRawMode(false);
            }
            process.stdin.pause();
        } catch (error) {
            // エラーは無視
        }
        
        this.keyboards.forEach(keyboard => {
            try {
                keyboard.device.close();
            } catch (error) {
                console.error(`${keyboard.id} クローズエラー:`, error);
            }
        });
        this.keyboards = [];
        console.log('すべてのキーボードデバイスを閉じました。');
    }
}

// テスト実行
async function runTest(): Promise<void> {
    const tester = new KeyboardInputTester();
    
    try {
        await tester.initialize();
        tester.start();
        
        // テストを無限に実行（Ctrl+Cで終了）
        await new Promise((resolve) => {
            // 空のPromiseで無限に待機
            // プロセスシグナルで終了される
        });
        
    } catch (error) {
        console.error('テスト実行エラー:', error);
        tester.stop();
        process.exit(1);
    }
}

runTest();