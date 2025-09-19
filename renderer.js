// レンダラープロセス - 1.1 キーボード接続確認UI

class KeyboardConnectionManager {
    constructor() {
        this.keyboards = [];
        this.isMonitoring = true;
        this.activityBuffer = [];
        this.keyboardActivities = new Map();
        this.lastScanTime = Date.now();

        this.init();
    }

    async init() {
        console.log('=== Keyboard Connection Manager 初期化 ===');

        this.setupEventListeners();
        this.setupUIHandlers();

        // 初期キーボード情報取得
        try {
            const keyboards = await window.electronAPI.getKeyboards();
            this.updateKeyboards(keyboards);
        } catch (error) {
            console.error('初期キーボード取得エラー:', error);
        }

        this.updateStatus('キーボード検知完了 - タイピングテストを開始できます');
    }

    setupEventListeners() {
        // キーボード検知イベント
        window.electronAPI.onKeyboardsDetected((keyboards) => {
            console.log('キーボード検知:', keyboards);
            this.updateKeyboards(keyboards);
        });

        // キーボード更新イベント
        window.electronAPI.onKeyboardsUpdated((keyboards) => {
            console.log('キーボード更新:', keyboards);
            this.updateKeyboards(keyboards);
            this.showConnectionChange(keyboards);
        });

        // リアルタイム入力イベント
        window.electronAPI.onRealKeyInput((keyEvent) => {
            if (this.isMonitoring) {
                this.handleRealKeyInput(keyEvent);
            }
        });

        // フォールバック入力イベント
        window.electronAPI.onKeyInput((keyEvent) => {
            if (this.isMonitoring) {
                this.handleKeyInput(keyEvent);
            }
        });
    }

    setupUIHandlers() {
        // グローバル関数として定義（HTMLから呼び出し可能）
        window.rescanKeyboards = () => this.rescanKeyboards();
        window.testAllKeyboards = () => this.testAllKeyboards();
        window.clearActivityLog = () => this.clearActivityLog();
        window.toggleMonitoring = () => this.toggleMonitoring();
        window.exportLog = () => this.exportLog();
        window.proceedToNextStep = () => this.proceedToNextStep();
    }

    updateKeyboards(keyboards) {
        // LocationIDベースで重複除去（念のため）
        const uniqueKeyboards = [];
        const seenLocationIds = new Set();

        for (const keyboard of keyboards) {
            if (!seenLocationIds.has(keyboard.locationId)) {
                seenLocationIds.add(keyboard.locationId);
                uniqueKeyboards.push(keyboard);
            }
        }

        this.keyboards = uniqueKeyboards;
        console.log(`UI更新: ${this.keyboards.length}台のキーボード`);

        this.renderKeyboards();
        this.updateKeyboardCount();
        this.checkNextStepAvailability();
    }

    renderKeyboards() {
        const container = document.getElementById('keyboards-grid');
        if (!container) return;

        if (this.keyboards.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #718096;">
                    <div style="font-size: 3em; margin-bottom: 20px;">🔍</div>
                    <div style="font-size: 1.2em; margin-bottom: 10px;">キーボードが見つかりません</div>
                    <div>キーボードを接続して「再スキャン」ボタンを押してください</div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.keyboards.map(keyboard => {
            const activity = this.keyboardActivities.get(keyboard.id) || [];
            const recentActivity = activity.slice(-5).reverse();

            return `
                <div class="keyboard-card ${keyboard.connected ? 'connected' : 'disconnected'}" data-keyboard-id="${keyboard.id}">
                    <div class="keyboard-status ${keyboard.connected ? 'connected' : 'disconnected'}">
                        ${keyboard.connected ? '✅ 接続中' : '❌ 切断'}
                    </div>
                    <div class="keyboard-name">${this.escapeHtml(keyboard.name)}</div>
                    <div class="keyboard-info">
                        <div>メーカー: ${this.escapeHtml(keyboard.manufacturer)}</div>
                        <div>ID: ${keyboard.id}</div>
                        <div>VID: 0x${keyboard.vendorId.toString(16).padStart(4, '0').toUpperCase()}</div>
                        <div>PID: 0x${keyboard.productId.toString(16).padStart(4, '0').toUpperCase()}</div>
                    </div>
                    <div class="keyboard-activity" id="activity-${keyboard.id}">
                        ${recentActivity.length > 0
                            ? recentActivity.map(entry =>
                                `<div style="margin-bottom: 2px;">
                                    <span class="timestamp">${entry.time}</span>
                                    <span class="key-display">${entry.key}</span>
                                </div>`
                              ).join('')
                            : '<div style="color: #a0aec0; font-style: italic;">タイピングして動作確認...</div>'
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    updateKeyboardCount() {
        const countElement = document.getElementById('keyboard-count');
        if (countElement) {
            const connectedCount = this.keyboards.filter(kb => kb.connected).length;
            countElement.textContent = `${connectedCount}台`;

            if (connectedCount === 0) {
                countElement.style.background = '#f56565';
            } else if (connectedCount >= 2) {
                countElement.style.background = '#48bb78';
            } else {
                countElement.style.background = '#ed8936';
            }
        }
    }

    handleRealKeyInput(keyEvent) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] 🎹 ${keyEvent.keyboardId}: ${keyEvent.key}`;

        this.addToActivityLog(logEntry, 'native');
        this.updateKeyboardActivity(keyEvent.keyboardId, keyEvent.key, timestamp);
    }

    handleKeyInput(keyEvent) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ⌨️  ${keyEvent.keyboardId}: ${keyEvent.key}`;

        this.addToActivityLog(logEntry, 'electron');
        this.updateKeyboardActivity(keyEvent.keyboardId, keyEvent.key, timestamp);
    }

    updateKeyboardActivity(keyboardId, key, timestamp) {
        if (!this.keyboardActivities.has(keyboardId)) {
            this.keyboardActivities.set(keyboardId, []);
        }

        const activity = this.keyboardActivities.get(keyboardId);
        activity.push({ key, time: timestamp });

        // 最新10件のみ保持
        if (activity.length > 10) {
            activity.shift();
        }

        // 該当キーボードカードの活動表示を更新
        const activityElement = document.getElementById(`activity-${keyboardId}`);
        if (activityElement) {
            const recentActivity = activity.slice(-5).reverse();
            activityElement.innerHTML = recentActivity.map(entry =>
                `<div style="margin-bottom: 2px;">
                    <span class="timestamp">${entry.time}</span>
                    <span class="key-display">${entry.key}</span>
                </div>`
            ).join('');

            // キーボードカードをハイライト
            const card = activityElement.closest('.keyboard-card');
            if (card) {
                card.style.transform = 'scale(1.02)';
                card.style.boxShadow = '0 8px 25px rgba(66, 153, 225, 0.3)';
                setTimeout(() => {
                    card.style.transform = '';
                    card.style.boxShadow = '';
                }, 200);
            }
        }
    }

    addToActivityLog(message, type = 'info') {
        this.activityBuffer.push({ message, type, timestamp: Date.now() });

        // バッファサイズ制限
        if (this.activityBuffer.length > 200) {
            this.activityBuffer.shift();
        }

        const logElement = document.getElementById('activity-log');
        if (logElement) {
            logElement.textContent += message + '\n';
            logElement.scrollTop = logElement.scrollHeight;
        }
    }

    showConnectionChange(keyboards) {
        const connectedCount = keyboards.filter(kb => kb.connected).length;
        const message = `キーボード接続状態が変更されました（${connectedCount}台接続中）`;

        this.updateStatus(message);
        this.addToActivityLog(`[システム] ${message}`, 'system');
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    checkNextStepAvailability() {
        const nextStepBtn = document.getElementById('nextStepBtn');
        if (nextStepBtn) {
            const connectedCount = this.keyboards.filter(kb => kb.connected).length;

            if (connectedCount >= 2) {
                nextStepBtn.disabled = false;
                nextStepBtn.style.background = '#48bb78';
                nextStepBtn.textContent = `1.2 プレイヤー集合へ進む（${connectedCount}台のキーボード確認済み）`;
            } else {
                nextStepBtn.disabled = true;
                nextStepBtn.style.background = '#a0aec0';
                nextStepBtn.textContent = connectedCount === 0
                    ? 'キーボードを接続してください'
                    : `もう1台以上キーボードが必要です（現在${connectedCount}台）`;
            }
        }
    }

    // UI イベントハンドラー
    async rescanKeyboards() {
        this.updateStatus('キーボードを再スキャン中...');

        try {
            const keyboards = await window.electronAPI.rescanKeyboards();
            this.updateKeyboards(keyboards);
            this.addToActivityLog('[システム] キーボード再スキャン完了', 'system');
            this.updateStatus('再スキャン完了');
        } catch (error) {
            console.error('再スキャンエラー:', error);
            this.updateStatus('再スキャンに失敗しました');
        }
    }

    testAllKeyboards() {
        this.addToActivityLog('[システム] 全キーボードテスト開始 - 各キーボードで何かキーを押してください', 'system');
        this.updateStatus('全キーボードテスト中 - 各キーボードでタイピングしてください');

        // 30秒後にテスト終了
        setTimeout(() => {
            this.addToActivityLog('[システム] キーボードテスト終了', 'system');
            this.updateStatus('キーボードテスト完了');
        }, 30000);
    }

    clearActivityLog() {
        const logElement = document.getElementById('activity-log');
        if (logElement) {
            logElement.textContent = '=== キーボード入力監視開始 ===\nキーボードでタイピングしてテストしてください...\n\n';
        }

        this.activityBuffer = [];
        this.keyboardActivities.clear();
        this.renderKeyboards(); // アクティビティ表示をクリア

        window.electronAPI.clearHistory();
        this.addToActivityLog('[システム] ログをクリアしました', 'system');
    }

    toggleMonitoring() {
        this.isMonitoring = !this.isMonitoring;
        const btn = document.getElementById('monitorBtn');

        if (this.isMonitoring) {
            btn.textContent = '⏸️ 監視停止';
            this.addToActivityLog('[システム] 入力監視を再開しました', 'system');
            this.updateStatus('入力監視中');
        } else {
            btn.textContent = '▶️ 監視開始';
            this.addToActivityLog('[システム] 入力監視を停止しました', 'system');
            this.updateStatus('入力監視停止中');
        }
    }

    exportLog() {
        const logData = {
            timestamp: new Date().toISOString(),
            keyboards: this.keyboards,
            activities: Object.fromEntries(this.keyboardActivities),
            activityBuffer: this.activityBuffer
        };

        const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `keyboard-test-log-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.addToActivityLog('[システム] ログファイルを保存しました', 'system');
    }

    proceedToNextStep() {
        this.addToActivityLog('[システム] 次のステップに進みます...', 'system');
        this.updateStatus('1.2 プレイヤー集合の準備中...');

        // TODO: 次のステップの実装
        alert('次のステップ「1.2 プレイヤー集合」の実装はまだ準備中です。\n現在は1.1のキーボード接続確認が完了しました！');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM読み込み完了 - KeyboardConnectionManager初期化開始');
    new KeyboardConnectionManager();
});