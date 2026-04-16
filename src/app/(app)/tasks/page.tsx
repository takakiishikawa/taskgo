'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/db'
import type { Task, LayerType, TaskStatus } from '@/types/database'
import { StatusDot } from '@/components/ui/status-dot'
import { formatDate } from '@/lib/date'
import { Plus, Star, Trash2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const LAYER_LABELS: Record<LayerType, string> = {
  core_value: 'コアバリュー',
  roadmap: 'ロードマップ',
  spec_design: '仕様・デザイン',
  other: 'その他',
}

const LAYER_ORDER: LayerType[] = ['core_value', 'roadmap', 'spec_design', 'other']

const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: 'gray' | 'blue' | 'green' }> = {
  pending: { label: '未着手', dot: 'gray' },
  in_progress: { label: '進行中', dot: 'blue' },
  done: { label: '完了', dot: 'green' },
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    layer_type: 'spec_design' as LayerType,
    due_date: '',
  })
  const [creating, setCreating] = useState(false)

  const loadTasks = useCallback(async () => {
    try {
      const data = await getTasks()
      setTasks(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  const filteredTasks = tasks.filter((t) =>
    statusFilter === 'all' ? true : t.status === statusFilter
  )

  const groupedTasks = LAYER_ORDER.reduce<Record<LayerType, Task[]>>((acc, layer) => {
    acc[layer] = filteredTasks.filter((t) => t.layer_type === layer)
    return acc
  }, { core_value: [], roadmap: [], spec_design: [], other: [] })

  const handleToggleFocus = async (task: Task) => {
    const currentFocusCount = tasks.filter((t) => t.is_focus && t.id !== task.id).length
    if (!task.is_focus && currentFocusCount >= 3) {
      toast.error('フォーカスは最大3件までです')
      return
    }
    try {
      const updated = await updateTask(task.id, { is_focus: !task.is_focus })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    } catch {
      toast.error('更新に失敗しました')
    }
  }

  const handleDelete = async (task: Task) => {
    if (!confirm(`"${task.title}" を削除しますか？`)) return
    try {
      await deleteTask(task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
      toast.success('削除しました')
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setCreating(true)
    try {
      const task = await createTask({
        title: form.title.trim(),
        description: form.description || undefined,
        layer_type: form.layer_type,
        due_date: form.due_date || undefined,
      })
      setTasks((prev) => [task, ...prev])
      setCreateOpen(false)
      setForm({ title: '', description: '', layer_type: 'spec_design', due_date: '' })
      toast.success('タスクを作成しました')
    } catch {
      toast.error('作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: '#6B6B6B' }}>
        <div className="text-sm">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#F0F0F0' }}>タスク</h2>
          <p className="text-xs mt-1" style={{ color: '#6B6B6B' }}>設計タスクを管理する</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded transition-colors"
          style={{ background: '#5E6AD2', color: '#FFFFFF' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#4F5BC0')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#5E6AD2')}
        >
          <Plus style={{ width: 13, height: 13 }} />
          新規タスク
        </button>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1 mb-6">
        {(['all', 'pending', 'in_progress', 'done'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="text-xs px-3 py-1.5 rounded transition-colors"
            style={{
              background: statusFilter === s ? '#2A2A2A' : 'transparent',
              color: statusFilter === s ? '#F0F0F0' : '#6B6B6B',
            }}
          >
            {s === 'all' ? 'すべて' : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Task groups */}
      <div className="space-y-6">
        {LAYER_ORDER.map((layer) => {
          const layerTasks = groupedTasks[layer]
          if (layerTasks.length === 0) return null
          return (
            <div key={layer}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B6B6B' }}>
                  {LAYER_LABELS[layer]}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: '#2A2A2A', color: '#6B6B6B' }}
                >
                  {layerTasks.length}
                </span>
              </div>

              <div
                className="rounded-lg overflow-hidden"
                style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
              >
                {layerTasks.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isLast={i === layerTasks.length - 1}
                    onToggleFocus={handleToggleFocus}
                    onDelete={handleDelete}
                    onStatusChange={async (status) => {
                      const updated = await updateTask(task.id, { status })
                      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          style={{
            background: '#1A1A1A',
            border: '1px solid #2A2A2A',
            color: '#F0F0F0',
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: '#F0F0F0', fontSize: 14 }}>新規タスク</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs block mb-1.5" style={{ color: '#6B6B6B' }}>タイトル *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="タスクのタイトルを入力"
                className="w-full text-sm px-3 py-2 rounded outline-none transition-colors"
                style={{
                  background: '#141414',
                  border: '1px solid #2A2A2A',
                  color: '#F0F0F0',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#5E6AD2')}
                onBlur={(e) => (e.target.style.borderColor = '#2A2A2A')}
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs block mb-1.5" style={{ color: '#6B6B6B' }}>レイヤー</label>
              <Select
                value={form.layer_type}
                onValueChange={(v) => setForm((f) => ({ ...f, layer_type: v as LayerType }))}
              >
                <SelectTrigger
                  className="text-sm"
                  style={{
                    background: '#141414',
                    border: '1px solid #2A2A2A',
                    color: '#F0F0F0',
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
                  {LAYER_ORDER.map((l) => (
                    <SelectItem key={l} value={l} style={{ color: '#F0F0F0', fontSize: 13 }}>
                      {LAYER_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs block mb-1.5" style={{ color: '#6B6B6B' }}>期日</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded outline-none"
                style={{
                  background: '#141414',
                  border: '1px solid #2A2A2A',
                  color: '#F0F0F0',
                  colorScheme: 'dark',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#5E6AD2')}
                onBlur={(e) => (e.target.style.borderColor = '#2A2A2A')}
              />
            </div>

            <div>
              <label className="text-xs block mb-1.5" style={{ color: '#6B6B6B' }}>説明</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="タスクの詳細（任意）"
                className="text-sm resize-none"
                rows={3}
                style={{
                  background: '#141414',
                  border: '1px solid #2A2A2A',
                  color: '#F0F0F0',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#5E6AD2')}
                onBlur={(e) => (e.target.style.borderColor = '#2A2A2A')}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCreateOpen(false)}
                className="text-xs px-3 py-2 rounded transition-colors"
                style={{ color: '#6B6B6B', background: '#2A2A2A' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#333')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#2A2A2A')}
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.title.trim() || creating}
                className="text-xs px-3 py-2 rounded transition-colors disabled:opacity-50"
                style={{ background: '#5E6AD2', color: '#FFFFFF' }}
                onMouseEnter={(e) => !creating && (e.currentTarget.style.background = '#4F5BC0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#5E6AD2')}
              >
                {creating ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TaskRow({
  task,
  isLast,
  onToggleFocus,
  onDelete,
  onStatusChange,
}: {
  task: Task
  isLast: boolean
  onToggleFocus: (task: Task) => void
  onDelete: (task: Task) => void
  onStatusChange: (status: TaskStatus) => Promise<void>
}) {
  const statusConf = STATUS_CONFIG[task.status]

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 group"
      style={{
        borderBottom: isLast ? undefined : '1px solid #2A2A2A',
      }}
    >
      {/* Focus toggle */}
      <button
        onClick={() => onToggleFocus(task)}
        className="flex-shrink-0 transition-colors"
        title={task.is_focus ? 'フォーカスから外す' : 'フォーカスに追加'}
      >
        <Star
          style={{
            width: 14,
            height: 14,
            color: task.is_focus ? '#F5A623' : '#3A3A3A',
            fill: task.is_focus ? '#F5A623' : 'none',
          }}
        />
      </button>

      {/* Title */}
      <Link
        href={`/tasks/${task.id}`}
        className="flex-1 min-w-0 flex items-center gap-2"
      >
        <span
          className="text-sm truncate transition-colors"
          style={{ color: task.status === 'done' ? '#4A4A4A' : '#F0F0F0' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = task.status === 'done' ? '#4A4A4A' : '#5E6AD2')}
          onMouseLeave={(e) => (e.currentTarget.style.color = task.status === 'done' ? '#4A4A4A' : '#F0F0F0')}
        >
          {task.title}
        </span>
      </Link>

      {/* Due date */}
      {task.due_date && (
        <span className="text-xs flex-shrink-0" style={{ color: '#6B6B6B' }}>
          {formatDate(task.due_date)}
        </span>
      )}

      {/* Status */}
      <div className="flex-shrink-0">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          className="text-xs rounded px-2 py-1 outline-none cursor-pointer"
          style={{
            background: '#2A2A2A',
            border: 'none',
            color: '#F0F0F0',
          }}
        >
          <option value="pending">未着手</option>
          <option value="in_progress">進行中</option>
          <option value="done">完了</option>
        </select>
      </div>

      {/* Status dot */}
      <StatusDot variant={statusConf.dot} className="flex-shrink-0" />

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/tasks/${task.id}`}
          className="p-1 rounded transition-colors"
          style={{ color: '#6B6B6B' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#F0F0F0')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B6B')}
        >
          <ChevronRight style={{ width: 13, height: 13 }} />
        </Link>
        <button
          onClick={() => onDelete(task)}
          className="p-1 rounded transition-colors"
          style={{ color: '#6B6B6B' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#E5484D')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B6B')}
        >
          <Trash2 style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  )
}
