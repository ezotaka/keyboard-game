const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Native Addonを使って実際のキーボード検知
let keyboardDetector;
try {
    const { KeyboardDetector } = require('./native-keyboard-addon/index.js');
    keyboardDetector = new KeyboardDetector();
    console.log('Native keyboard detector loaded successfully');
} catch (error) {
    console.warn('Native keyboard detector not available, using mock data:', error.message);
}

class KeyboardTester {
    constructor() {
        this.mainWindow = null;
        this.detectedKeyboards = [];
        this.inputHistory = [];
        this.keyboardAssignments = new Map(); // タイミングベースでキーボード推定
    }

    async createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            title: 'Multi-Keyboard Input Tester'
        });

        await this.mainWindow.loadFile('index.html');
        
        // 開発時はDevToolsを開く
        if (process.argv.includes('--dev')) {
            this.mainWindow.webContents.openDevTools();
        }

        this.setupKeyboardDetection();
        this.setupInputHandling();
        this.setupRealKeyboardInput();
    }

    setupKeyboardDetection() {
        console.log('=== キーボード検知開始 ===');

        try {
            if (keyboardDetector) {
                // Native Addonによるキーボード検知
                console.log('Native Addonでキーボード検知を初期化...');
                const initialized = keyboardDetector.initialize();

                if (initialized) {
                    console.log('Native Addon初期化成功、キーボードスキャン開始...');
                    const detectedKeyboards = keyboardDetector.scanKeyboards();

                    this.detectedKeyboards = detectedKeyboards.map((device, index) => ({
                        id: `kb-${index + 1}`,
                        name: device.name || `Keyboard ${index + 1}`,
                        manufacturer: device.manufacturer || 'Unknown',
                        vendorId: device.vendorId,
                        productId: device.productId,
                        locationId: device.locationId,
                        method: 'native-addon'
                    }));

                    console.log(`Native Addon検知: ${this.detectedKeyboards.length}個のキーボード`);
                    this.detectedKeyboards.forEach((kb, i) => {
                        console.log(`  ${i + 1}. ${kb.name} (${kb.manufacturer})`);
                        console.log(`     Vendor: 0x${kb.vendorId.toString(16)}, Product: 0x${kb.productId.toString(16)}`);
                    });
                } else {
                    console.error('Native Addon初期化失敗');
                    throw new Error('Native Addon initialization failed');
                }
            } else {
                throw new Error('Native keyboard detector not available');
            }
        } catch (error) {
            console.error('キーボード検知エラー:', error);
            // フォールバック: モックデータ
            this.detectedKeyboards = [
                {
                    id: 'kb-1',
                    name: 'Mock Keyboard 1',
                    manufacturer: 'Mock Inc.',
                    vendorId: 0x1234,
                    productId: 0x5678,
                    locationId: 0x01,
                    method: 'mock'
                },
                {
                    id: 'kb-2',
                    name: 'Mock Keyboard 2',
                    manufacturer: 'Mock Corp.',
                    vendorId: 0x9ABC,
                    productId: 0xDEF0,
                    locationId: 0x02,
                    method: 'mock'
                }
            ];
            console.log('フォールバック: モックデータ使用');
        }

        // レンダラーにキーボード情報を送信
        this.sendToRenderer('keyboards-detected', this.detectedKeyboards);
    }

    setupRealKeyboardInput() {
        console.log('=== リアルキーボード入力監視設定 ===');

        if (!keyboardDetector) {
            console.warn('Native keyboard detector not available, skipping real input setup');
            return;
        }

        try {
            // Native Addonによる直接キーイベントキャプチャ
            const success = keyboardDetector.setKeyEventCallback((keyEvent) => {
                console.log(`🎹 Real Input - KB-${keyEvent.keyboardId}: "${keyEvent.keyName}"`);

                // 正確なキーボードIDを含むイベントを送信
                const realKeyEvent = {
                    key: keyEvent.keyName,
                    code: keyEvent.keyName, // HIDからは直接codeが取れないので同じ値を使用
                    keyboardId: `kb-${keyEvent.keyboardId}`,
                    timestamp: Date.now(),
                    source: 'native-direct',
                    rawData: {
                        usagePage: keyEvent.usagePage,
                        usage: keyEvent.usage,
                        value: keyEvent.value,
                        nativeTimestamp: keyEvent.timestamp
                    }
                };

                // 入力履歴に追加
                this.inputHistory.push(realKeyEvent);
                if (this.inputHistory.length > 100) {
                    this.inputHistory.shift();
                }

                // レンダラーに送信
                this.sendToRenderer('real-key-input', realKeyEvent);
            });

            if (success) {
                console.log('✅ リアルキーボード入力監視が開始されました');
                console.log('💡 これで物理的に異なるキーボードからの入力を個別に識別できます');
            } else {
                console.error('❌ リアルキーボード入力監視の開始に失敗');
            }
        } catch (error) {
            console.error('リアルキーボード入力設定エラー:', error);
        }
    }

    setupInputHandling() {
        console.log('=== 入力監視設定 ===');
        
        // Electronの入力イベント監視
        this.mainWindow.webContents.on('before-input-event', (event, input) => {
            if (input.type === 'keyDown') {
                this.handleKeyInput(input);
            }
        });

        // ウィンドウフォーカスイベント
        this.mainWindow.on('focus', () => {
            console.log('ウィンドウフォーカス取得');
        });

        this.mainWindow.on('blur', () => {
            console.log('ウィンドウフォーカス喪失');
        });
    }

    handleKeyInput(input) {
        const timestamp = Date.now();
        const keyboardId = this.estimateKeyboardSource(input, timestamp);
        
        const keyEvent = {
            key: input.key,
            code: input.code,
            keyboardId: keyboardId,
            timestamp: timestamp,
            modifiers: {
                shift: input.shift,
                control: input.control,
                alt: input.alt,
                meta: input.meta
            }
        };

        console.log(`⌨️ キー入力: "${input.key}" -> ${keyboardId} (${timestamp})`);
        
        // 入力履歴に追加
        this.inputHistory.push(keyEvent);
        if (this.inputHistory.length > 100) {
            this.inputHistory.shift(); // 古い履歴を削除
        }

        // レンダラーに送信
        this.sendToRenderer('key-input', keyEvent);
    }

    estimateKeyboardSource(input, timestamp) {
        // 改良版キーボード推定ロジック
        const recentInputs = this.inputHistory.slice(-10); // 最近の10個の入力

        if (recentInputs.length === 0) {
            return this.detectedKeyboards[0]?.id || 'kb-1';
        }

        const lastInput = recentInputs[recentInputs.length - 1];
        const timeDiff = timestamp - lastInput.timestamp;

        // アプローチ1: 連続入力判定（同じキーボード）
        if (timeDiff < 300) {
            // 300ms以内の高速連続入力 = 同じキーボードの可能性が高い
            console.log(`高速連続入力: ${lastInput.keyboardId} 継続 (間隔: ${timeDiff}ms)`);
            return lastInput.keyboardId;
        }

        // アプローチ2: タイミング解析（キーボード切り替え）
        if (timeDiff > 800) {
            // 800ms以上の間隔 = 異なるキーボードの可能性
            const currentIndex = this.detectedKeyboards.findIndex(kb => kb.id === lastInput.keyboardId);
            const nextKeyboardId = this.detectedKeyboards[(currentIndex + 1) % this.detectedKeyboards.length]?.id || 'kb-1';
            console.log(`長い間隔での切替: ${lastInput.keyboardId} -> ${nextKeyboardId} (間隔: ${timeDiff}ms)`);
            return nextKeyboardId;
        }

        // アプローチ3: 修飾キーパターン分析
        if (input.shift && input.key.length === 1) {
            // Shift + 文字 = キーボード2優先
            const shiftKeyboardId = this.detectedKeyboards[1]?.id || 'kb-2';
            console.log(`Shift修飾キー検出: ${shiftKeyboardId} 選択`);
            return shiftKeyboardId;
        }

        if (input.control || input.alt || input.meta) {
            // Ctrl/Alt/Cmd修飾キー = キーボード1優先
            const ctrlKeyboardId = this.detectedKeyboards[0]?.id || 'kb-1';
            console.log(`Ctrl/Alt/Cmd修飾キー検出: ${ctrlKeyboardId} 選択`);
            return ctrlKeyboardId;
        }

        // アプローチ4: 中間間隔の場合は前回と同じキーボードを維持
        console.log(`中間間隔: ${lastInput.keyboardId} 維持 (間隔: ${timeDiff}ms)`);
        return lastInput.keyboardId;
    }

    sendToRenderer(channel, data) {
        if (this.mainWindow) {
            this.mainWindow.webContents.send(channel, data);
        }
    }

    // IPCハンドラー
    setupIPC() {
        ipcMain.handle('get-keyboards', () => {
            return this.detectedKeyboards;
        });

        ipcMain.handle('get-input-history', () => {
            return this.inputHistory;
        });

        ipcMain.handle('clear-history', () => {
            this.inputHistory = [];
            return { success: true };
        });
    }
}

// Electronアプリケーション初期化
const keyboardTester = new KeyboardTester();

app.whenReady().then(() => {
    keyboardTester.setupIPC();
    keyboardTester.createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        keyboardTester.createWindow();
    }
});