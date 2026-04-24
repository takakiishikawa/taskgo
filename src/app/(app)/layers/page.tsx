"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  getDesignLayers,
  upsertDesignLayer,
  deleteDesignLayer,
} from "@/lib/db";
import type { DesignLayer } from "@/types/database";
import { formatDate, getMonthsFromNow, getDaysAgo } from "@/lib/date";
import {
  Button,
  Input,
  Textarea,
  PageHeader,
  EmptyState,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  ConfirmDialog,
} from "@takaki/go-design-system";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Pencil, Trash2, Check, X, Layers } from "lucide-react";
import { toast } from "@takaki/go-design-system";
import { Suspense } from "react";

type TabType = "core_value" | "roadmap" | "spec_design";

const HEALTH_BADGE_CLASS: Record<"green" | "yellow" | "red", string> = {
  green: "bg-success-subtle text-success hover:bg-success-subtle",
  yellow: "bg-warning-subtle text-warning hover:bg-warning-subtle",
  red: "bg-danger-subtle text-destructive hover:bg-danger-subtle",
};

const TAB_CONFIG: Record<
  TabType,
  {
    label: string;
    showCoverUntil: boolean;
    getHealth: (layer: DesignLayer) => {
      status: "green" | "yellow" | "red";
      label: string;
    };
  }
> = {
  core_value: {
    label: "コアバリュー",
    showCoverUntil: false,
    getHealth: (layer) => {
      const days = getDaysAgo(layer.last_updated_at);
      if (days >= 90)
        return { status: "red", label: `${days}日前に更新（要更新）` };
      if (days >= 30)
        return { status: "yellow", label: `${days}日前に更新（注意）` };
      return { status: "green", label: `${days}日前に更新（良好）` };
    },
  },
  roadmap: {
    label: "ロードマップ",
    showCoverUntil: true,
    getHealth: (layer) => {
      if (!layer.cover_until)
        return { status: "red", label: "カバー期限未設定" };
      const m = getMonthsFromNow(layer.cover_until);
      if (m < 12) return { status: "red", label: `残り${m}ヶ月（要補充）` };
      if (m < 24) return { status: "yellow", label: `残り${m}ヶ月（注意）` };
      return { status: "green", label: `残り${m}ヶ月（良好）` };
    },
  },
  spec_design: {
    label: "仕様・デザイン",
    showCoverUntil: true,
    getHealth: (layer) => {
      if (!layer.cover_until)
        return { status: "red", label: "カバー期限未設定" };
      const m = getMonthsFromNow(layer.cover_until);
      if (m < 3) return { status: "red", label: `残り${m}ヶ月（要補充）` };
      if (m < 6) return { status: "yellow", label: `残り${m}ヶ月（注意）` };
      return { status: "green", label: `残り${m}ヶ月（良好）` };
    },
  },
};

function LayersContent() {
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get("tab") ?? "core_value") as TabType;
  const [activeTab, setActiveTab] = useState<TabType>(
    ["core_value", "roadmap", "spec_design"].includes(tabParam)
      ? tabParam
      : "core_value",
  );
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [createMode, setCreateMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    cover_until: undefined as string | undefined,
  });
  const [saving, setSaving] = useState(false);

  const loadLayers = useCallback(async () => {
    setLoading(true);
    try {
      setLayers(await getDesignLayers(activeTab));
    } catch (e) {
      console.error(e);
      toast.error("読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadLayers();
  }, [loadLayers]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const layer = await upsertDesignLayer({
        layer_type: activeTab,
        title: form.title.trim(),
        content: form.content || undefined,
        cover_until: form.cover_until || undefined,
      });
      setLayers((prev) => [layer, ...prev]);
      setCreateMode(false);
      setForm({ title: "", content: "", cover_until: undefined });
      toast.success("作成しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (layer: DesignLayer) => {
    setSaving(true);
    try {
      const updated = await upsertDesignLayer({
        id: layer.id,
        layer_type: activeTab,
        title: form.title.trim(),
        content: form.content || undefined,
        cover_until: form.cover_until || undefined,
      });
      setLayers((prev) => prev.map((l) => (l.id === layer.id ? updated : l)));
      setEditingId(null);
      toast.success("更新しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (layer: DesignLayer) => {
    try {
      await deleteDesignLayer(layer.id);
      setLayers((prev) => prev.filter((l) => l.id !== layer.id));
      toast.success("削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const startEdit = (layer: DesignLayer) => {
    setEditingId(layer.id);
    setForm({
      title: layer.title,
      content: layer.content ?? "",
      cover_until: layer.cover_until ?? undefined,
    });
  };

  const config = TAB_CONFIG[activeTab];

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6">
      <PageHeader
        title="設計レイヤー"
        description="設計の貯金残高を管理する"
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setCreateMode(true);
              setEditingId(null);
              setForm({ title: "", content: "", cover_until: undefined });
            }}
          >
            <Plus className="w-3 h-3" />
            新規ドキュメント
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as TabType);
          setCreateMode(false);
          setEditingId(null);
        }}
      >
        <TabsList>
          {(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {TAB_CONFIG[tab].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* 作成フォーム */}
      {createMode && (
        <div className="rounded-lg p-5 bg-card border border-[color:var(--color-primary)]">
          <div className="space-y-3">
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="タイトル"
              autoFocus
            />
            {config.showCoverUntil && (
              <div>
                <label className="text-sm block mb-1 text-muted-foreground">
                  カバー期限
                </label>
                <DatePicker
                  value={form.cover_until}
                  onChange={(v) => setForm((f) => ({ ...f, cover_until: v }))}
                  placeholder="カバー期限を選択"
                />
              </div>
            )}
            <Textarea
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              placeholder="内容（任意）"
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateMode(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!form.title.trim() || saving}
              >
                {saving ? "作成中..." : "作成"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* レイヤーリスト */}
      {loading ? (
        <div className="text-sm text-center py-8 text-muted-foreground">
          読み込み中...
        </div>
      ) : layers.length === 0 && !createMode ? (
        <EmptyState
          icon={<Layers className="w-5 h-5" />}
          title="ドキュメントがありません"
          description={`${config.label}のドキュメントを追加しましょう`}
          action={{
            label: "新規ドキュメントを作成",
            onClick: () => {
              setCreateMode(true);
              setForm({ title: "", content: "", cover_until: undefined });
            },
          }}
        />
      ) : (
        <div className="space-y-3">
          {layers.map((layer) => {
            const health = config.getHealth(layer);
            const isEditing = editingId === layer.id;

            return (
              <div
                key={layer.id}
                className={`rounded-lg p-5 group bg-card border ${isEditing ? "border-[color:var(--color-primary)]" : "border-border"}`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      autoFocus
                    />
                    {config.showCoverUntil && (
                      <div>
                        <label className="text-sm block mb-1 text-muted-foreground">
                          カバー期限
                        </label>
                        <DatePicker
                          value={form.cover_until}
                          onChange={(v) =>
                            setForm((f) => ({ ...f, cover_until: v }))
                          }
                          placeholder="カバー期限を選択"
                        />
                      </div>
                    )}
                    <Textarea
                      value={form.content}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, content: e.target.value }))
                      }
                      rows={4}
                      className="resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        onClick={() => handleEdit(layer)}
                        disabled={!form.title.trim() || saving}
                        className="p-1.5 rounded disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-medium">{layer.title}</h3>
                        <Badge className={HEALTH_BADGE_CLASS[health.status]}>
                          {health.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(layer)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          }
                          title={`"${layer.title}" を削除しますか？`}
                          description="この操作は取り消せません。"
                          confirmLabel="削除"
                          variant="destructive"
                          onConfirm={() => handleDelete(layer)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-xs text-muted-foreground">
                        最終更新: {formatDate(layer.last_updated_at)}
                      </span>
                      {config.showCoverUntil && layer.cover_until && (
                        <span className="text-xs text-muted-foreground">
                          カバー期限: {formatDate(layer.cover_until)}
                        </span>
                      )}
                    </div>
                    {layer.content && (
                      <p className="text-sm leading-relaxed mt-3 whitespace-pre-wrap text-muted-foreground">
                        {layer.content}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LayersPage() {
  return (
    <Suspense>
      <LayersContent />
    </Suspense>
  );
}
