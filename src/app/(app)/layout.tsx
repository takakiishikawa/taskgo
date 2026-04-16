import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="border-r border-border bg-sidebar">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
}
