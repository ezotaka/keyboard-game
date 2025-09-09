import { app, BrowserWindow } from 'electron';
import * as path from 'path';

class Application {
    private mainWindow: BrowserWindow | null = null;

    constructor() {
        this.initApp();
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
}

new Application();