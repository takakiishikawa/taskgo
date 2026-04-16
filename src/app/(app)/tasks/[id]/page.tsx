'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTask, updateTask, getAiSuggestions } from '@/lib/db'
import type { Task, AiSuggestion, LayerType, TaskStatus } from '@/types/database'
import { StatusDot } from '@/components/ui/status-dot'
import { DatePicker } from '@/components/ui/date-picker'
import { ArrowLeft, Sparkles, BookOpen, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const LAYER_LABELS: Record<LayerType, string> = {
  core_value: 'コアバリュー',
  roadmap: 'ロードマップ',
  spec_design: '仕様・デザイン',
  other: 'その他',
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: 'gray' | 'blue' | 'green' }> = {
  pending: { label: '未着手', dot: 'gray' },
  in_progress: { label: '進行中', dot: 'blue' },
  done: { label: '完了', dot: 'green' },
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState<'first_step' | 'research' | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    layer_type: 'spec_design' as LayerType,
    status: 'pending' as TaskStatus,
    due_date: undefined as string | undefined,
  })

  const loadData = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([getTask(id), getAiSuggestions(id)])
      if (!t) { router.push('/tasks'); return }
      setTask(t)
      setSuggestions(s)
      setEditForm({
        title: t.title,
        description: t.description ?? '',
        layer_type: t.layer_type,
        status: t.status,
        due_date: t.due_date ?? undefined,
      })
    } catch (e) {
      console.error(e)
      toast.error('読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    if (!task) return
    setSaving(true)
    try {
      const updated = await updateTask(task.id, {
        title: editForm.title.trim(),
        description: editForm.description || null,
        layer_type: editForm.layer_type,
        status: editForm.status,
        due_date: editForm.due_date || null,
      })
      setTask(updated)
      setEditMode(false)
      toast.success('保存しました')
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleAiSuggest = async (type: 'first_step' | 'research') => {
    if (!task) return
    setAiLoading(type)
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          title: task.title,
          description: task.description,
          layerType: task.layer_type,
          suggestionType: type,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSuggestions((prev) => [data.suggestion, ...prev])
      toast.success('AI提案を取得しました')
    } catch (e) {
      console.error(e)
      toast.error('AI提案の取得に失敗しました')
    } finally {
      setAiLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        読み込み中...
      </div>
    )
  }

  if (!task) return null

  const statusConf = STATUS_CONFIG[task.status]

  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs mb-6 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft style={{ width: 13, height: 13 }} />
        タスク一覧に戻る
      </button>

      {/* Task info */}
      <div className="rounded-lg p-6 mb-6 bg-card border border-border">
        <div className="flex items-start justify-between mb-4">
          {editMode ? (
            <input
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              className="text-base font-medium flex-1 mr-4 px-2 py-1 rounded outline-none bg-input border border-ring text-foreground"
            />
          ) : (
            <h2 className="text-base font-medium flex-1 text-foreground">{task.title}</h2>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusDot variant={statusConf.dot} label={statusConf.label} />
            {editMode ? (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="text-xs px-2.5 py-1.5 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs px-2.5 py-1.5 rounded disabled:opacity-50 transition-colors"
                  style={{ background: '#5E6AD2', color: '#FFFFFF' }}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="text-xs px-2.5 py-1.5 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                編集
              </button>
            )}
          </div>
        </div>

        {/* Meta fields */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs block mb-1 text-muted-foreground">レイヤー</label>
            {editMode ? (
              <Select
                value={editForm.layer_type}
                onValueChange={(v) => setEditForm((f) => ({ ...f, layer_type: v as LayerType }))}
              >
                <SelectTrigger className="text-xs h-8 bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {(Object.keys(LAYER_LABELS) as LayerType[]).map((l) => (
                    <SelectItem key={l} value={l} className="text-foreground text-xs">
                      {LAYER_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs text-foreground">{LAYER_LABELS[task.layer_type]}</span>
            )}
          </div>

          <div>
            <label className="text-xs block mb-1 text-muted-foreground">ステータス</label>
            {editMode ? (
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as TaskStatus }))}
              >
                <SelectTrigger className="text-xs h-8 bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-foreground text-xs">
                      {STATUS_CONFIG[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs text-foreground">{statusConf.label}</span>
            )}
          </div>

          <div>
            <label className="text-xs block mb-1 text-muted-foreground">期日</label>
            {editMode ? (
              <DatePicker
                value={editForm.due_date}
                onChange={(v) => setEditForm((f) => ({ ...f, due_date: v }))}
              />
            ) : (
              <span className="text-xs text-foreground">
                {task.due_date
                  ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
                  : '—'}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs block mb-1 text-muted-foreground">説明</label>
          {editMode ? (
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="タスクの詳細..."
              rows={4}
              className="text-sm resize-none bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
            />
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: task.description ? 'var(--muted-foreground)' : 'var(--border)' }}>
              {task.description || '説明なし'}
            </p>
          )}
        </div>
      </div>

      {/* AI buttons */}
      <div className="rounded-lg p-5 mb-6 bg-card border border-border">
        <h3 className="text-xs font-medium mb-4 flex items-center gap-2 text-muted-foreground">
          <Sparkles style={{ width: 12, height: 12, color: '#5E6AD2' }} />
          AIサジェスト
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => handleAiSuggest('first_step')}
            disabled={aiLoading !== null}
            className="flex items-center gap-2 text-xs px-4 py-2.5 rounded border transition-colors disabled:opacity-50"
            style={{ border: '1px solid #5E6AD2', color: '#5E6AD2', background: 'transparent' }}
            onMouseEnter={(e) => { if (!aiLoading) e.currentTarget.style.background = 'rgba(94,106,210,0.1)' }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Sparkles style={{ width: 12, height: 12 }} />
            {aiLoading === 'first_step' ? '提案中...' : '次の一手を提案してもらう'}
          </button>

          <button
            onClick={() => handleAiSuggest('research')}
            disabled={aiLoading !== null}
            className="flex items-center gap-2 text-xs px-4 py-2.5 rounded border transition-colors disabled:opacity-50 border-border text-muted-foreground hover:border-ring hover:text-foreground"
            style={{ background: 'transparent' }}
          >
            <BookOpen style={{ width: 12, height: 12 }} />
            {aiLoading === 'research' ? '提案中...' : 'リサーチを手伝ってもらう'}
          </button>
        </div>
      </div>

      {/* AI suggestions history */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="text-xs font-medium mb-3 uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
            <Clock style={{ width: 12, height: 12 }} />
            過去のAI提案
          </h3>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div key={s.id} className="rounded-lg p-4 bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: s.suggestion_type === 'first_step' ? 'rgba(94,106,210,0.15)' : 'var(--secondary)',
                      color: s.suggestion_type === 'first_step' ? '#5E6AD2' : 'var(--muted-foreground)',
                    }}
                  >
                    {s.suggestion_type === 'first_step' ? '次の一手' : 'リサーチ'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString('ja-JP', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {s.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
