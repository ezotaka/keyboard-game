class KeyboardInputTester {
    constructor() {
        this.keyboards = [];
        this.inputHistory = [];
        this.isPaused = false;
        this.keyboardActivity = new Map(); // 各キーボードの最新入力を追跡
        
        this.init();
    }

    async init() {
        console.log('レンダラー初期化開始');
        
        // イベントリスナー設定
        window.electronAPI.onKeyboardsDetected((keyboards) => {
            this.handleKeyboardsDetected(keyboards);
        });
        
        window.electronAPI.onKeyInput((keyEvent) => {
            if (!this.isPaused) {
                this.handleKeyInput(keyEvent);
            }
        });
        
        // 初期キーボード情報の取得
        try {
            this.keyboards = await window.electronAPI.getKeyboards();
            this.displayKeyboards();
            this.updateStatus(`${this.keyboards.length}個のキーボードを検知`);
        } catch (error) {
            console.error('キーボード情報取得エラー:', error);
            this.updateStatus('エラー: キーボード情報を取得できませんでした');
        }
        
        // 既存の履歴があれば取得
        try {
            this.inputHistory = await window.electronAPI.getInputHistory();
            this.displayInputHistory();
        } catch (error) {
            console.error('履歴取得エラー:', error);
        }
    }

    handleKeyboardsDetected(keyboards) {
        console.log('キーボード検知:', keyboards);
        this.keyboards = keyboards;
        this.displayKeyboards();
        this.updateStatus(`${keyboards.length}個のキーボードを検知しました`);
    }

    handleKeyInput(keyEvent) {
        console.log('キー入力:', keyEvent);
        
        // 履歴に追加
        this.inputHistory.push(keyEvent);
        if (this.inputHistory.length > 200) {
            this.inputHistory.shift(); // 古い履歴を削除
        }
        
        // キーボード活動を更新
        this.keyboardActivity.set(keyEvent.keyboardId, {
            lastKey: keyEvent.key,
            timestamp: keyEvent.timestamp,
            count: (this.keyboardActivity.get(keyEvent.keyboardId)?.count || 0) + 1
        });
        
        // UI更新
        this.displayInputLog(keyEvent);
        this.updateKeyboardCards();
    }

    displayKeyboards() {
        const infoDiv = document.getElementById('keyboards-info');
        const gridDiv = document.getElementById('keyboards-grid');
        
        if (this.keyboards.length === 0) {
            infoDiv.textContent = 'キーボードが検知されませんでした';
            gridDiv.innerHTML = '';
            return;
        }
        
        infoDiv.textContent = `${this.keyboards.length}個のキーボードが利用可能です:`;
        
        gridDiv.innerHTML = this.keyboards.map(keyboard => `
            <div class="keyboard-card" id="keyboard-${keyboard.id}">
                <div class="keyboard-name">${keyboard.name}</div>
                <div class="keyboard-info">
                    ID: ${keyboard.id} | 検知方法: ${keyboard.method}
                    ${keyboard.vendorId ? `<br>VendorID: ${keyboard.vendorId} | ProductID: ${keyboard.productId}` : ''}
                </div>
                <div class="keyboard-activity" id="activity-${keyboard.id}">
                    入力待機中...
                </div>
            </div>
        `).join('');
    }

    updateKeyboardCards() {
        this.keyboards.forEach(keyboard => {
            const card = document.getElementById(`keyboard-${keyboard.id}`);
            const activityDiv = document.getElementById(`activity-${keyboard.id}`);
            
            if (card && activityDiv) {
                const activity = this.keyboardActivity.get(keyboard.id);
                
                if (activity) {
                    // アクティブなキーボードをハイライト
                    const timeDiff = Date.now() - activity.timestamp;
                    if (timeDiff < 2000) { // 2秒以内の入力
                        card.classList.add('active');
                        setTimeout(() => card.classList.remove('active'), 2000);
                    }
                    
                    // 活動情報を表示
                    activityDiv.innerHTML = `
                        最新キー: <span class="key-display">${activity.lastKey}</span><br>
                        入力数: ${activity.count}<br>
                        <span class="timestamp">${new Date(activity.timestamp).toLocaleTimeString()}</span>
                    `;
                } else {
                    activityDiv.textContent = '入力待機中...';
                }
            }
        });
    }

    displayInputLog(keyEvent) {
        const logDiv = document.getElementById('input-log');
        const timestamp = new Date(keyEvent.timestamp).toLocaleTimeString();
        
        // キーの表示形式を調整
        let keyDisplay = keyEvent.key;
        if (keyEvent.key === ' ') keyDisplay = 'Space';
        if (keyEvent.key === 'Enter') keyDisplay = '⏎';
        if (keyEvent.key === 'Backspace') keyDisplay = '⌫';
        if (keyEvent.key === 'Tab') keyDisplay = '⇥';
        
        // 修飾キーの表示
        let modifiers = '';
        if (keyEvent.modifiers.control) modifiers += 'Ctrl+';
        if (keyEvent.modifiers.shift) modifiers += 'Shift+';
        if (keyEvent.modifiers.alt) modifiers += 'Alt+';
        if (keyEvent.modifiers.meta) modifiers += 'Cmd+';
        
        const logEntry = `[${timestamp}] ${keyEvent.keyboardId}: ${modifiers}${keyDisplay}\n`;
        
        logDiv.textContent += logEntry;
        logDiv.scrollTop = logDiv.scrollHeight; // 自動スクロール
    }

    displayInputHistory() {
        const logDiv = document.getElementById('input-log');
        logDiv.textContent = '=== 入力履歴復元 ===\n';
        
        this.inputHistory.forEach(keyEvent => {
            this.displayInputLog(keyEvent);
        });
        
        logDiv.textContent += '\n=== リアルタイム監視開始 ===\n';
    }

    updateStatus(message) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
    }
    
    // グローバル関数（HTMLから呼ばれる）
    async clearLog() {
        try {
            await window.electronAPI.clearHistory();
            this.inputHistory = [];
            this.keyboardActivity.clear();
            
            document.getElementById('input-log').textContent = '=== ログクリア完了 ===\nキーボードで何かタイピングしてください...\n\n';
            this.updateKeyboardCards();
            this.updateStatus('ログをクリアしました');
        } catch (error) {
            console.error('ログクリアエラー:', error);
            this.updateStatus('エラー: ログをクリアできませんでした');
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseBtn');
        btn.textContent = this.isPaused ? '再開' : '一時停止';
        
        const status = this.isPaused ? '入力監視を一時停止中' : '入力監視中';
        this.updateStatus(status);
    }
    
    exportLog() {
        const logContent = this.inputHistory.map(event => {
            const timestamp = new Date(event.timestamp).toISOString();
            return `${timestamp},${event.keyboardId},${event.key},${event.code}`;
        }).join('\n');
        
        const blob = new Blob(['timestamp,keyboardId,key,code\n' + logContent], 
                             { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `keyboard-input-log-${new Date().toISOString().slice(0,19)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.updateStatus('ログをエクスポートしました');
    }
}

// グローバル関数を定義（HTMLのonclickから呼ばれる）
let tester;

window.addEventListener('DOMContentLoaded', () => {
    tester = new KeyboardInputTester();
});

function clearLog() {
    if (tester) tester.clearLog();
}

function togglePause() {
    if (tester) tester.togglePause();
}

function exportLog() {
    if (tester) tester.exportLog();
}