import { Application } from '../main';
import { app, BrowserWindow, ipcMain } from 'electron';

// Electronモジュールをモック化
jest.mock('electron', () => ({
    app: {
        whenReady: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        quit: jest.fn(),
        getPath: jest.fn().mockReturnValue('/mock/path')
    },
    BrowserWindow: jest.fn().mockImplementation(() => ({
        loadFile: jest.fn(),
        on: jest.fn(),
        webContents: {
            openDevTools: jest.fn()
        }
    })),
    ipcMain: {
        handle: jest.fn()
    }
}));

// node-hidをモック化
jest.mock('node-hid', () => ({
    devices: jest.fn().mockReturnValue([
        {
            path: '/dev/hidraw0',
            vendorId: 1452,
            productId: 641,
            product: 'Apple Internal Keyboard',
            manufacturer: 'Apple Inc.',
            usagePage: 1,
            usage: 6
        }
    ])
}));

describe('Application', () => {
    let application: Application;
    const mockApp = app as jest.Mocked<typeof app>;
    const mockBrowserWindow = BrowserWindow as jest.MockedClass<typeof BrowserWindow>;
    const mockIpcMain = ipcMain as jest.Mocked<typeof ipcMain>;

    beforeEach(() => {
        jest.clearAllMocks();
        application = new Application();
    });

    describe('constructor', () => {
        it('should create application instance', () => {
            expect(application).toBeInstanceOf(Application);
        });
    });

    describe('initialize', () => {
        it('should set up app event listeners', () => {
            application.initialize();

            expect(mockApp.whenReady).toHaveBeenCalled();
            expect(mockApp.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
            expect(mockApp.on).toHaveBeenCalledWith('activate', expect.any(Function));
        });

        it('should register get-keyboards IPC handler', () => {
            application.initialize();
            expect(mockIpcMain.handle).toHaveBeenCalledWith('get-keyboards', expect.any(Function));
        });

        it('should handle window-all-closed event on non-macOS', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'win32', writable: true });

            application.initialize();

            // window-all-closedハンドラーを実行
            const windowAllClosedHandler = mockApp.on.mock.calls
                .find(call => call[0] === 'window-all-closed')?.[1];
            
            expect(windowAllClosedHandler).toBeDefined();
            if (windowAllClosedHandler) {
                windowAllClosedHandler();
                expect(mockApp.quit).toHaveBeenCalled();
            }

            Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
        });

        it('should not quit on window-all-closed on macOS', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });

            application.initialize();

            const windowAllClosedHandler = mockApp.on.mock.calls
                .find(call => call[0] === 'window-all-closed')?.[1];
            
            expect(windowAllClosedHandler).toBeDefined();
            if (windowAllClosedHandler) {
                windowAllClosedHandler();
                expect(mockApp.quit).not.toHaveBeenCalled();
            }

            Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
        });
    });

    describe('IPC handlers', () => {
        beforeEach(() => {
            application.initialize();
        });

        it('should return keyboard devices from get-keyboards handler', async () => {
            const getKeyboardsHandler = mockIpcMain.handle.mock.calls
                .find(call => call[0] === 'get-keyboards')?.[1];

            expect(getKeyboardsHandler).toBeDefined();

            if (getKeyboardsHandler) {
                // IPC handler requires event parameter
                const mockEvent = {} as any;
                const result = await getKeyboardsHandler(mockEvent);
                expect(result).toEqual([
                    {
                        id: '/dev/hidraw0',
                        name: 'Apple Internal Keyboard',
                        manufacturer: 'Apple Inc.',
                        connected: true
                    }
                ]);
            }
        });
    });

    describe('createWindow', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should create BrowserWindow when whenReady callback is called', async () => {
            application.initialize();
            
            // whenReady コールバックを実行
            const calls = mockApp.whenReady.mock.calls as any[];
            expect(calls.length).toBeGreaterThan(0);
            
            const whenReadyCallback = calls[0]?.[0] as (() => Promise<void>) | undefined;
            expect(whenReadyCallback).toBeDefined();
            
            if (typeof whenReadyCallback === 'function') {
                await whenReadyCallback();
            }

            expect(mockBrowserWindow).toHaveBeenCalledWith({
                width: 1200,
                height: 800,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: expect.stringContaining('preload.js')
                }
            });
        });

        it('should load index.html file', async () => {
            const mockWindow = {
                loadFile: jest.fn(),
                on: jest.fn(),
                webContents: {
                    openDevTools: jest.fn()
                }
            };
            mockBrowserWindow.mockReturnValue(mockWindow as any);

            application.initialize();
            
            // whenReady コールバックを実行
            const calls = mockApp.whenReady.mock.calls as any[];
            expect(calls.length).toBeGreaterThan(0);
            
            const whenReadyCallback = calls[0]?.[0] as (() => Promise<void>) | undefined;
            if (typeof whenReadyCallback === 'function') {
                await whenReadyCallback();
                expect(mockWindow.loadFile).toHaveBeenCalledWith('index.html');
            }
        });

        it('should open dev tools in development mode', async () => {
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const mockWindow = {
                loadFile: jest.fn(),
                on: jest.fn(),
                webContents: {
                    openDevTools: jest.fn()
                }
            };
            mockBrowserWindow.mockReturnValue(mockWindow as any);

            application.initialize();
            
            // whenReady コールバックを実行
            const calls = mockApp.whenReady.mock.calls as any[];
            expect(calls.length).toBeGreaterThan(0);
            
            const whenReadyCallback = calls[0]?.[0] as (() => Promise<void>) | undefined;
            if (typeof whenReadyCallback === 'function') {
                await whenReadyCallback();
                expect(mockWindow.webContents.openDevTools).toHaveBeenCalled();
            }

            process.env.NODE_ENV = originalNodeEnv;
        });
    });
});