"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getWeeklyFocusTasks,
  addTaskToWeeklyFocus,
  removeTaskFromWeeklyFocus,
  markWeeklyFocusTaskDone,
  getTasks,
  type WeeklyFocusTaskWithTask,
} from "@/lib/db";
import type { Task } from "@/types/database";
import { getWeekStart, formatWeekLabel } from "@/lib/date";
import { StatusDot } from "@/components/ui/status-dot";
import {
  Button,
  Input,
  PageHeader,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@takaki/go-design-system";
import {
  Plus,
  X,
  CheckCircle2,
  Circle,
  ChevronRight,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const WEEK_OFFSETS = [0, 1, 2, 3, 4];

export default function FocusPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [focusByWeek, setFocusByWeek] = useState<
    Record<number, WeeklyFocusTaskWithTask[]>
  >({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskSearch, setTaskSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const weekStart = (offset: number) => getWeekStart(offset);

  const loadWeek = useCallback(async (offset: number) => {
    setLoading((prev) => ({ ...prev, [offset]: true }));
    try {
      const data = await getWeeklyFocusTasks(weekStart(offset));
      setFocusByWeek((prev) => ({ ...prev, [offset]: data }));
    } catch {
      toast.error("読み込みに失敗しました");
    } finally {
      setLoading((prev) => ({ ...prev, [offset]: false }));
    }
  }, []);

  useEffect(() => {
    WEEK_OFFSETS.forEach((o) => loadWeek(o));
  }, [loadWeek]);

  const openAddDialog = async () => {
    setTaskSearch("");
    setAddOpen(true);
    if (allTasks.length === 0) {
      try {
        const tasks = await getTasks();
        setAllTasks(tasks.filter((t) => t.status !== "done"));
      } catch {
        toast.error("タスクの読み込みに失敗しました");
      }
    }
  };

  const handleAddTask = async (task: Task) => {
    setAdding(true);
    try {
      await addTaskToWeeklyFocus(weekStart(activeTab), task.id);
      await loadWeek(activeTab);
      setAddOpen(false);
      toast.success("フォーカスに追加しました");
    } catch {
      toast.error("追加に失敗しました");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (wfTaskId: string) => {
    try {
      await removeTaskFromWeeklyFocus(wfTaskId);
      setFocusByWeek((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] ?? []).filter((wf) => wf.id !== wfTaskId),
      }));
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleToggleDone = async (wfTask: WeeklyFocusTaskWithTask) => {
    try {
      await markWeeklyFocusTaskDone(wfTask.id, !wfTask.is_done);
      setFocusByWeek((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] ?? []).map((wf) =>
          wf.id === wfTask.id ? { ...wf, is_done: !wf.is_done } : wf,
        ),
      }));
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const currentFocus = focusByWeek[activeTab] ?? [];
  const isLoading = loading[activeTab];
  const alreadyAddedIds = new Set(currentFocus.map((wf) => wf.task_id));
  const filteredTasks = allTasks.filter(
    (t) =>
      !alreadyAddedIds.has(t.id) &&
      (taskSearch === "" ||
        t.title.toLowerCase().includes(taskSearch.toLowerCase())),
  );

  return (
    <div className="px-8 py-8 max-w-3xl space-y-6">
      <PageHeader
        title="フォーカス管理"
        description="週ごとに集中するタスクを管理する"
      />

      {/* 週タブ */}
      <div className="flex items-center gap-1 border-b border-border">
        {WEEK_OFFSETS.map((offset) => {
          const count = (focusByWeek[offset] ?? []).length;
          const doneCount = (focusByWeek[offset] ?? []).filter(
            (wf) => wf.is_done,
          ).length;
          const isActive = activeTab === offset;
          const allDone = count > 0 && doneCount === count;
          return (
            <button
              key={offset}
              onClick={() => setActiveTab(offset)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2 ${
                isActive
                  ? "text-foreground border-[color:var(--color-primary)]"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {formatWeekLabel(offset)}
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${allDone ? "bg-success-subtle text-success" : "bg-accent text-muted-foreground"}`}
                >
                  {doneCount}/{count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* フォーカスリスト */}
      <div className="rounded-lg overflow-hidden border border-border bg-card">
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            読み込み中...
          </div>
        ) : currentFocus.length === 0 ? (
          <EmptyState
            icon={<Target className="w-5 h-5" />}
            title={`${formatWeekLabel(activeTab)}のフォーカスタスクがありません`}
            description="最大5件までタスクを追加できます"
          />
        ) : (
          currentFocus.map((wfTask, i) => (
            <div
              key={wfTask.id}
              className={`flex items-center gap-3 px-4 py-3.5 group ${i < currentFocus.length - 1 ? "border-b border-border" : ""}`}
            >
              <button
                onClick={() => handleToggleDone(wfTask)}
                className="shrink-0 transition-colors text-muted-foreground"
              >
                {wfTask.is_done ? (
                  <CheckCircle2 className="text-success w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </button>

              <Link
                href={`/tasks/${wfTask.task_id}`}
                className="flex-1 min-w-0"
              >
                <span
                  className={`text-sm block truncate hover:text-primary transition-colors ${wfTask.is_done ? "opacity-40" : ""}`}
                >
                  {wfTask.task.title}
                </span>
              </Link>

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
                className="shrink-0"
              />

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/tasks/${wfTask.task_id}`}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => handleRemove(wfTask.id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 追加ボタン */}
      {currentFocus.length < 5 && (
        <Button variant="outline" onClick={openAddDialog} className="gap-2">
          <Plus className="w-3 h-3" />
          タスクを追加（{currentFocus.length}/5）
        </Button>
      )}

      {/* タスク追加ダイアログ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {formatWeekLabel(activeTab)}のフォーカスにタスクを追加
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <Input
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              placeholder="タスク名で検索..."
              autoFocus
              className="mb-3"
            />
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filteredTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {taskSearch
                    ? "該当するタスクがありません"
                    : "追加できるタスクがありません"}
                </p>
              ) : (
                filteredTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => !adding && handleAddTask(task)}
                    disabled={adding}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <StatusDot
                      variant={task.status === "in_progress" ? "blue" : "gray"}
                      className="shrink-0"
                    />
                    <span className="text-sm truncate flex-1">
                      {task.title}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
