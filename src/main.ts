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
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });
    }

    private createWindow(): void {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
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
            return { success: true };
        });

        // ゲーム停止
        ipcMain.handle('stop-game', async () => {
            console.log('Game stopped');
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
}

// Production initialization
if (require.main === module) {
    const app = new Application();
    app.initialize();
}