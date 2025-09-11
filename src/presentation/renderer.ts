import { SoundManager, SoundType } from './sounds/sound-manager';
import { ISoundManager } from './sounds/sound-manager-interface';
import { NullSoundManager } from './sounds/null-sound-manager';
import { GameConfig } from '../domain/entities/GameConfig.js';
import { GameConfigRepository } from '../domain/repositories/GameConfigRepository.js';
import { DifficultyLevel, WordCategory } from '../shared/types/GameConfig.js';
import '../types/window.d.ts';

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
    private gameTimer: number | null = null;
    private soundManager: ISoundManager;
    private currentConfig: GameConfig | null = null; // 現在の設定
    private configRepository: GameConfigRepository | null = null; // 設定リポジトリ
    
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
        
        // 設定リポジトリの初期化
        this.initializeConfigRepository();
        
        this.initializeUI();
        this.setupEventListeners();
        
        // キーボード読み込みを少し遅延させる
        setTimeout(() => {
            this.loadKeyboards();
        }, 100);
    }

    private async initializeConfigRepository(): Promise<void> {
        try {
            // 動的インポートでリポジトリを読み込み
            const { LocalStorageGameConfigRepository } = await import('../infrastructure/persistence/LocalStorageGameConfigRepository.js');
            this.configRepository = new LocalStorageGameConfigRepository();
            
            // デフォルト設定をロード
            await this.loadDefaultConfig();
        } catch (error) {
            console.error('設定リポジトリの初期化に失敗:', error);
        }
    }

    private async loadDefaultConfig(): Promise<void> {
        try {
            if (this.configRepository) {
                const { GameConfig } = await import('../domain/entities/GameConfig.js');
                this.currentConfig = new GameConfig();
                this.applyConfigToUI();
            }
        } catch (error) {
            console.error('デフォルト設定の読み込みに失敗:', error);
        }
    }

    private applyConfigToUI(): void {
        if (!this.currentConfig) return;

        // 基本設定の適用
        const configNameInput = document.getElementById('config-name') as HTMLInputElement;
        const teamCountSelect = document.getElementById('team-count') as HTMLSelectElement;
        const difficultySelect = document.getElementById('difficulty') as HTMLSelectElement;
        const gameDurationSelect = document.getElementById('game-duration') as HTMLSelectElement;
        const wordCategorySelect = document.getElementById('word-category') as HTMLSelectElement;
        
        if (configNameInput) configNameInput.value = this.currentConfig.name;
        if (teamCountSelect) teamCountSelect.value = this.currentConfig.teamCount.toString();
        if (difficultySelect) difficultySelect.value = this.currentConfig.difficulty;
        if (gameDurationSelect) gameDurationSelect.value = this.currentConfig.gameDuration.toString();
        if (wordCategorySelect) wordCategorySelect.value = this.currentConfig.wordCategory;

        // 音響設定の適用
        const masterVolumeSlider = document.getElementById('master-volume') as HTMLInputElement;
        const soundEffectsCheckbox = document.getElementById('sound-effects') as HTMLInputElement;
        const typingSoundCheckbox = document.getElementById('typing-sound') as HTMLInputElement;
        const backgroundMusicCheckbox = document.getElementById('background-music') as HTMLInputElement;
        
        const soundSettings = this.currentConfig.soundSettings;
        if (masterVolumeSlider) {
            masterVolumeSlider.value = (soundSettings.masterVolume * 100).toString();
            this.updateVolumeDisplay();
        }
        if (soundEffectsCheckbox) soundEffectsCheckbox.checked = soundSettings.soundEffectsEnabled;
        if (typingSoundCheckbox) typingSoundCheckbox.checked = soundSettings.typingSoundEnabled;
        if (backgroundMusicCheckbox) backgroundMusicCheckbox.checked = soundSettings.backgroundMusicEnabled;

        // チーム設定とキーボード割り当ての更新
        this.updateTeamAssignment();
        this.renderTeamSettings();
        this.renderKeyboardAssignment();
    }

    private renderTeamSettings(): void {
        const teamSettingsContainer = document.getElementById('team-settings');
        if (!teamSettingsContainer || !this.currentConfig) return;

        const teamSettings = this.currentConfig.teamSettings;
        
        teamSettingsContainer.innerHTML = teamSettings.map((team: any) => `
            <div class="team-setting-item">
                <div class="team-header">
                    <div class="team-color-indicator" style="background-color: ${team.color}"></div>
                    <input type="text" 
                           class="team-name-input" 
                           value="${team.name}"
                           data-team-id="${team.id}"
                           placeholder="チーム名を入力">
                </div>
                <div class="team-assignment">
                    <label>割り当てキーボード:</label>
                    <select class="keyboard-assignment-select" data-team-id="${team.id}">
                        <option value="">キーボードを選択</option>
                        ${this.keyboards.map(kb => `
                            <option value="${kb.id}" ${team.assignedKeyboardId === kb.id ? 'selected' : ''}>
                                ${kb.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `).join('');

        // イベントリスナーを追加
        this.setupTeamSettingsEventListeners();
    }

    private renderKeyboardAssignment(): void {
        const keyboardAssignmentContainer = document.getElementById('keyboard-assignment');
        const keyboardCountElement = document.getElementById('keyboard-count');
        
        if (!keyboardAssignmentContainer) return;

        // キーボード数の更新
        if (keyboardCountElement) {
            keyboardCountElement.textContent = this.keyboards.length.toString();
        }

        // キーボード一覧の表示
        keyboardAssignmentContainer.innerHTML = this.keyboards.map(keyboard => {
            const assignedTeam = this.currentConfig?.teamSettings.find((team: any) => 
                team.assignedKeyboardId === keyboard.id
            );
            
            return `
                <div class="keyboard-item">
                    <div class="keyboard-info">
                        <span class="keyboard-name">${keyboard.name}</span>
                        <span class="keyboard-status ${keyboard.connected ? 'connected' : 'disconnected'}">
                            ${keyboard.connected ? '接続中' : '切断'}
                        </span>
                        ${assignedTeam ? `
                            <span class="keyboard-status assigned">
                                ${assignedTeam.name}に割り当て済み
                            </span>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    private setupTeamSettingsEventListeners(): void {
        // チーム名変更イベント
        document.querySelectorAll('.team-name-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const teamId = parseInt(target.dataset.teamId || '0');
                this.updateTeamName(teamId, target.value);
            });
        });

        // キーボード割り当て変更イベント
        document.querySelectorAll('.keyboard-assignment-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const target = e.target as HTMLSelectElement;
                const teamId = parseInt(target.dataset.teamId || '0');
                this.updateKeyboardAssignment(teamId, target.value);
            });
        });
    }

    private updateTeamName(teamId: number, newName: string): void {
        if (!this.currentConfig) return;
        
        try {
            this.currentConfig = this.currentConfig.updateTeamName(teamId, newName);
            this.updateSetupStatus();
        } catch (error) {
            console.error('チーム名の更新に失敗:', error);
        }
    }

    private updateKeyboardAssignment(teamId: number, keyboardId: string): void {
        if (!this.currentConfig) return;

        try {
            // 既存の割り当てをクリア
            const updatedAssignments = this.keyboards.map(kb => ({
                keyboardId: kb.id,
                keyboardName: kb.name,
                assignedTeamId: kb.id === keyboardId ? teamId : (
                    this.currentConfig?.keyboardAssignments.find((a: any) => a.keyboardId === kb.id)?.assignedTeamId !== teamId 
                        ? this.currentConfig?.keyboardAssignments.find((a: any) => a.keyboardId === kb.id)?.assignedTeamId 
                        : undefined
                ),
                connected: kb.connected
            }));

            if (this.currentConfig) {
                this.currentConfig = this.currentConfig.updateKeyboardAssignments(updatedAssignments);
            }
            this.renderTeamSettings();
            this.renderKeyboardAssignment();
            this.updateSetupStatus();
        } catch (error) {
            console.error('キーボード割り当ての更新に失敗:', error);
        }
    }

    private updateVolumeDisplay(): void {
        const volumeSlider = document.getElementById('master-volume') as HTMLInputElement;
        const volumeDisplay = document.getElementById('volume-display');
        
        if (volumeSlider && volumeDisplay) {
            volumeDisplay.textContent = `${volumeSlider.value}%`;
        }
    }

    private updateSetupStatus(): void {
        const setupStatus = document.getElementById('setup-status');
        if (!setupStatus || !this.currentConfig) return;

        const validation = this.currentConfig.isReadyForGame();
        
        setupStatus.className = 'setup-status';
        if (validation.ready) {
            setupStatus.classList.add('ready');
            setupStatus.textContent = 'ゲーム開始準備完了！';
        } else if (validation.issues.length > 0) {
            setupStatus.classList.add('warning');
            setupStatus.textContent = validation.issues[0];
        } else {
            setupStatus.classList.add('error');
            setupStatus.textContent = '設定を確認してください';
        }
    }

    private async saveCurrentConfig(): Promise<void> {
        if (!this.currentConfig || !this.configRepository) {
            alert('設定を保存できません');
            return;
        }

        try {
            const configNameInput = document.getElementById('config-name') as HTMLInputElement;
            if (configNameInput && configNameInput.value.trim()) {
                this.currentConfig = this.currentConfig.updateName(configNameInput.value.trim());
            }

            const { GameConfigManagementUseCase } = await import('../application/use-cases/GameConfigManagementUseCase.js');
            const useCase = new GameConfigManagementUseCase(this.configRepository);
            
            await useCase.saveConfig(this.currentConfig);
            alert('設定を保存しました');
        } catch (error) {
            console.error('設定の保存に失敗:', error);
            alert('設定の保存に失敗しました');
        }
    }

    private async loadConfig(): Promise<void> {
        if (!this.configRepository) {
            alert('設定を読み込めません');
            return;
        }

        try {
            const { GameConfigManagementUseCase } = await import('../application/use-cases/GameConfigManagementUseCase.js');
            const useCase = new GameConfigManagementUseCase(this.configRepository);
            
            const configs = await useCase.getAllConfigs();
            
            if (configs.length === 0) {
                alert('保存された設定がありません');
                return;
            }

            // 簡単な選択UI（今後改善可能）
            const configNames = configs.map((config, index) => 
                `${index + 1}. ${config.config.name} (${new Date(config.config.createdAt).toLocaleDateString()})`
            ).join('\n');
            
            const selection = prompt(`読み込む設定を選択してください:\n${configNames}\n\n数字を入力:`);
            const selectedIndex = parseInt(selection || '0') - 1;
            
            if (selectedIndex >= 0 && selectedIndex < configs.length) {
                const { GameConfig } = await import('../domain/entities/GameConfig.js');
                this.currentConfig = new GameConfig(configs[selectedIndex].config);
                this.applyConfigToUI();
                
                // 使用統計を更新
                await useCase.useConfigForGame(configs[selectedIndex].id);
                alert('設定を読み込みました');
            }
        } catch (error) {
            console.error('設定の読み込みに失敗:', error);
            alert('設定の読み込みに失敗しました');
        }
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
        teamCountSelect?.addEventListener('change', () => this.onTeamCountChange());

        // 設定値変更イベント
        const difficultySelect = document.getElementById('difficulty') as HTMLSelectElement;
        difficultySelect?.addEventListener('change', () => this.onConfigChange());

        const gameDurationSelect = document.getElementById('game-duration') as HTMLSelectElement;
        gameDurationSelect?.addEventListener('change', () => this.onConfigChange());

        const wordCategorySelect = document.getElementById('word-category') as HTMLSelectElement;
        wordCategorySelect?.addEventListener('change', () => this.onConfigChange());

        // 音響設定イベント
        const masterVolumeSlider = document.getElementById('master-volume') as HTMLInputElement;
        masterVolumeSlider?.addEventListener('input', () => {
            this.updateVolumeDisplay();
            this.onSoundSettingsChange();
        });

        const soundEffectsCheckbox = document.getElementById('sound-effects') as HTMLInputElement;
        soundEffectsCheckbox?.addEventListener('change', () => this.onSoundSettingsChange());

        const typingSoundCheckbox = document.getElementById('typing-sound') as HTMLInputElement;
        typingSoundCheckbox?.addEventListener('change', () => this.onSoundSettingsChange());

        const backgroundMusicCheckbox = document.getElementById('background-music') as HTMLInputElement;
        backgroundMusicCheckbox?.addEventListener('change', () => this.onSoundSettingsChange());

        // 設定保存・読み込みボタン
        const saveConfigBtn = document.getElementById('save-config-btn') as HTMLButtonElement;
        saveConfigBtn?.addEventListener('click', () => this.saveCurrentConfig());

        const loadConfigBtn = document.getElementById('load-config-btn') as HTMLButtonElement;
        loadConfigBtn?.addEventListener('click', () => this.loadConfig());

        // キーボード再検索ボタン
        const refreshKeyboardsBtn = document.getElementById('refresh-keyboards-btn') as HTMLButtonElement;
        refreshKeyboardsBtn?.addEventListener('click', () => this.loadKeyboards());

        // キーボード入力イベント
        if (window.keyboardGameAPI) {
            window.keyboardGameAPI.onKeyboardInput((data) => this.handleKeyboardInput(data));
        }
    }

    private onTeamCountChange(): void {
        const teamCountSelect = document.getElementById('team-count') as HTMLSelectElement;
        if (!teamCountSelect || !this.currentConfig) return;

        const newTeamCount = parseInt(teamCountSelect.value);
        try {
            this.currentConfig = this.currentConfig.updateTeamCount(newTeamCount);
            this.updateTeamAssignment();
            this.renderTeamSettings();
            this.renderKeyboardAssignment();
            this.updateSetupStatus();
        } catch (error) {
            console.error('チーム数の変更に失敗:', error);
        }
    }

    private onConfigChange(): void {
        if (!this.currentConfig) return;

        try {
            const difficultySelect = document.getElementById('difficulty') as HTMLSelectElement;
            const gameDurationSelect = document.getElementById('game-duration') as HTMLSelectElement;
            const wordCategorySelect = document.getElementById('word-category') as HTMLSelectElement;

            if (difficultySelect && this.currentConfig) {
                this.currentConfig = this.currentConfig.updateDifficulty(difficultySelect.value as DifficultyLevel);
            }
            if (gameDurationSelect) {
                this.currentConfig = this.currentConfig.updateGameDuration(parseInt(gameDurationSelect.value));
            }
            if (wordCategorySelect && this.currentConfig) {
                this.currentConfig = this.currentConfig.updateWordCategory(wordCategorySelect.value as WordCategory);
            }

            this.updateSetupStatus();
        } catch (error) {
            console.error('設定の変更に失敗:', error);
        }
    }

    private onSoundSettingsChange(): void {
        if (!this.currentConfig) return;

        try {
            const masterVolumeSlider = document.getElementById('master-volume') as HTMLInputElement;
            const soundEffectsCheckbox = document.getElementById('sound-effects') as HTMLInputElement;
            const typingSoundCheckbox = document.getElementById('typing-sound') as HTMLInputElement;
            const backgroundMusicCheckbox = document.getElementById('background-music') as HTMLInputElement;

            const soundSettings = {
                masterVolume: masterVolumeSlider ? parseFloat(masterVolumeSlider.value) / 100 : 0.7,
                soundEffectsEnabled: soundEffectsCheckbox ? soundEffectsCheckbox.checked : true,
                typingSoundEnabled: typingSoundCheckbox ? typingSoundCheckbox.checked : true,
                backgroundMusicEnabled: backgroundMusicCheckbox ? backgroundMusicCheckbox.checked : false
            };

            this.currentConfig = this.currentConfig.updateSoundSettings(soundSettings);
        } catch (error) {
            console.error('音響設定の変更に失敗:', error);
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
                this.renderKeyboardAssignment();
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
                this.renderKeyboardAssignment();
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
            this.renderKeyboardAssignment();
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
        
        // キーボード割り当てをリセット
        this.keyboards.forEach(keyboard => {
            keyboard.assigned = false;
            keyboard.teamId = undefined;
        });

        // チーム数に基づいてキーボード割り当て
        this.keyboards.forEach((keyboard, index) => {
            if (index < teamCount) {
                keyboard.assigned = true;
                keyboard.teamId = index + 1;
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
            this.gameState.timeRemaining = this.currentConfig?.gameDuration || 60;
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
            
            // 簡単な正規化（英単語用）
            const normalizeText = (text: string): string => {
                return text.toLowerCase().trim();
            };

            const normalizedInput = normalizeText(team.currentInput);
            const normalizedTarget = normalizeText(this.gameState.currentWord);
            
            // 入力状態に応じてスタイル変更
            if (normalizedTarget.startsWith(normalizedInput)) {
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
        // 簡単な正規化（英単語用）
        const normalizeText = (text: string): string => {
            return text.toLowerCase().trim();
        };

        const normalizedInput = normalizeText(input);
        const normalizedTarget = normalizeText(this.gameState.currentWord);
        
        let correctLength = 0;
        for (let i = 0; i < Math.min(normalizedInput.length, normalizedTarget.length); i++) {
            if (normalizedInput[i] === normalizedTarget[i]) {
                correctLength++; 
            } else {
                break;
            }
        }
        return correctLength;
    }

    private checkWord(team: Team): void {
        // 簡単な正規化（英単語用）
        const normalizeText = (text: string): string => {
            return text.toLowerCase().trim();
        };

        const normalizedInput = normalizeText(team.currentInput);
        const normalizedTarget = normalizeText(this.gameState.currentWord);
        
        if (normalizedInput === normalizedTarget) {
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
        // 英単語カテゴリを定義（保育園児向け簡単な単語）
        const wordCategories: Record<string, string[]> = {
            animals: ['cat', 'dog', 'fish', 'bird', 'bear', 'lion', 'fox', 'pig'],
            foods: ['apple', 'banana', 'cake', 'milk', 'bread', 'rice', 'egg', 'meat'],
            colors: ['red', 'blue', 'green', 'yellow', 'pink', 'black', 'white', 'orange'],
            nature: ['sun', 'moon', 'star', 'tree', 'flower', 'water', 'wind', 'rain'],
            family: ['mom', 'dad', 'baby', 'family', 'home', 'love'],
            school: ['book', 'pen', 'chair', 'desk', 'bag', 'toy', 'game'],
            mixed: ['cat', 'dog', 'fish', 'bird', 'apple', 'cake', 'red', 'blue', 'sun', 'moon',
                   'book', 'toy', 'home', 'love', 'tree', 'water', 'happy', 'big', 'small', 'good']
        };

        const category = this.currentConfig?.wordCategory || 'mixed';
        const words = wordCategories[category] || wordCategories.mixed;
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
            timeRemaining: this.currentConfig?.gameDuration || 60,
            gameRunning: false
        };
        
        this.keyboards.forEach(kb => {
            kb.assigned = false;
            kb.teamId = undefined;
        });
        
        this.showScreen('setup');
        this.updateGameStatus('準備中');
        this.updateTeamAssignment();
        this.renderTeamSettings();
        this.renderKeyboardAssignment();
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
console.log('=== RENDERER.JS 読み込み開始 ===');
console.log('window.keyboardGameAPI:', window.keyboardGameAPI);
console.log('document.readyState:', document.readyState);

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

