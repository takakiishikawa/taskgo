'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ListTodo, Layers, LogOut } from 'lucide-react'

const navItems = [
  { href: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/tasks', label: 'タスク', icon: ListTodo },
  { href: '/layers', label: '設計レイヤー', icon: Layers },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="flex-shrink-0 flex flex-col min-h-screen"
      style={{ width: 220, background: '#111111', borderRight: '1px solid #2A2A2A' }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid #2A2A2A' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ background: '#5E6AD2' }}
          >
            T
          </div>
          <span className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>
            taskgo
          </span>
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
                  ? 'text-white'
                  : 'hover:bg-[#1E1E1E]'
              )}
              style={{
                color: isActive ? '#F0F0F0' : '#6B6B6B',
                background: isActive ? '#1E1E1E' : undefined,
              }}
            >
              <Icon
                className="flex-shrink-0"
                style={{
                  width: 14,
                  height: 14,
                  color: isActive ? '#5E6AD2' : '#6B6B6B',
                }}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3" style={{ borderTop: '1px solid #2A2A2A' }}>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-2 rounded text-xs w-full transition-colors hover:bg-[#1E1E1E]"
          style={{ color: '#6B6B6B' }}
        >
          <LogOut style={{ width: 14, height: 14 }} className="flex-shrink-0" />
          ログアウト
        </button>
      </div>
    </aside>
  )
}
