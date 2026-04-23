import { Zap, Target, Clock, Brain, ChevronRight } from "lucide-react";
import { PageHeader, Section } from "@takaki/go-design-system";

export default function AboutPage() {
  return (
    <div className="px-8 py-8 max-w-4xl space-y-8">
      <PageHeader
        title="コンセプト・使い方"
        description="TaskGoの設計思想と使い方ガイド"
      />

      <div className="flex items-start gap-4 rounded-lg p-5 bg-card border border-border">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, #ffffff) 100%)",
          }}
        >
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed pt-1">
          TaskGoはタスクを記録・管理するためのツールではありません。
          <br />
          <span className="text-foreground font-medium">
            PdMが設計系タスクを先回りして実行し続ける構造を作る
          </span>
          ためのツールです。
        </p>
      </div>

      {/* 解決する課題 */}
      <Section title="解決する4つの課題">
        <div className="space-y-3">
          {[
            {
              num: "01",
              title: "設計タスクの前倒し実行が意志に依存している",
              body: "PdMの設計タスクは締め切りが自分の外にない。外部トリガーがなければ着手が遅れ、「貯金がなくなってからギリギリで動く」サイクルに陥りやすい。",
              accent: true,
            },
            {
              num: "02",
              title: "反応型タスクが設計時間を侵食する",
              body: "詳細仕様の確認・デザインレビュー・問題相談など、割り込みタスクが日常的に発生して設計の集中時間が削がれる。",
              accent: false,
            },
            {
              num: "03",
              title: "着手コストが高いタスクが止まる",
              body: "「締め切りがまだ先」×「最初の一手が不明確」の掛け合わせで止まりやすい。着手さえすれば進むが、初動のハードルが高い。",
              accent: false,
            },
            {
              num: "04",
              title: "設計の壁打ち・レビュー相手がいない",
              body: "シニアマネージャー退職後、設計の質を担保するフィードバックループが機能していない。毎回プロンプトを書かずにAIと相談できる環境が必要。",
              accent: false,
            },
          ].map((item) => (
            <div
              key={item.num}
              className={`rounded-lg p-4 bg-card border ${item.accent ? "border-[color:var(--color-primary)]/40" : "border-border"}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`text-xs font-mono font-bold shrink-0 mt-0.5 ${item.accent ? "text-primary" : "text-muted-foreground"}`}
                >
                  {item.num}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 3つの構造 */}
      <Section title="TaskGoが作る3つの構造">
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: Target,
              title: "貯金残高の可視化",
              body: "コアバリュー・ロードマップ・仕様デザインの3層について、どこまで設計できているか（カバー期間）を常に一目でわかる状態にする。残高が減ったら色で警告。",
            },
            {
              icon: Clock,
              title: "今週のフォーカス",
              body: "タスクの中から「今週これをやればOK」を1〜3件明示。設計時間を意図的に確保することで、反応型タスクへの侵食を防ぐ。",
            },
            {
              icon: Brain,
              title: "AIによる着手サポート",
              body: "止まっているタスクに対してAIが「次の一手」を提案。初動ハードルを下げて、先送りを構造的に減らす。",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-lg p-4 bg-card border border-border"
            >
              <Icon className="w-4 h-4 mb-2 text-primary" />
              <p className="text-sm font-medium text-foreground mb-1.5">
                {title}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 使い方 */}
      <Section title="使い方">
        <div className="space-y-2">
          {[
            {
              step: "Step 1",
              title: "設計レイヤーにドキュメントを登録する",
              detail:
                "「設計レイヤー」タブで、コアバリュー・ロードマップ・仕様デザインの各層にドキュメントを作成し、cover_until（どこまで設計できているか）を設定します。これがダッシュボードの「設計貯金残高」に反映されます。",
            },
            {
              step: "Step 2",
              title: "タスクを作成し、今週のフォーカスを設定する",
              detail:
                "「タスク」タブからタスクを作成します。各タスクの★アイコンでフォーカスON/OFFを切り替え。ダッシュボードに「今週やること」として最大3件表示されます。",
            },
            {
              step: "Step 3",
              title: "AIに着手サポートを依頼する",
              detail:
                "タスク詳細画面で「次の一手を提案してもらう」か「リサーチを手伝ってもらう」をクリック。AIが具体的なアクションを提案します。ダッシュボードでも最も止まっているタスクに対して自動でサジェストされます。",
            },
            {
              step: "Step 4",
              title: "貯金残高を定期的に補充する",
              detail:
                "ダッシュボードの残高カードが黄・赤になったら設計レイヤーを更新するサイン。設計の貯金を常に緑の状態に保つことで、開発チームへの滞りない供給が実現します。",
            },
          ].map((item, i) => (
            <div
              key={item.step}
              className="flex gap-3 rounded-lg p-4 bg-card border border-border"
            >
              <div className="shrink-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-[color:var(--color-primary)]/15 text-primary">
                  {i + 1}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {item.step}
                  </span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {item.title}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 目指す理想状態 */}
      <Section title="目指す理想状態">
        <div className="rounded-lg p-5 bg-card border border-[color:var(--color-primary)]/20">
          <ul className="space-y-2">
            {[
              "ロードマップが常に今から1年以上先までカバーされている",
              "仕様・デザインが常に今から6ヶ月以上先までストックされている",
              "コアバリュー・解く/解かないことが定期的にアップデートされている",
              "この「貯金残高」が常に可視化されていて、減ったら補充できる",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-success mt-0.5 shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          TaskGo — NativeGo / CareGo / KenyakuGo シリーズ
        </p>
      </div>
    </div>
  );
}
