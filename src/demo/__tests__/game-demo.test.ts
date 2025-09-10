/**
 * @jest-environment jsdom
 */

// Mock console methods before any imports
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
};

global.alert = jest.fn();

describe('game-demo', () => {
    beforeEach(() => {
        // DOM環境をセットアップ
        document.body.innerHTML = `
            <div id="keyboard-list"></div>
            <button id="start-game-btn">ゲーム開始準備中...</button>
        `;
        
        jest.clearAllMocks();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Module Import', () => {
        it('should import SimpleGameDemo and initDemo without errors', async () => {
            const module = await import('../game-demo');
            expect(module.SimpleGameDemo).toBeDefined();
            expect(module.initDemo).toBeDefined();
            expect(typeof module.SimpleGameDemo).toBe('function');
            expect(typeof module.initDemo).toBe('function');
        });
    });

    describe('SimpleGameDemo', () => {
        it('should create SimpleGameDemo instance', async () => {
            const { SimpleGameDemo } = await import('../game-demo');
            
            const demo = new SimpleGameDemo();
            expect(demo).toBeInstanceOf(SimpleGameDemo);
            expect(console.log).toHaveBeenCalledWith('SimpleGameDemo初期化開始');
        });

        it('should setup mock keyboards', async () => {
            const { SimpleGameDemo } = await import('../game-demo');
            
            new SimpleGameDemo();
            
            expect(console.log).toHaveBeenCalledWith('モックキーボード設定中...');
            expect(console.log).toHaveBeenCalledWith('モックキーボード設定完了:', expect.any(Array));
        });

        it('should update display', async () => {
            const { SimpleGameDemo } = await import('../game-demo');
            
            new SimpleGameDemo();
            
            expect(console.log).toHaveBeenCalledWith('ディスプレイ更新中...');
            
            const keyboardList = document.getElementById('keyboard-list');
            expect(keyboardList?.innerHTML).toContain('Apple Magic Keyboard');
            expect(keyboardList?.innerHTML).toContain('外付けキーボード');
        });

        it('should enable game button', async () => {
            const { SimpleGameDemo } = await import('../game-demo');
            
            new SimpleGameDemo();
            
            expect(console.log).toHaveBeenCalledWith('ゲームボタン有効化中...');
            expect(console.log).toHaveBeenCalledWith('ゲームボタン有効化完了');
            
            const startBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
            expect(startBtn.disabled).toBe(false);
            expect(startBtn.textContent).toBe('ゲーム開始');
        });

        it('should handle button click event', async () => {
            const { SimpleGameDemo } = await import('../game-demo');
            
            new SimpleGameDemo();
            
            const startBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
            startBtn.click();
            
            expect(console.log).toHaveBeenCalledWith('ゲーム開始ボタンがクリックされました');
            expect(window.alert).toHaveBeenCalledWith('デモモード: ゲームが開始されます！');
        });

        it('should handle missing keyboard-list element', async () => {
            document.getElementById('keyboard-list')?.remove();
            
            const { SimpleGameDemo } = await import('../game-demo');
            
            new SimpleGameDemo();
            
            expect(console.error).toHaveBeenCalledWith('keyboard-list要素が見つかりません');
        });

        it('should handle missing start-game-btn element', async () => {
            document.getElementById('start-game-btn')?.remove();
            
            const { SimpleGameDemo } = await import('../game-demo');
            
            new SimpleGameDemo();
            
            expect(console.error).toHaveBeenCalledWith('start-game-btn要素が見つかりません');
        });
    });

    describe('initDemo', () => {
        it('should initialize demo when DOM is ready', async () => {
            const { initDemo } = await import('../game-demo');
            
            // DOMが完全に読み込まれた状態をシミュレート
            Object.defineProperty(document, 'readyState', {
                writable: true,
                value: 'complete'
            });
            
            initDemo();
            
            expect(console.log).toHaveBeenCalledWith('DOM読み込み完了 - デモ初期化開始');
        });

        it('should wait for DOM to be ready', async () => {
            const { initDemo } = await import('../game-demo');
            
            // DOMが読み込み中の状態をシミュレート
            Object.defineProperty(document, 'readyState', {
                writable: true,
                value: 'loading'
            });
            
            initDemo();
            
            // DOMContentLoadedイベントを発火
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);
            
            expect(console.log).toHaveBeenCalledWith('DOM読み込み完了 - デモ初期化開始');
        });
    });

    describe('DOM Structure', () => {
        it('should have required DOM elements', () => {
            expect(document.getElementById('keyboard-list')).toBeTruthy();
            expect(document.getElementById('start-game-btn')).toBeTruthy();
        });

        it('should handle DOM manipulation', async () => {
            const { SimpleGameDemo } = await import('../game-demo');
            
            const keyboardList = document.getElementById('keyboard-list');
            expect(keyboardList?.innerHTML).toBe('');
            
            new SimpleGameDemo();
            
            expect(keyboardList?.innerHTML).not.toBe('');
        });
    });
});