import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { DevSwitcher } from '@/components/layout/dev-switcher'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as { id: string; email: string; full_name: string; role: string; avatar_url: string | null } | null
  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50/50 via-white to-teal-50/30">
      <DevSwitcher />
      <div className="flex-1 flex">
        <Sidebar profile={profile} />
        <main className="flex-1 overflow-auto">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
