import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ActivityFeed } from '@/components/parent/activity-feed'

export default async function ParentDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get parent's children
  interface ChildRow {
    id: string
    first_name: string
    last_name: string
    profile_photo_url: string | null
  }
  const { data: childrenData } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', user.id)

  const children = childrenData as ChildRow[] | null
  if (!children || children.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Welcome to Mommy & Me</h1>
        <p className="text-muted-foreground">
          No children have been added to your account yet. Please contact the daycare administrator.
        </p>
      </div>
    )
  }

  // Get activity logs for all children
  const childIds = children.map((c) => c.id)
  const { data: activities } = await supabase
    .from('activity_logs')
    .select(`
      *,
      author:profiles!activity_logs_author_id_fkey(full_name, avatar_url),
      child:children!activity_logs_child_id_fkey(first_name, last_name, profile_photo_url)
    `)
    .in('child_id', childIds)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Today&apos;s Updates</h1>
        <p className="text-muted-foreground">
          See what&apos;s happening with your little ones
        </p>
      </div>

      <ActivityFeed activities={activities || []} childrenData={children as unknown as import('@/types/supabase').Child[]} />
    </div>
  )
}
