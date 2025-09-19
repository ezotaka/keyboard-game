const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Native Addonを使ってキーボード検知
let keyboardDetector;
try {
    const { KeyboardDetector } = require('./native-keyboard-addon/index.js');
    keyboardDetector = new KeyboardDetector();
    console.log('Native keyboard detector loaded successfully');
} catch (error) {
    console.warn('Native keyboard detector not available, using mock data:', error.message);
}

class KeyboardGameApp {
    constructor() {
        this.mainWindow = null;
        this.detectedKeyboards = [];
        this.inputHistory = [];
        this.keyboardUpdateCallbacks = [];
    }

    async createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            title: 'Keyboard Game - 保育園タイピングゲーム'
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
                    this.scanKeyboards();

                    // 定期的にキーボード状態をチェック（新しいキーボードの検知）
                    setInterval(() => {
                        this.scanKeyboards();
                    }, 3000); // 3秒ごと
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
                    connected: true,
                    method: 'mock'
                },
                {
                    id: 'kb-2',
                    name: 'Mock Keyboard 2',
                    manufacturer: 'Mock Corp.',
                    vendorId: 0x9ABC,
                    productId: 0xDEF0,
                    locationId: 0x02,
                    connected: true,
                    method: 'mock'
                }
            ];
            console.log('フォールバック: モックデータ使用');
        }

        // レンダラーにキーボード情報を送信
        this.sendToRenderer('keyboards-detected', this.detectedKeyboards);
    }

    scanKeyboards() {
        if (!keyboardDetector) return;

        try {
            const detectedKeyboards = keyboardDetector.scanKeyboards();

            // 前回との差分チェック（LocationIDベースで重複除去）
            const previousCount = this.detectedKeyboards.length;
            const existingLocationIds = new Set(this.detectedKeyboards.map(kb => kb.locationId));

            // 新しいキーボードリストを作成（重複除去）
            const newKeyboards = detectedKeyboards.map((device, index) => ({
                id: `kb-${index + 1}`,
                name: device.name || `Keyboard ${index + 1}`,
                manufacturer: device.manufacturer || 'Unknown',
                vendorId: device.vendorId,
                productId: device.productId,
                locationId: device.locationId,
                connected: true,
                method: 'native-addon'
            }));

            // LocationIDで重複除去
            const uniqueKeyboards = [];
            const seenLocationIds = new Set();

            for (const keyboard of newKeyboards) {
                if (!seenLocationIds.has(keyboard.locationId)) {
                    seenLocationIds.add(keyboard.locationId);
                    uniqueKeyboards.push(keyboard);
                }
            }

            this.detectedKeyboards = uniqueKeyboards;

            // キーボード数が変更された場合のみ通知
            if (this.detectedKeyboards.length !== previousCount) {
                console.log(`キーボード数変更: ${previousCount} -> ${this.detectedKeyboards.length}`);
                this.sendToRenderer('keyboards-updated', this.detectedKeyboards);
            }

        } catch (error) {
            console.error('キーボードスキャンエラー:', error);
        }
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
                    code: keyEvent.keyName,
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
            } else {
                console.error('❌ リアルキーボード入力監視の開始に失敗');
            }
        } catch (error) {
            console.error('リアルキーボード入力設定エラー:', error);
        }
    }

    setupInputHandling() {
        // Electronの入力イベント監視（フォールバック用）
        this.mainWindow.webContents.on('before-input-event', (event, input) => {
            if (input.type === 'keyDown') {
                // Native Addonが利用可能でない場合のフォールバック
                if (!keyboardDetector) {
                    this.handleFallbackKeyInput(input);
                }
            }
        });
    }

    handleFallbackKeyInput(input) {
        const keyEvent = {
            key: input.key,
            code: input.code,
            keyboardId: 'kb-1', // フォールバック時は仮のID
            timestamp: Date.now(),
            source: 'electron-fallback',
            modifiers: {
                shift: input.shift,
                control: input.control,
                alt: input.alt,
                meta: input.meta
            }
        };

        console.log(`⌨️ Fallback Input: "${input.key}"`);

        // 入力履歴に追加
        this.inputHistory.push(keyEvent);
        if (this.inputHistory.length > 100) {
            this.inputHistory.shift();
        }

        // レンダラーに送信
        this.sendToRenderer('key-input', keyEvent);
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

        ipcMain.handle('rescan-keyboards', () => {
            this.scanKeyboards();
            return this.detectedKeyboards;
        });
    }
}

// Electronアプリケーション初期化
const keyboardGameApp = new KeyboardGameApp();

app.whenReady().then(() => {
    keyboardGameApp.setupIPC();
    keyboardGameApp.createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        keyboardGameApp.createWindow();
    }
});