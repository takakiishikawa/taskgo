'use client'

import { useRouter } from 'next/navigation'
import { AppSidebar } from '@takaki/go-design-system'
import {
  LayoutDashboard,
  ListTodo,
  Target,
  Layers,
  Info,
  Zap,
} from 'lucide-react'

const GO_APPS = [
  { name: 'NativeGo',      url: 'https://native-go.vercel.app',        color: '#0052CC' },
  { name: 'CareGo',        url: 'https://care-go.vercel.app',          color: '#30A46C' },
  { name: 'KenyakuGo',     url: 'https://kenyaku-go.vercel.app',       color: '#F5A623' },
  { name: 'TaskGo',        url: 'https://task-go.vercel.app',          color: '#5E6AD2' },
  { name: 'CookGo',        url: 'https://cook-go.vercel.app',          color: '#1AD1A5' },
  { name: 'PhysicalGo',    url: 'https://physical-go.vercel.app',      color: '#FF6B6B' },
  { name: 'Design System', url: 'https://go-design-system.vercel.app', color: '#6B7280' },
] as const

const navItems = [
  { title: 'ダッシュボード', url: '/',       icon: LayoutDashboard },
  { title: 'タスク',         url: '/tasks',  icon: ListTodo },
  { title: 'フォーカス管理', url: '/focus',  icon: Target },
  { title: '設計レイヤー',   url: '/layers', icon: Layers },
  { title: 'コンセプト',     url: '/about',  icon: Info },
]

const logo = (
  <div className="flex items-center gap-2">
    <div
      className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #5E6AD2 0%, #7B87E3 100%)' }}
    >
      <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
    </div>
    <span className="text-sm font-semibold">TaskGo</span>
  </div>
)

export function TaskGoSidebar() {
  const router = useRouter()

  return (
    <AppSidebar
      currentApp="TaskGo"
      apps={GO_APPS as unknown as { name: string; url: string; color: string }[]}
      navItems={navItems}
      logo={logo}
      onNavigate={(url) => {
        if (url.startsWith('http')) {
          window.location.href = url
        } else {
          router.push(url)
        }
      }}
    />
  )
}
