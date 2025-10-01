import { GameConfig } from './GameConfig';
import { DifficultyLevel, WordCategory } from '../../shared/types/GameConfig';

describe('GameConfig', () => {
  describe('constructor', () => {
    it('デフォルト値で設定を作成できる', () => {
      const config = new GameConfig();
      
      expect(config.teamCount).toBe(2);
      expect(config.difficulty).toBe('easy');
      expect(config.gameDuration).toBe(60);
      expect(config.wordCategory).toBe('mixed');
      expect(config.teamSettings).toHaveLength(2);
      expect(config.soundSettings.masterVolume).toBe(0.7);
      expect(config.name).toContain('設定');
    });

    it('カスタム設定で設定を作成できる', () => {
      const customConfig = {
        teamCount: 4,
        difficulty: 'hard' as DifficultyLevel,
        gameDuration: 120,
        wordCategory: 'animals' as WordCategory,
        name: 'テスト設定'
      };

      const config = new GameConfig(customConfig);
      
      expect(config.teamCount).toBe(4);
      expect(config.difficulty).toBe('hard');
      expect(config.gameDuration).toBe(120);
      expect(config.wordCategory).toBe('animals');
      expect(config.name).toBe('テスト設定');
      expect(config.teamSettings).toHaveLength(4);
    });
  });

  describe('updateTeamCount', () => {
    it('チーム数を増加できる', () => {
      const config = new GameConfig();
      const updated = config.updateTeamCount(4);
      
      expect(updated.teamCount).toBe(4);
      expect(updated.teamSettings).toHaveLength(4);
      expect(updated.teamSettings[3].name).toBe('チーム 4');
    });

    it('チーム数を減少できる', () => {
      const config = new GameConfig({ teamCount: 6 });
      const updated = config.updateTeamCount(3);
      
      expect(updated.teamCount).toBe(3);
      expect(updated.teamSettings).toHaveLength(3);
    });

    it('無効なチーム数でエラーが発生する', () => {
      const config = new GameConfig();
      
      expect(() => config.updateTeamCount(1)).toThrow('チーム数は2-8の範囲で設定してください');
      expect(() => config.updateTeamCount(9)).toThrow('チーム数は2-8の範囲で設定してください');
    });
  });

  describe('updateDifficulty', () => {
    it('難易度を変更できる', () => {
      const config = new GameConfig();
      const updated = config.updateDifficulty('hard');
      
      expect(updated.difficulty).toBe('hard');
    });
  });

  describe('updateGameDuration', () => {
    it('ゲーム時間を変更できる', () => {
      const config = new GameConfig();
      const updated = config.updateGameDuration(180);
      
      expect(updated.gameDuration).toBe(180);
    });

    it('無効なゲーム時間でエラーが発生する', () => {
      const config = new GameConfig();
      
      expect(() => config.updateGameDuration(20)).toThrow('ゲーム時間は30-300秒の範囲で設定してください');
      expect(() => config.updateGameDuration(400)).toThrow('ゲーム時間は30-300秒の範囲で設定してください');
    });
  });

  describe('updateTeamName', () => {
    it('チーム名を変更できる', () => {
      const config = new GameConfig();
      const updated = config.updateTeamName(1, 'みかんチーム');
      
      expect(updated.teamSettings[0].name).toBe('みかんチーム');
    });

    it('存在しないチームでも処理が完了する', () => {
      const config = new GameConfig();
      const updated = config.updateTeamName(999, 'テストチーム');
      
      // 元の設定は変更されない
      expect(updated.teamSettings[0].name).toBe('チーム 1');
    });
  });

  describe('updateWordCategory', () => {
    it('お題カテゴリを変更できる', () => {
      const config = new GameConfig();
      const updated = config.updateWordCategory('animals');
      
      expect(updated.wordCategory).toBe('animals');
    });
  });

  describe('updateSoundSettings', () => {
    it('音響設定を部分的に更新できる', () => {
      const config = new GameConfig();
      const updated = config.updateSoundSettings({
        masterVolume: 0.5,
        soundEffectsEnabled: false
      });
      
      expect(updated.soundSettings.masterVolume).toBe(0.5);
      expect(updated.soundSettings.soundEffectsEnabled).toBe(false);
      expect(updated.soundSettings.typingSoundEnabled).toBe(true); // 変更されない
    });
  });

  describe('updateName', () => {
    it('設定名を変更できる', () => {
      const config = new GameConfig();
      const updated = config.updateName('新しい設定名');
      
      expect(updated.name).toBe('新しい設定名');
    });

    it('空の設定名でエラーが発生する', () => {
      const config = new GameConfig();
      
      expect(() => config.updateName('')).toThrow('設定名は必須です');
      expect(() => config.updateName('   ')).toThrow('設定名は必須です');
    });
  });

  describe('isValid', () => {
    it('有効な設定でtrueを返す', () => {
      const config = new GameConfig();
      
      expect(config.isValid()).toBe(true);
    });

    it('無効な設定でfalseを返す', () => {
      // 無効な設定を強制的に作成（normallyは constructor で検証される）
      const invalidConfig = new GameConfig();
      // privateメンバーを直接変更してテスト（実際のケースでは起こりにくい）
      (invalidConfig as any).config.teamCount = 10;
      
      expect(invalidConfig.isValid()).toBe(false);
    });
  });

  describe('isReadyForGame', () => {
    it('キーボード割り当て不足で準備未完了を返す', () => {
      const config = new GameConfig({ teamCount: 3 });
      const result = config.isReadyForGame();
      
      expect(result.ready).toBe(false);
      expect(result.issues).toContain('3チームに対してキーボードが0台しか割り当てられていません');
    });

    it('十分なキーボード割り当てで準備完了を返す', () => {
      const config = new GameConfig({
        teamCount: 2,
        keyboardAssignments: [
          {
            keyboardId: 'kb1',
            keyboardName: 'キーボード1',
            assignedTeamId: 1,
            connected: true
          },
          {
            keyboardId: 'kb2', 
            keyboardName: 'キーボード2',
            assignedTeamId: 2,
            connected: true
          }
        ]
      });
      
      const result = config.isReadyForGame();
      expect(result.ready).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('clone', () => {
    it('設定のクローンを作成できる', () => {
      const original = new GameConfig({ teamCount: 4, name: 'オリジナル' });
      const cloned = original.clone();
      
      expect(cloned.teamCount).toBe(original.teamCount);
      expect(cloned.name).toBe(original.name);
      expect(cloned).not.toBe(original);
    });
  });

  describe('toPlainObject', () => {
    it('プレーンオブジェクトを取得できる', () => {
      const config = new GameConfig({ name: 'テスト設定' });
      const plain = config.toPlainObject();
      
      expect(plain.name).toBe('テスト設定');
      expect(typeof plain).toBe('object');
    });
  });

  describe('validation', () => {
    it('無効な音量設定でエラーが発生する', () => {
      expect(() => new GameConfig({
        soundSettings: {
          masterVolume: 1.5,
          soundEffectsEnabled: true,
          typingSoundEnabled: true,
          backgroundMusicEnabled: false
        }
      })).toThrow('音量は0.0-1.0の範囲で設定してください');
    });

    it('チーム設定とチーム数の不整合でエラーが発生する', () => {
      expect(() => new GameConfig({
        teamCount: 3,
        teamSettings: [{
          id: 1,
          name: 'チーム1',
          color: '#ff6b6b',
          assignedKeyboardId: undefined
        }] // チーム数3に対して1つしかない
      })).toThrow('チーム設定の数がチーム数と一致しません');
    });
  });
});