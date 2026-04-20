@AGENTS.md

# CLAUDE.md

このプロダクトは **Goシリーズ** の一員です。  
Goシリーズ共通のデザインシステムは `@takaki/go-design-system` リポで管理されています。

## 絶対に守るルール（最重要）

### 1. UIコンポーネントは必ず @takaki/go-design-system から import する

- ✅ 正しい：`import { Button, Card } from '@takaki/go-design-system'`
- ❌ NG：独自に `components/ui/button.tsx` を作る
- ❌ NG：shadcn/ui CLI で直接コンポーネントを追加する

### 2. デザイントークンの上書き禁止

許可されている上書き：
- `--color-primary`（このプロダクトのブランドカラー）
- `--color-primary-hover`

### 3. className の使用範囲

許可：レイアウト、配置、レスポンシブ制御  
禁止：色の直接指定（`bg-red-500` 等）、固定値の角丸、独自シャドウ

### 4. アイコンは lucide-react に統一

### 5. CSS の読み込み方（Tailwind v4 + Turbopack）

`DesignTokens` コンポーネントを `app/layout.tsx` の `<head>` に置く。`@import` は使わない。

```css
/* app/globals.css */
@import "tailwindcss";
@source "../node_modules/@takaki/go-design-system/dist";
@import "@takaki/go-design-system/theme.css";
```

## このプロダクト固有のルール

- **プロダクト名**: TaskGo
- **プライマリカラー**: `#5E6AD2`（インディゴ）
  - 選定理由: PdMが設計タスクを規律的・戦略的に管理するツール。インディゴは「集中・構造・知的規律」を象徴し、プロダクトマネジメントの文脈に適合する。NativeGoの青とは明確に差別化されたプロダクトアイデンティティ。
  - Hover: `#4F5BC0`
- **ドメイン**: task-go.vercel.app
- **データモデル概要**:
  - `tasks`: 設計タスク（layer_type: core_value/roadmap/spec_design/other、status: pending/in_progress/done、is_focus、output_note）
  - `design_layers`: 設計貯金の状態（layer_type、content、cover_until、last_updated_at）
  - `weekly_focus_tasks`: 週次フォーカスタスク（week_start、task_id、is_done）
  - `weekly_summaries`: AI生成の週次サマリー
  - `tags` / `task_tags`: タグ管理
  - `ai_suggestions`: タスクへのAIサジェスト
- **外部連携**: Supabase（DB・認証）、Anthropic Claude API（AIサジェスト・週次サマリー・タグ提案）
- **固有セマンティックカラー**:
  - success（健康）: `var(--color-success)` #30A46C
  - warning（注意）: `var(--color-warning)` #F5A623
  - danger（要更新）: `var(--color-danger)` #E5484D

## 作業時の判断基準

1. 新しいUIが必要 → まず `@takaki/go-design-system` に該当コンポーネントがあるか確認
2. ある → それを使う
3. ない → 既存の組み合わせで実現できないか検討
4. それも無理 → go-design-system 側への追加を検討

## デザインシステムの更新

```json
// vercel.json
{
  "buildCommand": "npm update @takaki/go-design-system && npm run build"
}
```
