// ブラウザ環境用の簡単なrenderer
console.log('=== SIMPLE RENDERER 読み込み開始 ===');

// 簡単なゲームUI
class SimpleGameUI {
    constructor() {
        console.log('SimpleGameUI初期化開始');

        this.keyboards = [
            { id: 'keyboard-1', name: 'Apple Magic Keyboard', connected: true },
            { id: 'keyboard-2', name: '外付けキーボード', connected: true }
        ];

        this.gameState = {
            currentScreen: 'setup',
            teams: [
                { id: 1, name: 'チーム 1', score: 0, currentInput: '', progress: 0, wordIndex: 0 },
                { id: 2, name: 'チーム 2', score: 0, currentInput: '', progress: 0, wordIndex: 0 }
            ],
            // 全チーム共通のお題リスト（DEV-24: 各チームでお題リストを共有）
            wordList: [],
            timeRemaining: 60,
            gameRunning: false
        };
        
        this.words = ['cat', 'dog', 'fish', 'bird', 'apple', 'cake', 'red', 'blue'];
        
        this.initializeUI();
        this.setupEventListeners();
        this.initializeDevPresets();
        
        console.log('SimpleGameUI初期化完了:', this);
    }
    
    initializeDevPresets() {
        console.log('=== 開発プリセット初期化開始 ===');

        // DOM要素の存在確認
        const devPresetsSection = document.getElementById('dev-presets');
        console.log('dev-presetsセクション:', devPresetsSection);

        if (!devPresetsSection) {
            console.error('❌ CRITICAL: dev-presetsセクションが見つかりません！HTMLを確認してください。');
            return;
        }

        // 開発環境の判定結果をログに出力
        const isDev = this.isDevEnvironment();
        console.log('URL:', window.location.href);
        console.log('プロトコル:', window.location.protocol);
        console.log('ホスト名:', window.location.hostname);
        console.log('ポート:', window.location.port);
        console.log('開発環境判定:', isDev);

        // 強制的に表示する（開発環境判定に関係なく）
        console.log('🔧 デバッグ目的で強制的にプリセットを表示します');
        devPresetsSection.style.display = 'flex';
        devPresetsSection.style.visibility = 'visible';
        devPresetsSection.style.opacity = '1';
        console.log('✅ 開発プリセットセクションを強制表示しました。');

        // プリセット選択肢を生成
        setTimeout(() => {
            this.loadPresetOptions();

            // プリセット読み込みボタンのイベントリスナー設定
            const loadPresetBtn = document.getElementById('load-preset-btn');
            if (loadPresetBtn) {
                loadPresetBtn.addEventListener('click', () => this.loadPresetConfig());
                console.log('✅ プリセット読み込みボタンのイベントリスナーを設定しました。');
            } else {
                console.error('❌ load-preset-btnが見つかりません。');
            }

            // 自動でデフォルトプリセットを読み込む
            if (isDev) {
                this.autoLoadDefaultPreset();
            }
        }, 100);
    }
    
    isDevEnvironment() {
        // Electronアプリの場合の判定ロジック

        // 1. URLパラメータでの指定
        if (window.location.search.includes('dev=true')) {
            return true;
        }

        // 2. Electronの開発環境判定（window.require が利用可能な場合）
        if (typeof window.require !== 'undefined') {
            try {
                const { ipcRenderer } = window.require('electron');
                // IPCでメインプロセスから環境情報を取得することも可能
            } catch (e) {
                // requireが使えない場合は無視
            }
        }

        // 3. ファイルプロトコルの場合は開発環境として判定
        if (window.location.protocol === 'file:') {
            return true;
        }

        // 4. 通常のWeb環境での判定（fallback）
        return window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1' ||
               window.location.port !== '';
    }
    
    loadPresetOptions() {
        const presetSelect = document.getElementById('preset-select');
        if (!presetSelect) {
            console.error('❌ preset-selectが見つかりません。');
            return;
        }

        console.log('📋 プリセット選択肢を生成中...');

        // 開発用プリセット設定（JSONファイルの内容を直接埋め込み）
        const devPresets = {
            "quick-2team": {
                name: "クイック2チーム",
                description: "2チームでの動作確認用"
            },
            "multi-team": {
                name: "マルチチーム",
                description: "多チームでの動作確認用"
            },
            "minimal": {
                name: "最小構成",
                description: "最小限の設定でのテスト用"
            },
            "full-config": {
                name: "フル機能テスト",
                description: "すべての機能を有効にしたテスト用"
            }
        };

        // 選択肢をクリア
        presetSelect.innerHTML = '<option value="">プリセットを選択...</option>';

        // プリセット選択肢を追加
        Object.entries(devPresets).forEach(([key, preset]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${preset.name} - ${preset.description}`;
            presetSelect.appendChild(option);
        });

        console.log(`✅ ${Object.keys(devPresets).length}個のプリセット選択肢を追加しました。`);
    }
    
    loadPresetConfig() {
        const presetSelect = document.getElementById('preset-select');
        const presetKey = presetSelect?.value;
        
        if (!presetKey) {
            alert('プリセットを選択してください。');
            return;
        }
        
        try {
            const config = this.getPresetConfig(presetKey);
            if (config) {
                this.applyPresetConfig(config);
                console.log(`プリセット設定を適用しました: ${presetKey}`);
                
                // 成功通知
                const statusElement = document.getElementById('setup-status');
                if (statusElement) {
                    statusElement.textContent = `プリセット "${config.name}" を読み込みました`;
                    statusElement.style.color = 'green';
                    
                    // 3秒後に元に戻す
                    setTimeout(() => {
                        statusElement.textContent = '設定を確認してください';
                        statusElement.style.color = '';
                    }, 3000);
                }
            }
        } catch (error) {
            console.error('プリセット設定の読み込みに失敗しました:', error);
            alert('プリセット設定の読み込みに失敗しました。');
        }
    }
    
    getPresetConfig(presetKey) {
        // 開発用プリセット設定
        const presets = {
            "quick-2team": {
                name: "クイック2チーム",
                teamCount: 2,
                difficulty: "easy",
                gameDurationSeconds: 30,
                wordCategory: "animals",
                players: ["テストプレイヤー1", "テストプレイヤー2", "テストプレイヤー3", "テストプレイヤー4"],
                teamAssignmentStrategy: "sequential",
                turnOrderStrategy: "sequential",
                soundSettings: {
                    masterVolume: 50,
                    soundEffectsEnabled: true,
                    typingSoundEnabled: true,
                    backgroundMusicEnabled: false
                }
            },
            "multi-team": {
                name: "マルチチーム",
                teamCount: 4,
                difficulty: "normal", 
                gameDurationSeconds: 60,
                wordCategory: "mixed",
                players: ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4", "プレイヤー5", "プレイヤー6", "プレイヤー7", "プレイヤー8"],
                teamAssignmentStrategy: "random",
                turnOrderStrategy: "random",
                soundSettings: {
                    masterVolume: 70,
                    soundEffectsEnabled: true,
                    typingSoundEnabled: true,
                    backgroundMusicEnabled: true
                }
            },
            "minimal": {
                name: "最小構成",
                teamCount: 2,
                difficulty: "easy",
                gameDurationSeconds: 15,
                wordCategory: "colors", 
                players: ["Player1", "Player2"],
                teamAssignmentStrategy: "sequential",
                turnOrderStrategy: "sequential",
                soundSettings: {
                    masterVolume: 0,
                    soundEffectsEnabled: false,
                    typingSoundEnabled: false,
                    backgroundMusicEnabled: false
                }
            },
            "full-config": {
                name: "フル機能テスト",
                teamCount: 6,
                difficulty: "hard",
                gameDurationSeconds: 120,
                wordCategory: "school",
                players: ["あきら", "かずき", "さくら", "たろう", "なおき", "はなこ", "みさき", "ゆうた", "りな", "わかな", "そうた", "えみ"],
                teamAssignmentStrategy: "manual",
                turnOrderStrategy: "alphabetical",
                soundSettings: {
                    masterVolume: 100,
                    soundEffectsEnabled: true,
                    typingSoundEnabled: true,
                    backgroundMusicEnabled: true
                }
            }
        };
        
        return presets[presetKey] || null;
    }
    
    applyPresetConfig(config) {
        // 設定名
        const configNameInput = document.getElementById('config-name');
        if (configNameInput) {
            configNameInput.value = config.name;
        }
        
        // チーム数
        const teamCountSelect = document.getElementById('team-count');
        if (teamCountSelect) {
            teamCountSelect.value = config.teamCount.toString();
        }
        
        // 難易度
        const difficultySelect = document.getElementById('difficulty');
        if (difficultySelect) {
            difficultySelect.value = config.difficulty;
        }
        
        // ゲーム時間
        const gameDurationSelect = document.getElementById('game-duration');
        if (gameDurationSelect) {
            gameDurationSelect.value = config.gameDurationSeconds.toString();
        }
        
        // お題カテゴリ
        const wordCategorySelect = document.getElementById('word-category');
        if (wordCategorySelect) {
            wordCategorySelect.value = config.wordCategory;
        }
        
        // 音響設定
        const masterVolumeSlider = document.getElementById('master-volume');
        const volumeDisplay = document.getElementById('volume-display');
        if (masterVolumeSlider && volumeDisplay) {
            masterVolumeSlider.value = config.soundSettings.masterVolume.toString();
            volumeDisplay.textContent = `${config.soundSettings.masterVolume}%`;
        }
        
        const soundEffectsCheckbox = document.getElementById('sound-effects');
        if (soundEffectsCheckbox) {
            soundEffectsCheckbox.checked = config.soundSettings.soundEffectsEnabled;
        }
        
        const typingSoundCheckbox = document.getElementById('typing-sound');
        if (typingSoundCheckbox) {
            typingSoundCheckbox.checked = config.soundSettings.typingSoundEnabled;
        }
        
        const backgroundMusicCheckbox = document.getElementById('background-music');
        if (backgroundMusicCheckbox) {
            backgroundMusicCheckbox.checked = config.soundSettings.backgroundMusicEnabled;
        }
        
        // プレイヤーを追加
        this.clearPlayers();
        config.players.forEach(playerName => {
            this.addPlayer(playerName);
        });
        
        // 割り当て方法を設定
        const assignmentStrategySelect = document.getElementById('assignment-strategy');
        if (assignmentStrategySelect) {
            assignmentStrategySelect.value = config.teamAssignmentStrategy;
        }
        
        const turnOrderStrategySelect = document.getElementById('turn-order-strategy');
        if (turnOrderStrategySelect) {
            turnOrderStrategySelect.value = config.turnOrderStrategy;
        }
    }
    
    clearPlayers() {
        const playersContainer = document.getElementById('players-container');
        if (playersContainer) {
            playersContainer.innerHTML = '';
        }
        this.updatePlayerCount();
    }
    
    addPlayer(name) {
        const playersContainer = document.getElementById('players-container');
        if (!playersContainer) return;
        
        const playerElement = document.createElement('div');
        playerElement.className = 'player-item';
        playerElement.innerHTML = `
            <span class="player-name">${name}</span>
            <button class="btn btn-small btn-danger remove-player-btn">削除</button>
        `;
        
        // 削除ボタンのイベントリスナー
        const removeBtn = playerElement.querySelector('.remove-player-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                playerElement.remove();
                this.updatePlayerCount();
            });
        }
        
        playersContainer.appendChild(playerElement);
        this.updatePlayerCount();
    }
    
    updatePlayerCount() {
        const playersContainer = document.getElementById('players-container');
        const playerCountElement = document.getElementById('player-count');
        
        if (playersContainer && playerCountElement) {
            const count = playersContainer.querySelectorAll('.player-item').length;
            playerCountElement.textContent = count.toString();
        }
    }
    
    autoLoadDefaultPreset() {
        // 開発環境では自動的にデフォルトプリセットを読み込む
        if (this.isDevEnvironment()) {
            setTimeout(() => {
                const presetSelect = document.getElementById('preset-select');
                if (presetSelect) {
                    presetSelect.value = 'quick-2team'; // デフォルトプリセット
                    this.loadPresetConfig();
                }
            }, 500); // UI初期化後に実行
        }
    }
    
    initializeUI() {
        console.log('UIを初期化中...');
        
        // キーボードリストを更新
        const keyboardList = document.getElementById('keyboard-list');
        if (keyboardList) {
            keyboardList.innerHTML = this.keyboards.map(kb => 
                `<div class="keyboard-item">
                    <span class="keyboard-name">${kb.name}</span>
                    <span class="keyboard-status connected">接続中</span>
                </div>`
            ).join('');
        }
        
        // ゲーム開始ボタンを有効化
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.disabled = false;
            console.log('ゲーム開始ボタンを有効化しました');
        }
    }
    
    setupEventListeners() {
        console.log('イベントリスナーを設定中...');
        
        // ゲーム開始ボタン
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log('ゲーム開始ボタンがクリックされました');
                this.startGame();
            });
        }
        
        // リスタートボタン
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartGame());
        }
        
        // キーボード入力
        document.addEventListener('keydown', (e) => {
            if (this.gameState.gameRunning) {
                this.handleKeyInput(e.key);
            }
        });
    }
    
    async startGame() {
        console.log('ゲーム開始処理開始');

        try {
            // カウントダウン表示
            await this.showCountdown();

            // ゲーム状態を更新
            this.gameState.gameRunning = true;
            // DEV-24: 全チーム共通のお題リストを生成
            this.gameState.wordList = this.generateWordList();
            // 各チームのwordIndexを0にリセット
            this.gameState.teams.forEach(team => team.wordIndex = 0);
            this.gameState.timeRemaining = 60;

            // 画面切り替え
            this.showScreen('game');
            this.updateGameStatus('ゲーム中');
            this.renderGameScreen();
            this.startGameTimer();

            console.log('ゲーム開始完了');
        } catch (error) {
            console.error('ゲーム開始エラー:', error);
        }
    }

    generateWordList() {
        // DEV-24: 全チーム共通のお題リストを生成（シャッフル）
        const shuffled = [...this.words].sort(() => Math.random() - 0.5);
        return shuffled;
    }

    getTeamCurrentWord(team) {
        // DEV-24: チームの現在のお題を取得
        if (team.wordIndex < this.gameState.wordList.length) {
            return this.gameState.wordList[team.wordIndex];
        }
        // リストの最後に達したら最初に戻る
        return this.gameState.wordList[0] || 'cat';
    }
    
    renderGameScreen() {
        // チーム表示
        this.renderTeams();
        this.updateTimer();
    }

    renderTeams() {
        const container = document.getElementById('teams-container');
        if (!container) return;

        console.log('=== renderTeams called ===');
        console.log('wordList:', this.gameState.wordList);
        // console.log('teams:', this.gameState.teams.map(t => ({id: t.id, wordIndex: t.wordIndex})));

        container.innerHTML = this.gameState.teams.map(team => {
            // DEV-24: 各チームの現在のお題を取得
            const teamWord = this.getTeamCurrentWord(team);
            console.log(`Team ${team.id}: wordIndex=${team.wordIndex}, word="${teamWord}"`);
            return `
                <div class="team-panel team-${team.id}">
                    <div class="team-header">
                        <div class="team-name">${team.name}</div>
                        <div class="team-score">${team.score}点</div>
                    </div>
                    <div class="team-word">お題: ${teamWord}</div>
                    <div class="team-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${team.progress}%"></div>
                        </div>
                    </div>
                    <div class="current-input" id="team-${team.id}-input">
                        ${team.currentInput}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    handleKeyInput(key) {
        const team = this.gameState.teams[0]; // 簡単のため1チーム目のみ
        
        if (key === 'Backspace') {
            team.currentInput = team.currentInput.slice(0, -1);
        } else if (key === 'Enter') {
            this.checkWord(team);
        } else if (key.length === 1 && key.match(/[あ-んア-ンa-zA-Z]/)) {
            team.currentInput += key;
        }
        
        this.updateTeamInput(team);
        this.updateTeamProgress(team);
    }
    
    updateTeamInput(team) {
        const inputElement = document.getElementById(`team-${team.id}-input`);
        if (inputElement) {
            inputElement.textContent = team.currentInput;

            // DEV-24: 各チームは自分のお題と比較
            const currentWord = this.getTeamCurrentWord(team);
            // 正誤判定スタイル
            if (currentWord.startsWith(team.currentInput)) {
                inputElement.style.color = 'green';
            } else {
                inputElement.style.color = 'red';
            }
        }
    }

    updateTeamProgress(team) {
        // DEV-24: 各チームは自分のお題の長さを使用
        const currentWord = this.getTeamCurrentWord(team);
        const wordLength = currentWord.length;
        const correctLength = this.getCorrectInputLength(team.currentInput, currentWord);
        team.progress = wordLength > 0 ? (correctLength / wordLength) * 100 : 0;

        const progressFill = document.querySelector(`.team-${team.id} .progress-fill`);
        if (progressFill) {
            progressFill.style.width = `${team.progress}%`;
        }
    }

    getCorrectInputLength(input, targetWord) {
        let correctLength = 0;
        for (let i = 0; i < Math.min(input.length, targetWord.length); i++) {
            if (input[i] === targetWord[i]) {
                correctLength++;
            } else {
                break;
            }
        }
        return correctLength;
    }

    checkWord(team) {
        // DEV-24: 各チームは自分のwordIndexに対応するお題をチェック
        const currentWord = this.getTeamCurrentWord(team);

        if (team.currentInput === currentWord) {
            team.score += 10;
            team.currentInput = '';
            team.progress = 0;

            // DEV-24: このチームのwordIndexだけを進める
            team.wordIndex++;

            this.renderGameScreen();

            console.log(`正解！次の単語: ${this.getTeamCurrentWord(team)}`);
        } else {
            console.log('不正解');
        }
    }
    
    getRandomWord() {
        return this.words[Math.floor(Math.random() * this.words.length)];
    }
    
    startGameTimer() {
        this.gameTimer = setInterval(() => {
            this.gameState.timeRemaining--;
            this.updateTimer();
            
            if (this.gameState.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }
    
    updateTimer() {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = this.gameState.timeRemaining.toString();
        }
    }
    
    endGame() {
        this.gameState.gameRunning = false;
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        this.showScreen('result');
        this.updateGameStatus('ゲーム終了');
        this.renderResults();
    }
    
    renderResults() {
        const resultsList = document.getElementById('results-list');
        if (!resultsList) return;
        
        const sortedTeams = [...this.gameState.teams].sort((a, b) => b.score - a.score);
        
        resultsList.innerHTML = sortedTeams.map((team, index) => `
            <div class="result-item ${index === 0 ? 'winner' : ''}">
                <span class="result-rank">${index + 1}位</span>
                <span class="result-team">${team.name}</span>
                <span class="result-score">${team.score}点</span>
            </div>
        `).join('');
    }
    
    restartGame() {
        this.gameState = {
            currentScreen: 'setup',
            teams: [
                { id: 1, name: 'チーム 1', score: 0, currentInput: '', progress: 0, wordIndex: 0 },
                { id: 2, name: 'チーム 2', score: 0, currentInput: '', progress: 0, wordIndex: 0 }
            ],
            wordList: [],
            timeRemaining: 60,
            gameRunning: false
        };

        this.showScreen('setup');
        this.updateGameStatus('準備中');
    }
    
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }
    
    updateGameStatus(status) {
        const statusElement = document.getElementById('game-state');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }
    
    async showCountdown() {
        return new Promise((resolve) => {
            let count = 3;
            const countdownElement = document.createElement('div');
            countdownElement.className = 'countdown';
            countdownElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 4em;
                font-weight: bold;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 9999;
            `;
            countdownElement.textContent = count.toString();
            document.body.appendChild(countdownElement);

            const interval = setInterval(() => {
                count--;
                
                if (count > 0) {
                    countdownElement.textContent = count.toString();
                } else {
                    countdownElement.textContent = 'スタート!';
                    clearInterval(interval);
                    
                    setTimeout(() => {
                        document.body.removeChild(countdownElement);
                        resolve();
                    }, 500);
                }
            }, 1000);
        });
    }
}

// アプリケーション初期化
function initializeSimpleApp() {
    console.log('SimpleApp初期化関数実行');
    try {
        const gameUI = new SimpleGameUI();
        window.gameUI = gameUI; // デバッグ用
        console.log('SimpleGameUI初期化成功:', gameUI);
    } catch (error) {
        console.error('SimpleGameUI初期化エラー:', error);
    }
}

// DOM読み込み完了後に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSimpleApp);
} else {
    initializeSimpleApp();
}