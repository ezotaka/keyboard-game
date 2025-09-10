/**
 * @jest-environment jsdom
 */

// Setup DOM elements
beforeEach(() => {
    document.body.innerHTML = `
        <div id="keyboard-list"></div>
        <button id="start-game-btn">ゲーム開始準備中...</button>
    `;
});

describe('game-demo (Simple)', () => {
    it('should have required DOM elements', () => {
        expect(document.getElementById('keyboard-list')).toBeTruthy();
        expect(document.getElementById('start-game-btn')).toBeTruthy();
    });

    it('should import module without errors', async () => {
        const module = await import('../game-demo');
        expect(module.SimpleGameDemo).toBeDefined();
        expect(module.initDemo).toBeDefined();
        expect(typeof module.SimpleGameDemo).toBe('function');
        expect(typeof module.initDemo).toBe('function');
    });
});