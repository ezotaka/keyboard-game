/**
 * @jest-environment node
 */

import { contextBridge, ipcRenderer } from 'electron';

// Electronモジュールをモック化
jest.mock('electron', () => ({
    contextBridge: {
        exposeInMainWorld: jest.fn()
    },
    ipcRenderer: {
        on: jest.fn(),
        invoke: jest.fn()
    }
}));

describe('preload.ts', () => {
    const mockContextBridge = contextBridge as jest.Mocked<typeof contextBridge>;
    const mockIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        // preload.tsを新しく実行
        require('../preload');
    });

    it('should expose keyboardGameAPI to main world', () => {
        expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
            'keyboardGameAPI',
            expect.any(Object)
        );
    });

    it('should provide correct API structure', () => {
        expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalled();
        const calls = mockContextBridge.exposeInMainWorld.mock.calls;
        
        if (calls.length > 0) {
            const exposedAPI = calls[0][1];

            expect(exposedAPI).toHaveProperty('onKeyboardInput');
            expect(exposedAPI).toHaveProperty('startGame');
            expect(exposedAPI).toHaveProperty('stopGame');
            expect(exposedAPI).toHaveProperty('getKeyboards');

            expect(typeof exposedAPI.onKeyboardInput).toBe('function');
            expect(typeof exposedAPI.startGame).toBe('function');
            expect(typeof exposedAPI.stopGame).toBe('function');
            expect(typeof exposedAPI.getKeyboards).toBe('function');
        }
    });

    describe('onKeyboardInput', () => {
        it('should set up IPC listener for keyboard-input', () => {
            const calls = mockContextBridge.exposeInMainWorld.mock.calls;
            
            if (calls.length > 0) {
                const exposedAPI = calls[0][1];
                const mockCallback = jest.fn();

                exposedAPI.onKeyboardInput(mockCallback);

                expect(mockIpcRenderer.on).toHaveBeenCalledWith('keyboard-input', expect.any(Function));
            }
        });

        it('should call callback when keyboard-input event is received', () => {
            const calls = mockContextBridge.exposeInMainWorld.mock.calls;
            
            if (calls.length > 0) {
                const exposedAPI = calls[0][1];
                const mockCallback = jest.fn();
                const testData = { key: 'a', keyboard: 'test' };

                exposedAPI.onKeyboardInput(mockCallback);

                // IPC listener関数を取得して実行
                const onCalls = mockIpcRenderer.on.mock.calls;
                if (onCalls.length > 0) {
                    const ipcListener = onCalls[0][1];
                    ipcListener({} as any, testData);

                    expect(mockCallback).toHaveBeenCalledWith(testData);
                }
            }
        });
    });

    describe('startGame', () => {
        it('should invoke start-game IPC with config', async () => {
            const calls = mockContextBridge.exposeInMainWorld.mock.calls;
            
            if (calls.length > 0) {
                const exposedAPI = calls[0][1];
                const testConfig = { teams: 2, duration: 60 };

                mockIpcRenderer.invoke.mockResolvedValue({ success: true });

                const result = await exposedAPI.startGame(testConfig);

                expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('start-game', testConfig);
                expect(result).toEqual({ success: true });
            }
        });

        it('should handle startGame errors', async () => {
            const calls = mockContextBridge.exposeInMainWorld.mock.calls;
            
            if (calls.length > 0) {
                const exposedAPI = calls[0][1];
                const testConfig = { teams: 2, duration: 60 };
                const error = new Error('Start game failed');

                mockIpcRenderer.invoke.mockRejectedValue(error);

                await expect(exposedAPI.startGame(testConfig)).rejects.toThrow('Start game failed');
            }
        });
    });

    describe('stopGame', () => {
        it('should invoke stop-game IPC', async () => {
            const calls = mockContextBridge.exposeInMainWorld.mock.calls;
            
            if (calls.length > 0) {
                const exposedAPI = calls[0][1];

                mockIpcRenderer.invoke.mockResolvedValue({ success: true });

                const result = await exposedAPI.stopGame();

                expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('stop-game');
                expect(result).toEqual({ success: true });
            }
        });

        it('should handle stopGame errors', async () => {
            const calls = mockContextBridge.exposeInMainWorld.mock.calls;
            
            if (calls.length > 0) {
                const exposedAPI = calls[0][1];
                const error = new Error('Stop game failed');

                mockIpcRenderer.invoke.mockRejectedValue(error);

                await expect(exposedAPI.stopGame()).rejects.toThrow('Stop game failed');
            }
        });
    });

    describe('getKeyboards', () => {
        it('should invoke get-keyboards IPC', async () => {
            const calls = mockContextBridge.exposeInMainWorld.mock.calls;
            
            if (calls.length > 0) {
                const exposedAPI = calls[0][1];
                const mockKeyboards = [
                    { id: 'kb1', name: 'Keyboard 1' },
                    { id: 'kb2', name: 'Keyboard 2' }
                ];

                mockIpcRenderer.invoke.mockResolvedValue(mockKeyboards);

                const result = await exposedAPI.getKeyboards();

                expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-keyboards');
                expect(result).toEqual(mockKeyboards);
            }
        });

        it('should handle getKeyboards errors', async () => {
            const calls = mockContextBridge.exposeInMainWorld.mock.calls;
            
            if (calls.length > 0) {
                const exposedAPI = calls[0][1];
                const error = new Error('Get keyboards failed');

                mockIpcRenderer.invoke.mockRejectedValue(error);

                await expect(exposedAPI.getKeyboards()).rejects.toThrow('Get keyboards failed');
            }
        });
    });
});