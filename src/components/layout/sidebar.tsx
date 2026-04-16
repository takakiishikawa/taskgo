'use client'

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
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/tasks', label: 'タスク', icon: ListTodo },
  { href: '/layers', label: '設計レイヤー', icon: Layers },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

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
