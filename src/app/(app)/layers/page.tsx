'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { getDesignLayers, upsertDesignLayer, deleteDesignLayer } from '@/lib/db'
import type { DesignLayer } from '@/types/database'
import { formatDate, getMonthsFromNow, getDaysAgo } from '@/lib/date'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { Suspense } from 'react'

type TabType = 'core_value' | 'roadmap' | 'spec_design'

const TAB_CONFIG: Record<TabType, {
  label: string
  showCoverUntil: boolean
  getHealth: (layer: DesignLayer) => { status: 'green' | 'yellow' | 'red'; label: string }
}> = {
  core_value: {
    label: 'コアバリュー',
    showCoverUntil: false,
    getHealth: (layer) => {
      const days = getDaysAgo(layer.last_updated_at)
      if (days >= 90) return { status: 'red', label: `${days}日前に更新（要更新）` }
      if (days >= 30) return { status: 'yellow', label: `${days}日前に更新（注意）` }
      return { status: 'green', label: `${days}日前に更新（健康）` }
    },
  },
  roadmap: {
    label: 'ロードマップ',
    showCoverUntil: true,
    getHealth: (layer) => {
      if (!layer.cover_until) return { status: 'red', label: 'カバー期限未設定' }
      const m = getMonthsFromNow(layer.cover_until)
      if (m < 12) return { status: 'red', label: `残り${m}ヶ月（要補充）` }
      if (m < 24) return { status: 'yellow', label: `残り${m}ヶ月（注意）` }
      return { status: 'green', label: `残り${m}ヶ月（健康）` }
    },
  },
  spec_design: {
    label: '仕様・デザイン',
    showCoverUntil: true,
    getHealth: (layer) => {
      if (!layer.cover_until) return { status: 'red', label: 'カバー期限未設定' }
      const m = getMonthsFromNow(layer.cover_until)
      if (m < 3) return { status: 'red', label: `残り${m}ヶ月（要補充）` }
      if (m < 6) return { status: 'yellow', label: `残り${m}ヶ月（注意）` }
      return { status: 'green', label: `残り${m}ヶ月（健康）` }
    },
  },
}

const healthColors = { green: '#30A46C', yellow: '#F5A623', red: '#E5484D' }
const healthBg = {
  green: 'rgba(48,164,108,0.1)',
  yellow: 'rgba(245,166,35,0.1)',
  red: 'rgba(229,72,77,0.1)',
}

function LayersContent() {
  const searchParams = useSearchParams()
  const tabParam = (searchParams.get('tab') ?? 'core_value') as TabType
  const [activeTab, setActiveTab] = useState<TabType>(
    ['core_value', 'roadmap', 'spec_design'].includes(tabParam) ? tabParam : 'core_value'
  )
  const [layers, setLayers] = useState<DesignLayer[]>([])
  const [loading, setLoading] = useState(true)
  const [createMode, setCreateMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', content: '', cover_until: '' })
  const [saving, setSaving] = useState(false)

  const loadLayers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDesignLayers(activeTab)
      setLayers(data)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => { loadLayers() }, [loadLayers])

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const layer = await upsertDesignLayer({
        layer_type: activeTab,
        title: form.title.trim(),
        content: form.content || undefined,
        cover_until: form.cover_until || undefined,
      })
      setLayers((prev) => [layer, ...prev])
      setCreateMode(false)
      setForm({ title: '', content: '', cover_until: '' })
      toast.success('作成しました')
    } catch {
      toast.error('作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (layer: DesignLayer) => {
    setSaving(true)
    try {
      const updated = await upsertDesignLayer({
        id: layer.id,
        layer_type: activeTab,
        title: form.title.trim(),
        content: form.content || undefined,
        cover_until: form.cover_until || undefined,
      })
      setLayers((prev) => prev.map((l) => (l.id === layer.id ? updated : l)))
      setEditingId(null)
      toast.success('更新しました')
    } catch {
      toast.error('更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (layer: DesignLayer) => {
    if (!confirm(`"${layer.title}" を削除しますか？`)) return
    try {
      await deleteDesignLayer(layer.id)
      setLayers((prev) => prev.filter((l) => l.id !== layer.id))
      toast.success('削除しました')
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  const startEdit = (layer: DesignLayer) => {
    setEditingId(layer.id)
    setForm({
      title: layer.title,
      content: layer.content ?? '',
      cover_until: layer.cover_until ?? '',
    })
  }

  const config = TAB_CONFIG[activeTab]

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#F0F0F0' }}>設計レイヤー</h2>
          <p className="text-xs mt-1" style={{ color: '#6B6B6B' }}>設計の貯金残高を管理する</p>
        </div>
        <button
          onClick={() => { setCreateMode(true); setEditingId(null); setForm({ title: '', content: '', cover_until: '' }) }}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded transition-colors"
          style={{ background: '#5E6AD2', color: '#FFFFFF' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#4F5BC0')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#5E6AD2')}
        >
          <Plus style={{ width: 13, height: 13 }} />
          新規ドキュメント
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6" style={{ borderBottom: '1px solid #2A2A2A', paddingBottom: 0 }}>
        {(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setCreateMode(false); setEditingId(null) }}
            className="text-xs px-4 py-2.5 transition-colors -mb-px"
            style={{
              color: activeTab === tab ? '#F0F0F0' : '#6B6B6B',
              borderBottom: activeTab === tab ? '1px solid #5E6AD2' : '1px solid transparent',
            }}
          >
            {TAB_CONFIG[tab].label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {createMode && (
        <div
          className="rounded-lg p-5 mb-4"
          style={{ background: '#1A1A1A', border: '1px solid #5E6AD2' }}
        >
          <div className="space-y-3">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="タイトル"
              autoFocus
              className="w-full text-sm px-3 py-2 rounded outline-none"
              style={{ background: '#141414', border: '1px solid #2A2A2A', color: '#F0F0F0' }}
              onFocus={(e) => (e.target.style.borderColor = '#5E6AD2')}
              onBlur={(e) => (e.target.style.borderColor = '#2A2A2A')}
            />
            {config.showCoverUntil && (
              <div>
                <label className="text-xs block mb-1" style={{ color: '#6B6B6B' }}>カバー期限</label>
                <input
                  type="date"
                  value={form.cover_until}
                  onChange={(e) => setForm((f) => ({ ...f, cover_until: e.target.value }))}
                  className="text-sm px-3 py-2 rounded outline-none"
                  style={{ background: '#141414', border: '1px solid #2A2A2A', color: '#F0F0F0', colorScheme: 'dark' }}
                  onFocus={(e) => (e.target.style.borderColor = '#5E6AD2')}
                  onBlur={(e) => (e.target.style.borderColor = '#2A2A2A')}
                />
              </div>
            )}
            <Textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="内容（任意）"
              rows={3}
              className="text-sm resize-none"
              style={{ background: '#141414', border: '1px solid #2A2A2A', color: '#F0F0F0' }}
              onFocus={(e) => (e.target.style.borderColor = '#5E6AD2')}
              onBlur={(e) => (e.target.style.borderColor = '#2A2A2A')}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCreateMode(false)}
                className="text-xs px-3 py-1.5 rounded"
                style={{ color: '#6B6B6B', background: '#2A2A2A' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.title.trim() || saving}
                className="text-xs px-3 py-1.5 rounded disabled:opacity-50"
                style={{ background: '#5E6AD2', color: '#FFFFFF' }}
              >
                {saving ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layer list */}
      {loading ? (
        <div className="text-xs text-center py-8" style={{ color: '#6B6B6B' }}>読み込み中...</div>
      ) : layers.length === 0 && !createMode ? (
        <div
          className="rounded-lg px-5 py-10 text-center"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          <p className="text-xs" style={{ color: '#6B6B6B' }}>ドキュメントがありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {layers.map((layer) => {
            const health = config.getHealth(layer)
            const isEditing = editingId === layer.id

            return (
              <div
                key={layer.id}
                className="rounded-lg p-5 group"
                style={{ background: '#1A1A1A', border: `1px solid ${isEditing ? '#5E6AD2' : '#2A2A2A'}` }}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      autoFocus
                      className="w-full text-sm px-3 py-2 rounded outline-none"
                      style={{ background: '#141414', border: '1px solid #5E6AD2', color: '#F0F0F0' }}
                    />
                    {config.showCoverUntil && (
                      <div>
                        <label className="text-xs block mb-1" style={{ color: '#6B6B6B' }}>カバー期限</label>
                        <input
                          type="date"
                          value={form.cover_until}
                          onChange={(e) => setForm((f) => ({ ...f, cover_until: e.target.value }))}
                          className="text-sm px-3 py-2 rounded outline-none"
                          style={{ background: '#141414', border: '1px solid #2A2A2A', color: '#F0F0F0', colorScheme: 'dark' }}
                          onFocus={(e) => (e.target.style.borderColor = '#5E6AD2')}
                          onBlur={(e) => (e.target.style.borderColor = '#2A2A2A')}
                        />
                      </div>
                    )}
                    <Textarea
                      value={form.content}
                      onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                      rows={4}
                      className="text-sm resize-none"
                      style={{ background: '#141414', border: '1px solid #2A2A2A', color: '#F0F0F0' }}
                      onFocus={(e) => (e.target.style.borderColor = '#5E6AD2')}
                      onBlur={(e) => (e.target.style.borderColor = '#2A2A2A')}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded"
                        style={{ color: '#6B6B6B' }}
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                      <button
                        onClick={() => handleEdit(layer)}
                        disabled={!form.title.trim() || saving}
                        className="p-1.5 rounded disabled:opacity-50"
                        style={{ background: '#5E6AD2', color: '#FFFFFF' }}
                      >
                        <Check style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-medium" style={{ color: '#F0F0F0' }}>
                          {layer.title}
                        </h3>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: healthBg[health.status],
                            color: healthColors[health.status],
                          }}
                        >
                          {health.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(layer)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: '#6B6B6B' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#F0F0F0')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B6B')}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          onClick={() => handleDelete(layer)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: '#6B6B6B' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#E5484D')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B6B')}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-xs" style={{ color: '#6B6B6B' }}>
                        最終更新: {formatDate(layer.last_updated_at)}
                      </span>
                      {config.showCoverUntil && layer.cover_until && (
                        <span className="text-xs" style={{ color: '#6B6B6B' }}>
                          カバー期限: {formatDate(layer.cover_until)}
                        </span>
                      )}
                    </div>

                    {layer.content && (
                      <p
                        className="text-xs leading-relaxed mt-3 whitespace-pre-wrap"
                        style={{ color: '#8A8A8A' }}
                      >
                        {layer.content}
                      </p>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function LayersPage() {
  return (
    <Suspense>
      <LayersContent />
    </Suspense>
  )
}
