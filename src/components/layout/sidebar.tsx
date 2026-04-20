'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  AppSwitcher,
} from '@takaki/go-design-system'
import {
  LayoutDashboard,
  ListTodo,
  Target,
  Layers,
  Info,
  LogOut,
  Zap,
  Sun,
  Moon,
} from 'lucide-react'

const GO_APPS = [
  { name: 'NativeGo',      url: 'https://native-go.vercel.app',        color: '#0052CC' },
  { name: 'CareGo',        url: 'https://care-go.vercel.app',          color: '#30A46C' },
  { name: 'KenyakuGo',     url: 'https://kenyaku-go.vercel.app',       color: '#1A7A4A' },
  { name: 'TaskGo',        url: 'https://task-go.vercel.app',          color: '#5E6AD2' },
  { name: 'CookGo',        url: 'https://cook-go.vercel.app',          color: '#1AD1A5' },
  { name: 'PhysicalGo',    url: 'https://physical-go.vercel.app',      color: '#FF6B6B' },
  { name: 'Design System', url: 'https://go-design-system.vercel.app', color: '#6B7280' },
]

const mainNavItems = [
  { href: '/',       label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/tasks',  label: 'タスク',         icon: ListTodo },
  { href: '/focus',  label: 'フォーカス管理', icon: Target },
  { href: '/layers', label: '設計レイヤー',   icon: Layers },
]

const footerNavItems = [
  { href: '/about', label: 'コンセプト・使い方', icon: Info },
]

function isItemActive(href: string, pathname: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

function useDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = useCallback(() => {
    const next = !isDark
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('taskgo-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('taskgo-theme', 'light')
    }
    setIsDark(next)
  }, [isDark])

  return { isDark, toggle }
}

export function TaskGoSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isDark, toggle } = useDarkMode()

  const handleSignOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }, [router])

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
            style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 60%, white) 100%)' }}
          >
            <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold">TaskGo</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const Icon = item.icon
                const active = isItemActive(item.href, pathname)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.href} className="flex items-center gap-2">
                        <Icon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {footerNavItems.map((item) => {
            const Icon = item.icon
            const active = isItemActive(item.href, pathname)
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={active}>
                  <Link href={item.href} className="flex items-center gap-2">
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}

          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggle}>
              {isDark
                ? <Sun className="size-4 shrink-0" />
                : <Moon className="size-4 shrink-0" />
              }
              {isDark ? 'ライトモード' : 'ダークモード'}
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="size-4 shrink-0" />
              ログアウト
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <AppSwitcher currentApp="TaskGo" apps={GO_APPS} placement="top" />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
