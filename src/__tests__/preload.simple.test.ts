/**
 * @jest-environment node
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

    it('should expose keyboardGameAPI to main world', () => {
        expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
            'keyboardGameAPI',
            expect.objectContaining({
                onKeyboardInput: expect.any(Function),
                startGame: expect.any(Function),
                stopGame: expect.any(Function),
                getKeyboards: expect.any(Function)
            })
        );
    });

    it('should have correct API methods', () => {
        const exposedAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1];
        
        expect(typeof exposedAPI.onKeyboardInput).toBe('function');
        expect(typeof exposedAPI.startGame).toBe('function');
        expect(typeof exposedAPI.stopGame).toBe('function');
        expect(typeof exposedAPI.getKeyboards).toBe('function');
    });
});