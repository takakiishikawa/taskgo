'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ListTodo,
  Layers,
  LogOut,
  Sun,
  Moon,
  Info,
  Zap,
  Target,
  ChevronUp,
  LayoutGrid,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/tasks', label: 'タスク', icon: ListTodo },
  { href: '/focus', label: 'フォーカス管理', icon: Target },
  { href: '/layers', label: '設計レイヤー', icon: Layers },
]

const GO_APPS = [
  { name: 'NativeGo',   url: 'https://english-learning-app-black.vercel.app/', color: '#E5484D' },
  { name: 'CareGo',     url: 'https://care-go-mu.vercel.app/dashboard',        color: '#30A46C' },
  { name: 'KenyakuGo',  url: 'https://kenyaku-go.vercel.app/',                 color: '#F5A623' },
  { name: 'TaskGo',     url: 'https://taskgo-dun.vercel.app/',                 color: '#5E6AD2' },
  { name: 'CookGo',     url: 'https://cook-go-lovat.vercel.app/dashboard',     color: '#1AD1A5' },
  { name: 'PhysicalGo', url: 'https://physical-go.vercel.app/dashboard',       color: '#FF6B6B' },
]

const CURRENT_APP = 'TaskGo'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [appsOpen, setAppsOpen] = useState(false)
  const appsRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) {
        setAppsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <aside
      className="flex-shrink-0 flex flex-col min-h-screen"
      style={{ width: 220 }}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #5E6AD2 0%, #7B87E3 100%)' }}
          >
            <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <span className="text-sm font-semibold text-foreground">TaskGo</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors',
                isActive
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              <Icon
                className={cn('flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}
                style={{ width: 14, height: 14 }}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        {/* About */}
        <Link
          href="/about"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded text-xs w-full transition-colors',
            pathname === '/about'
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <Info style={{ width: 14, height: 14 }} className="flex-shrink-0" />
          コンセプト・使い方
        </Link>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2.5 px-3 py-2 rounded text-xs w-full transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/60"
        >
          {theme === 'dark'
            ? <Sun style={{ width: 14, height: 14 }} className="flex-shrink-0" />
            : <Moon style={{ width: 14, height: 14 }} className="flex-shrink-0" />
          }
          {theme === 'dark' ? 'ライトモード' : 'ダークモード'}
        </button>

        {/* App switcher */}
        <div ref={appsRef} className="relative">
          <button
            onClick={() => setAppsOpen((o) => !o)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded text-xs w-full transition-colors',
              appsOpen
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
            )}
          >
            <LayoutGrid style={{ width: 14, height: 14 }} className="flex-shrink-0" />
            <span className="flex-1 text-left">Goシリーズ</span>
            <ChevronUp
              style={{ width: 12, height: 12 }}
              className={cn('flex-shrink-0 transition-transform', appsOpen ? 'rotate-0' : 'rotate-180')}
            />
          </button>

          {/* Drop-up panel */}
          {appsOpen && (
            <div
              className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-border overflow-hidden"
              style={{ background: 'var(--popover)' }}
            >
              {GO_APPS.map((app) => {
                const isCurrent = app.name === CURRENT_APP
                return isCurrent ? (
                  <div
                    key={app.name}
                    className="flex items-center gap-2.5 px-3 py-2 cursor-default"
                    style={{ background: 'var(--accent)' }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: app.color }}
                    />
                    <span className="text-xs font-medium text-foreground flex-1">{app.name}</span>
                    <span className="text-xs" style={{ color: app.color, opacity: 0.8 }}>現在</span>
                  </div>
                ) : (
                  <a
                    key={app.name}
                    href={app.url}
                    onClick={() => setAppsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: app.color }}
                    />
                    <span className="text-xs">{app.name}</span>
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-2 rounded text-xs w-full transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/60"
        >
          <LogOut style={{ width: 14, height: 14 }} className="flex-shrink-0" />
          ログアウト
        </button>
      </div>
    </aside>
  )
}
