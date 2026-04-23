import { createClient } from "@/lib/supabase/client";
import type {
  Task,
  DesignLayer,
  AiSuggestion,
  LayerType,
  TaskStatus,
  Tag,
  WeeklyFocus,
  WeeklyFocusTask,
  WeeklySummary,
  RecurringTask,
  RecurringTaskType,
} from "@/types/database";
import { getWeekStart, toYMD } from "@/lib/date";

const SCHEMA = "taskgo" as const;
function db() {
  return createClient().schema(SCHEMA);
}

async function requireUser() {
  const {
    data: { user },
    error,
  } = await createClient().auth.getUser();
  if (error || !user) throw new Error("認証エラー");
  return user;
}

async function getUser() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  return user;
}

// ── Tasks ──────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  const { data, error } = await db()
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getTasks: ${error.message}`);
  return data ?? [];
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await db()
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function createTask(params: {
  title: string;
  description?: string;
  layer_type: LayerType;
  due_date?: string;
}): Promise<Task> {
  const user = await requireUser();
  const { data, error } = await db()
    .from("tasks")
    .insert({
      user_id: user.id,
      title: params.title,
      description: params.description ?? null,
      layer_type: params.layer_type,
      due_date: params.due_date ?? null,
      status: "pending",
      is_focus: false,
    })
    .select()
    .single();
  if (error) throw new Error(`createTask: ${error.message}`);
  return data;
}

export async function updateTask(
  id: string,
  updates: Partial<
    Pick<
      Task,
      | "title"
      | "description"
      | "layer_type"
      | "status"
      | "is_focus"
      | "due_date"
      | "output_note"
      | "completed_at"
    >
  >,
): Promise<Task> {
  const { data, error } = await db()
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`updateTask: ${error.message}`);
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await db().from("tasks").delete().eq("id", id);
  if (error) throw new Error(`deleteTask: ${error.message}`);
}

export async function getFocusTasks(): Promise<Task[]> {
  const { data, error } = await db()
    .from("tasks")
    .select("*")
    .eq("is_focus", true)
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(3);
  if (error) throw new Error(`getFocusTasks: ${error.message}`);
  return data ?? [];
}

export async function getStalestTask(): Promise<Task | null> {
  const { data } = await db()
    .from("tasks")
    .select("*")
    .in("status", ["pending", "in_progress"])
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

// ── Tags ───────────────────────────────────────────────

export async function getAllTags(): Promise<Tag[]> {
  const { data } = await db().from("tags").select("*").order("name");
  return data ?? [];
}

/** task_id のリストに対応するタグを {task_id: Tag[]} で返す */
export async function getTagsForTasks(
  taskIds: string[],
): Promise<Record<string, Tag[]>> {
  if (taskIds.length === 0) return {};
  const { data: taskTagData } = await db()
    .from("task_tags")
    .select("task_id, tag_id")
    .in("task_id", taskIds);
  if (!taskTagData?.length) return {};
  const tagIds = [...new Set(taskTagData.map((tt) => tt.tag_id))];
  const { data: tagsData } = await db()
    .from("tags")
    .select("*")
    .in("id", tagIds);
  const tagsById = Object.fromEntries((tagsData ?? []).map((t) => [t.id, t]));
  const result: Record<string, Tag[]> = {};
  for (const tt of taskTagData) {
    if (!result[tt.task_id]) result[tt.task_id] = [];
    const tag = tagsById[tt.tag_id];
    if (tag) result[tt.task_id].push(tag);
  }
  return result;
}

export async function getTaskTagIds(taskId: string): Promise<string[]> {
  const { data } = await db()
    .from("task_tags")
    .select("tag_id")
    .eq("task_id", taskId);
  return (data ?? []).map((tt) => tt.tag_id);
}

/** タグ名からタグを upsert してタスクに紐づける */
export async function addTagToTask(
  taskId: string,
  tagName: string,
): Promise<Tag> {
  const user = await requireUser();

  // 既存タグを検索
  const { data: existing } = await db()
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .eq("name", tagName.trim())
    .maybeSingle();

  let tag: Tag;
  if (existing) {
    tag = existing;
  } else {
    const { data: created, error } = await db()
      .from("tags")
      .insert({ user_id: user.id, name: tagName.trim() })
      .select()
      .single();
    if (error) throw new Error(`addTag: ${error.message}`);
    tag = created;
  }

  // task_tags に追加（重複チェック）
  const { data: existingLink } = await db()
    .from("task_tags")
    .select("id")
    .eq("task_id", taskId)
    .eq("tag_id", tag.id)
    .maybeSingle();
  if (!existingLink) {
    await db().from("task_tags").insert({ task_id: taskId, tag_id: tag.id });
  }
  return tag;
}

export async function removeTagFromTask(
  taskId: string,
  tagId: string,
): Promise<void> {
  const { error } = await db()
    .from("task_tags")
    .delete()
    .eq("task_id", taskId)
    .eq("tag_id", tagId);
  if (error) throw new Error(`removeTag: ${error.message}`);
}

// ── Design Layers ──────────────────────────────────────

export async function getDesignLayers(
  layerType?: "core_value" | "roadmap" | "spec_design",
): Promise<DesignLayer[]> {
  let query = db()
    .from("design_layers")
    .select("*")
    .order("last_updated_at", { ascending: false });
  if (layerType) query = query.eq("layer_type", layerType);
  const { data, error } = await query;
  if (error) throw new Error(`getDesignLayers: ${error.message}`);
  return data ?? [];
}

export async function upsertDesignLayer(params: {
  id?: string;
  layer_type: "core_value" | "roadmap" | "spec_design";
  title: string;
  content?: string;
  cover_until?: string;
}): Promise<DesignLayer> {
  const user = await requireUser();
  const now = new Date().toISOString();
  if (params.id) {
    const { data, error } = await db()
      .from("design_layers")
      .update({
        title: params.title,
        content: params.content ?? null,
        cover_until: params.cover_until ?? null,
        last_updated_at: now,
      })
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw new Error(`updateDesignLayer: ${error.message}`);
    return data;
  } else {
    const { data, error } = await db()
      .from("design_layers")
      .insert({
        user_id: user.id,
        layer_type: params.layer_type,
        title: params.title,
        content: params.content ?? null,
        cover_until: params.cover_until ?? null,
        last_updated_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(`createDesignLayer: ${error.message}`);
    return data;
  }
}

export async function deleteDesignLayer(id: string): Promise<void> {
  const { error } = await db().from("design_layers").delete().eq("id", id);
  if (error) throw new Error(`deleteDesignLayer: ${error.message}`);
}

export async function getLatestDesignLayer(
  layerType: "core_value" | "roadmap" | "spec_design",
): Promise<DesignLayer | null> {
  const { data } = await db()
    .from("design_layers")
    .select("*")
    .eq("layer_type", layerType)
    .order("cover_until", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// ── AI Suggestions ─────────────────────────────────────

export async function getAiSuggestions(
  taskId: string,
): Promise<AiSuggestion[]> {
  const { data, error } = await db()
    .from("ai_suggestions")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getAiSuggestions: ${error.message}`);
  return data ?? [];
}

// ── Weekly Focus ───────────────────────────────────────

export async function getOrCreateWeeklyFocus(
  weekStart: string,
): Promise<WeeklyFocus> {
  const user = await requireUser();

  const { data: existing } = await db()
    .from("weekly_focuses")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await db()
    .from("weekly_focuses")
    .insert({ user_id: user.id, week_start: weekStart })
    .select()
    .single();
  if (error) throw new Error(`createWeeklyFocus: ${error.message}`);
  return data;
}

export async function getWeeklyFocus(
  weekStart: string,
): Promise<WeeklyFocus | null> {
  const user = await getUser();
  if (!user) return null;
  const { data } = await db()
    .from("weekly_focuses")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();
  return data;
}

export type WeeklyFocusTaskWithTask = WeeklyFocusTask & { task: Task };

export async function getWeeklyFocusTasks(
  weekStart: string,
): Promise<WeeklyFocusTaskWithTask[]> {
  const focus = await getWeeklyFocus(weekStart);
  if (!focus) return [];

  const { data: wfTasks } = await db()
    .from("weekly_focus_tasks")
    .select("*")
    .eq("weekly_focus_id", focus.id)
    .order("created_at");
  if (!wfTasks?.length) return [];

  const taskIds = wfTasks.map((wf) => wf.task_id);
  const { data: tasks } = await db()
    .from("tasks")
    .select("*")
    .in("id", taskIds);
  const tasksById = Object.fromEntries((tasks ?? []).map((t) => [t.id, t]));

  return wfTasks
    .map((wf) => ({ ...wf, task: tasksById[wf.task_id] }))
    .filter((wf) => wf.task) as WeeklyFocusTaskWithTask[];
}

export async function addTaskToWeeklyFocus(
  weekStart: string,
  taskId: string,
): Promise<void> {
  const focus = await getOrCreateWeeklyFocus(weekStart);
  // 重複チェック
  const { data: existing } = await db()
    .from("weekly_focus_tasks")
    .select("id")
    .eq("weekly_focus_id", focus.id)
    .eq("task_id", taskId)
    .maybeSingle();
  if (existing) return;
  const { error } = await db()
    .from("weekly_focus_tasks")
    .insert({ weekly_focus_id: focus.id, task_id: taskId, is_done: false });
  if (error) throw new Error(`addTaskToWeeklyFocus: ${error.message}`);
}

export async function removeTaskFromWeeklyFocus(
  wfTaskId: string,
): Promise<void> {
  const { error } = await db()
    .from("weekly_focus_tasks")
    .delete()
    .eq("id", wfTaskId);
  if (error) throw new Error(`removeTaskFromWeeklyFocus: ${error.message}`);
}

export async function markWeeklyFocusTaskDone(
  wfTaskId: string,
  isDone: boolean,
): Promise<void> {
  const { error } = await db()
    .from("weekly_focus_tasks")
    .update({ is_done: isDone })
    .eq("id", wfTaskId);
  if (error) throw new Error(`markWeeklyFocusTaskDone: ${error.message}`);
}

// ── Weekly Summary ─────────────────────────────────────

export async function getWeeklySummary(
  weekStart: string,
): Promise<WeeklySummary | null> {
  const user = await getUser();
  if (!user) return null;
  const { data } = await db()
    .from("weekly_summaries")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();
  return data;
}

export async function saveWeeklySummary(
  weekStart: string,
  summaryText: string,
): Promise<WeeklySummary> {
  const user = await requireUser();

  const existing = await getWeeklySummary(weekStart);
  if (existing) {
    const { data, error } = await db()
      .from("weekly_summaries")
      .update({ summary: summaryText })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(`updateWeeklySummary: ${error.message}`);
    return data;
  }
  const { data, error } = await db()
    .from("weekly_summaries")
    .insert({ user_id: user.id, week_start: weekStart, summary: summaryText })
    .select()
    .single();
  if (error) throw new Error(`createWeeklySummary: ${error.message}`);
  return data;
}

/** 今週完了したタスク（completed_atベース） */
export async function getThisWeekCompletedTasks(): Promise<Task[]> {
  const weekStart = getWeekStart(0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const { data } = await db()
    .from("tasks")
    .select("*")
    .eq("status", "done")
    .gte("completed_at", weekStart)
    .lt("completed_at", toYMD(weekEnd))
    .order("completed_at", { ascending: false });
  return data ?? [];
}

// ── Recurring Tasks ────────────────────────────────────

export async function getRecurringTasks(): Promise<RecurringTask[]> {
  const user = await getUser();
  if (!user) return [];
  const { data } = await db()
    .from("recurring_tasks")
    .select("*")
    .eq("user_id", user.id);
  return data ?? [];
}

export async function initRecurringTasksIfNeeded(): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const existing = await getRecurringTasks();
  if (existing.length > 0) return;

  const today = toYMD(new Date());
  await db()
    .from("recurring_tasks")
    .insert([
      {
        user_id: user.id,
        task_type: "issue_discovery_short",
        next_generate_at: today,
      },
      {
        user_id: user.id,
        task_type: "issue_discovery_mid",
        next_generate_at: today,
      },
    ]);
}

export async function checkAndGenerateRecurringTasks(): Promise<Task[]> {
  const user = await getUser();
  if (!user) return [];

  const today = toYMD(new Date());
  const recurringTasks = await getRecurringTasks();
  // next_generate_at は timestamptz で返るため先頭10文字（YYYY-MM-DD）で比較
  const due = recurringTasks.filter(
    (rt) => rt.next_generate_at.slice(0, 10) <= today,
  );
  if (!due.length) return [];

  const generated: Task[] = [];
  const titleMap: Record<RecurringTaskType, string> = {
    issue_discovery_short: "【短期】課題発見",
    issue_discovery_mid: "【中期】課題発見",
  };
  const intervalDays: Record<RecurringTaskType, number> = {
    issue_discovery_short: 14,
    issue_discovery_mid: 30,
  };

  for (const rt of due) {
    // next_generate_at を先に更新（重複生成防止）
    const nextDate = new Date(rt.next_generate_at);
    nextDate.setDate(nextDate.getDate() + intervalDays[rt.task_type]);
    await db()
      .from("recurring_tasks")
      .update({ next_generate_at: toYMD(nextDate) })
      .eq("id", rt.id);

    // タスク生成
    const { data: task, error } = await db()
      .from("tasks")
      .insert({
        user_id: user.id,
        title: titleMap[rt.task_type],
        description: null,
        layer_type: "other",
        status: "pending",
        is_focus: false,
      })
      .select()
      .single();
    if (!error && task) generated.push(task);
  }
  return generated;
}
