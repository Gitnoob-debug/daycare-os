import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
