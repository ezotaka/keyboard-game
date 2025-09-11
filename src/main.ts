import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as HID from 'node-hid';

// HID定数の定義
const KEYBOARD_USAGE = 6;
const GENERIC_DESKTOP_USAGE_PAGE = 1;

interface KeyboardInfo {
    id: string;
    name: string;
    vendorId: number;
    productId: number;
    path: string;
}

export class Application {
    private mainWindow: BrowserWindow | null = null;
    private detectedKeyboards: KeyboardInfo[] = [];

    constructor() {
        // テスト用に初期化を遅延
    }

    public initialize(): void {
        this.initApp();
        this.setupIPC();
    }

    private initApp(): void {
        app.whenReady().then(() => {
            this.createWindow();
        });

        app.on('window-all-closed', () => {
            this.stopKeyboardListening(); // クリーンアップ
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        app.on('before-quit', () => {
            this.stopKeyboardListening(); // アプリ終了前のクリーンアップ
        });
    }

    private createWindow(): void {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                preload: path.join(__dirname, 'preload.js')
            },
            show: false,
            titleBarStyle: 'default'
        });

        this.mainWindow.loadFile(path.join(__dirname, 'presentation', 'index.html'));

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
        });

        if (process.env.NODE_ENV === 'development') {
            this.mainWindow.webContents.openDevTools();
        }
    }

    private setupIPC(): void {
        // キーボード一覧取得
        ipcMain.handle('get-keyboards', async () => {
            console.log('キーボード取得リクエストを受信');
            const keyboards = this.getKeyboards();
            console.log('検知したキーボード:', keyboards);
            return keyboards;
        });

        // ゲーム開始
        ipcMain.handle('start-game', async (event, config) => {
            console.log('Game started with config:', config);
            this.startKeyboardListening();
            return { success: true };
        });

        // ゲーム停止
        ipcMain.handle('stop-game', async () => {
            console.log('Game stopped');
            this.stopKeyboardListening();
            return { success: true };
        });
    }

    private getKeyboards(): KeyboardInfo[] {
        try {
            // 実際のHIDデバイスを検知
            const devices = HID.devices();
            const keyboards = devices
                .filter((device: any) => 
                    device.usage === KEYBOARD_USAGE && device.usagePage === GENERIC_DESKTOP_USAGE_PAGE
                )
                .map((device: any, index: number) => ({
                    id: `keyboard-${device.vendorId}-${device.productId}-${index}`,
                    name: device.product || `キーボード ${index + 1}`,
                    vendorId: device.vendorId || 0,
                    productId: device.productId || 0,
                    path: device.path || ''
                }));

            // 開発用: キーボードが見つからない場合はモックデータを返す
            if (keyboards.length === 0) {
                return this.getMockKeyboards();
            }

            this.detectedKeyboards = keyboards;
            return keyboards;
        } catch (error) {
            console.error('キーボード検知エラー:', error);
            return this.getMockKeyboards();
        }
    }

    private getMockKeyboards(): KeyboardInfo[] {
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

    private keyboardDevices: Map<string, any> = new Map();
    private isListening = false;

    private startKeyboardListening(): void {
        if (this.isListening) return;
        
        try {
            console.log('キーボード監視開始');
            this.isListening = true;

            // 各キーボードデバイスに対してリスナーを設定
            this.detectedKeyboards.forEach(keyboard => {
                try {
                    const device = new HID.HID(keyboard.path);
                    this.keyboardDevices.set(keyboard.id, device);
                    
                    device.on('data', (data: Buffer) => {
                        this.handleKeyboardData(keyboard.id, data);
                    });
                    
                    device.on('error', (error: Error) => {
                        console.error(`キーボード ${keyboard.id} エラー:`, error);
                    });
                    
                    console.log(`キーボード ${keyboard.name} (${keyboard.id}) の監視開始`);
                } catch (error) {
                    console.error(`キーボード ${keyboard.id} のオープンに失敗:`, error);
                }
            });

            // フォールバック: 通常のキーボードイベントも監視
            if (this.mainWindow) {
                this.mainWindow.webContents.on('before-input-event', (event, input) => {
                    if (input.type === 'keyDown') {
                        // デバイス特定できない場合のフォールバック
                        const fallbackKeyboardId = this.detectedKeyboards[0]?.id || 'mock-keyboard-1';
                        this.sendKeyboardInput(fallbackKeyboardId, input.key);
                    }
                });
            }
        } catch (error) {
            console.error('キーボード監視開始エラー:', error);
        }
    }

    private stopKeyboardListening(): void {
        if (!this.isListening) return;
        
        console.log('キーボード監視停止');
        this.isListening = false;

        // 全デバイスを閉じる
        this.keyboardDevices.forEach((device, keyboardId) => {
            try {
                device.close();
                console.log(`キーボード ${keyboardId} を閉じました`);
            } catch (error) {
                console.error(`キーボード ${keyboardId} のクローズエラー:`, error);
            }
        });
        
        this.keyboardDevices.clear();
    }

    private handleKeyboardData(keyboardId: string, data: Buffer): void {
        try {
            // HIDデータからキー情報を抽出（簡易版）
            // 実際の実装ではより詳細な解析が必要
            const keyCode = data[2]; // 通常3バイト目にキーコード
            if (keyCode > 0) {
                const key = this.convertHIDToKey(keyCode);
                if (key) {
                    this.sendKeyboardInput(keyboardId, key);
                }
            }
        } catch (error) {
            console.error('キーボードデータ処理エラー:', error);
        }
    }

    private convertHIDToKey(keyCode: number): string | null {
        // HIDキーコードから文字への変換マップ（簡易版）
        const keyMap: { [key: number]: string } = {
            4: 'a', 5: 'b', 6: 'c', 7: 'd', 8: 'e', 9: 'f', 10: 'g',
            11: 'h', 12: 'i', 13: 'j', 14: 'k', 15: 'l', 16: 'm', 17: 'n',
            18: 'o', 19: 'p', 20: 'q', 21: 'r', 22: 's', 23: 't', 24: 'u',
            25: 'v', 26: 'w', 27: 'x', 28: 'y', 29: 'z',
            30: '1', 31: '2', 32: '3', 33: '4', 34: '5',
            35: '6', 36: '7', 37: '8', 38: '9', 39: '0',
            40: 'Enter', 41: 'Escape', 42: 'Backspace', 43: 'Tab', 44: ' '
        };
        
        return keyMap[keyCode] || null;
    }

    private sendKeyboardInput(keyboardId: string, key: string): void {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('keyboard-input', {
                keyboardId,
                key,
                timestamp: Date.now()
            });
        }
    }
}

// Production initialization
if (require.main === module) {
    const app = new Application();
    app.initialize();
}