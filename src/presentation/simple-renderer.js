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
                { id: 1, name: 'チーム 1', score: 0, currentInput: '', progress: 0 },
                { id: 2, name: 'チーム 2', score: 0, currentInput: '', progress: 0 }
            ],
            currentWord: 'cat',
            timeRemaining: 60,
            gameRunning: false
        };
        
        this.words = ['cat', 'dog', 'fish', 'bird', 'apple', 'cake', 'red', 'blue'];
        
        this.initializeUI();
        this.setupEventListeners();
        
        console.log('SimpleGameUI初期化完了:', this);
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
            this.gameState.currentWord = this.getRandomWord();
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
    
    renderGameScreen() {
        // 現在の単語を表示
        const wordElement = document.getElementById('target-word');
        if (wordElement) {
            wordElement.textContent = this.gameState.currentWord;
        }
        
        // チーム表示
        this.renderTeams();
        this.updateTimer();
    }
    
    renderTeams() {
        const container = document.getElementById('teams-container');
        if (!container) return;
        
        container.innerHTML = this.gameState.teams.map(team => `
            <div class="team-panel team-${team.id}">
                <div class="team-header">
                    <div class="team-name">${team.name}</div>
                    <div class="team-score">${team.score}点</div>
                </div>
                <div class="team-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${team.progress}%"></div>
                    </div>
                </div>
                <div class="current-input" id="team-${team.id}-input">
                    ${team.currentInput}
                </div>
            </div>
        `).join('');
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
            
            // 正誤判定スタイル
            if (this.gameState.currentWord.startsWith(team.currentInput)) {
                inputElement.style.color = 'green';
            } else {
                inputElement.style.color = 'red';
            }
        }
    }
    
    updateTeamProgress(team) {
        const wordLength = this.gameState.currentWord.length;
        const correctLength = this.getCorrectInputLength(team.currentInput);
        team.progress = wordLength > 0 ? (correctLength / wordLength) * 100 : 0;
        
        const progressFill = document.querySelector(`.team-${team.id} .progress-fill`);
        if (progressFill) {
            progressFill.style.width = `${team.progress}%`;
        }
    }
    
    getCorrectInputLength(input) {
        let correctLength = 0;
        for (let i = 0; i < Math.min(input.length, this.gameState.currentWord.length); i++) {
            if (input[i] === this.gameState.currentWord[i]) {
                correctLength++;
            } else {
                break;
            }
        }
        return correctLength;
    }
    
    checkWord(team) {
        if (team.currentInput === this.gameState.currentWord) {
            team.score += 10;
            team.currentInput = '';
            team.progress = 0;
            
            this.gameState.currentWord = this.getRandomWord();
            this.renderGameScreen();
            
            console.log(`正解！新しい単語: ${this.gameState.currentWord}`);
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
                { id: 1, name: 'チーム 1', score: 0, currentInput: '', progress: 0 },
                { id: 2, name: 'チーム 2', score: 0, currentInput: '', progress: 0 }
            ],
            currentWord: 'cat',
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