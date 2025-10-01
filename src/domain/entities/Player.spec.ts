import { Player } from './Player';

describe('Player', () => {
  describe('constructor', () => {
    it('should create player with valid name', () => {
      const player = new Player('太郎');

      expect(player.name).toBe('太郎');
      expect(player.id).toBeDefined();
      expect(player.id.length).toBeGreaterThan(0);
      expect(player.createdAt).toBeDefined();
    });

    it('should create player with custom ID', () => {
      const customId = 'custom-player-id';
      const player = new Player('太郎', customId);

      expect(player.id).toBe(customId);
      expect(player.name).toBe('太郎');
    });

    it('should trim player name', () => {
      const player = new Player('  太郎  ');

      expect(player.name).toBe('太郎');
    });

    it('should throw error for empty name', () => {
      expect(() => new Player('')).toThrow('プレイヤー名は必須です');
      expect(() => new Player('   ')).toThrow('プレイヤー名は必須です');
    });

    it('should throw error for name too long', () => {
      const longName = 'あ'.repeat(21);

      expect(() => new Player(longName)).toThrow('プレイヤー名は20文字以内で入力してください');
    });

    it('should allow name with exactly 20 characters', () => {
      const maxLengthName = 'あ'.repeat(20);
      const player = new Player(maxLengthName);

      expect(player.name).toBe(maxLengthName);
    });
  });

  describe('updateName', () => {
    it('should update player name', () => {
      const player = new Player('太郎');
      const updatedPlayer = player.updateName('次郎');

      expect(updatedPlayer.name).toBe('次郎');
      expect(updatedPlayer.id).toBe(player.id); // IDは変更されない
      expect(updatedPlayer.createdAt).toBe(player.createdAt); // 作成日時も変更されない
    });

    it('should trim updated name', () => {
      const player = new Player('太郎');
      const updatedPlayer = player.updateName('  次郎  ');

      expect(updatedPlayer.name).toBe('次郎');
    });

    it('should throw error for empty updated name', () => {
      const player = new Player('太郎');

      expect(() => player.updateName('')).toThrow('プレイヤー名は必須です');
      expect(() => player.updateName('   ')).toThrow('プレイヤー名は必須です');
    });
  });

  describe('toPlainObject', () => {
    it('should return plain object representation', () => {
      const player = new Player('太郎', 'test-id');
      const plainObject = player.toPlainObject();

      expect(plainObject).toEqual({
        id: 'test-id',
        name: '太郎',
        createdAt: expect.any(String)
      });
    });
  });

  describe('fromPlainObject', () => {
    it('should create player from plain object', () => {
      const plainData = {
        id: 'test-id',
        name: '太郎',
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      const player = Player.fromPlainObject(plainData);

      expect(player.id).toBe('test-id');
      expect(player.name).toBe('太郎');
      expect(player.createdAt).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should validate plain object data', () => {
      const invalidData = {
        id: '',
        name: '太郎',
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      expect(() => Player.fromPlainObject(invalidData)).toThrow('プレイヤーIDは必須です');
    });
  });

  describe('createMultiple', () => {
    it('should create multiple players', () => {
      const names = ['太郎', '花子', '次郎'];
      const players = Player.createMultiple(names);

      expect(players).toHaveLength(3);
      expect(players[0].name).toBe('太郎');
      expect(players[1].name).toBe('花子');
      expect(players[2].name).toBe('次郎');

      // 各プレイヤーのIDがユニークかチェック
      const ids = players.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should create empty array for empty names', () => {
      const players = Player.createMultiple([]);

      expect(players).toHaveLength(0);
    });

    it('should throw error for invalid names', () => {
      const names = ['太郎', '', '次郎'];

      expect(() => Player.createMultiple(names)).toThrow('プレイヤー名は必須です');
    });
  });
});