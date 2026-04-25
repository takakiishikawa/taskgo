"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getTask,
  updateTask,
  getAiSuggestions,
  getTaskTagIds,
  getAllTags,
  addTagToTask,
  removeTagFromTask,
} from "@/lib/db";
import type {
  Task,
  AiSuggestion,
  LayerType,
  TaskStatus,
  Tag,
} from "@/types/database";
import { StatusDot } from "@/components/ui/status-dot";
import { TagBadge } from "@/components/ui/tag-badge";
import { OutputModal } from "@/components/ui/output-modal";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Sparkles,
  BookOpen,
  Clock,
  Tag as TagIcon,
  X,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { toast } from "@takaki/go-design-system";
import {
  Button,
  Input,
  Textarea,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@takaki/go-design-system";
import {
  LAYER_LABELS,
  LAYER_ORDER,
  STATUS_LABEL,
  STATUS_DOT,
} from "@/lib/constants";

const ISSUE_TITLE_PREFIXES = ["【短期】", "【中期】"];
function isIssueDiscoveryTask(title: string) {
  return ISSUE_TITLE_PREFIXES.some((prefix) => title.startsWith(prefix));
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<
    "first_step" | "research" | "issues" | null
  >(null);
  const [editMode, setEditMode] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggesting, setTagSuggesting] = useState(false);
  const [outputModal, setOutputModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    layer_type: "spec_design" as LayerType,
    status: "pending" as TaskStatus,
    due_date: undefined as string | undefined,
  });

  const loadData = useCallback(async () => {
    try {
      const [t, s, tagIds, allTagsData] = await Promise.all([
        getTask(id),
        getAiSuggestions(id),
        getTaskTagIds(id),
        getAllTags(),
      ]);
      if (!t) {
        router.push("/tasks");
        return;
      }
      setTask(t);
      setSuggestions(s);
      setAllTags(allTagsData);
      setTags(allTagsData.filter((tag) => tagIds.includes(tag.id)));
      setEditForm({
        title: t.title,
        description: t.description ?? "",
        layer_type: t.layer_type,
        status: t.status,
        due_date: t.due_date ?? undefined,
      });
    } catch (e) {
      console.error(e);
      toast.error("読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!task) return;
    const newStatus = editForm.status;
    const isMarkingDone = newStatus === "done" && task.status !== "done";

    if (isMarkingDone) {
      // Save everything except status/completed_at — output modal will handle those
      setSaving(true);
      try {
        const updated = await updateTask(task.id, {
          title: editForm.title.trim(),
          description: editForm.description || null,
          layer_type: editForm.layer_type,
          due_date: editForm.due_date || null,
        });
        setTask(updated);
        setEditMode(false);
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "保存に失敗しました");
      } finally {
        setSaving(false);
      }
      setOutputModal(true);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateTask(task.id, {
        title: editForm.title.trim(),
        description: editForm.description || null,
        layer_type: editForm.layer_type,
        status: editForm.status,
        due_date: editForm.due_date || null,
      });
      setTask(updated);
      setEditMode(false);
      toast.success("保存しました");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleOutputSave = async (outputNote: string) => {
    if (!task) return;
    const updated = await updateTask(task.id, {
      status: "done",
      output_note: outputNote,
      completed_at: new Date().toISOString(),
    });
    setTask(updated);
    setOutputModal(false);
    toast.success("アウトプットを記録しました");
  };

  const handleOutputSkip = async () => {
    if (!task) return;
    const updated = await updateTask(task.id, {
      status: "done",
      completed_at: new Date().toISOString(),
    });
    setTask(updated);
    setOutputModal(false);
  };

  const handleAiSuggest = async (type: "first_step" | "research") => {
    if (!task) return;
    setAiLoading(type);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          title: task.title,
          description: task.description,
          layerType: task.layer_type,
          suggestionType: type,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestions((prev) => [data.suggestion, ...prev]);
      toast.success("AI提案を取得しました");
    } catch (e) {
      console.error(e);
      toast.error("AI提案の取得に失敗しました");
    } finally {
      setAiLoading(null);
    }
  };

  const handleIssueDiscovery = async () => {
    if (!task) return;
    const issueType = task.title.startsWith("【短期】") ? "short" : "mid";
    setAiLoading("issues");
    try {
      const res = await fetch("/api/ai/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, issueType }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestions((prev) => [data.suggestion, ...prev]);
      toast.success("課題発見レポートを生成しました");
    } catch (e) {
      console.error(e);
      toast.error("課題発見に失敗しました");
    } finally {
      setAiLoading(null);
    }
  };

  const handleAddTag = async (name: string) => {
    if (!task || !name.trim()) return;
    const trimmed = name.trim();
    if (tags.some((t) => t.name === trimmed)) return;
    try {
      const tag = await addTagToTask(task.id, trimmed);
      setTags((prev) => [...prev, tag]);
      setAllTags((prev) =>
        prev.some((t) => t.id === tag.id) ? prev : [...prev, tag],
      );
      setTagInput("");
    } catch (e) {
      console.error(e);
      toast.error("タグの追加に失敗しました");
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!task) return;
    try {
      await removeTagFromTask(task.id, tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (e) {
      console.error(e);
      toast.error("タグの削除に失敗しました");
    }
  };

  const handleSuggestTags = async () => {
    if (!task) return;
    setTagSuggesting(true);
    try {
      const res = await fetch("/api/ai/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          layerType: task.layer_type,
        }),
      });
      const data = await res.json();
      if (data.tags?.length) {
        for (const tagName of data.tags as string[]) {
          await handleAddTag(tagName);
        }
        toast.success(
          `タグを提案しました: ${(data.tags as string[]).join(", ")}`,
        );
      } else {
        toast.info("タグの提案がありませんでした");
      }
    } catch (e) {
      console.error(e);
      toast.error("タグ提案に失敗しました");
    } finally {
      setTagSuggesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

  if (!task) return null;

  const isIssuetask = isIssueDiscoveryTask(task.title);

  return (
    <div className="px-8 py-8 max-w-3xl space-y-6">
      <PageHeader
        title={task.title}
        breadcrumbs={[
          { label: "タスク", href: "/tasks" },
          { label: task.title },
        ]}
      />

      {/* Task info */}
      <div className="rounded-lg p-6 bg-card border border-border">
        <div className="flex items-start justify-between mb-4">
          {editMode ? (
            <Input
              value={editForm.title}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, title: e.target.value }))
              }
              className="flex-1 mr-4"
            />
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2 shrink-0">
            <StatusDot
              variant={STATUS_DOT[task.status]}
              label={STATUS_LABEL[task.status]}
            />
            {editMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(false)}
                >
                  キャンセル
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "保存中..." : "保存"}
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditMode(true)}
              >
                編集
              </Button>
            )}
          </div>
        </div>

        {/* Meta fields */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm block mb-1 text-muted-foreground">
              レイヤー
            </label>
            {editMode ? (
              <Select
                value={editForm.layer_type}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, layer_type: v as LayerType }))
                }
              >
                <SelectTrigger className="text-sm h-8 bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {LAYER_ORDER.map((l) => (
                    <SelectItem
                      key={l}
                      value={l}
                      className="text-foreground text-sm"
                    >
                      {LAYER_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm text-foreground">
                {LAYER_LABELS[task.layer_type]}
              </span>
            )}
          </div>

          <div>
            <label className="text-sm block mb-1 text-muted-foreground">
              ステータス
            </label>
            {editMode ? (
              <Select
                value={editForm.status}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, status: v as TaskStatus }))
                }
              >
                <SelectTrigger className="text-sm h-8 bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      className="text-foreground text-sm"
                    >
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm text-foreground">
                {STATUS_LABEL[task.status]}
              </span>
            )}
          </div>

          <div>
            <label className="text-sm block mb-1 text-muted-foreground">
              期日
            </label>
            {editMode ? (
              <DatePicker
                value={editForm.due_date}
                onChange={(v) => setEditForm((f) => ({ ...f, due_date: v }))}
              />
            ) : (
              <span className="text-sm text-foreground">
                {task.due_date
                  ? new Date(task.due_date + "T00:00:00").toLocaleDateString(
                      "ja-JP",
                      { year: "numeric", month: "short", day: "numeric" },
                    )
                  : "—"}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="text-sm block mb-1 text-muted-foreground">
            説明
          </label>
          {editMode ? (
            <Textarea
              value={editForm.description}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="タスクの詳細..."
              rows={4}
              className="text-sm resize-none bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
            />
          ) : (
            <p
              className={`text-sm leading-relaxed ${task.description ? "text-muted-foreground" : "text-border"}`}
            >
              {task.description || "説明なし"}
            </p>
          )}
        </div>

        {/* Output note (if done) */}
        {task.status === "done" && (
          <div className="mb-4 rounded p-3 border bg-success-subtle border-[color:var(--color-success)]/20">
            <label className="text-sm block mb-1 font-medium text-success">
              アウトプット記録
            </label>
            <p className="text-sm text-muted-foreground">
              {task.output_note || "（記録なし）"}
            </p>
            {task.completed_at && (
              <p className="text-xs mt-1 text-success/70">
                {new Date(task.completed_at).toLocaleDateString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                完了
              </p>
            )}
          </div>
        )}

        {/* Tags */}
        <div>
          <label className="text-sm block mb-1.5 text-muted-foreground flex items-center gap-1">
            <TagIcon className="size-2.5" />
            タグ
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {tags.map((tag) => (
              <TagBadge
                key={tag.id}
                name={tag.name}
                size="sm"
                onRemove={() => handleRemoveTag(tag.id)}
              />
            ))}

            {/* Tag input */}
            <div className="flex items-center gap-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder="タグを追加..."
                className="w-25"
                list="tag-suggestions"
              />
              <datalist id="tag-suggestions">
                {allTags
                  .filter((t) => !tags.some((tt) => tt.id === t.id))
                  .map((t) => (
                    <option key={t.id} value={t.name} />
                  ))}
              </datalist>
              {tagInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddTag(tagInput)}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="size-3" />
                </Button>
              )}
            </div>

            {/* AI suggest tags */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuggestTags}
              disabled={tagSuggesting}
              className="flex items-center gap-1 text-sm px-2 py-0.5 rounded transition-colors disabled:opacity-50 text-primary border border-[color:var(--color-primary)]/30 bg-transparent hover:bg-[color:var(--color-primary)]/10"
            >
              <Sparkles className="size-2.5" />
              {tagSuggesting ? "提案中..." : "AI提案"}
            </Button>
          </div>
        </div>
      </div>

      {/* Issue Discovery AI (for recurring issue tasks) */}
      {isIssuetask && (
        <div className="rounded-lg p-5 bg-card border border-border">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="text-warning" className="size-3" />
            課題発見AI
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {task.title.startsWith("【短期】")
              ? "現在の進行中タスクを分析し、今すぐ対処すべき重要な課題をトップ3で発見します。"
              : "3〜12ヶ月のスパンで見た時に対処すべき重要な課題をトップ3で発見します。"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleIssueDiscovery}
            disabled={aiLoading !== null}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded transition-colors disabled:opacity-50 bg-warning-subtle text-warning border border-[color:var(--color-warning)]/30 hover:bg-[color:var(--color-warning)]/20"
          >
            <Sparkles className="size-3" />
            {aiLoading === "issues" ? "分析中..." : "課題を発見する"}
          </Button>
        </div>
      )}

      {/* AI buttons (non-issue tasks) */}
      {!isIssuetask && (
        <div className="rounded-lg p-5 bg-card border border-border">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2 text-muted-foreground">
            <Sparkles className="text-primary" className="size-3" />
            AIサジェスト
          </h3>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAiSuggest("first_step")}
              disabled={aiLoading !== null}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded border transition-colors disabled:opacity-50 border-[color:var(--color-primary)] text-primary bg-transparent hover:bg-[color:var(--color-primary)]/10"
            >
              <Sparkles className="size-3" />
              {aiLoading === "first_step"
                ? "提案中..."
                : "次の一手を提案してもらう"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAiSuggest("research")}
              disabled={aiLoading !== null}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded border transition-colors disabled:opacity-50 border-border text-muted-foreground hover:border-ring hover:text-foreground bg-transparent"
            >
              <BookOpen className="size-3" />
              {aiLoading === "research"
                ? "提案中..."
                : "リサーチを手伝ってもらう"}
            </Button>
          </div>
        </div>
      )}

      {/* AI suggestions history */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="text-xs font-medium mb-3 uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
            <Clock className="size-3" />
            過去のAI提案
          </h3>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="rounded-lg p-4 bg-card border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      s.suggestion_type === "first_step"
                        ? "bg-[color:var(--color-primary)]/15 text-primary"
                        : s.suggestion_type === "issues"
                          ? "bg-warning-subtle text-warning"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {s.suggestion_type === "first_step"
                      ? "次の一手"
                      : s.suggestion_type === "issues"
                        ? "課題発見"
                        : "リサーチ"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {s.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output modal */}
      <OutputModal
        open={outputModal}
        taskTitle={task.title}
        onSave={handleOutputSave}
        onSkip={handleOutputSkip}
      />
    </div>
  );
}
