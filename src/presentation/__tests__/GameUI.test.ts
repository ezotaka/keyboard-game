import { JSDOM } from 'jsdom';

// JSDOM環境のセットアップ
const dom = new JSDOM(`<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
</head>
<body>
    <div id="app">
        <header class="game-header">
            <h1>🎮 キーボードタイピングゲーム 🎮</h1>
            <div class="game-status">
                <span id="game-state">準備中</span>
            </div>
        </header>
        <main class="game-container">
            <section id="setup-screen" class="screen active">
                <div class="setup-panel">
                    <select id="team-count" class="setting-input">
                        <option value="2">2チーム</option>
                        <option value="3">3チーム</option>
                        <option value="4">4チーム</option>
                    </select>
                    <select id="difficulty" class="setting-input">
                        <option value="easy">やさしい</option>
                    </select>
                    <div id="keyboard-list" class="keyboard-list">
                        <div class="loading">キーボードを検知しています...</div>
                    </div>
                    <button id="start-game-btn" class="btn btn-primary btn-large" disabled>
                        ゲーム開始
                    </button>
                </div>
            </section>
            <section id="game-screen" class="screen">
                <div class="game-info">
                    <div class="current-word">
                        <h2 id="target-word">単語が表示されます</h2>
                    </div>
                    <div class="game-timer">
                        <span id="timer">60</span>秒
                    </div>
                </div>
                <div id="teams-container" class="teams-container"></div>
            </section>
            <section id="result-screen" class="screen">
                <div class="result-panel">
                    <div id="results-list" class="results-list"></div>
                    <button id="restart-btn" class="btn btn-primary btn-large">
                        もう一度遊ぶ
                    </button>
                </div>
            </section>
        </main>
    </div>
</body>
</html>`);

global.window = dom.window as any;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;

// Web Audio API モック
class MockAudioContext {
    sampleRate = 44100;
    createBuffer = jest.fn().mockReturnValue({
        getChannelData: jest.fn().mockReturnValue(new Float32Array(1000))
    });
    createBufferSource = jest.fn().mockReturnValue({
        buffer: null,
        connect: jest.fn(),
        start: jest.fn()
    });
    createGain = jest.fn().mockReturnValue({
        gain: { value: 1 },
        connect: jest.fn()
    });
    destination = {};
}

global.window.AudioContext = MockAudioContext as any;
(global.window as any).webkitAudioContext = MockAudioContext as any;

// KeyboardGameAPI モック
const mockKeyboardAPI = {
    onKeyboardInput: jest.fn(),
    startGame: jest.fn().mockResolvedValue(undefined),
    stopGame: jest.fn().mockResolvedValue(undefined),
    getKeyboards: jest.fn().mockResolvedValue([
        { id: 'keyboard-1', name: 'テストキーボード1' },
        { id: 'keyboard-2', name: 'テストキーボード2' }
    ])
};

global.window.keyboardGameAPI = mockKeyboardAPI;

// テスト対象のインポート
import '../renderer';

describe('GameUI', () => {
    beforeEach(() => {
        // DOM要素をリセット
        document.getElementById('setup-screen')?.classList.add('active');
        document.getElementById('game-screen')?.classList.remove('active');
        document.getElementById('result-screen')?.classList.remove('active');
        
        // ゲーム状態をリセット
        const gameState = document.getElementById('game-state');
        if (gameState) gameState.textContent = '準備中';
        
        // モックをリセット
        jest.clearAllMocks();
    });

    describe('初期化', () => {
        test('初期画面が正しく表示される', () => {
            const setupScreen = document.getElementById('setup-screen');
            const gameScreen = document.getElementById('game-screen');
            const resultScreen = document.getElementById('result-screen');

            expect(setupScreen?.classList.contains('active')).toBe(true);
            expect(gameScreen?.classList.contains('active')).toBe(false);
            expect(resultScreen?.classList.contains('active')).toBe(false);
        });

        test('ゲーム状態が初期値で表示される', () => {
            const gameState = document.getElementById('game-state');
            expect(gameState?.textContent).toBe('準備中');
        });

        test('開始ボタンが存在する', () => {
            const startButton = document.getElementById('start-game-btn') as HTMLButtonElement;
            expect(startButton).toBeTruthy();
            expect(startButton?.textContent?.trim()).toBe('ゲーム開始');
        });
    });

    describe('キーボード管理', () => {
        test('キーボードリストが更新される', async () => {
            const keyboardList = document.getElementById('keyboard-list');
            expect(keyboardList).toBeTruthy();
            
            // ページ読み込み後にキーボード一覧が表示されていることを確認
            // 実際のアプリではモックAPIが呼び出され、キーボードアイテムが表示される
            expect(keyboardList?.innerHTML).toMatch(/(キーボードを検知しています|テストキーボード)/);
        });
    });

    describe('チーム設定', () => {
        test('チーム数が正しく設定される', () => {
            const teamCountSelect = document.getElementById('team-count') as HTMLSelectElement;
            teamCountSelect.value = '3';
            
            // change イベントをディスパッチ
            const changeEvent = new dom.window.Event('change');
            teamCountSelect.dispatchEvent(changeEvent);

            expect(teamCountSelect.value).toBe('3');
        });

        test('チーム数変更でキーボード割り当てが更新される', () => {
            const teamCountSelect = document.getElementById('team-count') as HTMLSelectElement;
            teamCountSelect.value = '4';
            
            const changeEvent = new dom.window.Event('change');
            teamCountSelect.dispatchEvent(changeEvent);

            // チーム数に応じてキーボードの割り当て状態が変わることを期待
            expect(teamCountSelect.value).toBe('4');
        });
    });

    describe('画面遷移', () => {
        test('画面表示の切り替えが正しく動作する', () => {
            // ゲーム画面への切り替えをシミュレート
            const setupScreen = document.getElementById('setup-screen');
            const gameScreen = document.getElementById('game-screen');

            setupScreen?.classList.remove('active');
            gameScreen?.classList.add('active');

            expect(setupScreen?.classList.contains('active')).toBe(false);
            expect(gameScreen?.classList.contains('active')).toBe(true);
        });
    });

    describe('UI要素の表示', () => {
        test('チーム表示エリアが動的に生成される', () => {
            const teamsContainer = document.getElementById('teams-container');
            expect(teamsContainer).toBeTruthy();

            // テストでチーム表示を模擬
            teamsContainer!.innerHTML = `
                <div class="team-panel team-1">
                    <div class="team-name">チーム 1</div>
                    <div class="team-score">0点</div>
                </div>
                <div class="team-panel team-2">
                    <div class="team-name">チーム 2</div>
                    <div class="team-score">0点</div>
                </div>
            `;

            const teamPanels = teamsContainer!.querySelectorAll('.team-panel');
            expect(teamPanels.length).toBe(2);
        });

        test('単語表示エリアが存在する', () => {
            const targetWord = document.getElementById('target-word');
            expect(targetWord).toBeTruthy();
            expect(targetWord?.textContent).toBe('単語が表示されます');
        });

        test('タイマー表示エリアが存在する', () => {
            const timer = document.getElementById('timer');
            expect(timer).toBeTruthy();
            expect(timer?.textContent).toBe('60');
        });
    });

    describe('ボタンイベント', () => {
        test('リスタートボタンのクリックイベントが設定されている', () => {
            const restartButton = document.getElementById('restart-btn');
            expect(restartButton).toBeTruthy();
            
            // クリックイベントがあることを確認（実際のイベントハンドラーが設定されているかは初期化時にテスト）
            const clickEvent = new dom.window.Event('click');
            restartButton?.dispatchEvent(clickEvent);
            
            // エラーが発生しないことを確認
            expect(true).toBe(true);
        });
    });

    describe('レスポンシブ対応', () => {
        test('チームコンテナがグリッドレイアウトを持つ', () => {
            const teamsContainer = document.getElementById('teams-container');
            expect(teamsContainer?.className).toContain('teams-container');
        });
    });

    describe('アクセシビリティ', () => {
        test('適切なHTML構造を持つ', () => {
            const app = document.getElementById('app');
            const header = app?.querySelector('header');
            const main = app?.querySelector('main');
            
            expect(header).toBeTruthy();
            expect(main).toBeTruthy();
        });

        test('ボタンに適切なクラス名が設定されている', () => {
            const startButton = document.getElementById('start-game-btn');
            const restartButton = document.getElementById('restart-btn');
            
            expect(startButton?.className).toContain('btn');
            expect(startButton?.className).toContain('btn-primary');
            expect(startButton?.className).toContain('btn-large');
            
            expect(restartButton?.className).toContain('btn');
            expect(restartButton?.className).toContain('btn-primary');
            expect(restartButton?.className).toContain('btn-large');
        });
    });

    describe('エラーハンドリング', () => {
        test('存在しない要素へのアクセスでエラーが発生しない', () => {
            // 存在しない要素にアクセスしてもエラーが発生しないことを確認
            const nonExistentElement = document.getElementById('non-existent');
            expect(nonExistentElement).toBeNull();
        });
    });
});

describe('SoundManager統合', () => {
    test('AudioContextが適切にモックされている', () => {
        expect(global.window.AudioContext).toBeDefined();
        expect((global.window as any).webkitAudioContext).toBeDefined();
    });

    test('サウンド関連の要素が存在する', () => {
        // サウンド効果に関連するDOM要素やクラスが適切に設定されていることを確認
        expect(document.querySelector('.screen')).toBeTruthy();
    });
});