/**
 * Webブラウザ環境でのテスト用ElectronAPI モック
 * 実際のElectron環境では使用されず、ブラウザでのデバッグ・テスト時のみ使用
 */

class MockElectronAPI {
    constructor() {
        this.keyboards = [
            {
                id: 'kb-1',
                name: 'Mock Keyboard 1',
                manufacturer: 'Mock Inc.',
                vendorId: 0x1234,
                productId: 0x5678,
                locationId: 0x01,
                connected: true,
                method: 'mock'
            },
            {
                id: 'kb-2',
                name: 'Mock Keyboard 2',
                manufacturer: 'Mock Corp.',
                vendorId: 0x9ABC,
                productId: 0xDEF0,
                locationId: 0x02,
                connected: true,
                method: 'mock'
            }
        ];

        this.inputHistory = [];
        this.eventCallbacks = {
            keyboardsDetected: [],
            keyboardsUpdated: [],
            realKeyInput: [],
            keyInput: []
        };

        this.setupMockKeyboardInput();
    }

    // IPC Main プロセス関数のモック
    async getKeyboards() {
        console.log('[Mock] getKeyboards called');
        return this.keyboards;
    }

    async rescanKeyboards() {
        console.log('[Mock] rescanKeyboards called');
        // シミュレート: 時々キーボード数が変わる
        if (Math.random() > 0.7) {
            this.keyboards.push({
                id: `kb-${this.keyboards.length + 1}`,
                name: `Mock Keyboard ${this.keyboards.length + 1}`,
                manufacturer: 'Dynamic Mock',
                vendorId: 0x1111,
                productId: 0x2222,
                locationId: 0x10 + this.keyboards.length,
                connected: true,
                method: 'mock'
            });

            // keyboardsUpdated イベントを発火
            this.eventCallbacks.keyboardsUpdated.forEach(callback => {
                callback(this.keyboards);
            });
        }
        return this.keyboards;
    }

    async clearHistory() {
        console.log('[Mock] clearHistory called');
        this.inputHistory = [];
        return { success: true };
    }

    // IPC Renderer イベントリスナーのモック
    onKeyboardsDetected(callback) {
        console.log('[Mock] onKeyboardsDetected listener registered');
        this.eventCallbacks.keyboardsDetected.push(callback);

        // 初期化時に自動的にキーボード検知イベントを発火
        setTimeout(() => {
            callback(this.keyboards);
        }, 500);
    }

    onKeyboardsUpdated(callback) {
        console.log('[Mock] onKeyboardsUpdated listener registered');
        this.eventCallbacks.keyboardsUpdated.push(callback);
    }

    onRealKeyInput(callback) {
        console.log('[Mock] onRealKeyInput listener registered');
        this.eventCallbacks.realKeyInput.push(callback);
    }

    onKeyInput(callback) {
        console.log('[Mock] onKeyInput listener registered');
        this.eventCallbacks.keyInput.push(callback);
    }

    // モックキーボード入力のシミュレーション
    setupMockKeyboardInput() {
        // 実際のキーボードイベントをキャプチャしてモック入力として転送
        document.addEventListener('keydown', (event) => {
            if (this.eventCallbacks.realKeyInput.length === 0) return;

            const mockKeyEvent = {
                key: event.key,
                code: event.code,
                keyboardId: Math.random() > 0.5 ? 'kb-1' : 'kb-2', // ランダムにキーボードを選択
                timestamp: Date.now(),
                source: 'mock-browser',
                rawData: {
                    usagePage: 0x07,
                    usage: event.keyCode,
                    value: 1,
                    nativeTimestamp: Date.now()
                }
            };

            this.inputHistory.push(mockKeyEvent);
            if (this.inputHistory.length > 100) {
                this.inputHistory.shift();
            }

            // リアルキー入力イベントを発火
            this.eventCallbacks.realKeyInput.forEach(callback => {
                callback(mockKeyEvent);
            });

            // 通常のキー入力イベントも発火
            this.eventCallbacks.keyInput.forEach(callback => {
                callback(mockKeyEvent);
            });

            console.log(`[Mock] Key input: ${event.key} from ${mockKeyEvent.keyboardId}`);
        });
    }

    // デバッグ用: 自動的にキーボード入力をシミュレート
    startAutoInput() {
        const words = ['hello', 'world', 'typing', 'game', 'keyboard'];
        let wordIndex = 0;
        let charIndex = 0;

        const autoType = () => {
            if (this.eventCallbacks.realKeyInput.length === 0) {
                setTimeout(autoType, 1000);
                return;
            }

            const currentWord = words[wordIndex];
            const currentChar = currentWord[charIndex];

            const mockKeyEvent = {
                key: currentChar,
                code: `Key${currentChar.toUpperCase()}`,
                keyboardId: Math.random() > 0.5 ? 'kb-1' : 'kb-2',
                timestamp: Date.now(),
                source: 'mock-auto',
                rawData: {
                    usagePage: 0x07,
                    usage: currentChar.charCodeAt(0),
                    value: 1,
                    nativeTimestamp: Date.now()
                }
            };

            this.inputHistory.push(mockKeyEvent);
            if (this.inputHistory.length > 100) {
                this.inputHistory.shift();
            }

            this.eventCallbacks.realKeyInput.forEach(callback => {
                callback(mockKeyEvent);
            });

            console.log(`[Mock Auto] Key input: ${currentChar} from ${mockKeyEvent.keyboardId}`);

            charIndex++;
            if (charIndex >= currentWord.length) {
                charIndex = 0;
                wordIndex = (wordIndex + 1) % words.length;

                // 単語の間にスペースを追加
                setTimeout(() => {
                    const spaceEvent = {
                        key: ' ',
                        code: 'Space',
                        keyboardId: Math.random() > 0.5 ? 'kb-1' : 'kb-2',
                        timestamp: Date.now(),
                        source: 'mock-auto',
                        rawData: {
                            usagePage: 0x07,
                            usage: 32,
                            value: 1,
                            nativeTimestamp: Date.now()
                        }
                    };

                    this.eventCallbacks.realKeyInput.forEach(callback => {
                        callback(spaceEvent);
                    });
                }, 200);

                setTimeout(autoType, 2000); // 次の単語まで2秒待機
            } else {
                setTimeout(autoType, 300 + Math.random() * 400); // 文字間隔をランダム化
            }
        };

        setTimeout(autoType, 3000); // 3秒後に自動入力開始
    }
}

// Electron環境でない場合のみモックを適用
if (typeof window !== 'undefined' && !window.electronAPI) {
    console.log('🔧 [Mock] Electron環境ではありません。MockElectronAPIを初期化します。');
    window.electronAPI = new MockElectronAPI();

    // デバッグ用の自動入力を開始（コメントアウトして手動テスト可能）
    // window.electronAPI.startAutoInput();

    console.log('✅ [Mock] MockElectronAPIが初期化されました。ブラウザでのテストが可能です。');
}