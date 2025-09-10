// Simple game demo that demonstrates keyboard functionality without complex dependencies

interface MockKeyboard {
    id: string;
    name: string;
    connected: boolean;
    assigned: boolean;
}

class SimpleGameDemo {
    private keyboards: MockKeyboard[] = [];

    constructor() {
        console.log('SimpleGameDemo初期化開始');
        this.setupMockKeyboards();
        this.updateDisplay();
        this.enableGameButton();
    }

    private setupMockKeyboards(): void {
        console.log('モックキーボード設定中...');
        this.keyboards = [
            {
                id: 'demo-keyboard-1',
                name: 'Apple Magic Keyboard',
                connected: true,
                assigned: true
            },
            {
                id: 'demo-keyboard-2',
                name: '外付けキーボード',
                connected: true,
                assigned: true
            }
        ];
        console.log('モックキーボード設定完了:', this.keyboards);
    }

    private updateDisplay(): void {
        console.log('ディスプレイ更新中...');
        
        // キーボードリストを更新
        const keyboardList = document.getElementById('keyboard-list');
        if (keyboardList) {
            keyboardList.innerHTML = this.keyboards.map(keyboard => `
                <div class="keyboard-item">
                    <span class="keyboard-name">${keyboard.name}</span>
                    <span class="keyboard-status connected">接続中</span>
                </div>
            `).join('');
            console.log('キーボードリスト更新完了');
        } else {
            console.error('keyboard-list要素が見つかりません');
        }
    }

    private enableGameButton(): void {
        console.log('ゲームボタン有効化中...');
        const startBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'ゲーム開始';
            console.log('ゲームボタン有効化完了');
            
            // ボタンクリックイベント
            startBtn.addEventListener('click', () => {
                console.log('ゲーム開始ボタンがクリックされました');
                alert('デモモード: ゲームが開始されます！');
            });
        } else {
            console.error('start-game-btn要素が見つかりません');
        }
    }
}

// 初期化
console.log('=== Simple Game Demo 開始 ===');
console.log('DOM readyState:', document.readyState);

function initDemo() {
    console.log('デモ初期化関数実行');
    try {
        new SimpleGameDemo();
    } catch (error) {
        console.error('デモ初期化エラー:', error);
    }
}

if (document.readyState === 'loading') {
    console.log('DOM読み込み待機中...');
    document.addEventListener('DOMContentLoaded', initDemo);
} else {
    console.log('DOM準備完了 - 即座に初期化');
    initDemo();
}

console.log('=== Demo script loaded ===');