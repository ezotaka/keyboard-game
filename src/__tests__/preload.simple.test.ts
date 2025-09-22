/**
 * @jest-environment jsdom
 */

// Electronモジュールをモック化
const mockContextBridge = {
    exposeInMainWorld: jest.fn()
};

const mockIpcRenderer = {
    on: jest.fn(),
    invoke: jest.fn()
};

jest.mock('electron', () => ({
    contextBridge: mockContextBridge,
    ipcRenderer: mockIpcRenderer
}));

describe('preload.ts', () => {
    beforeAll(() => {
        // preload.tsを実行
        require('../preload');
    });

    it('should expose keyboardGameAPI to window', () => {
        // preload.tsは直接windowに割り当てるので、windowオブジェクトをテストする
        expect((window as any).keyboardGameAPI).toBeDefined();
        expect((window as any).keyboardGameAPI).toHaveProperty('onKeyboardInput');
        expect((window as any).keyboardGameAPI).toHaveProperty('startGame');
        expect((window as any).keyboardGameAPI).toHaveProperty('stopGame');
        expect((window as any).keyboardGameAPI).toHaveProperty('getKeyboards');
    });

    it('should have correct API methods', () => {
        const api = (window as any).keyboardGameAPI;

        expect(typeof api.onKeyboardInput).toBe('function');
        expect(typeof api.startGame).toBe('function');
        expect(typeof api.stopGame).toBe('function');
        expect(typeof api.getKeyboards).toBe('function');
    });
});