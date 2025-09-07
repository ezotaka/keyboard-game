# Keyboard Game 開発方針

## プロジェクト概要
保育園児向け複数キーボード対応タイピングゲーム

## 開発方針

### アーキテクチャ
- **ドメイン駆動設計 (DDD)**: ビジネスロジックをドメインモデルに集約
- **クリーンアーキテクチャ**: 依存関係の方向を制御し、ドメインを中心とした設計
- **テスト駆動開発 (TDD)**: テストファーストでの開発

### アーキテクチャ構成

```
src/
├── domain/                 # ドメイン層
│   ├── entities/          # エンティティ
│   ├── value-objects/     # 値オブジェクト
│   ├── repositories/      # リポジトリインターフェース
│   └── services/          # ドメインサービス
├── application/           # アプリケーション層
│   ├── use-cases/         # ユースケース
│   └── services/          # アプリケーションサービス
├── infrastructure/        # インフラストラクチャ層
│   ├── keyboard/          # キーボード検知実装
│   ├── persistence/       # データ永続化
│   └── adapters/          # 外部システム連携
├── presentation/          # プレゼンテーション層
│   ├── controllers/       # コントローラー
│   └── views/            # ビュー
└── shared/               # 共有
    ├── types/            # 型定義
    └── utils/            # ユーティリティ
```

### TDD開発サイクル
1. **Red**: 失敗するテストを書く
2. **Green**: テストを通すための最小限のコードを書く
3. **Refactor**: コードを改善する

### テスト戦略
- **Unit Tests**: 各ドメインエンティティ・ユースケースのテスト
- **Integration Tests**: 外部システム連携のテスト
- **E2E Tests**: エンドツーエンドのシナリオテスト

### ドメインモデル（予定）

#### エンティティ
- `Game`: ゲーム全体を管理
- `Team`: チーム情報と状態
- `Keyboard`: キーボードデバイス情報
- `Word`: お題単語

#### 値オブジェクト
- `TeamId`: チーム識別子
- `KeyboardId`: キーボード識別子
- `Score`: スコア
- `GameState`: ゲーム状態

#### ドメインサービス
- `KeyboardDetectionService`: キーボード検知
- `TeamAssignmentService`: チーム割り当て
- `GameProgressService`: ゲーム進行管理

### 開発順序
1. ドメインモデルの設計・テスト
2. ユースケースの実装・テスト
3. インフラストラクチャ層の実装
4. プレゼンテーション層の実装

### 技術スタック
- **Framework**: Electron + Node.js
- **Testing**: Jest
- **Type Safety**: TypeScript
- **キーボード検知**: node-hid

### 開発ルール
- すべての機能はテストファーストで開発
- ドメインロジックは外部依存を持たない
- 依存関係は内側（ドメイン）から外側（インフラ）へのみ
- インターフェースを通じた疎結合設計

## Git運用方針

### コミット方針
- **こまめなコミット**: 機能単位、テスト単位で細かくコミット
- **意味のあるコミットメッセージ**: 変更内容と理由を明確に記述
- **TDDサイクルでのコミット**: Red → Green → Refactor の各段階でコミット

### コミットメッセージ規約
```
<type>(<scope>): <subject>

<body>
```

**Type:**
- `feat`: 新機能
- `fix`: バグ修正
- `test`: テスト追加・修正
- `refactor`: リファクタリング
- `docs`: ドキュメント更新
- `style`: コードスタイル修正
- `chore`: その他（設定変更など）

**例:**
```
feat(domain): add Game entity with basic properties

- Add Game entity class
- Implement game state management
- Add unit tests for Game entity
```

### ブランチ戦略
- `main`: 安定版
- `develop`: 開発版
- `feature/*`: 機能開発
- `fix/*`: バグ修正

## サブエージェント活用方針

### 開発フェーズ別エージェント利用

#### Phase 1: プロジェクト基盤構築
- `project-orchestrator`: 全体統括
- `system-architect`: アーキテクチャ設計
- `cicd-builder`: 開発環境構築

#### Phase 2: キーボード検知システム
- `api-designer`: インターフェース設計
- `test-suite-generator`: テストケース生成
- `code-reviewer`: コード品質チェック

#### Phase 3: ゲームロジック実装
- `requirements-analyst`: 要件分析
- `user-story-generator`: ユーザーストーリー作成
- `performance-optimizer`: パフォーマンス最適化

#### Phase 4: ユーザーインターフェース
- `interface-designer`: UI/UX設計
- `code-refactoring-specialist`: コード改善
- `test-suite-generator`: UI テスト生成

#### Phase 5: 設定・管理機能
- `business-process-analyst`: 業務フロー分析
- `documentation-generator`: ドキュメント生成
- `qa-coordinator`: 品質保証

#### Phase 6: テスト・最適化
- `security-analyzer`: セキュリティチェック
- `performance-optimizer`: 最適化
- `deployment-ops-manager`: デプロイ管理

### エージェント連携ルール
1. 各フェーズ開始時に適切なエージェントを選択
2. エージェント間での成果物の引き継ぎを明確化
3. 品質チェック（code-reviewer）を各段階で実施
4. ドキュメント更新（documentation-generator）を定期実施

## Linear Issue管理方針

### Issue作業ルール
- **すべての作業はIssueベース**: 機能開発、バグ修正、リファクタリングなど全ての作業は必ずLinear Issueを作成または更新
- **作業開始前**: 該当IssueをIn Progress状態に更新
- **作業完了後**: Issue内容を更新し、完了状態に変更
- **サブタスクの管理**: 大きなIssueは適切にサブタスクに分割

### Issue作成・更新タイミング

#### 作業開始時
1. **新規作業**: 新しいIssueを作成
2. **既存Issue**: ステータスを「In Progress」に更新
3. **詳細な作業計画**: タスクリストを詳細化
4. **見積もり更新**: 必要に応じて作業時間を見直し

#### 作業中
1. **進捗更新**: 重要な進捗はIssueコメントで記録
2. **問題発生**: ブロッカーや課題をコメントで報告
3. **方針変更**: 実装方針が変わった場合は理由と共に記録

#### 作業完了時
1. **成果物記録**: 実装内容、テスト結果を記載
2. **ステータス更新**: 完了状態に変更
3. **関連Issue**: 依存関係のあるIssueを更新
4. **次のアクション**: フォローアップが必要な場合は新Issue作成

### Issue記録内容

#### 必須項目
- **Title**: 明確で具体的なタイトル
- **Description**: 目的、要件、受け入れ条件
- **Labels**: 適切なラベル付け（feature, bug, refactor等）
- **Priority**: 優先度設定
- **Assignee**: 担当者（通常はClaude/自分）

#### 推奨項目
- **Tasks**: チェックリスト形式のタスク分割
- **Links**: 関連Issue、ドキュメント、PRへのリンク
- **Comments**: 作業ログ、決定事項、課題等

### Issue活用例

#### 開発作業例
```
Title: feat(domain): implement Game entity with TDD

Description:
## 目的
ゲームドメインエンティティをTDDで実装

## タスク
- [ ] Game entity の仕様設計
- [ ] 失敗するテストケース作成 (Red)
- [ ] Game entity 実装 (Green)
- [ ] リファクタリング (Refactor)
- [ ] 追加テストケース作成

## 受け入れ条件
- [ ] 全テストがパス
- [ ] コードカバレッジ100%
- [ ] Clean Architecture準拠
```

#### バグ修正例
```
Title: fix(keyboard): keyboard detection not working on macOS

Description:
## 問題
macOSでキーボード検知が動作しない

## 調査結果
[調査内容を記載]

## 修正方針
[修正方針を記載]

## テスト計画
[テスト方法を記載]
```

### 自動化連携
- **Git連携**: コミットメッセージにIssue IDを含める（例: `feat(domain): add Game entity [DEV-15]`）
- **PR連携**: Pull RequestとIssueを関連付け
- **進捗追跡**: Issue完了率でプロジェクト進捗を可視化