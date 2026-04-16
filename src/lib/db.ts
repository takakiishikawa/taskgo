import { createClient } from '@/lib/supabase/client'
import type { Task, DesignLayer, AiSuggestion, LayerType, TaskStatus } from '@/types/database'

// スキーマが 'taskgo' の場合は .schema('taskgo') を使う。
// Supabase Dashboard > Project Settings > API > "Extra schemas to expose" に
// 'taskgo' を追加している場合のみ有効。
// テーブルが public スキーマにある場合は SCHEMA 定数を 'public' に変更してください。
const SCHEMA = 'taskgo' as const

function db() {
  return createClient().schema(SCHEMA)
}

// ── Tasks ──────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  const { data, error } = await db()
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`getTasks: ${error.message}`)
  return data ?? []
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await db()
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createTask(params: {
  title: string
  description?: string
  layer_type: LayerType
  due_date?: string
}): Promise<Task> {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('認証エラー: ログインし直してください')

  const { data, error } = await db()
    .from('tasks')
    .insert({
      user_id: user.id,
      title: params.title,
      description: params.description ?? null,
      layer_type: params.layer_type,
      due_date: params.due_date ?? null,
      status: 'pending',
      is_focus: false,
    })
    .select()
    .single()
  if (error) throw new Error(`createTask: ${error.message}`)
  return data
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'layer_type' | 'status' | 'is_focus' | 'due_date'>>
): Promise<Task> {
  const { data, error } = await db()
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`updateTask: ${error.message}`)
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await db()
    .from('tasks')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`deleteTask: ${error.message}`)
}

// ── Design Layers ──────────────────────────────────────

export async function getDesignLayers(layerType?: 'core_value' | 'roadmap' | 'spec_design'): Promise<DesignLayer[]> {
  let query = db()
    .from('design_layers')
    .select('*')
    .order('last_updated_at', { ascending: false })

  if (layerType) {
    query = query.eq('layer_type', layerType)
  }

  const { data, error } = await query
  if (error) throw new Error(`getDesignLayers: ${error.message}`)
  return data ?? []
}

export async function upsertDesignLayer(params: {
  id?: string
  layer_type: 'core_value' | 'roadmap' | 'spec_design'
  title: string
  content?: string
  cover_until?: string
}): Promise<DesignLayer> {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('認証エラー: ログインし直してください')

  const now = new Date().toISOString()

  if (params.id) {
    const { data, error } = await db()
      .from('design_layers')
      .update({
        title: params.title,
        content: params.content ?? null,
        cover_until: params.cover_until ?? null,
        last_updated_at: now,
      })
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw new Error(`updateDesignLayer: ${error.message}`)
    return data
  } else {
    const { data, error } = await db()
      .from('design_layers')
      .insert({
        user_id: user.id,
        layer_type: params.layer_type,
        title: params.title,
        content: params.content ?? null,
        cover_until: params.cover_until ?? null,
        last_updated_at: now,
      })
      .select()
      .single()
    if (error) throw new Error(`createDesignLayer: ${error.message}`)
    return data
  }
}

export async function deleteDesignLayer(id: string): Promise<void> {
  const { error } = await db()
    .from('design_layers')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`deleteDesignLayer: ${error.message}`)
}

// ── AI Suggestions ─────────────────────────────────────

export async function getAiSuggestions(taskId: string): Promise<AiSuggestion[]> {
  const { data, error } = await db()
    .from('ai_suggestions')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`getAiSuggestions: ${error.message}`)
  return data ?? []
}

// ── Dashboard helpers ──────────────────────────────────

export async function getFocusTasks(): Promise<Task[]> {
  const { data, error } = await db()
    .from('tasks')
    .select('*')
    .eq('is_focus', true)
    .neq('status', 'done')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(3)
  if (error) throw new Error(`getFocusTasks: ${error.message}`)
  return data ?? []
}

export async function getStalestTask(): Promise<Task | null> {
  const { data, error } = await db()
    .from('tasks')
    .select('*')
    .in('status', ['pending', 'in_progress'])
    .order('updated_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}

export async function getLatestDesignLayer(layerType: 'core_value' | 'roadmap' | 'spec_design'): Promise<DesignLayer | null> {
  const { data, error } = await db()
    .from('design_layers')
    .select('*')
    .eq('layer_type', layerType)
    .order('cover_until', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}
