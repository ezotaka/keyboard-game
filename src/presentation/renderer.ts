import { SoundManager, SoundType } from './sounds/sound-manager';
import { ISoundManager } from './sounds/sound-manager-interface';
import { NullSoundManager } from './sounds/null-sound-manager';
import '../types/window.d';

interface GameState {
    currentScreen: 'setup' | 'game' | 'result';
    teams: Team[];
    currentWord: string;
    timeRemaining: number;
    gameRunning: boolean;
}

interface Team {
    id: number;
    name: string;
    score: number;
    currentInput: string;
    progress: number;
    keyboardId?: string;
    color: string;
}

interface Keyboard {
    id: string;
    name: string;
    connected: boolean;
    assigned: boolean;
    teamId?: number;
}

export class GameUI {
    private gameState: GameState;
    private keyboards: Keyboard[] = [];
    private gameTimer: number | null = null;
    private soundManager: ISoundManager;
    
    private readonly TEAM_COLORS = [
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
        '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'
    ];

    constructor() {
        this.gameState = {
            currentScreen: 'setup',
            teams: [],
            currentWord: '',
            timeRemaining: 60,
            gameRunning: false
        };
        
        try {
            this.soundManager = new SoundManager();
            console.log('SoundManager初期化成功');
        } catch (error) {
            console.error('SoundManager初期化エラー:', error);
            // 適切なNullSoundManagerを使用
            this.soundManager = new NullSoundManager();
        }
        this.initializeUI();
        this.setupEventListeners();
        
        // キーボード読み込みを少し遅延させる
        window.setTimeout(() => {
            this.loadKeyboards();
        }, 100);
    }

    private initializeUI(): void {
        console.log('initializeUI呼び出し');
        this.showScreen('setup');
        this.updateGameStatus('準備中');
        
        // 初期状態でローディング表示を確認
        const keyboardList = document.getElementById('keyboard-list');
        console.log('初期keyboard-list要素:', keyboardList);
        console.log('初期keyboard-list内容:', keyboardList?.innerHTML);
    }

    private setupEventListeners(): void {
        // ゲーム開始ボタン
        const startBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
        startBtn?.addEventListener('click', () => this.startGame());

        // リスタートボタン
        const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
        restartBtn?.addEventListener('click', () => this.restartGame());

        // チーム数変更
        const teamCountSelect = document.getElementById('team-count') as HTMLSelectElement;
        teamCountSelect?.addEventListener('change', () => this.updateTeamAssignment());

        // キーボード入力イベント
        if (window.keyboardGameAPI) {
            window.keyboardGameAPI.onKeyboardInput((data) => this.handleKeyboardInput(data));
        }
    }

    private async loadKeyboards(): Promise<void> {
        try {
            console.log('loadKeyboards関数が呼ばれました');
            console.log('keyboardGameAPI利用可能:', !!window.keyboardGameAPI);
            
            if (window.keyboardGameAPI) {
                console.log('キーボードデータを取得中...');
                const keyboardData = await window.keyboardGameAPI.getKeyboards();
                console.log('取得したキーボードデータ:', keyboardData);
                
                this.keyboards = keyboardData.map(kb => ({
                    id: kb.id,
                    name: kb.name || `キーボード ${kb.id}`,
                    connected: true,
                    assigned: false
                }));
                
                console.log('変換後のキーボード配列:', this.keyboards);
                this.updateKeyboardList();
                this.updateTeamAssignment();
            } else {
                console.log('keyboardGameAPIが利用できません - モックデータを使用');
                // フォールバック: モックキーボードデータを直接設定
                this.keyboards = [
                    {
                        id: 'mock-keyboard-1',
                        name: 'Apple Magic Keyboard',
                        connected: true,
                        assigned: false
                    },
                    {
                        id: 'mock-keyboard-2',
                        name: '外付けキーボード',
                        connected: true,
                        assigned: false
                    }
                ];
                this.updateKeyboardList();
                this.updateTeamAssignment();
            }
        } catch (error) {
            console.error('キーボード取得エラー:', error);
            console.log('エラーのためモックデータを使用');
            // エラー時のフォールバック
            this.keyboards = [
                {
                    id: 'mock-keyboard-1',
                    name: 'Apple Magic Keyboard',
                    connected: true,
                    assigned: false
                },
                {
                    id: 'mock-keyboard-2',
                    name: '外付けキーボード',
                    connected: true,
                    assigned: false
                }
            ];
            this.updateKeyboardList();
            this.updateTeamAssignment();
        }
    }

    private updateKeyboardList(): void {
        console.log('updateKeyboardList呼び出し - キーボード数:', this.keyboards.length);
        const keyboardList = document.getElementById('keyboard-list');
        if (!keyboardList) {
            console.log('keyboard-list要素が見つかりません');
            return;
        }

        if (this.keyboards.length === 0) {
            console.log('キーボードが0個のため「見つかりません」を表示');
            keyboardList.innerHTML = '<div class="loading">キーボードが見つかりません</div>';
            return;
        }

        console.log('キーボードリスト表示中:', this.keyboards);
        keyboardList.innerHTML = this.keyboards.map(keyboard => `
            <div class="keyboard-item">
                <span class="keyboard-name">${keyboard.name}</span>
                <span class="keyboard-status ${keyboard.assigned ? 'assigned' : 'connected'}">
                    ${keyboard.assigned ? 'チーム割り当て済み' : '接続中'}
                </span>
            </div>
        `).join('');
    }

    private updateTeamAssignment(): void {
        const teamCountSelect = document.getElementById('team-count') as HTMLSelectElement;
        const teamCount = parseInt(teamCountSelect?.value || '2');
        
        // チーム数に基づいてキーボード割り当て
        this.keyboards.forEach((keyboard, index) => {
            if (index < teamCount) {
                keyboard.assigned = true;
                keyboard.teamId = index + 1;
            } else {
                keyboard.assigned = false;
                keyboard.teamId = undefined;
            }
        });

        // チーム配列を更新
        this.gameState.teams = Array.from({ length: teamCount }, (_, i) => ({
            id: i + 1,
            name: `チーム ${i + 1}`,
            score: 0,
            currentInput: '',
            progress: 0,
            keyboardId: this.keyboards.find(kb => kb.teamId === i + 1)?.id,
            color: this.TEAM_COLORS[i]
        }));

        this.updateKeyboardList();
        this.updateStartButtonState();
    }

    private updateStartButtonState(): void {
        const startBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
        const assignedKeyboards = this.keyboards.filter(kb => kb.assigned).length;
        const requiredKeyboards = this.gameState.teams.length;
        
        if (startBtn) {
            startBtn.disabled = assignedKeyboards < requiredKeyboards;
        }
    }

    private async startGame(): Promise<void> {
        try {
            // ゲーム開始音を再生
            this.soundManager.playSound(SoundType.GAME_START);
            
            // カウントダウン表示
            await this.showCountdown();
            
            if (window.keyboardGameAPI) {
                const gameConfig = {
                    teamCount: this.gameState.teams.length,
                    difficulty: (document.getElementById('difficulty') as HTMLSelectElement)?.value || 'easy',
                    keyboards: this.keyboards.filter(kb => kb.assigned)
                };
                
                await window.keyboardGameAPI.startGame(gameConfig);
            }
            
            this.gameState.currentScreen = 'game';
            this.gameState.gameRunning = true;
            this.gameState.timeRemaining = 60;
            this.gameState.currentWord = this.getRandomWord();
            
            this.showScreen('game');
            this.updateGameStatus('ゲーム中');
            this.renderGameScreen();
            this.startGameTimer();
            
        } catch (error) {
            console.error('ゲーム開始エラー:', error);
        }
    }

    private renderGameScreen(): void {
        this.updateCurrentWord();
        this.renderTeams();
        this.updateTimer();
    }

    private renderTeams(): void {
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

    private handleKeyboardInput(data: any): void {
        if (!this.gameState.gameRunning) return;

        const team = this.gameState.teams.find(t => t.keyboardId === data.keyboardId);
        if (!team) return;

        if (data.key === 'Backspace') {
            team.currentInput = team.currentInput.slice(0, -1);
        } else if (data.key === 'Enter') {
            this.checkWord(team);
        } else if (data.key.length === 1) {
            team.currentInput += data.key;
            // タイピング音を再生
            this.soundManager.playSound(SoundType.TYPING, 0.3);
        }

        this.updateTeamInput(team);
        this.updateTeamProgress(team);
    }

    private updateTeamInput(team: Team): void {
        const inputElement = document.getElementById(`team-${team.id}-input`);
        if (inputElement) {
            inputElement.textContent = team.currentInput;
            
            // 入力状態に応じてスタイル変更
            if (this.gameState.currentWord.startsWith(team.currentInput)) {
                inputElement.classList.add('correct');
                inputElement.classList.remove('incorrect');
            } else {
                inputElement.classList.add('incorrect');
                inputElement.classList.remove('correct');
            }
        }
    }

    private updateTeamProgress(team: Team): void {
        const wordLength = this.gameState.currentWord.length;
        const correctLength = this.getCorrectInputLength(team.currentInput);
        
        team.progress = wordLength > 0 ? (correctLength / wordLength) * 100 : 0;
        
        const progressFill = document.querySelector(
            `.team-${team.id} .progress-fill`
        ) as HTMLElement;
        if (progressFill) {
            progressFill.style.width = `${team.progress}%`;
        }
    }

    private getCorrectInputLength(input: string): number {
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

    private checkWord(team: Team): void {
        if (team.currentInput === this.gameState.currentWord) {
            team.score += 10;
            team.currentInput = '';
            team.progress = 0;
            
            // 成功音を再生
            this.soundManager.playSound(SoundType.SUCCESS);
            
            this.gameState.currentWord = this.getRandomWord();
            this.updateCurrentWord();
            this.renderTeams();
            
            // 成功エフェクト
            this.showSuccessEffect(team);
        } else {
            // エラー音を再生
            this.soundManager.playSound(SoundType.ERROR);
        }
    }

    private showSuccessEffect(team: Team): void {
        const teamPanel = document.querySelector(`.team-${team.id}`) as HTMLElement;
        if (teamPanel) {
            teamPanel.classList.add('bounce');
            window.setTimeout(() => {
                teamPanel.classList.remove('bounce');
            }, 1000);
        }
    }

    private getRandomWord(): string {
        const words = [
            'ねこ', 'いぬ', 'うさぎ', 'ぞう', 'きりん',
            'りんご', 'ばなな', 'いちご', 'ぶどう', 'みかん',
            'あか', 'あお', 'きいろ', 'みどり', 'しろ',
            'はな', 'つき', 'ほし', 'そら', 'うみ'
        ];
        return words[Math.floor(Math.random() * words.length)];
    }

    private updateCurrentWord(): void {
        const wordElement = document.getElementById('target-word');
        if (wordElement) {
            wordElement.textContent = this.gameState.currentWord;
        }
    }

    private startGameTimer(): void {
        this.gameTimer = window.setInterval(() => {
            this.gameState.timeRemaining--;
            this.updateTimer();
            
            if (this.gameState.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    private updateTimer(): void {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = this.gameState.timeRemaining.toString();
            
            if (this.gameState.timeRemaining <= 10) {
                timerElement.classList.add('pulse');
                // カウントダウン音を再生
                if (this.gameState.timeRemaining <= 5) {
                    this.soundManager.playSound(SoundType.COUNTDOWN);
                }
            }
        }
    }

    private async endGame(): Promise<void> {
        this.gameState.gameRunning = false;
        
        if (this.gameTimer) {
            window.clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        // ゲーム終了音を再生
        this.soundManager.playSound(SoundType.GAME_END);
        
        try {
            if (window.keyboardGameAPI) {
                await window.keyboardGameAPI.stopGame();
            }
        } catch (error) {
            console.error('ゲーム停止エラー:', error);
        }
        
        this.showScreen('result');
        this.updateGameStatus('ゲーム終了');
        this.renderResults();
    }

    private renderResults(): void {
        const resultsList = document.getElementById('results-list');
        if (!resultsList) return;

        const sortedTeams = [...this.gameState.teams].sort((a, b) => b.score - a.score);

        // 勝利音を再生
        if (sortedTeams.length > 0 && sortedTeams[0].score > 0) {
            this.soundManager.playSound(SoundType.WINNER);
        }

        resultsList.innerHTML = sortedTeams.map((team, index) => `
            <div class="result-item ${index === 0 ? 'winner winner-effect' : ''}">
                <span class="result-rank">${index + 1}位</span>
                <span class="result-team">${team.name}</span>
                <span class="result-score">${team.score}点</span>
            </div>
        `).join('');
    }

    private restartGame(): void {
        this.gameState = {
            currentScreen: 'setup',
            teams: [],
            currentWord: '',
            timeRemaining: 60,
            gameRunning: false
        };
        
        this.keyboards.forEach(kb => {
            kb.assigned = false;
            kb.teamId = undefined;
        });
        
        this.showScreen('setup');
        this.updateGameStatus('準備中');
        this.updateTeamAssignment();
    }

    private showScreen(screenName: string): void {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    private updateGameStatus(status: string): void {
        const statusElement = document.getElementById('game-state');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    private async showCountdown(): Promise<void> {
        return new Promise((resolve) => {
            let count = 3;
            const countdownElement = document.createElement('div');
            countdownElement.className = 'countdown';
            countdownElement.textContent = count.toString();
            document.body.appendChild(countdownElement);

            const interval = window.setInterval(() => {
                this.soundManager.playSound(SoundType.COUNTDOWN);
                count--;
                
                if (count > 0) {
                    countdownElement.textContent = count.toString();
                } else {
                    countdownElement.textContent = 'スタート!';
                    window.clearInterval(interval);
                    
                    window.setTimeout(() => {
                        document.body.removeChild(countdownElement);
                        resolve();
                    }, 500);
                }
            }, 1000);
        });
    }
}

// アプリケーション初期化
console.log('renderer.js読み込み開始');

function initializeApp() {
    console.log('initializeApp関数実行');
    try {
        const gameUI = new GameUI();
        console.log('GameUIインスタンス作成成功:', gameUI);
    } catch (error) {
        console.error('GameUI初期化エラー:', error);
    }
}

if (document.readyState === 'loading') {
    console.log('DOMローディング中 - イベントリスナー登録');
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    console.log('DOMすでに準備完了 - 即座に初期化');
    initializeApp();
}

