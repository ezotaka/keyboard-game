// レンダラープロセス - 1.1 キーボード接続確認UI

class KeyboardConnectionManager {
    constructor() {
        this.keyboards = [];
        this.isMonitoring = true;
        this.activityBuffer = [];
        this.keyboardActivities = new Map();
        this.lastScanTime = Date.now();

        // プレイヤー管理
        this.players = [];
        this.currentPhase = '1.1'; // 現在のフェーズ

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
        this.updatePhaseDisplay(); // 初期フェーズ表示
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

        // プレイヤー管理関数
        window.addPlayer = () => this.addPlayer();
        window.removePlayer = (playerId) => this.removePlayer(playerId);
        window.clearAllPlayers = () => this.clearAllPlayers();
        window.takePhoto = () => this.takePhoto();
        window.proceedToTeamCreation = () => this.proceedToTeamCreation();

        // エンターキーでプレイヤー追加
        const playerNameInput = document.getElementById('playerName');
        if (playerNameInput) {
            playerNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addPlayer();
                }
            });
        }
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
        this.addToActivityLog('[システム] 1.2 プレイヤー集合へ進みます...', 'system');
        this.updateStatus('1.2 プレイヤー集合 - 友達の名前を入力してください');

        // フェーズ切り替え
        this.currentPhase = '1.2';
        this.updatePhaseDisplay();

        // セクション表示切り替え
        document.getElementById('keyboard-section').classList.add('hidden');
        document.getElementById('players-section').classList.remove('hidden');

        // プレイヤー名入力にフォーカス
        const playerNameInput = document.getElementById('playerName');
        if (playerNameInput) {
            playerNameInput.focus();
        }
    }

    proceedToTeamCreation() {
        if (this.players.length < 2) {
            alert('チームを作るには最低2人の友達が必要です！');
            return;
        }

        this.addToActivityLog(`[システム] 1.3 チーム作成へ進みます（${this.players.length}人参加）`, 'system');
        this.updateStatus('1.3 チーム作成の準備中...');

        // TODO: 1.3の実装
        alert(`素晴らしい！${this.players.length}人の友達が集まりました。\n次は「1.3 チーム作成」の実装を進めましょう！`);
    }

    updatePhaseDisplay() {
        // プログレスインジケーターの更新
        document.querySelectorAll('.progress-step').forEach(step => {
            step.classList.remove('completed', 'current');
        });

        switch (this.currentPhase) {
            case '1.1':
                document.getElementById('phase-1-1').classList.add('current');
                break;
            case '1.2':
                document.getElementById('phase-1-1').classList.add('completed');
                document.getElementById('phase-1-2').classList.add('current');
                break;
            case '1.3':
                document.getElementById('phase-1-1').classList.add('completed');
                document.getElementById('phase-1-2').classList.add('completed');
                document.getElementById('phase-1-3').classList.add('current');
                break;
        }
    }

    // プレイヤー管理メソッド
    addPlayer() {
        const nameInput = document.getElementById('playerName');
        const name = nameInput.value.trim();

        if (!name) {
            alert('なまえを入力してください！');
            nameInput.focus();
            return;
        }

        if (name.length > 10) {
            alert('なまえは10文字以内で入力してください！');
            nameInput.focus();
            return;
        }

        // 重複チェック
        if (this.players.some(player => player.name === name)) {
            alert('同じ名前の友達がすでにいます！');
            nameInput.focus();
            return;
        }

        // 最大人数チェック（8人まで）
        if (this.players.length >= 8) {
            alert('最大8人まで参加できます！');
            return;
        }

        // プレイヤー追加
        const player = {
            id: `player-${Date.now()}`,
            name: name,
            avatar: this.generatePlayerAvatar(name),
            addedAt: new Date().toISOString()
        };

        this.players.push(player);
        nameInput.value = '';
        nameInput.focus();

        this.renderPlayers();
        this.updatePlayerCount();
        this.addToActivityLog(`[システム] ${name}さんが参加しました！`, 'system');
    }

    removePlayer(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        if (confirm(`${player.name}さんを削除しますか？`)) {
            this.players = this.players.filter(p => p.id !== playerId);
            this.renderPlayers();
            this.updatePlayerCount();
            this.addToActivityLog(`[システム] ${player.name}さんが離脱しました`, 'system');
        }
    }

    clearAllPlayers() {
        if (this.players.length === 0) {
            alert('削除する友達がいません！');
            return;
        }

        if (confirm('すべての友達を削除しますか？')) {
            this.players = [];
            this.renderPlayers();
            this.updatePlayerCount();
            this.addToActivityLog('[システム] すべてのプレイヤーを削除しました', 'system');
        }
    }

    takePhoto() {
        // 将来的にはカメラ機能を実装
        alert('写真撮影機能は将来のバージョンで実装予定です！\n今は名前だけ入力してください。');
    }

    generatePlayerAvatar(name) {
        // 名前の最初の文字をアバターとして使用
        return name.charAt(0).toUpperCase();
    }

    renderPlayers() {
        const container = document.getElementById('players-grid');
        if (!container) return;

        if (this.players.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #718096;">
                    <div style="font-size: 3em; margin-bottom: 20px;">👥</div>
                    <div style="font-size: 1.2em; margin-bottom: 10px;">まだ友達がいません</div>
                    <div>上のフォームから友達を追加してください</div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.players.map(player => `
            <div class="player-card">
                <div class="player-avatar" style="background: ${this.generatePlayerColor(player.id)}">
                    ${player.avatar}
                </div>
                <div class="player-name">${this.escapeHtml(player.name)}</div>
                <div class="player-actions">
                    <button onclick="removePlayer('${player.id}')" class="btn-small btn-danger">
                        🗑️ 削除
                    </button>
                </div>
            </div>
        `).join('');
    }

    generatePlayerColor(playerId) {
        // プレイヤーIDから一意な色を生成
        const colors = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            'linear-gradient(135deg, #ff8a80 0%, #ea80fc 100%)'
        ];

        const hash = playerId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);

        return colors[Math.abs(hash) % colors.length];
    }

    updatePlayerCount() {
        const countElement = document.getElementById('playerCount');
        const proceedBtn = document.getElementById('proceedToTeamsBtn');

        if (countElement) {
            countElement.textContent = this.players.length;
        }

        if (proceedBtn) {
            if (this.players.length >= 2) {
                proceedBtn.disabled = false;
                proceedBtn.style.background = '#48bb78';
                proceedBtn.textContent = `1.3 チーム作成へ進む（${this.players.length}人）`;
            } else {
                proceedBtn.disabled = true;
                proceedBtn.style.background = '#a0aec0';
                proceedBtn.textContent = `あと${2 - this.players.length}人必要です`;
            }
        }
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