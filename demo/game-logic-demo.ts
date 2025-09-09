#!/usr/bin/env npx ts-node

import { Game } from '../src/domain/entities/Game';
import { Team } from '../src/domain/entities/Team';
import { Player } from '../src/domain/entities/Player';
import { Word, WordDifficulty } from '../src/domain/entities/Word';
import { Keyboard } from '../src/domain/entities/Keyboard';
import { TeamId } from '../src/domain/value-objects/TeamId';
import { PlayerId } from '../src/domain/value-objects/PlayerId';
import { KeyboardId } from '../src/domain/value-objects/KeyboardId';
import { Score } from '../src/domain/value-objects/Score';
import { InputJudgmentService } from '../src/domain/services/InputJudgmentService';
import { WordManagementService } from '../src/domain/services/WordManagementService';
import { TeamAssignmentService } from '../src/domain/services/TeamAssignmentService';
import { KeyboardConnectionState } from '../src/shared/types/keyboard.types';

console.log('🎮 キーボードゲーム ドメインロジック デモ');
console.log('='.repeat(50));

// 1. キーボードの作成
console.log('\n📱 1. キーボードデバイスを作成');
const keyboards = [
  new Keyboard({
    id: new KeyboardId('keyboard-1'),
    devicePath: '/dev/input/event1',
    vendorId: 1234,
    productId: 5678,
    manufacturer: 'Apple',
    product: 'Magic Keyboard',
    connectionState: KeyboardConnectionState.CONNECTED
  }),
  new Keyboard({
    id: new KeyboardId('keyboard-2'),
    devicePath: '/dev/input/event2',
    vendorId: 1234,
    productId: 5679,
    manufacturer: 'Logitech',
    product: 'K120',
    connectionState: KeyboardConnectionState.CONNECTED
  })
];

keyboards.forEach(keyboard => {
  console.log(`   ✓ ${keyboard.getManufacturer()} ${keyboard.getProduct()}`);
});

// 2. プレイヤーの作成
console.log('\n👥 2. プレイヤーを作成');
const players = [
  new Player({
    id: new PlayerId('player-1'),
    teamId: TeamId.create(1),
    keyboardId: keyboards[0].getId(),
    name: 'たろう'
  }),
  new Player({
    id: new PlayerId('player-2'),
    teamId: TeamId.create(2),
    keyboardId: keyboards[1].getId(),
    name: 'はなこ'
  })
];

players.forEach(player => {
  console.log(`   ✓ ${player.getName()} (チーム${player.getTeamId().getValue()})`);
});

// 3. チームの作成
console.log('\n🏆 3. チームを作成');
const teams = [
  new Team({
    id: TeamId.create(1),
    name: 'チーム あか',
    players: [players[0]]
  }),
  new Team({
    id: TeamId.create(2),
    name: 'チーム あお',
    players: [players[1]]
  })
];

teams.forEach(team => {
  console.log(`   ✓ ${team.getName()} (プレイヤー数: ${team.getPlayerCount()})`);
});

// 4. 単語の準備
console.log('\n📝 4. 単語管理システム');
const wordService = new WordManagementService();
const words = [
  new Word({ text: 'ねこ', difficulty: WordDifficulty.EASY, category: 'animals' }),
  new Word({ text: 'いぬ', difficulty: WordDifficulty.EASY, category: 'animals' }),
  new Word({ text: 'ひこうき', difficulty: WordDifficulty.MEDIUM, category: 'transport' }),
  new Word({ text: 'とうきょう', difficulty: WordDifficulty.MEDIUM, category: 'places' }),
  new Word({ text: 'むずかしいことば', difficulty: WordDifficulty.HARD, category: 'abstract' })
];

console.log('   利用可能な単語:');
words.forEach(word => {
  console.log(`     • ${word.getText()} (${word.getDifficulty()}, ${word.getCharacterCount()}文字)`);
});

const targetWord = wordService.selectWordByDifficulty(words, WordDifficulty.EASY);
console.log(`   ✓ 選択された単語: "${targetWord.getText()}" (${targetWord.getDifficulty()})`);

// 5. ゲームの作成
console.log('\n🎯 5. ゲームを開始');
const game = new Game({ 
  teamIds: teams.map(team => team.getId()),
  targetScore: new Score(100),
  currentWord: targetWord
});
game.start();
console.log(`   ✓ ゲーム状態: ${game.getState()}`);
console.log(`   ✓ 参加チーム数: ${game.getTeamCount()}`);

// 6. 入力判定サービスのデモ
console.log('\n⌨️  6. 入力判定システム');
const inputService = new InputJudgmentService();

// プログレスコールバックを設定
inputService.onProgressUpdate((progress) => {
  console.log(`   📊 ${players.find(p => p.getId().getValue() === progress.playerId.getValue())?.getName()}: 進捗 ${Math.round(progress.progress * 100)}%`);
});

// 完了コールバックを設定  
inputService.onCompletion((result) => {
  const playerName = players.find(p => p.getId().getValue() === result.playerId.getValue())?.getName();
  console.log(`   🎉 ${playerName}が完了! 時間: ${result.completionTime}ms ${result.isWinner ? '(勝者!)' : ''}`);
});

console.log(`   対象単語: "${targetWord.getText()}"`);
console.log('   入力シミュレーション開始...');

// プレイヤー1の入力をシミュレート
console.log('\n   👤 たろうの入力:');
let result1 = inputService.processInput('ね', targetWord, players[0]);
console.log(`     入力 "ね" → 正解: ${result1.isCorrect}, 進捗: ${Math.round(result1.progress * 100)}%`);

result1 = inputService.processInput('こ', targetWord, players[0]);
console.log(`     入力 "こ" → 正解: ${result1.isCorrect}, 完了: ${result1.isComplete}`);

// プレイヤー2の入力をシミュレート（少し遅れて）
console.log('\n   👤 はなこの入力:');
let result2 = inputService.processInput('ね', targetWord, players[1]);
console.log(`     入力 "ね" → 正解: ${result2.isCorrect}, 進捗: ${Math.round(result2.progress * 100)}%`);

result2 = inputService.processInput('い', targetWord, players[1]); // 間違い
console.log(`     入力 "い" → 正解: ${result2.isCorrect}, エラー数: ${result2.errors}`);

result2 = inputService.processInput('こ', targetWord, players[1]);
console.log(`     入力 "こ" → 正解: ${result2.isCorrect}, 完了: ${result2.isComplete}`);

// 7. 結果とランキング
console.log('\n🏅 7. 結果とランキング');
const rankings = inputService.getCurrentRankings(targetWord);
console.log('   最終ランキング:');
rankings.forEach((progress, index) => {
  const playerName = players.find(p => p.getId().getValue() === progress.playerId.getValue())?.getName();
  const status = progress.isComplete ? `完了 (${progress.completionTime}ms)` : `未完了 (${Math.round(progress.progress * 100)}%)`;
  console.log(`     ${index + 1}位: ${playerName} - ${status}, エラー: ${progress.errors}`);
});

const winner = inputService.getWinner(targetWord);
if (winner) {
  const winnerName = players.find(p => p.getId().getValue() === winner.playerId.getValue())?.getName();
  console.log(`   🎊 勝者: ${winnerName} (完了時間: ${winner.completionTime}ms)`);
}

// 8. 統計情報
console.log('\n📈 8. プレイヤー統計');
players.forEach(player => {
  const stats = inputService.getPlayerStatistics(targetWord, player);
  console.log(`   ${player.getName()}:`);
  console.log(`     正解率: ${Math.round(stats.accuracy * 100)}%`);
  console.log(`     エラー数: ${stats.errorCount}`);
  console.log(`     正解文字数: ${stats.correctCharacters}`);
  console.log(`     WPM: ${Math.round(stats.wordsPerMinute * 100) / 100}`);
});

// 9. チーム結果
console.log('\n🏆 9. チーム結果');
teams.forEach(team => {
  const teamResult = inputService.getTeamResult(targetWord, team);
  console.log(`   ${team.getName()}:`);
  console.log(`     完了プレイヤー: ${teamResult.completedPlayers}/${teamResult.totalPlayers}`);
  console.log(`     チーム完了: ${teamResult.isTeamComplete ? 'はい' : 'いいえ'}`);
});

const winningTeam = inputService.getWinningTeam(targetWord, teams);
if (winningTeam) {
  const teamName = teams.find(t => t.getId().getValue() === winningTeam.teamId.getValue())?.getName();
  console.log(`   🏆 勝利チーム: ${teamName} (完了時間: ${winningTeam.completionTime}ms)`);
}

// 10. チーム管理サービス
console.log('\n🔄 10. チーム管理システム');
const teamService = new TeamAssignmentService();
const isReady = teamService.validateTeamsForGame(teams);
console.log(`   ゲーム準備完了: ${isReady ? 'はい' : 'いいえ'}`);

const assignments = teamService.assignKeyboardsToTeams(keyboards, teams);
console.log('   キーボード割り当て:');
assignments.forEach((assignedKeyboards, teamKey) => {
  const team = teams.find(t => `team-${t.getId().getValue()}` === teamKey);
  assignedKeyboards.forEach(keyboard => {
    console.log(`     ${team?.getName()} ← ${keyboard.getManufacturer()} ${keyboard.getProduct()}`);
  });
});

console.log('\n✨ デモ完了!');
console.log('='.repeat(50));