"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getTagsForTasks,
  getAllTags,
} from "@/lib/db";
import type { Task, TaskStatus, Tag } from "@/types/database";
import { TagBadge } from "@/components/ui/tag-badge";
import { OutputModal } from "@/components/ui/output-modal";
import { formatDate } from "@/lib/date";
import { LAYER_LABELS, LAYER_ORDER, STATUS_LABEL } from "@/lib/constants";
import {
  Button,
  Input,
  PageHeader,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@takaki/go-design-system";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Plus,
  Star,
  Trash2,
  ChevronRight,
  Tag as TagIcon,
  X,
} from "lucide-react";
import { toast } from "@takaki/go-design-system";
import type { LayerType } from "@/types/database";
import { cn } from "@/lib/utils";

const STATUS_BADGE_VARIANT: Record<TaskStatus, "default" | "secondary"> = {
  pending: "secondary",
  in_progress: "default",
  done: "secondary",
};

const STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  pending: "",
  in_progress: "",
  done: "bg-success-subtle text-success hover:bg-success-subtle",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tagsByTask, setTagsByTask] = useState<Record<string, Tag[]>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    layer_type: "spec_design" as LayerType,
    due_date: undefined as string | undefined,
  });
  const [creating, setCreating] = useState(false);
  const [outputModal, setOutputModal] = useState<{
    open: boolean;
    task: Task | null;
  }>({ open: false, task: null });
  const pendingStatusRef = useRef<{
    taskId: string;
    status: TaskStatus;
  } | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const data = await getTasks();
      setTasks(data);
      const [tagsMap, tags] = await Promise.all([
        getTagsForTasks(data.map((t) => t.id)),
        getAllTags(),
      ]);
      setTagsByTask(tagsMap);
      setAllTags(tags);
    } catch (e) {
      console.error(e);
      toast.error("タスクの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const tagFilteredTasks = tagFilter
    ? tasks.filter((t) =>
        (tagsByTask[t.id] ?? []).some((tag) => tag.name === tagFilter),
      )
    : tasks;

  const statusCounts: Record<TaskStatus | "all", number> = {
    all: tagFilteredTasks.length,
    pending: tagFilteredTasks.filter((t) => t.status === "pending").length,
    in_progress: tagFilteredTasks.filter((t) => t.status === "in_progress")
      .length,
    done: tagFilteredTasks.filter((t) => t.status === "done").length,
  };

  const filteredTasks = tagFilteredTasks.filter(
    (t) => statusFilter === "all" || t.status === statusFilter,
  );

  const groupedTasks = LAYER_ORDER.reduce<Record<LayerType, Task[]>>(
    (acc, layer) => {
      acc[layer] = filteredTasks.filter((t) => t.layer_type === layer);
      return acc;
    },
    { core_value: [], roadmap: [], spec_design: [], other: [] },
  );

  const handleToggleFocus = async (task: Task) => {
    const currentFocusCount = tasks.filter(
      (t) => t.is_focus && t.id !== task.id,
    ).length;
    if (!task.is_focus && currentFocusCount >= 3) {
      toast.error("フォーカスは最大3件までです");
      return;
    }
    try {
      const updated = await updateTask(task.id, { is_focus: !task.is_focus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleDelete = async (task: Task) => {
    try {
      await deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      toast.success("削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    if (status === "done" && task.status !== "done") {
      pendingStatusRef.current = { taskId: task.id, status };
      setOutputModal({ open: true, task });
      return;
    }
    try {
      const updated = await updateTask(task.id, { status });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleOutputSave = async (outputNote: string) => {
    const pending = pendingStatusRef.current;
    if (!pending) return;
    try {
      const updated = await updateTask(pending.taskId, {
        status: "done",
        output_note: outputNote,
        completed_at: new Date().toISOString(),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === pending.taskId ? updated : t)),
      );
      toast.success("アウトプットを記録しました");
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      pendingStatusRef.current = null;
      setOutputModal({ open: false, task: null });
    }
  };

  const handleOutputSkip = async () => {
    const pending = pendingStatusRef.current;
    if (!pending) return;
    try {
      const updated = await updateTask(pending.taskId, {
        status: "done",
        completed_at: new Date().toISOString(),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === pending.taskId ? updated : t)),
      );
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      pendingStatusRef.current = null;
      setOutputModal({ open: false, task: null });
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const task = await createTask({
        title: form.title.trim(),
        description: form.description || undefined,
        layer_type: form.layer_type,
        due_date: form.due_date || undefined,
      });
      setTasks((prev) => [task, ...prev]);
      setCreateOpen(false);
      setForm({
        title: "",
        description: "",
        layer_type: "spec_design",
        due_date: undefined,
      });
      toast.success("タスクを作成しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6">
      <PageHeader
        title="タスク"
        description="設計タスクを管理する"
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="w-3 h-3" />
            新規タスク
          </Button>
        }
      />

      {/* ステータスフィルター */}
      <div className="space-y-3">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as TaskStatus | "all")}
        >
          <TabsList>
            {(["all", "pending", "in_progress", "done"] as const).map((s) => (
              <TabsTrigger
                key={s}
                value={s}
                className="flex items-center gap-1.5"
              >
                {s === "all" ? "すべて" : STATUS_LABEL[s]}
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] flex items-center justify-center"
                >
                  {statusCounts[s]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* タグフィルター */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <TagIcon className="w-3 h-3 text-muted-foreground" />
            {allTags.map((tag) => (
              <Button
                key={tag.id}
                onClick={() =>
                  setTagFilter(tagFilter === tag.name ? null : tag.name)
                }
                variant="ghost"
                className="text-xs px-2 py-0.5 rounded-full transition-opacity h-auto"
                style={{
                  opacity: tagFilter && tagFilter !== tag.name ? 0.4 : 1,
                  outline:
                    tagFilter === tag.name ? "1px solid currentColor" : "none",
                  outlineOffset: 1,
                }}
              >
                <TagBadge name={tag.name} size="xs" />
              </Button>
            ))}
            {tagFilter && (
              <Button
                onClick={() => setTagFilter(null)}
                variant="ghost"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors h-auto px-2 py-0.5"
              >
                <X className="w-2.5 h-2.5" />
                クリア
              </Button>
            )}
          </div>
        )}
      </div>

      {/* タスクグループ */}
      <div className="space-y-6">
        {LAYER_ORDER.map((layer) => {
          const layerTasks = groupedTasks[layer];
          if (layerTasks.length === 0) return null;
          return (
            <div key={layer}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {LAYER_LABELS[layer]}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
                  {layerTasks.length}
                </span>
              </div>
              <div className="rounded-lg overflow-hidden border border-border bg-card">
                {layerTasks.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    tags={tagsByTask[task.id] ?? []}
                    isLast={i === layerTasks.length - 1}
                    onToggleFocus={handleToggleFocus}
                    onDelete={handleDelete}
                    onStatusChange={(status) =>
                      handleStatusChange(task, status)
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <EmptyState
            title="タスクがありません"
            description="新規タスクを作成して設計を始めましょう"
            action={{
              label: "新規タスクを作成",
              onClick: () => setCreateOpen(true),
            }}
          />
        )}
      </div>

      {/* 新規タスクダイアログ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm">新規タスク</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm block mb-1.5 text-muted-foreground">
                タイトル *
              </label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="タスクのタイトルを入力"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm block mb-1.5 text-muted-foreground">
                レイヤー
              </label>
              <Select
                value={form.layer_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, layer_type: v as LayerType }))
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYER_ORDER.map((l) => (
                    <SelectItem key={l} value={l} className="text-sm">
                      {LAYER_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm block mb-1.5 text-muted-foreground">
                期日
              </label>
              <DatePicker
                value={form.due_date}
                onChange={(v) => setForm((f) => ({ ...f, due_date: v }))}
              />
            </div>
            <div>
              <label className="text-sm block mb-1.5 text-muted-foreground">
                説明
              </label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="タスクの詳細（任意）"
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!form.title.trim() || creating}
              >
                {creating ? "作成中..." : "作成"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <OutputModal
        open={outputModal.open}
        taskTitle={outputModal.task?.title ?? ""}
        onSave={handleOutputSave}
        onSkip={handleOutputSkip}
      />
    </div>
  );
}

function TaskRow({
  task,
  tags,
  isLast,
  onToggleFocus,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  tags: Tag[];
  isLast: boolean;
  onToggleFocus: (task: Task) => void;
  onDelete: (task: Task) => Promise<void>;
  onStatusChange: (status: TaskStatus) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 group ${isLast ? "" : "border-b border-border"}`}
    >
      <Button
        onClick={() => onToggleFocus(task)}
        variant="ghost"
        className="shrink-0 transition-colors p-0 h-auto hover:bg-transparent"
        title={task.is_focus ? "フォーカスから外す" : "フォーカスに追加"}
      >
        <Star
          className={task.is_focus ? "text-warning" : "text-border"}
          style={{
            width: 14,
            height: 14,
            fill: task.is_focus ? "currentColor" : "none",
          }}
        />
      </Button>

      <Link href={`/tasks/${task.id}`} className="flex-1 min-w-0">
        <span
          className={`text-sm block truncate transition-colors hover:text-primary ${task.status === "done" ? "opacity-40" : ""}`}
        >
          {task.title}
        </span>
        {tags.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {tags.map((tag) => (
              <TagBadge key={tag.id} name={tag.name} size="xs" />
            ))}
          </div>
        )}
      </Link>

      {task.due_date && (
        <span className="text-xs shrink-0 text-muted-foreground">
          {formatDate(task.due_date)}
        </span>
      )}

      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="focus:outline-none p-0 h-auto hover:bg-transparent"
            >
              <Badge
                variant={STATUS_BADGE_VARIANT[task.status]}
                className={cn(
                  "cursor-pointer text-xs font-medium select-none",
                  STATUS_BADGE_CLASS[task.status],
                )}
              >
                {STATUS_LABEL[task.status]}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(["pending", "in_progress", "done"] as TaskStatus[]).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
                {STATUS_LABEL[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/tasks/${task.id}`}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
        </Link>
        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              className="p-1 h-auto rounded text-muted-foreground hover:text-destructive transition-colors hover:bg-transparent"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          }
          title={`"${task.title}" を削除しますか？`}
          description="この操作は取り消せません。"
          confirmLabel="削除"
          variant="destructive"
          onConfirm={() => onDelete(task)}
        />
      </div>
    </div>
  );
}
