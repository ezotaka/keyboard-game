import { SoundManager, SoundType } from './sounds/sound-manager';

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

class GameUI {
    private gameState: GameState;
    private keyboards: Keyboard[] = [];
    private gameTimer: NodeJS.Timeout | null = null;
    private soundManager: SoundManager;
    
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
        
        this.soundManager = new SoundManager();
        this.initializeUI();
        this.setupEventListeners();
        this.loadKeyboards();
    }

    private initializeUI(): void {
        this.showScreen('setup');
        this.updateGameStatus('準備中');
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
            if (window.keyboardGameAPI) {
                const keyboardData = await window.keyboardGameAPI.getKeyboards();
                this.keyboards = keyboardData.map(kb => ({
                    id: kb.id,
                    name: kb.name || `キーボード ${kb.id}`,
                    connected: true,
                    assigned: false
                }));
                
                this.updateKeyboardList();
                this.updateTeamAssignment();
            }
        } catch (error) {
            console.error('キーボード取得エラー:', error);
            this.updateKeyboardList();
        }
    }

    private updateKeyboardList(): void {
        const keyboardList = document.getElementById('keyboard-list');
        if (!keyboardList) return;

        if (this.keyboards.length === 0) {
            keyboardList.innerHTML = '<div class="loading">キーボードが見つかりません</div>';
            return;
        }

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
        const inputLength = team.currentInput.length;
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
            setTimeout(() => {
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
        this.gameTimer = setInterval(() => {
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
            clearInterval(this.gameTimer);
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

            const interval = setInterval(() => {
                this.soundManager.playSound(SoundType.COUNTDOWN);
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
document.addEventListener('DOMContentLoaded', () => {
    new GameUI();
});

// TypeScript 型定義を window に追加
declare global {
    interface Window {
        keyboardGameAPI?: {
            onKeyboardInput: (callback: (data: any) => void) => void;
            startGame: (config: any) => Promise<void>;
            stopGame: () => Promise<void>;
            getKeyboards: () => Promise<any[]>;
        };
    }
}