'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTask, updateTask, getAiSuggestions } from '@/lib/db'
import type { Task, AiSuggestion, LayerType, TaskStatus } from '@/types/database'
import { StatusDot } from '@/components/ui/status-dot'
import { formatDate } from '@/lib/date'
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
    due_date: '',
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
        due_date: t.due_date ?? '',
      })
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
    } catch {
      toast.error('保存に失敗しました')
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
    } catch {
      toast.error('AI提案の取得に失敗しました')
    } finally {
      setAiLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: '#6B6B6B' }}>
        <div className="text-sm">読み込み中...</div>
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
        className="flex items-center gap-1.5 text-xs mb-6 transition-colors"
        style={{ color: '#6B6B6B' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#F0F0F0')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B6B')}
      >
        <ArrowLeft style={{ width: 13, height: 13 }} />
        タスク一覧に戻る
      </button>

      {/* Task info */}
      <div
        className="rounded-lg p-6 mb-6"
        style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
      >
        <div className="flex items-start justify-between mb-4">
          {editMode ? (
            <input
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              className="text-base font-medium flex-1 mr-4 px-2 py-1 rounded outline-none"
              style={{
                background: '#141414',
                border: '1px solid #5E6AD2',
                color: '#F0F0F0',
              }}
            />
          ) : (
            <h2 className="text-base font-medium flex-1" style={{ color: '#F0F0F0' }}>
              {task.title}
            </h2>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusDot variant={statusConf.dot} label={statusConf.label} />
            {editMode ? (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="text-xs px-2.5 py-1.5 rounded transition-colors"
                  style={{ color: '#6B6B6B', background: '#2A2A2A' }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs px-2.5 py-1.5 rounded transition-colors disabled:opacity-50"
                  style={{ background: '#5E6AD2', color: '#FFFFFF' }}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="text-xs px-2.5 py-1.5 rounded transition-colors"
                style={{ color: '#6B6B6B', background: '#2A2A2A' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#333')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#2A2A2A')}
              >
                編集
              </button>
            )}
          </div>
        </div>

        {/* Meta fields */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs block mb-1" style={{ color: '#6B6B6B' }}>レイヤー</label>
            {editMode ? (
              <Select
                value={editForm.layer_type}
                onValueChange={(v) => setEditForm((f) => ({ ...f, layer_type: v as LayerType }))}
              >
                <SelectTrigger className="text-xs h-8" style={{ background: '#141414', border: '1px solid #2A2A2A', color: '#F0F0F0' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
                  {(Object.keys(LAYER_LABELS) as LayerType[]).map((l) => (
                    <SelectItem key={l} value={l} style={{ color: '#F0F0F0', fontSize: 12 }}>
                      {LAYER_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs" style={{ color: '#F0F0F0' }}>{LAYER_LABELS[task.layer_type]}</span>
            )}
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: '#6B6B6B' }}>ステータス</label>
            {editMode ? (
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as TaskStatus }))}
              >
                <SelectTrigger className="text-xs h-8" style={{ background: '#141414', border: '1px solid #2A2A2A', color: '#F0F0F0' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
                  {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s} style={{ color: '#F0F0F0', fontSize: 12 }}>
                      {STATUS_CONFIG[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs" style={{ color: '#F0F0F0' }}>{statusConf.label}</span>
            )}
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: '#6B6B6B' }}>期日</label>
            {editMode ? (
              <input
                type="date"
                value={editForm.due_date}
                onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))}
                className="text-xs w-full px-2 py-1.5 rounded outline-none"
                style={{
                  background: '#141414',
                  border: '1px solid #2A2A2A',
                  color: '#F0F0F0',
                  colorScheme: 'dark',
                }}
              />
            ) : (
              <span className="text-xs" style={{ color: '#F0F0F0' }}>
                {task.due_date ? formatDate(task.due_date) : '—'}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs block mb-1" style={{ color: '#6B6B6B' }}>説明</label>
          {editMode ? (
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="タスクの詳細..."
              rows={4}
              className="text-sm resize-none"
              style={{
                background: '#141414',
                border: '1px solid #2A2A2A',
                color: '#F0F0F0',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#5E6AD2')}
              onBlur={(e) => (e.target.style.borderColor = '#2A2A2A')}
            />
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: task.description ? '#B0B0B0' : '#4A4A4A' }}>
              {task.description || '説明なし'}
            </p>
          )}
        </div>
      </div>

      {/* AI buttons */}
      <div
        className="rounded-lg p-5 mb-6"
        style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
      >
        <h3 className="text-xs font-medium mb-4 flex items-center gap-2" style={{ color: '#6B6B6B' }}>
          <Sparkles style={{ width: 12, height: 12, color: '#5E6AD2' }} />
          AIサジェスト
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => handleAiSuggest('first_step')}
            disabled={aiLoading !== null}
            className="flex items-center gap-2 text-xs px-4 py-2.5 rounded border transition-colors disabled:opacity-50"
            style={{
              border: '1px solid #5E6AD2',
              color: '#5E6AD2',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              if (aiLoading) return
              e.currentTarget.style.background = 'rgba(94,106,210,0.1)'
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Sparkles style={{ width: 12, height: 12 }} />
            {aiLoading === 'first_step' ? '提案中...' : '次の一手を提案してもらう'}
          </button>

          <button
            onClick={() => handleAiSuggest('research')}
            disabled={aiLoading !== null}
            className="flex items-center gap-2 text-xs px-4 py-2.5 rounded border transition-colors disabled:opacity-50"
            style={{
              border: '1px solid #2A2A2A',
              color: '#6B6B6B',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              if (aiLoading) return
              e.currentTarget.style.borderColor = '#5E6AD2'
              e.currentTarget.style.color = '#F0F0F0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2A2A2A'
              e.currentTarget.style.color = '#6B6B6B'
            }}
          >
            <BookOpen style={{ width: 12, height: 12 }} />
            {aiLoading === 'research' ? '提案中...' : 'リサーチを手伝ってもらう'}
          </button>
        </div>
      </div>

      {/* AI suggestions history */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="text-xs font-medium mb-3 uppercase tracking-wider flex items-center gap-2" style={{ color: '#6B6B6B' }}>
            <Clock style={{ width: 12, height: 12 }} />
            過去のAI提案
          </h3>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="rounded-lg p-4"
                style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: s.suggestion_type === 'first_step' ? 'rgba(94,106,210,0.15)' : '#2A2A2A',
                      color: s.suggestion_type === 'first_step' ? '#5E6AD2' : '#6B6B6B',
                    }}
                  >
                    {s.suggestion_type === 'first_step' ? '次の一手' : 'リサーチ'}
                  </span>
                  <span className="text-xs" style={{ color: '#6B6B6B' }}>
                    {new Date(s.created_at).toLocaleString('ja-JP', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <p
                  className="text-xs leading-relaxed whitespace-pre-wrap"
                  style={{ color: '#B0B0B0' }}
                >
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
