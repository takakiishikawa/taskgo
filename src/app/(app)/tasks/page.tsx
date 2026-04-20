'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  getTasks, createTask, updateTask, deleteTask,
  getTagsForTasks, getAllTags,
} from '@/lib/db'
import type { Task, LayerType, TaskStatus, Tag } from '@/types/database'
import { StatusDot } from '@/components/ui/status-dot'
import { TagBadge } from '@/components/ui/tag-badge'
import { OutputModal } from '@/components/ui/output-modal'
import { formatDate } from '@/lib/date'
import { Plus, Star, Trash2, ChevronRight, Tag as TagIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import {
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
} from '@takaki/go-design-system'
import { DatePicker } from '@/components/ui/date-picker'

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
  const [tagsByTask, setTagsByTask] = useState<Record<string, Tag[]>>({})
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    layer_type: 'spec_design' as LayerType,
    due_date: undefined as string | undefined,
  })
  const [creating, setCreating] = useState(false)

  // Output modal state
  const [outputModal, setOutputModal] = useState<{ open: boolean; task: Task | null }>({
    open: false, task: null,
  })
  const pendingStatusRef = useRef<{ taskId: string; status: TaskStatus } | null>(null)

  const loadTasks = useCallback(async () => {
    try {
      const data = await getTasks()
      setTasks(data)
      const [tagsMap, tags] = await Promise.all([
        getTagsForTasks(data.map((t) => t.id)),
        getAllTags(),
      ])
      setTagsByTask(tagsMap)
      setAllTags(tags)
    } catch (e) {
      console.error(e)
      toast.error('タスクの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (tagFilter) {
      const tags = tagsByTask[t.id] ?? []
      if (!tags.some((tag) => tag.name === tagFilter)) return false
    }
    return true
  })

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
    } catch (e) {
      console.error(e)
      toast.error('更新に失敗しました')
    }
  }

  const handleDelete = async (task: Task) => {
    if (!confirm(`"${task.title}" を削除しますか？`)) return
    try {
      await deleteTask(task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
      toast.success('削除しました')
    } catch (e) {
      console.error(e)
      toast.error('削除に失敗しました')
    }
  }

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    if (status === 'done' && task.status !== 'done') {
      // Show output modal before saving
      pendingStatusRef.current = { taskId: task.id, status }
      setOutputModal({ open: true, task })
      return
    }
    try {
      const updated = await updateTask(task.id, { status })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    } catch (e) {
      console.error(e)
      toast.error('更新に失敗しました')
    }
  }

  const handleOutputSave = async (outputNote: string) => {
    const pending = pendingStatusRef.current
    if (!pending) return
    try {
      const updated = await updateTask(pending.taskId, {
        status: 'done',
        output_note: outputNote,
        completed_at: new Date().toISOString(),
      })
      setTasks((prev) => prev.map((t) => (t.id === pending.taskId ? updated : t)))
      toast.success('アウトプットを記録しました')
    } catch (e) {
      console.error(e)
      toast.error('更新に失敗しました')
    } finally {
      pendingStatusRef.current = null
      setOutputModal({ open: false, task: null })
    }
  }

  const handleOutputSkip = async () => {
    const pending = pendingStatusRef.current
    if (!pending) return
    try {
      const updated = await updateTask(pending.taskId, {
        status: 'done',
        completed_at: new Date().toISOString(),
      })
      setTasks((prev) => prev.map((t) => (t.id === pending.taskId ? updated : t)))
    } catch (e) {
      console.error(e)
      toast.error('更新に失敗しました')
    } finally {
      pendingStatusRef.current = null
      setOutputModal({ open: false, task: null })
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
      setForm({ title: '', description: '', layer_type: 'spec_design', due_date: undefined })
      toast.success('タスクを作成しました')
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : '作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        読み込み中...
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">タスク</h2>
          <p className="text-xs mt-1 text-muted-foreground">設計タスクを管理する</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded transition-colors"
          style={{ background: '#5E6AD2', color: '#FFFFFF' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#4F5BC0')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#5E6AD2')}
        >
          <Plus style={{ width: 13, height: 13 }} />
          新規タスク
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Status filter */}
        <div className="flex items-center gap-1">
          {(['all', 'pending', 'in_progress', 'done'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="text-sm px-3 py-1.5 rounded transition-colors"
              style={{
                background: statusFilter === s ? 'var(--accent)' : 'transparent',
                color: statusFilter === s ? 'var(--foreground)' : 'var(--muted-foreground)',
              }}
            >
              {s === 'all' ? 'すべて' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <TagIcon style={{ width: 12, height: 12, color: 'var(--muted-foreground)' }} />
            {allTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setTagFilter(tagFilter === tag.name ? null : tag.name)}
                className="text-xs px-2 py-0.5 rounded-full transition-opacity"
                style={{
                  opacity: tagFilter && tagFilter !== tag.name ? 0.4 : 1,
                  outline: tagFilter === tag.name ? '1px solid currentColor' : 'none',
                  outlineOffset: 1,
                }}
              >
                <TagBadge name={tag.name} size="xs" />
              </button>
            ))}
            {tagFilter && (
              <button
                onClick={() => setTagFilter(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <X style={{ width: 10, height: 10 }} />
                クリア
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task groups */}
      <div className="space-y-6">
        {LAYER_ORDER.map((layer) => {
          const layerTasks = groupedTasks[layer]
          if (layerTasks.length === 0) return null
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
                    onStatusChange={(status) => handleStatusChange(task, status)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {filteredTasks.length === 0 && (
          <div className="rounded-lg border border-border bg-card px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">タスクがありません</p>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground text-sm">新規タスク</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm block mb-1.5 text-muted-foreground">タイトル *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="タスクのタイトルを入力"
                className="w-full text-sm px-3 py-2 rounded outline-none transition-colors bg-input border border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm block mb-1.5 text-muted-foreground">レイヤー</label>
              <Select
                value={form.layer_type}
                onValueChange={(v) => setForm((f) => ({ ...f, layer_type: v as LayerType }))}
              >
                <SelectTrigger className="text-sm bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {LAYER_ORDER.map((l) => (
                    <SelectItem key={l} value={l} className="text-foreground text-sm">
                      {LAYER_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm block mb-1.5 text-muted-foreground">期日</label>
              <DatePicker
                value={form.due_date}
                onChange={(v) => setForm((f) => ({ ...f, due_date: v }))}
              />
            </div>

            <div>
              <label className="text-sm block mb-1.5 text-muted-foreground">説明</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="タスクの詳細（任意）"
                className="text-sm resize-none bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCreateOpen(false)}
                className="text-sm px-3 py-2 rounded transition-colors bg-secondary text-muted-foreground hover:text-foreground"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.title.trim() || creating}
                className="text-sm px-3 py-2 rounded transition-colors disabled:opacity-50"
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

      {/* Output modal */}
      <OutputModal
        open={outputModal.open}
        taskTitle={outputModal.task?.title ?? ''}
        onSave={handleOutputSave}
        onSkip={handleOutputSkip}
      />
    </div>
  )
}

function TaskRow({
  task,
  tags,
  isLast,
  onToggleFocus,
  onDelete,
  onStatusChange,
}: {
  task: Task
  tags: Tag[]
  isLast: boolean
  onToggleFocus: (task: Task) => void
  onDelete: (task: Task) => void
  onStatusChange: (status: TaskStatus) => void
}) {
  const statusConf = STATUS_CONFIG[task.status]

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 group"
      style={{ borderBottom: isLast ? undefined : '1px solid var(--border)' }}
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
            color: task.is_focus ? '#F5A623' : 'var(--border)',
            fill: task.is_focus ? '#F5A623' : 'none',
          }}
        />
      </button>

      {/* Title + tags */}
      <Link href={`/tasks/${task.id}`} className="flex-1 min-w-0">
        <span
          className="text-sm block truncate transition-colors text-foreground hover:text-primary"
          style={{ opacity: task.status === 'done' ? 0.4 : 1 }}
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

      {/* Due date */}
      {task.due_date && (
        <span className="text-xs flex-shrink-0 text-muted-foreground">
          {formatDate(task.due_date)}
        </span>
      )}

      {/* Status select */}
      <div className="flex-shrink-0">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          className="text-sm rounded px-2 py-1 outline-none cursor-pointer bg-secondary border-none text-foreground"
        >
          <option value="pending">未着手</option>
          <option value="in_progress">進行中</option>
          <option value="done">完了</option>
        </select>
      </div>

      <StatusDot variant={statusConf.dot} className="flex-shrink-0" />

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/tasks/${task.id}`}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight style={{ width: 13, height: 13 }} />
        </Link>
        <button
          onClick={() => onDelete(task)}
          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  )
}
