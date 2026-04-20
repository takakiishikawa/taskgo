import { AppLayout } from '@takaki/go-design-system'
import { TaskGoSidebar } from '@/components/layout/sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <main>{children}</main>
  }

  return (
    <AppLayout sidebar={<TaskGoSidebar />}>
      {children}
    </AppLayout>
  )
}
