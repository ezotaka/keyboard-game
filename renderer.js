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

        // チーム管理
        this.teams = [];
        this.teamCount = 2;
        this.divisionMethod = 'auto';

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

        // チーム作成関数
        window.updateTeamCount = () => this.updateTeamCount();
        window.updateDivisionMethod = () => this.updateDivisionMethod();
        window.generateTeams = () => this.generateTeams();
        window.clearTeams = () => this.clearTeams();
        window.movePlayerToTeam = (playerId, teamId) => this.movePlayerToTeam(playerId, teamId);
        window.removePlayerFromTeam = (playerId) => this.removePlayerFromTeam(playerId);
        window.proceedToMemberAssignment = () => this.proceedToMemberAssignment();

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
        this.updateStatus('1.3 チーム作成 - チームを作って競い合いましょう！');

        // フェーズ切り替え
        this.currentPhase = '1.3';
        this.updatePhaseDisplay();

        // セクション表示切り替え
        document.getElementById('players-section').classList.add('hidden');
        document.getElementById('teams-section').classList.remove('hidden');

        // チーム数を自動設定（プレイヤー数に応じて）
        this.autoSetTeamCount();
        this.renderTeamsDisplay();
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
            case '1.4':
                document.getElementById('phase-1-1').classList.add('completed');
                document.getElementById('phase-1-2').classList.add('completed');
                document.getElementById('phase-1-3').classList.add('completed');
                document.getElementById('phase-1-4').classList.add('current');
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

    // チーム作成機能
    autoSetTeamCount() {
        const playerCount = this.players.length;

        if (playerCount <= 4) {
            this.teamCount = 2;
        } else if (playerCount <= 6) {
            this.teamCount = 3;
        } else {
            this.teamCount = 4;
        }

        // UIを更新
        const teamCountSelect = document.getElementById('teamCount');
        if (teamCountSelect) {
            teamCountSelect.value = this.teamCount;
        }
    }

    updateTeamCount() {
        const teamCountSelect = document.getElementById('teamCount');
        if (teamCountSelect) {
            this.teamCount = parseInt(teamCountSelect.value);
            this.addToActivityLog(`[システム] チーム数を${this.teamCount}に変更しました`, 'system');

            // 既存のチームがある場合は再構築するか確認
            if (this.teams.length > 0) {
                if (confirm('チーム数を変更すると現在のチーム分けがリセットされます。続けますか？')) {
                    this.clearTeams();
                    this.renderTeamsDisplay();
                } else {
                    // 元の値に戻す
                    teamCountSelect.value = this.teams.length;
                    this.teamCount = this.teams.length;
                }
            }
        }
    }

    updateDivisionMethod() {
        const checkedMethod = document.querySelector('input[name="divisionMethod"]:checked');
        if (checkedMethod) {
            this.divisionMethod = checkedMethod.value;
            this.addToActivityLog(`[システム] 分割方法を「${this.divisionMethod === 'auto' ? '自動' : '手動'}」に変更しました`, 'system');
        }
    }

    generateTeams() {
        if (this.players.length < 2) {
            alert('チームを作るには最低2人の友達が必要です！');
            return;
        }

        // チームを初期化
        this.teams = [];
        for (let i = 1; i <= this.teamCount; i++) {
            this.teams.push({
                id: `team-${i}`,
                name: `チーム${i}`,
                members: [],
                color: this.getTeamColor(i)
            });
        }

        // プレイヤーをシャッフルしてランダムに配置
        const shuffledPlayers = [...this.players].sort(() => Math.random() - 0.5);

        shuffledPlayers.forEach((player, index) => {
            const teamIndex = index % this.teamCount;
            this.teams[teamIndex].members.push({
                ...player,
                teamId: this.teams[teamIndex].id
            });
        });

        this.addToActivityLog(`[システム] ${this.teamCount}チームを自動生成しました`, 'system');
        this.renderTeamsDisplay();
        this.updateTeamsSummary();
    }

    clearTeams() {
        if (this.teams.length === 0) {
            alert('削除するチームがありません！');
            return;
        }

        if (confirm('すべてのチームをリセットしますか？')) {
            this.teams = [];
            this.addToActivityLog('[システム] すべてのチームを削除しました', 'system');
            this.renderTeamsDisplay();
            this.updateTeamsSummary();
        }
    }

    movePlayerToTeam(playerId, teamId) {
        // プレイヤーを他のチームから削除
        this.teams.forEach(team => {
            team.members = team.members.filter(member => member.id !== playerId);
        });

        // 指定されたチームにプレイヤーを追加
        const targetTeam = this.teams.find(team => team.id === teamId);
        const player = this.players.find(p => p.id === playerId);

        if (targetTeam && player) {
            targetTeam.members.push({
                ...player,
                teamId: teamId
            });

            this.addToActivityLog(`[システム] ${player.name}さんを${targetTeam.name}に移動しました`, 'system');
            this.renderTeamsDisplay();
            this.updateTeamsSummary();
        }
    }

    removePlayerFromTeam(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // プレイヤーをすべてのチームから削除
        this.teams.forEach(team => {
            team.members = team.members.filter(member => member.id !== playerId);
        });

        this.addToActivityLog(`[システム] ${player.name}さんをチームから外しました`, 'system');
        this.renderTeamsDisplay();
        this.updateTeamsSummary();
    }

    getTeamColor(teamNumber) {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24'];
        return colors[teamNumber - 1] || '#666';
    }

    renderTeamsDisplay() {
        const container = document.getElementById('teams-display');
        if (!container) return;

        if (this.teams.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #718096;">
                    <div style="font-size: 3em; margin-bottom: 20px;">🏆</div>
                    <div style="font-size: 1.2em; margin-bottom: 10px;">まだチームが作られていません</div>
                    <div>上の「チーム自動生成」ボタンでチームを作成してください</div>
                </div>
            `;
            return;
        }

        // チーム表示
        container.innerHTML = this.teams.map(team => `
            <div class="team-container team-${team.id.split('-')[1]}">
                <div class="team-header">
                    <div class="team-name">${this.escapeHtml(team.name)}</div>
                    <div class="team-member-count">${team.members.length}人のメンバー</div>
                </div>
                <div class="team-members">
                    ${team.members.map(member => `
                        <div class="team-member">
                            <div class="team-member-avatar" style="background: ${this.generatePlayerColor(member.id)}">
                                ${member.avatar}
                            </div>
                            <div class="team-member-name">${this.escapeHtml(member.name)}</div>
                            <div class="team-member-actions">
                                <button onclick="removePlayerFromTeam('${member.id}')" class="btn-mini btn-danger">
                                    ❌
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${this.divisionMethod === 'manual' ? `
                    <div class="drop-zone" ondrop="dropPlayer(event, '${team.id}')" ondragover="allowDrop(event)">
                        ここにプレイヤーをドロップ
                    </div>
                ` : ''}
            </div>
        `).join('');

        // 手動モードの場合、未割り当てプレイヤーを表示
        if (this.divisionMethod === 'manual') {
            this.renderUnassignedPlayers();
        }
    }

    renderUnassignedPlayers() {
        const assignedPlayerIds = new Set();
        this.teams.forEach(team => {
            team.members.forEach(member => assignedPlayerIds.add(member.id));
        });

        const unassignedPlayers = this.players.filter(player => !assignedPlayerIds.has(player.id));

        if (unassignedPlayers.length > 0) {
            const container = document.getElementById('teams-display');
            container.innerHTML += `
                <div class="unassigned-players" style="grid-column: 1 / -1;">
                    <h4>👥 未割り当てのプレイヤー</h4>
                    <div class="unassigned-grid">
                        ${unassignedPlayers.map(player => `
                            <div class="unassigned-player" draggable="true" ondragstart="dragPlayer(event, '${player.id}')">
                                <div class="unassigned-player-avatar" style="background: ${this.generatePlayerColor(player.id)}">
                                    ${player.avatar}
                                </div>
                                <div>${this.escapeHtml(player.name)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    updateTeamsSummary() {
        const summaryElement = document.getElementById('teams-summary');
        const proceedBtn = document.getElementById('proceedToMemberBtn');

        if (!summaryElement || !proceedBtn) return;

        // 全プレイヤーがチームに割り当てられているかチェック
        const assignedPlayerIds = new Set();
        this.teams.forEach(team => {
            team.members.forEach(member => assignedPlayerIds.add(member.id));
        });

        const allPlayersAssigned = this.players.length === assignedPlayerIds.size;
        const hasTeams = this.teams.length > 0;

        if (hasTeams && allPlayersAssigned) {
            summaryElement.style.display = 'flex';
            proceedBtn.disabled = false;
            proceedBtn.style.background = '#48bb78';
            proceedBtn.textContent = '1.4 メンバー割り当てへ進む';
        } else {
            summaryElement.style.display = 'none';
        }
    }

    proceedToMemberAssignment() {
        if (this.teams.length === 0) {
            alert('チームを作成してから進んでください！');
            return;
        }

        // 全プレイヤーがチームに割り当てられているかチェック
        const assignedPlayerIds = new Set();
        this.teams.forEach(team => {
            team.members.forEach(member => assignedPlayerIds.add(member.id));
        });

        if (this.players.length !== assignedPlayerIds.size) {
            alert('すべてのプレイヤーをチームに割り当ててから進んでください！');
            return;
        }

        this.addToActivityLog(`[システム] 1.4 メンバー割り当てへ進みます（${this.teams.length}チーム作成完了）`, 'system');
        this.updateStatus('1.4 メンバー割り当ての準備中...');

        // フェーズ切り替え
        this.currentPhase = '1.4';
        this.updatePhaseDisplay();

        // 1.4メンバー割り当てセクションを表示
        this.showMemberAssignmentSection();
    }

    showMemberAssignmentSection() {
        // チームセクションを隠す
        const teamsSection = document.getElementById('teams-section');
        if (teamsSection) {
            teamsSection.classList.add('hidden');
        }

        // 1.4メンバー割り当てセクションを作成
        const memberAssignmentSection = this.createMemberAssignmentSection();

        // 既存のセクションの後に追加
        if (teamsSection && teamsSection.parentNode) {
            teamsSection.parentNode.insertBefore(memberAssignmentSection, teamsSection.nextSibling);
        }

        this.updateStatus('1.4 メンバー割り当て - チームのターン順を決めましょう');
        this.addToActivityLog(`[システム] 1.4 メンバー割り当てセクションを表示しました`, 'system');
    }

    createMemberAssignmentSection() {
        const section = document.createElement('div');
        section.className = 'section';
        section.id = 'member-assignment-section';

        section.innerHTML = `
            <h3>⚡ メンバー割り当て</h3>
            <p>各チームの中でのターン順（プレイ順）を決めましょう！</p>

            <div class="turn-order-controls">
                <h4>ターン順決定方法</h4>
                <div class="radio-group">
                    <label class="radio-option">
                        <input type="radio" name="turnOrderMethod" value="auto" checked>
                        <span>自動で決める</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="turnOrderMethod" value="manual">
                        <span>手動で決める</span>
                    </label>
                </div>
                <div class="controls">
                    <button onclick="keyboardManager.decideTurnOrder()">🎲 ターン順決定</button>
                    <button onclick="keyboardManager.resetTurnOrder()" class="secondary">🔄 リセット</button>
                </div>
            </div>

            <div class="teams-display" id="turn-order-teams-display">
                ${this.generateTurnOrderTeamsDisplay()}
            </div>

            <div class="teams-summary" id="turn-order-summary" style="display: none;">
                <div>
                    <strong>ターン順決定完了！</strong>
                    <div style="font-size: 0.9em; color: #666;">全チームのプレイ順が決まりました</div>
                </div>
                <div>
                    <button onclick="keyboardManager.proceedToKeyboardAssignment()" id="proceedToKeyboardBtn" disabled>
                        1.5 キーボード割り当てへ進む
                    </button>
                </div>
            </div>
        `;

        return section;
    }

    generateTurnOrderTeamsDisplay() {
        let html = '';

        this.teams.forEach((team, index) => {
            html += `
                <div class="team-container team-${index + 1}">
                    <div class="team-header">
                        <div class="team-name">${this.escapeHtml(team.name)}</div>
                        <div class="team-member-count">${team.members.length}人</div>
                    </div>
                    <div class="team-members" id="team-${team.id}-turn-order">
                        ${team.members.map((member, memberIndex) => `
                            <div class="team-member" data-player-id="${member.id}">
                                <div class="team-member-avatar" style="background: ${member.color};">
                                    ${this.escapeHtml(member.name.charAt(0))}
                                </div>
                                <div class="team-member-name">${this.escapeHtml(member.name)}</div>
                                <div class="team-member-turn-order">
                                    <span class="turn-number">${memberIndex + 1}番目</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        return html;
    }

    decideTurnOrder() {
        const method = document.querySelector('input[name="turnOrderMethod"]:checked').value;

        if (method === 'auto') {
            // 自動でターン順をシャッフル
            this.teams.forEach(team => {
                // フィッシャー・イェーツアルゴリズムでシャッフル
                for (let i = team.members.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [team.members[i], team.members[j]] = [team.members[j], team.members[i]];
                }
            });

            this.addToActivityLog(`[システム] 全チームのターン順を自動決定しました`, 'system');
        }

        // 表示を更新
        this.updateTurnOrderDisplay();

        // 完了状態を更新
        this.checkTurnOrderCompletion();
    }

    updateTurnOrderDisplay() {
        const teamsDisplay = document.getElementById('turn-order-teams-display');
        if (teamsDisplay) {
            teamsDisplay.innerHTML = this.generateTurnOrderTeamsDisplay();
        }
    }

    resetTurnOrder() {
        // 各チームのメンバーを元の順序（追加順）に戻す
        this.teams.forEach(team => {
            team.members.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
        });

        this.updateTurnOrderDisplay();
        this.addToActivityLog(`[システム] ターン順をリセットしました`, 'system');

        // 完了状態をリセット
        const summary = document.getElementById('turn-order-summary');
        if (summary) {
            summary.style.display = 'none';
        }

        const proceedBtn = document.getElementById('proceedToKeyboardBtn');
        if (proceedBtn) {
            proceedBtn.disabled = true;
        }
    }

    checkTurnOrderCompletion() {
        // ターン順が決定されているかチェック（この場合は常にtrue）
        const isComplete = this.teams.length > 0 && this.teams.every(team => team.members.length > 0);

        const summary = document.getElementById('turn-order-summary');
        const proceedBtn = document.getElementById('proceedToKeyboardBtn');

        if (summary && proceedBtn) {
            if (isComplete) {
                summary.style.display = 'flex';
                proceedBtn.disabled = false;
                this.updateStatus('1.4 メンバー割り当て完了 - 次は1.5キーボード割り当てです');
            } else {
                summary.style.display = 'none';
                proceedBtn.disabled = true;
            }
        }
    }

    proceedToKeyboardAssignment() {
        this.addToActivityLog(`[システム] 1.5 キーボード割り当てへ進みます`, 'system');
        this.updateStatus('1.5 キーボード割り当ての準備中...');

        // フェーズ切り替え
        this.currentPhase = '1.5';
        this.updatePhaseDisplay();

        // 1.5キーボード割り当てセクションを表示
        this.showKeyboardAssignmentSection();
    }

    showKeyboardAssignmentSection() {
        // メンバー割り当てセクションを隠す
        const memberAssignmentSection = document.getElementById('member-assignment-section');
        if (memberAssignmentSection) {
            memberAssignmentSection.classList.add('hidden');
        }

        // 1.5キーボード割り当てセクションを作成
        const keyboardAssignmentSection = this.createKeyboardAssignmentSection();

        // 既存のセクションの後に追加
        if (memberAssignmentSection && memberAssignmentSection.parentNode) {
            memberAssignmentSection.parentNode.insertBefore(keyboardAssignmentSection, memberAssignmentSection.nextSibling);
        }

        this.updateStatus('1.5 キーボード割り当て - 各チームにキーボードを割り当てましょう');
        this.addToActivityLog(`[システム] 1.5 キーボード割り当てセクションを表示しました`, 'system');
    }

    createKeyboardAssignmentSection() {
        const section = document.createElement('div');
        section.className = 'section';
        section.id = 'keyboard-assignment-section';

        section.innerHTML = `
            <h3>⌨️ キーボード割り当て</h3>
            <p>各チームに使用するキーボードを割り当てましょう！</p>

            <div class="keyboard-status-overview">
                <div class="keyboard-summary">
                    <span>検知済みキーボード: <strong id="available-keyboard-count">${this.keyboards.length}</strong>台</span>
                    <span>必要キーボード: <strong id="required-keyboard-count">${this.teams.length}</strong>台</span>
                    <button onclick="keyboardManager.refreshKeyboards()" class="btn-small">🔄 再検索</button>
                </div>
                ${this.keyboards.length < this.teams.length ?
                    `<div class="warning-message">⚠️ キーボードが不足しています。必要数: ${this.teams.length}台、検知済み: ${this.keyboards.length}台</div>` :
                    ''}
            </div>

            <div class="assignment-controls">
                <h4>割り当て方法</h4>
                <div class="radio-group">
                    <label class="radio-option">
                        <input type="radio" name="keyboardAssignmentMethod" value="auto" checked>
                        <span>自動で割り当て</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="keyboardAssignmentMethod" value="manual">
                        <span>手動で割り当て</span>
                    </label>
                </div>
                <div class="controls">
                    <button onclick="keyboardManager.assignKeyboards()" id="assignKeyboardsBtn">🎯 キーボード割り当て</button>
                    <button onclick="keyboardManager.clearKeyboardAssignments()" class="secondary">🔄 割り当てクリア</button>
                </div>
            </div>

            <div class="keyboard-assignment-display" id="keyboard-assignment-display">
                ${this.generateKeyboardAssignmentDisplay()}
            </div>

            <div class="assignment-summary" id="keyboard-assignment-summary" style="display: none;">
                <div>
                    <strong>キーボード割り当て完了！</strong>
                    <div style="font-size: 0.9em; color: #666;">全チームにキーボードが割り当てられました</div>
                </div>
                <div>
                    <button onclick="keyboardManager.proceedToTargetSetting()" id="proceedToTargetBtn" disabled>
                        1.6 お題数設定へ進む
                    </button>
                </div>
            </div>
        `;

        return section;
    }

    generateKeyboardAssignmentDisplay() {
        let html = '';

        // チームとキーボードの表示
        html += '<div class="teams-keyboards-grid">';

        this.teams.forEach((team, index) => {
            const assignedKeyboard = this.keyboards.find(kb => kb.assignedTeamId === team.id);

            html += `
                <div class="team-keyboard-card team-${index + 1}">
                    <div class="team-info">
                        <div class="team-name">${this.escapeHtml(team.name)}</div>
                        <div class="team-members-count">${team.members.length}人</div>
                        <div class="team-members-preview">
                            ${team.members.slice(0, 3).map(member =>
                                `<span class="member-avatar" style="background: ${member.color};">${this.escapeHtml(member.name.charAt(0))}</span>`
                            ).join('')}
                            ${team.members.length > 3 ? `<span class="member-more">+${team.members.length - 3}</span>` : ''}
                        </div>
                    </div>
                    <div class="keyboard-assignment">
                        <div class="assignment-arrow">↓</div>
                        <div class="keyboard-slot" data-team-id="${team.id}">
                            ${assignedKeyboard ? `
                                <div class="assigned-keyboard">
                                    <div class="keyboard-name">${this.escapeHtml(assignedKeyboard.name)}</div>
                                    <div class="keyboard-info">ID: ${this.escapeHtml(assignedKeyboard.id)}</div>
                                    <button onclick="keyboardManager.unassignKeyboard('${team.id}')" class="btn-mini btn-danger">×</button>
                                </div>
                            ` : `
                                <div class="unassigned-slot">
                                    <div class="slot-placeholder">キーボード未割り当て</div>
                                    <select onchange="keyboardManager.assignSpecificKeyboard('${team.id}', this.value)" class="keyboard-selector">
                                        <option value="">選択してください</option>
                                        ${this.keyboards.filter(kb => !kb.assignedTeamId).map(kb =>
                                            `<option value="${kb.id}">${this.escapeHtml(kb.name)} (${kb.id})</option>`
                                        ).join('')}
                                    </select>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // 未割り当てキーボード一覧
        const unassignedKeyboards = this.keyboards.filter(kb => !kb.assignedTeamId);
        if (unassignedKeyboards.length > 0) {
            html += `
                <div class="unassigned-keyboards">
                    <h4>未割り当てキーボード</h4>
                    <div class="keyboard-list">
                        ${unassignedKeyboards.map(kb => `
                            <div class="keyboard-item">
                                <div class="keyboard-name">${this.escapeHtml(kb.name)}</div>
                                <div class="keyboard-id">ID: ${this.escapeHtml(kb.id)}</div>
                                <div class="keyboard-status ${kb.connected ? 'connected' : 'disconnected'}">
                                    ${kb.connected ? '🟢 接続中' : '🔴 未接続'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return html;
    }

    assignKeyboards() {
        const method = document.querySelector('input[name="keyboardAssignmentMethod"]:checked').value;

        if (this.keyboards.length < this.teams.length) {
            alert(`キーボードが不足しています。\n必要: ${this.teams.length}台、検知済み: ${this.keyboards.length}台\n\nキーボードを追加接続してから「🔄 再検索」を押してください。`);
            return;
        }

        // 既存の割り当てをクリア
        this.keyboards.forEach(kb => delete kb.assignedTeamId);

        if (method === 'auto') {
            // 自動割り当て: 接続済みキーボードを優先して割り当て
            const connectedKeyboards = this.keyboards.filter(kb => kb.connected);
            const disconnectedKeyboards = this.keyboards.filter(kb => !kb.connected);
            const availableKeyboards = [...connectedKeyboards, ...disconnectedKeyboards];

            this.teams.forEach((team, index) => {
                if (index < availableKeyboards.length) {
                    availableKeyboards[index].assignedTeamId = team.id;
                }
            });

            this.addToActivityLog(`[システム] キーボードを自動割り当てしました`, 'system');
        }

        // 表示を更新
        this.updateKeyboardAssignmentDisplay();

        // 完了状態を確認
        this.checkKeyboardAssignmentCompletion();
    }

    assignSpecificKeyboard(teamId, keyboardId) {
        if (!keyboardId) return;

        const keyboard = this.keyboards.find(kb => kb.id === keyboardId);
        const team = this.teams.find(t => t.id === teamId);

        if (keyboard && team) {
            // 既存の割り当てをクリア
            keyboard.assignedTeamId = teamId;

            this.updateKeyboardAssignmentDisplay();
            this.checkKeyboardAssignmentCompletion();

            this.addToActivityLog(`[システム] ${team.name}に${keyboard.name}を割り当てました`, 'system');
        }
    }

    unassignKeyboard(teamId) {
        const keyboard = this.keyboards.find(kb => kb.assignedTeamId === teamId);
        const team = this.teams.find(t => t.id === teamId);

        if (keyboard && team) {
            delete keyboard.assignedTeamId;

            this.updateKeyboardAssignmentDisplay();
            this.checkKeyboardAssignmentCompletion();

            this.addToActivityLog(`[システム] ${team.name}から${keyboard.name}の割り当てを解除しました`, 'system');
        }
    }

    clearKeyboardAssignments() {
        this.keyboards.forEach(kb => delete kb.assignedTeamId);

        this.updateKeyboardAssignmentDisplay();
        this.checkKeyboardAssignmentCompletion();

        this.addToActivityLog(`[システム] すべてのキーボード割り当てをクリアしました`, 'system');
    }

    updateKeyboardAssignmentDisplay() {
        const display = document.getElementById('keyboard-assignment-display');
        if (display) {
            display.innerHTML = this.generateKeyboardAssignmentDisplay();
        }

        // キーボード数表示を更新
        const availableCount = document.getElementById('available-keyboard-count');
        const requiredCount = document.getElementById('required-keyboard-count');
        if (availableCount) availableCount.textContent = this.keyboards.length;
        if (requiredCount) requiredCount.textContent = this.teams.length;
    }

    checkKeyboardAssignmentCompletion() {
        const assignedTeams = this.teams.filter(team =>
            this.keyboards.some(kb => kb.assignedTeamId === team.id)
        );

        const isComplete = assignedTeams.length === this.teams.length;

        const summary = document.getElementById('keyboard-assignment-summary');
        const proceedBtn = document.getElementById('proceedToTargetBtn');

        if (summary && proceedBtn) {
            if (isComplete) {
                summary.style.display = 'flex';
                proceedBtn.disabled = false;
                this.updateStatus('1.5 キーボード割り当て完了 - 次は1.6お題数設定です');
            } else {
                summary.style.display = 'none';
                proceedBtn.disabled = true;
            }
        }
    }

    proceedToTargetSetting() {
        this.addToActivityLog(`[システム] 1.6 お題数設定へ進みます`, 'system');
        this.updateStatus('1.6 お題数設定の準備中...');

        // フェーズ切り替え
        this.currentPhase = '1.6';
        this.updatePhaseDisplay();

        // お題数設定UIを表示
        this.showTargetCountSection();
    }

    showTargetCountSection() {
        const container = document.getElementById('setup-container') || document.querySelector('.setup-panel');
        if (!container) {
            console.error('Setup container not found');
            return;
        }

        // 既存のお題数設定セクションを削除
        const existingSection = document.getElementById('target-count-section');
        if (existingSection) {
            existingSection.remove();
        }

        const section = document.createElement('div');
        section.className = 'settings-section';
        section.id = 'target-count-section';

        section.innerHTML = `
            <h3>お題数設定 (Phase 1.6)</h3>
            <div class="target-count-config">
                <div class="target-count-controls">
                    <div class="setting-group">
                        <label for="target-count-input">各チームのクリア目標:</label>
                        <select id="target-count-input" class="setting-input">
                            <option value="3">3問</option>
                            <option value="5" selected>5問</option>
                            <option value="7">7問</option>
                            <option value="10">10問</option>
                            <option value="15">15問</option>
                            <option value="20">20問</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label for="difficulty-level">お題の難易度:</label>
                        <select id="difficulty-level" class="setting-input">
                            <option value="easy">やさしい (3文字以下)</option>
                            <option value="normal" selected>ふつう (4-6文字)</option>
                            <option value="hard">むずかしい (7文字以上)</option>
                        </select>
                    </div>
                </div>
                <div class="target-preview">
                    <h4>設定確認</h4>
                    <div id="target-settings-preview" class="settings-preview">
                        <!-- 動的に生成 -->
                    </div>
                </div>
                <div class="target-actions">
                    <button id="confirm-target-btn" class="btn btn-primary">設定完了</button>
                    <button id="back-to-keyboard-btn" class="btn btn-secondary">戻る</button>
                </div>
            </div>
        `;

        container.appendChild(section);

        // イベントリスナー設定
        this.setupTargetCountHandlers();

        // 初期プレビュー表示
        this.updateTargetPreview();

        this.addToActivityLog(`[システム] お題数設定画面を表示しました`, 'system');
        this.updateStatus('各チームのクリア目標数を設定してください');
    }

    setupTargetCountHandlers() {
        const targetInput = document.getElementById('target-count-input');
        const difficultySelect = document.getElementById('difficulty-level');
        const confirmBtn = document.getElementById('confirm-target-btn');
        const backBtn = document.getElementById('back-to-keyboard-btn');

        // 設定変更時にプレビュー更新
        [targetInput, difficultySelect].forEach(element => {
            if (element) {
                element.addEventListener('change', () => this.updateTargetPreview());
            }
        });

        // 設定完了ボタン
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmTargetSettings());
        }

        // 戻るボタン
        if (backBtn) {
            backBtn.addEventListener('click', () => this.backToKeyboardAssignment());
        }
    }

    updateTargetPreview() {
        const targetCount = parseInt(document.getElementById('target-count-input')?.value) || 5;
        const difficulty = document.getElementById('difficulty-level')?.value || 'normal';
        const preview = document.getElementById('target-settings-preview');

        if (!preview) return;

        const difficultyText = {
            easy: 'やさしい (3文字以下)',
            normal: 'ふつう (4-6文字)',
            hard: 'むずかしい (7文字以上)'
        };

        preview.innerHTML = `
            <div class="preview-item">
                <span class="preview-label">各チームのクリア目標:</span>
                <span class="preview-value">${targetCount}問</span>
            </div>
            <div class="preview-item">
                <span class="preview-label">お題の難易度:</span>
                <span class="preview-value">${difficultyText[difficulty]}</span>
            </div>
            <div class="preview-item">
                <span class="preview-label">参加チーム数:</span>
                <span class="preview-value">${this.teams.length}チーム</span>
            </div>
            <div class="preview-item">
                <span class="preview-label">総問題数:</span>
                <span class="preview-value">${targetCount * this.teams.length}問</span>
            </div>
        `;
    }

    confirmTargetSettings() {
        const targetCount = parseInt(document.getElementById('target-count-input')?.value) || 5;
        const difficulty = document.getElementById('difficulty-level')?.value || 'normal';

        // 各チームにお題数設定を追加
        this.teams.forEach(team => {
            team.targetCount = targetCount;
            team.difficulty = difficulty;
            team.clearedCount = 0; // クリア済み問題数
        });

        this.addToActivityLog(`[システム] お題数設定完了: ${targetCount}問 (${difficulty})`, 'system');
        this.updateStatus('お題数設定が完了しました！ゲーム開始の準備ができています');

        // 次のフェーズ（ゲーム開始）へ
        this.currentPhase = '1.7';
        this.updatePhaseDisplay();
        this.showGameStartSection();
    }

    showGameStartSection() {
        const container = document.getElementById('setup-container') || document.querySelector('.setup-panel');
        if (!container) return;

        // 既存のゲーム開始セクションを削除
        const existingSection = document.getElementById('game-start-section');
        if (existingSection) {
            existingSection.remove();
        }

        const section = document.createElement('div');
        section.className = 'settings-section game-ready-section';
        section.id = 'game-start-section';

        section.innerHTML = `
            <h3>ゲーム開始準備完了! 🎮</h3>
            <div class="game-summary">
                <h4>設定サマリー</h4>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">参加プレイヤー:</span>
                        <span class="summary-value">${this.players.length}名</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">チーム数:</span>
                        <span class="summary-value">${this.teams.length}チーム</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">各チームクリア目標:</span>
                        <span class="summary-value">${this.teams[0]?.targetCount || 5}問</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">キーボード割り当て:</span>
                        <span class="summary-value">完了</span>
                    </div>
                </div>
            </div>
            <div class="game-start-actions">
                <button id="start-game-final-btn" class="btn btn-primary btn-large">
                    🚀 ゲーム開始！
                </button>
                <button id="back-to-targets-btn" class="btn btn-secondary">戻る</button>
            </div>
        `;

        container.appendChild(section);

        // イベントリスナー設定
        const startBtn = document.getElementById('start-game-final-btn');
        const backBtn = document.getElementById('back-to-targets-btn');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startFinalGame());
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => this.backToTargetSetting());
        }

        this.addToActivityLog(`[システム] ゲーム開始準備完了`, 'system');
    }

    startFinalGame() {
        this.addToActivityLog(`[システム] ゲーム開始！`, 'system');
        this.updateStatus('ゲーム開始！');

        // ゲーム画面への遷移処理
        // TODO: 実際のゲーム開始ロジックを実装
        alert(`🎮 ゲーム開始！\n\n各チーム ${this.teams[0]?.targetCount || 5}問のクリアを目指してがんばってください！\n\n※ゲームロジックは次の開発フェーズで実装予定です`);
    }

    backToKeyboardAssignment() {
        // キーボード割り当て画面に戻る
        const targetSection = document.getElementById('target-count-section');
        if (targetSection) {
            targetSection.remove();
        }

        this.currentPhase = '1.5';
        this.updatePhaseDisplay();
        this.showKeyboardAssignmentSection();
        this.updateStatus('キーボード割り当て画面に戻りました');
    }

    backToTargetSetting() {
        // お題数設定画面に戻る
        const gameStartSection = document.getElementById('game-start-section');
        if (gameStartSection) {
            gameStartSection.remove();
        }

        this.currentPhase = '1.6';
        this.updatePhaseDisplay();
        this.showTargetCountSection();
        this.updateStatus('お題数設定画面に戻りました');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ドラッグ&ドロップ用のグローバル関数
let draggedPlayerId = null;

function dragPlayer(event, playerId) {
    draggedPlayerId = playerId;
    event.dataTransfer.effectAllowed = 'move';
}

function allowDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function dropPlayer(event, teamId) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');

    if (draggedPlayerId && window.keyboardManager) {
        window.keyboardManager.movePlayerToTeam(draggedPlayerId, teamId);
        draggedPlayerId = null;
    }
}

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM読み込み完了 - KeyboardConnectionManager初期化開始');
    window.keyboardManager = new KeyboardConnectionManager();
});