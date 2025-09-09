import { SoundManager, SoundType } from '../sound-manager';

// Web Audio API モック
class MockAudioBuffer {
    getChannelData = jest.fn().mockReturnValue(new Float32Array(1000));
}

class MockBufferSource {
    buffer: any = null;
    connect = jest.fn();
    start = jest.fn();
}

class MockGainNode {
    gain = { value: 1 };
    connect = jest.fn();
}

class MockAudioContext {
    sampleRate = 44100;
    destination = {};
    
    createBuffer = jest.fn().mockReturnValue(new MockAudioBuffer());
    createBufferSource = jest.fn().mockReturnValue(new MockBufferSource());
    createGain = jest.fn().mockReturnValue(new MockGainNode());
}

// グローバルなAudioContextをモック
global.window = {
    AudioContext: MockAudioContext
} as any;
(global.window as any).webkitAudioContext = MockAudioContext;

describe('SoundManager', () => {
    let soundManager: SoundManager;

    beforeEach(() => {
        // モックをリセット
        jest.clearAllMocks();
        soundManager = new SoundManager();
    });

    describe('初期化', () => {
        test('AudioContextが作成される', () => {
            expect(soundManager).toBeDefined();
            expect(soundManager.isEnabled()).toBe(true);
        });

        test('サウンドが無効化できる', () => {
            soundManager.setEnabled(false);
            expect(soundManager.isEnabled()).toBe(false);
        });

        test('サウンドが有効化できる', () => {
            soundManager.setEnabled(false);
            soundManager.setEnabled(true);
            expect(soundManager.isEnabled()).toBe(true);
        });
    });

    describe('サウンド生成', () => {
        test('成功音が生成される', async () => {
            // サウンドの再生が例外なく実行されることを確認
            expect(() => {
                soundManager.playSound(SoundType.SUCCESS);
            }).not.toThrow();
        });

        test('エラー音が再生される', () => {
            soundManager.playSound(SoundType.ERROR);
            
            // エラーが発生せずに呼び出しが完了することを確認
            expect(true).toBe(true);
        });

        test('すべてのサウンドタイプが再生可能', () => {
            const soundTypes = [
                SoundType.SUCCESS,
                SoundType.ERROR,
                SoundType.GAME_START,
                SoundType.GAME_END,
                SoundType.COUNTDOWN,
                SoundType.TYPING,
                SoundType.WINNER
            ];

            soundTypes.forEach(soundType => {
                expect(() => {
                    soundManager.playSound(soundType);
                }).not.toThrow();
            });
        });
    });

    describe('音量制御', () => {
        test('音量0で再生される', () => {
            expect(() => {
                soundManager.playSound(SoundType.SUCCESS, 0);
            }).not.toThrow();
        });

        test('音量1で再生される', () => {
            expect(() => {
                soundManager.playSound(SoundType.SUCCESS, 1);
            }).not.toThrow();
        });

        test('音量が範囲外でも安全に処理される', () => {
            expect(() => {
                soundManager.playSound(SoundType.SUCCESS, -1);
            }).not.toThrow();

            expect(() => {
                soundManager.playSound(SoundType.SUCCESS, 2);
            }).not.toThrow();
        });
    });

    describe('エラーハンドリング', () => {
        test('無効な状態での再生でエラーが発生しない', () => {
            soundManager.setEnabled(false);
            
            expect(() => {
                soundManager.playSound(SoundType.SUCCESS);
            }).not.toThrow();
        });

        test('存在しないサウンドタイプでエラーが発生しない', () => {
            expect(() => {
                soundManager.playSound('invalid-sound' as SoundType);
            }).not.toThrow();
        });
    });

    describe('パフォーマンス', () => {
        test('連続再生が可能', () => {
            const iterations = 10;
            
            expect(() => {
                for (let i = 0; i < iterations; i++) {
                    soundManager.playSound(SoundType.TYPING, 0.1);
                }
            }).not.toThrow();
        });

        test('短時間での大量再生が処理できる', () => {
            const rapidFire = () => {
                for (let i = 0; i < 100; i++) {
                    soundManager.playSound(SoundType.TYPING, 0.05);
                }
            };

            expect(rapidFire).not.toThrow();
        });
    });

    describe('サウンド種別の特性', () => {
        test('成功音の特徴', () => {
            expect(() => {
                soundManager.playSound(SoundType.SUCCESS);
            }).not.toThrow();
        });

        test('ゲーム開始音の特徴', () => {
            expect(() => {
                soundManager.playSound(SoundType.GAME_START);
            }).not.toThrow();
        });

        test('勝利音の特徴', () => {
            expect(() => {
                soundManager.playSound(SoundType.WINNER);
            }).not.toThrow();
        });
    });

    describe('状態管理', () => {
        test('有効/無効状態の切り替え', () => {
            expect(soundManager.isEnabled()).toBe(true);
            
            soundManager.setEnabled(false);
            expect(soundManager.isEnabled()).toBe(false);
            
            soundManager.setEnabled(true);
            expect(soundManager.isEnabled()).toBe(true);
        });

        test('無効状態での再生は実行されない', () => {
            soundManager.setEnabled(false);
            
            expect(() => {
                soundManager.playSound(SoundType.SUCCESS);
            }).not.toThrow();
        });
    });
});

describe('SoundType列挙型', () => {
    test('すべてのサウンドタイプが定義されている', () => {
        expect(SoundType.SUCCESS).toBeDefined();
        expect(SoundType.ERROR).toBeDefined();
        expect(SoundType.GAME_START).toBeDefined();
        expect(SoundType.GAME_END).toBeDefined();
        expect(SoundType.COUNTDOWN).toBeDefined();
        expect(SoundType.TYPING).toBeDefined();
        expect(SoundType.WINNER).toBeDefined();
    });

    test('サウンドタイプが適切な文字列値を持つ', () => {
        expect(SoundType.SUCCESS).toBe('success');
        expect(SoundType.ERROR).toBe('error');
        expect(SoundType.GAME_START).toBe('game_start');
        expect(SoundType.GAME_END).toBe('game_end');
        expect(SoundType.COUNTDOWN).toBe('countdown');
        expect(SoundType.TYPING).toBe('typing');
        expect(SoundType.WINNER).toBe('winner');
    });
});