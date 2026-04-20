'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getWeeklyFocusTasks,
  addTaskToWeeklyFocus,
  removeTaskFromWeeklyFocus,
  markWeeklyFocusTaskDone,
  getTasks,
  type WeeklyFocusTaskWithTask,
} from '@/lib/db'
import type { Task } from '@/types/database'
import { getWeekStart, formatWeekLabel } from '@/lib/date'
import { StatusDot } from '@/components/ui/status-dot'
import { Plus, X, CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@takaki/go-design-system'

const WEEK_OFFSETS = [0, 1, 2, 3, 4]

export default function FocusPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [focusByWeek, setFocusByWeek] = useState<Record<number, WeeklyFocusTaskWithTask[]>>({})
  const [loading, setLoading] = useState<Record<number, boolean>>({})
  const [addOpen, setAddOpen] = useState(false)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [taskSearch, setTaskSearch] = useState('')
  const [adding, setAdding] = useState(false)

  const weekStart = (offset: number) => getWeekStart(offset)

  const loadWeek = useCallback(async (offset: number) => {
    setLoading((prev) => ({ ...prev, [offset]: true }))
    try {
      const data = await getWeeklyFocusTasks(weekStart(offset))
      setFocusByWeek((prev) => ({ ...prev, [offset]: data }))
    } catch (e) {
      console.error(e)
      toast.error('読み込みに失敗しました')
    } finally {
      setLoading((prev) => ({ ...prev, [offset]: false }))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    WEEK_OFFSETS.forEach((o) => loadWeek(o))
  }, [loadWeek])

  const openAddDialog = async () => {
    setTaskSearch('')
    setAddOpen(true)
    if (allTasks.length === 0) {
      try {
        const tasks = await getTasks()
        setAllTasks(tasks.filter((t) => t.status !== 'done'))
      } catch {
        toast.error('タスクの読み込みに失敗しました')
      }
    }
  }

  const handleAddTask = async (task: Task) => {
    setAdding(true)
    try {
      await addTaskToWeeklyFocus(weekStart(activeTab), task.id)
      await loadWeek(activeTab)
      setAddOpen(false)
      toast.success('フォーカスに追加しました')
    } catch (e) {
      console.error(e)
      toast.error('追加に失敗しました')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (wfTaskId: string) => {
    try {
      await removeTaskFromWeeklyFocus(wfTaskId)
      setFocusByWeek((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] ?? []).filter((wf) => wf.id !== wfTaskId),
      }))
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  const handleToggleDone = async (wfTask: WeeklyFocusTaskWithTask) => {
    try {
      await markWeeklyFocusTaskDone(wfTask.id, !wfTask.is_done)
      setFocusByWeek((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] ?? []).map((wf) =>
          wf.id === wfTask.id ? { ...wf, is_done: !wf.is_done } : wf
        ),
      }))
    } catch {
      toast.error('更新に失敗しました')
    }
  }

  const currentFocus = focusByWeek[activeTab] ?? []
  const isLoading = loading[activeTab]

  const alreadyAddedIds = new Set(currentFocus.map((wf) => wf.task_id))
  const filteredTasks = allTasks.filter(
    (t) =>
      !alreadyAddedIds.has(t.id) &&
      (taskSearch === '' || t.title.toLowerCase().includes(taskSearch.toLowerCase()))
  )

  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">フォーカス管理</h2>
          <p className="text-xs mt-1 text-muted-foreground">週ごとに集中するタスクを管理する</p>
        </div>
      </div>

      {/* Week tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {WEEK_OFFSETS.map((offset) => {
          const count = (focusByWeek[offset] ?? []).length
          const doneCount = (focusByWeek[offset] ?? []).filter((wf) => wf.is_done).length
          return (
            <button
              key={offset}
              onClick={() => setActiveTab(offset)}
              className="relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors"
              style={{
                color: activeTab === offset ? 'var(--foreground)' : 'var(--muted-foreground)',
                borderBottom: activeTab === offset ? '2px solid #5E6AD2' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {formatWeekLabel(offset)}
              {count > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: doneCount === count ? 'rgba(48,164,108,0.15)' : 'var(--accent)',
                    color: doneCount === count ? '#30A46C' : 'var(--muted-foreground)',
                    fontSize: 10,
                  }}
                >
                  {doneCount}/{count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Focus list */}
      <div className="rounded-lg overflow-hidden border border-border bg-card mb-4">
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : currentFocus.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {formatWeekLabel(activeTab)}のフォーカスタスクがありません
            </p>
          </div>
        ) : (
          currentFocus.map((wfTask, i) => (
            <div
              key={wfTask.id}
              className="flex items-center gap-3 px-4 py-3.5 group"
              style={{ borderBottom: i < currentFocus.length - 1 ? '1px solid var(--border)' : undefined }}
            >
              {/* Done toggle */}
              <button
                onClick={() => handleToggleDone(wfTask)}
                className="flex-shrink-0 transition-colors"
              >
                {wfTask.is_done
                  ? <CheckCircle2 style={{ width: 16, height: 16, color: '#30A46C' }} />
                  : <Circle style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                }
              </button>

              {/* Task title */}
              <Link href={`/tasks/${wfTask.task_id}`} className="flex-1 min-w-0">
                <span
                  className="text-sm block truncate text-foreground hover:text-primary transition-colors"
                  style={{ opacity: wfTask.is_done ? 0.4 : 1 }}
                >
                  {wfTask.task.title}
                </span>
              </Link>

              {/* Status */}
              <StatusDot
                variant={
                  wfTask.task.status === 'done' ? 'green'
                  : wfTask.task.status === 'in_progress' ? 'blue'
                  : 'gray'
                }
                label={
                  wfTask.task.status === 'done' ? '完了'
                  : wfTask.task.status === 'in_progress' ? '進行中'
                  : '未着手'
                }
                className="flex-shrink-0"
              />

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/tasks/${wfTask.task_id}`}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight style={{ width: 13, height: 13 }} />
                </Link>
                <button
                  onClick={() => handleRemove(wfTask.id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add button */}
      {currentFocus.length < 5 && (
        <button
          onClick={openAddDialog}
          className="flex items-center gap-2 text-sm px-4 py-2.5 rounded border transition-colors"
          style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#5E6AD2'
            e.currentTarget.style.color = '#5E6AD2'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--muted-foreground)'
          }}
        >
          <Plus style={{ width: 13, height: 13 }} />
          タスクを追加（{currentFocus.length}/5）
        </button>
      )}

      {/* Add task dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground text-sm">
              {formatWeekLabel(activeTab)}のフォーカスにタスクを追加
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            <input
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              placeholder="タスク名で検索..."
              className="w-full text-sm px-3 py-2 rounded outline-none transition-colors bg-input border border-border text-foreground placeholder:text-muted-foreground focus:border-ring mb-3"
              autoFocus
            />

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filteredTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {taskSearch ? '該当するタスクがありません' : '追加できるタスクがありません'}
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
                      variant={task.status === 'in_progress' ? 'blue' : 'gray'}
                      className="flex-shrink-0"
                    />
                    <span className="text-sm text-foreground truncate flex-1">{task.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
