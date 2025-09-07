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