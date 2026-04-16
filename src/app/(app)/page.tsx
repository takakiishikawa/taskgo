'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getFocusTasks, getStalestTask, getLatestDesignLayer, updateTask } from '@/lib/db'
import type { Task, DesignLayer } from '@/types/database'
import { StatusDot } from '@/components/ui/status-dot'
import { formatDate, getDaysAgo, getMonthsFromNow } from '@/lib/date'
import { CheckCircle2, Circle, ChevronRight, Sparkles, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

// ── 貯金残高ロジック ──────────────────────────────────

type HealthStatus = 'green' | 'yellow' | 'red'

function getCoreValueHealth(layer: DesignLayer | null): { status: HealthStatus; label: string } {
  if (!layer) return { status: 'red', label: '未更新' }
  const days = getDaysAgo(layer.last_updated_at)
  if (days >= 90) return { status: 'red', label: `${days}日前に更新` }
  if (days >= 30) return { status: 'yellow', label: `${days}日前に更新` }
  return { status: 'green', label: `${days}日前に更新` }
}

function getRoadmapHealth(layer: DesignLayer | null): { status: HealthStatus; label: string } {
  if (!layer?.cover_until) return { status: 'red', label: 'カバー期限未設定' }
  const months = getMonthsFromNow(layer.cover_until)
  if (months < 12) return { status: 'red', label: `${layer.cover_until} まで` }
  if (months < 24) return { status: 'yellow', label: `${layer.cover_until} まで` }
  return { status: 'green', label: `${layer.cover_until} まで` }
}

function getSpecDesignHealth(layer: DesignLayer | null): { status: HealthStatus; label: string } {
  if (!layer?.cover_until) return { status: 'red', label: 'カバー期限未設定' }
  const months = getMonthsFromNow(layer.cover_until)
  if (months < 3) return { status: 'red', label: `${layer.cover_until} まで` }
  if (months < 6) return { status: 'yellow', label: `${layer.cover_until} まで` }
  return { status: 'green', label: `${layer.cover_until} まで` }
}

const healthColors: Record<HealthStatus, string> = {
  green: '#30A46C',
  yellow: '#F5A623',
  red: '#E5484D',
}

const healthBg: Record<HealthStatus, string> = {
  green: 'rgba(48,164,108,0.08)',
  yellow: 'rgba(245,166,35,0.08)',
  red: 'rgba(229,72,77,0.08)',
}

// ── Component ─────────────────────────────────────────

export default function DashboardPage() {
  const [focusTasks, setFocusTasks] = useState<Task[]>([])
  const [stalestTask, setStalestTask] = useState<Task | null>(null)
  const [layers, setLayers] = useState<{
    core_value: DesignLayer | null
    roadmap: DesignLayer | null
    spec_design: DesignLayer | null
  }>({ core_value: null, roadmap: null, spec_design: null })
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [focus, stale, cv, rm, sd] = await Promise.all([
        getFocusTasks(),
        getStalestTask(),
        getLatestDesignLayer('core_value'),
        getLatestDesignLayer('roadmap'),
        getLatestDesignLayer('spec_design'),
      ])
      setFocusTasks(focus)
      setStalestTask(stale)
      setLayers({ core_value: cv, roadmap: rm, spec_design: sd })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCompleteTask = async (task: Task) => {
    try {
      await updateTask(task.id, { status: 'done' })
      setFocusTasks((prev) => prev.filter((t) => t.id !== task.id))
      toast.success(`"${task.title}" を完了しました`)
    } catch {
      toast.error('更新に失敗しました')
    }
  }

  const handleFetchAiSuggestion = async () => {
    if (!stalestTask) return
    setLoadingAi(true)
    try {
      const res = await fetch('/api/ai/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: stalestTask.title,
          description: stalestTask.description,
          layerType: stalestTask.layer_type,
        }),
      })
      const data = await res.json()
      setAiSuggestion(data.suggestion)
    } catch {
      toast.error('AI提案の取得に失敗しました')
    } finally {
      setLoadingAi(false)
    }
  }

  useEffect(() => {
    if (stalestTask) handleFetchAiSuggestion()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stalestTask?.id])

  const cvHealth = getCoreValueHealth(layers.core_value)
  const rmHealth = getRoadmapHealth(layers.roadmap)
  const sdHealth = getSpecDesignHealth(layers.spec_design)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: '#6B6B6B' }}>
        <div className="text-sm">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* ページタイトル */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold" style={{ color: '#F0F0F0' }}>ダッシュボード</h2>
        <p className="text-xs mt-1" style={{ color: '#6B6B6B' }}>設計貯金の状態を確認する</p>
      </div>

      {/* 設計貯金残高 */}
      <section className="mb-8">
        <h3 className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: '#6B6B6B' }}>
          設計貯金残高
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: 'コアバリュー', health: cvHealth, sub: '90日以内更新で健康', href: '/layers?tab=core_value' },
            { title: 'ロードマップ', health: rmHealth, sub: '2年以上カバーで健康', href: '/layers?tab=roadmap' },
            { title: '仕様・デザイン', health: sdHealth, sub: '6ヶ月以上カバーで健康', href: '/layers?tab=spec_design' },
          ].map(({ title, health, sub, href }) => (
            <Link
              key={title}
              href={href}
              className="block rounded-lg p-5 transition-colors"
              style={{
                background: '#1A1A1A',
                border: `1px solid #2A2A2A`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1E1E1E')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#1A1A1A')}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: '#F0F0F0' }}>{title}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: healthBg[health.status],
                    color: healthColors[health.status],
                  }}
                >
                  {health.status === 'green' ? '健康' : health.status === 'yellow' ? '注意' : '要更新'}
                </span>
              </div>
              <p className="text-xs" style={{ color: '#6B6B6B' }}>{health.label}</p>
              <p className="text-xs mt-1" style={{ color: '#3A3A3A' }}>{sub}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 今週のフォーカス */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B6B6B' }}>
            今週のフォーカス
          </h3>
          <Link
            href="/tasks"
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: '#6B6B6B' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#F0F0F0')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B6B')}
          >
            フォーカスを編集 <ChevronRight style={{ width: 12, height: 12 }} />
          </Link>
        </div>

        <div
          className="rounded-lg overflow-hidden"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          {focusTasks.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-xs" style={{ color: '#6B6B6B' }}>フォーカス中のタスクはありません</p>
              <Link
                href="/tasks"
                className="inline-block mt-2 text-xs"
                style={{ color: '#5E6AD2' }}
              >
                タスク一覧からフォーカスを設定する
              </Link>
            </div>
          ) : (
            focusTasks.map((task, i) => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-5 py-3.5"
                style={{
                  borderBottom: i < focusTasks.length - 1 ? '1px solid #2A2A2A' : undefined,
                }}
              >
                <button
                  onClick={() => handleCompleteTask(task)}
                  className="flex-shrink-0 transition-colors"
                  style={{ color: '#6B6B6B' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#30A46C')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B6B')}
                >
                  {task.status === 'done'
                    ? <CheckCircle2 style={{ width: 16, height: 16, color: '#30A46C' }} />
                    : <Circle style={{ width: 16, height: 16 }} />
                  }
                </button>
                <Link
                  href={`/tasks/${task.id}`}
                  className="flex-1 min-w-0"
                >
                  <span className="text-sm block truncate" style={{ color: '#F0F0F0' }}>
                    {task.title}
                  </span>
                </Link>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <TaskStatusBadge status={task.status} />
                  {task.due_date && (
                    <span className="text-xs" style={{ color: '#6B6B6B' }}>
                      {formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* AIサジェスト */}
      {stalestTask && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium uppercase tracking-wider flex items-center gap-2" style={{ color: '#6B6B6B' }}>
              <Sparkles style={{ width: 12, height: 12, color: '#5E6AD2' }} />
              AIサジェスト
            </h3>
            <button
              onClick={handleFetchAiSuggestion}
              disabled={loadingAi}
              className="text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
              style={{ color: '#6B6B6B' }}
              onMouseEnter={(e) => !loadingAi && (e.currentTarget.style.color = '#F0F0F0')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B6B')}
            >
              <RefreshCw
                style={{ width: 12, height: 12 }}
                className={loadingAi ? 'animate-spin' : ''}
              />
              再取得
            </button>
          </div>

          <div
            className="rounded-lg p-5"
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium" style={{ color: '#F0F0F0' }}>
                  {stalestTask.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#6B6B6B' }}>
                  最も長く止まっているタスク
                </p>
              </div>
              <Link
                href={`/tasks/${stalestTask.id}`}
                className="text-xs flex items-center gap-1 flex-shrink-0 ml-4 transition-colors"
                style={{ color: '#5E6AD2' }}
              >
                詳しく聞く <ChevronRight style={{ width: 12, height: 12 }} />
              </Link>
            </div>

            {loadingAi ? (
              <div className="mt-3">
                <div className="h-3 rounded" style={{ background: '#2A2A2A', width: '60%' }} />
                <div className="h-3 rounded mt-2" style={{ background: '#2A2A2A', width: '80%' }} />
                <div className="h-3 rounded mt-2" style={{ background: '#2A2A2A', width: '40%' }} />
              </div>
            ) : aiSuggestion ? (
              <div
                className="mt-3 text-xs leading-relaxed whitespace-pre-wrap rounded p-3"
                style={{
                  color: '#B0B0B0',
                  background: '#141414',
                  border: '1px solid #2A2A2A',
                }}
              >
                {aiSuggestion}
              </div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  )
}

function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: '未着手', color: '#6B6B6B' },
    in_progress: { label: '進行中', color: '#5E6AD2' },
    done: { label: '完了', color: '#30A46C' },
  }
  const s = map[status] ?? map.pending
  return <StatusDot variant={status === 'done' ? 'green' : status === 'in_progress' ? 'blue' : 'gray'} label={s.label} />
}
