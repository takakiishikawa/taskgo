"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getFocusTasks,
  getStalestTask,
  getLatestDesignLayer,
  updateTask,
  getWeeklyFocusTasks,
  getWeeklySummary,
  initRecurringTasksIfNeeded,
  checkAndGenerateRecurringTasks,
  type WeeklyFocusTaskWithTask,
} from "@/lib/db";
import type { Task, DesignLayer, WeeklySummary } from "@/types/database";
import { StatusDot } from "@/components/ui/status-dot";
import { OutputModal } from "@/components/ui/output-modal";
import {
  formatDate,
  getDaysAgo,
  getMonthsFromNow,
  getWeekStart,
  isFriday,
} from "@/lib/date";
import {
  Button,
  PageHeader,
  Section,
  EmptyState,
  Badge,
} from "@takaki/go-design-system";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  FileText,
  Target,
} from "lucide-react";
import { toast } from "@takaki/go-design-system";

type HealthStatus = "green" | "yellow" | "red";

function getCoreValueHealth(layer: DesignLayer | null): {
  status: HealthStatus;
  label: string;
} {
  if (!layer) return { status: "red", label: "未更新" };
  const days = getDaysAgo(layer.last_updated_at);
  if (days >= 90) return { status: "red", label: `${days}日前に更新` };
  if (days >= 30) return { status: "yellow", label: `${days}日前に更新` };
  return { status: "green", label: `${days}日前に更新` };
}

function getRoadmapHealth(layer: DesignLayer | null): {
  status: HealthStatus;
  label: string;
} {
  if (!layer?.cover_until) return { status: "red", label: "カバー期限未設定" };
  const months = getMonthsFromNow(layer.cover_until);
  if (months < 12) return { status: "red", label: `${layer.cover_until} まで` };
  if (months < 24)
    return { status: "yellow", label: `${layer.cover_until} まで` };
  return { status: "green", label: `${layer.cover_until} まで` };
}

function getSpecDesignHealth(layer: DesignLayer | null): {
  status: HealthStatus;
  label: string;
} {
  if (!layer?.cover_until) return { status: "red", label: "カバー期限未設定" };
  const months = getMonthsFromNow(layer.cover_until);
  if (months < 3) return { status: "red", label: `${layer.cover_until} まで` };
  if (months < 6)
    return { status: "yellow", label: `${layer.cover_until} まで` };
  return { status: "green", label: `${layer.cover_until} まで` };
}

export default function DashboardPage() {
  const [weeklyFocusTasks, setWeeklyFocusTasks] = useState<
    WeeklyFocusTaskWithTask[]
  >([]);
  const [stalestTask, setStalestTask] = useState<Task | null>(null);
  const [layers, setLayers] = useState<{
    core_value: DesignLayer | null;
    roadmap: DesignLayer | null;
    spec_design: DesignLayer | null;
  }>({ core_value: null, roadmap: null, spec_design: null });
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(
    null,
  );
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFridayBanner, setIsFridayBanner] = useState(false);
  const [newRecurring, setNewRecurring] = useState<Task[]>([]);
  const [outputModal, setOutputModal] = useState<{
    open: boolean;
    task: Task | null;
  }>({ open: false, task: null });

  const thisWeek = getWeekStart(0);

  const loadData = useCallback(async () => {
    try {
      await initRecurringTasksIfNeeded();
      const generated = await checkAndGenerateRecurringTasks();
      if (generated.length > 0) setNewRecurring(generated);

      const [wfTasks, stale, cv, rm, sd, summary] = await Promise.all([
        getWeeklyFocusTasks(thisWeek),
        getStalestTask(),
        getLatestDesignLayer("core_value"),
        getLatestDesignLayer("roadmap"),
        getLatestDesignLayer("spec_design"),
        getWeeklySummary(thisWeek),
      ]);
      setWeeklyFocusTasks(wfTasks);
      setStalestTask(stale);
      setLayers({ core_value: cv, roadmap: rm, spec_design: sd });
      setWeeklySummary(summary);
      setIsFridayBanner(isFriday());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [thisWeek]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompleteTask = (task: Task) => {
    setOutputModal({ open: true, task });
  };

  const handleOutputSave = async (outputNote: string) => {
    const t = outputModal.task;
    if (!t) return;
    try {
      await updateTask(t.id, {
        status: "done",
        output_note: outputNote,
        completed_at: new Date().toISOString(),
      });
      setWeeklyFocusTasks((prev) =>
        prev.map((wf) =>
          wf.task_id === t.id
            ? {
                ...wf,
                is_done: true,
                task: { ...wf.task, status: "done" as const },
              }
            : wf,
        ),
      );
      toast.success(`"${t.title}" を完了しました`);
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setOutputModal({ open: false, task: null });
    }
  };

  const handleOutputSkip = async () => {
    const t = outputModal.task;
    if (!t) return;
    try {
      await updateTask(t.id, {
        status: "done",
        completed_at: new Date().toISOString(),
      });
      setWeeklyFocusTasks((prev) =>
        prev.map((wf) =>
          wf.task_id === t.id
            ? {
                ...wf,
                is_done: true,
                task: { ...wf.task, status: "done" as const },
              }
            : wf,
        ),
      );
      toast.success(`"${t.title}" を完了しました`);
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setOutputModal({ open: false, task: null });
    }
  };

  const handleFetchAiSuggestion = useCallback(async () => {
    if (!stalestTask) return;
    setLoadingAi(true);
    try {
      const res = await fetch("/api/ai/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: stalestTask.title,
          description: stalestTask.description,
          layerType: stalestTask.layer_type,
        }),
      });
      const data = await res.json();
      setAiSuggestion(data.suggestion);
    } catch {
      toast.error("AI提案の取得に失敗しました");
    } finally {
      setLoadingAi(false);
    }
  }, [stalestTask]);

  useEffect(() => {
    if (stalestTask) handleFetchAiSuggestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stalestTask?.id]);

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: thisWeek }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setWeeklySummary((prev) =>
        prev
          ? { ...prev, summary: data.summary }
          : {
              id: "",
              user_id: "",
              week_start: thisWeek,
              summary: data.summary,
              generated_at: "",
            },
      );
      toast.success("週次サマリーを生成しました");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "サマリー生成に失敗しました",
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const cvHealth = getCoreValueHealth(layers.core_value);
  const rmHealth = getRoadmapHealth(layers.roadmap);
  const sdHealth = getSpecDesignHealth(layers.spec_design);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-5xl space-y-8">
      <PageHeader
        title="ダッシュボード"
        description="設計貯金の状態を確認する"
      />

      {/* 通知バナー */}
      {newRecurring.length > 0 && (
        <div className="rounded-lg p-4 flex items-start gap-3 bg-warning-subtle border border-[color:var(--color-warning)]/30">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">
              課題発見タスクが生成されました
            </p>
            <div className="mt-1 space-y-0.5">
              {newRecurring.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="text-sm block text-muted-foreground hover:text-foreground transition-colors"
                >
                  → {t.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      {isFridayBanner && (
        <div className="rounded-lg p-4 flex items-center justify-between bg-[color:var(--color-primary)]/8 border border-[color:var(--color-primary)]/25">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary">
                金曜日です！今週を振り返りましょう
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                週次サマリーを生成して今週の成果を記録しましょう
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            className="shrink-0 gap-1.5"
          >
            <Sparkles className="w-3 h-3" />
            {summaryLoading ? "生成中..." : "サマリー生成"}
          </Button>
        </div>
      )}

      {/* 設計貯金残高 */}
      <Section title="設計貯金残高">
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              title: "コアバリュー",
              health: cvHealth,
              sub: "90日以内更新で良好",
              href: "/layers?tab=core_value",
            },
            {
              title: "ロードマップ",
              health: rmHealth,
              sub: "2年以上カバーで良好",
              href: "/layers?tab=roadmap",
            },
            {
              title: "仕様・デザイン",
              health: sdHealth,
              sub: "6ヶ月以上カバーで良好",
              href: "/layers?tab=spec_design",
            },
          ].map(({ title, health, sub, href }) => (
            <Link
              key={title}
              href={href}
              className="block rounded-lg p-5 transition-colors bg-card border border-border hover:bg-accent/30"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium">{title}</span>
                <Badge
                  className={
                    health.status === "green"
                      ? "bg-success-subtle text-success hover:bg-success-subtle"
                      : health.status === "yellow"
                        ? "bg-warning-subtle text-warning hover:bg-warning-subtle"
                        : "bg-danger-subtle text-destructive hover:bg-danger-subtle"
                  }
                >
                  {health.status === "green"
                    ? "良好"
                    : health.status === "yellow"
                      ? "注意"
                      : "要更新"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{health.label}</p>
              <p className="text-xs mt-1 text-muted-foreground/60">{sub}</p>
            </Link>
          ))}
        </div>
      </Section>

      {/* 今週のフォーカス */}
      <Section
        title="今週のフォーカス"
        actions={
          <Link
            href="/focus"
            className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            管理する <ChevronRight className="w-3 h-3" />
          </Link>
        }
      >
        <div className="rounded-lg overflow-hidden bg-card border border-border">
          {weeklyFocusTasks.length === 0 ? (
            <EmptyState
              icon={<Target className="w-5 h-5" />}
              title="今週のフォーカスがありません"
              description="フォーカス管理からタスクを設定しましょう"
              action={{
                label: "フォーカスを設定する",
                onClick: () => {
                  window.location.href = "/focus";
                },
              }}
            />
          ) : (
            weeklyFocusTasks.map((wfTask, i) => (
              <div
                key={wfTask.id}
                className={`flex items-center gap-3 px-5 py-3.5 ${i < weeklyFocusTasks.length - 1 ? "border-b border-border" : ""}`}
              >
                <Button
                  onClick={() =>
                    !wfTask.is_done && handleCompleteTask(wfTask.task)
                  }
                  className="shrink-0 text-muted-foreground hover:text-success transition-colors"
                  disabled={wfTask.is_done}
                  variant="ghost"
                  size="sm"
                >
                  {wfTask.is_done ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </Button>
                <Link
                  href={`/tasks/${wfTask.task_id}`}
                  className="flex-1 min-w-0"
                >
                  <span
                    className={`text-sm block truncate ${wfTask.is_done ? "opacity-40" : ""}`}
                  >
                    {wfTask.task.title}
                  </span>
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusDot
                    variant={
                      wfTask.task.status === "done"
                        ? "green"
                        : wfTask.task.status === "in_progress"
                          ? "blue"
                          : "gray"
                    }
                    label={
                      wfTask.task.status === "done"
                        ? "完了"
                        : wfTask.task.status === "in_progress"
                          ? "進行中"
                          : "未着手"
                    }
                  />
                  {wfTask.task.due_date && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(wfTask.task.due_date)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Section>

      {/* 週次サマリー */}
      <Section
        title="今週のサマリー"
        actions={
          <Button
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            variant="ghost"
            size="sm"
            className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${summaryLoading ? "animate-spin" : ""}`}
            />
            {weeklySummary ? "再生成" : "生成する"}
          </Button>
        }
      >
        <div className="rounded-lg p-5 bg-card border border-border">
          {summaryLoading ? (
            <div className="space-y-2">
              {[70, 90, 60].map((w, i) => (
                <div
                  key={i}
                  className="h-3 rounded bg-border animate-pulse"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          ) : weeklySummary ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {weeklySummary.summary}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              今週完了したタスクのアウトプットをもとにAIがサマリーを生成します
            </p>
          )}
        </div>
      </Section>

      {/* AIサジェスト */}
      {stalestTask && (
        <Section
          title="AIサジェスト"
          actions={
            <Button
              onClick={handleFetchAiSuggestion}
              disabled={loadingAi}
              variant="ghost"
              size="sm"
              className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3 h-3 ${loadingAi ? "animate-spin" : ""}`}
              />
              再取得
            </Button>
          }
        >
          <div className="rounded-lg p-5 bg-card border border-border">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium">{stalestTask.title}</p>
                <p className="text-xs mt-0.5 text-muted-foreground">
                  最も長く止まっているタスク
                </p>
              </div>
              <Link
                href={`/tasks/${stalestTask.id}`}
                className="text-sm flex items-center gap-1 shrink-0 ml-4 text-primary hover:opacity-80 transition-opacity"
              >
                詳しく聞く <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {loadingAi ? (
              <div className="mt-3 space-y-2">
                {[60, 80, 40].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 rounded bg-border animate-pulse"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            ) : aiSuggestion ? (
              <div className="mt-3 text-sm leading-relaxed whitespace-pre-wrap rounded p-3 bg-muted text-muted-foreground border border-border">
                {aiSuggestion}
              </div>
            ) : null}
          </div>
        </Section>
      )}

      <OutputModal
        open={outputModal.open}
        taskTitle={outputModal.task?.title ?? ""}
        onSave={handleOutputSave}
        onSkip={handleOutputSkip}
      />
    </div>
  );
}
