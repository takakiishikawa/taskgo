import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto" style={{ background: '#0F0F0F' }}>
        {children}
      </main>
    </div>
  )
}
