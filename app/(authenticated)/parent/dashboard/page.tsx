import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ActivityFeed } from '@/components/parent/activity-feed'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'
import {
  Baby,
  Clock,
  CheckCircle2,
  XCircle,
  Utensils,
  Moon,
  Camera,
  MessageSquare,
  ChevronRight,
  AlertTriangle
} from 'lucide-react'

export default async function ParentDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get parent's children with classroom info
  interface ChildRow {
    id: string
    first_name: string
    last_name: string
    profile_photo_url: string | null
    current_status: string
    allergies: string[] | null
    classroom: { name: string; age_group: string } | null
  }
  const { data: childrenData } = await supabase
    .from('children')
    .select(`
      id, first_name, last_name, profile_photo_url, current_status, allergies,
      classroom:classrooms(name, age_group)
    `)
    .eq('parent_id', user.id)

  const children = childrenData as ChildRow[] | null
  if (!children || children.length === 0) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="rounded-2xl bg-white shadow-soft border-2 border-dashed border-border/50 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mb-6">
              <Baby className="h-10 w-10 text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Mommy & Me</h2>
            <p className="text-muted-foreground text-center max-w-md">
              No children have been added to your account yet. Please contact the daycare administrator to link your child to your account.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Get activity logs for all children
  const childIds = children.map((c) => c.id)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { data: activities },
    { data: todayActivitiesData }
  ] = await Promise.all([
    supabase
      .from('activity_logs')
      .select(`
        *,
        author:profiles!activity_logs_author_id_fkey(full_name, avatar_url),
        child:children!activity_logs_child_id_fkey(first_name, last_name, profile_photo_url)
      `)
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('activity_logs')
      .select('child_id, type')
      .in('child_id', childIds)
      .gte('created_at', today.toISOString())
  ])

  // Calculate activity counts per child for today
  const todayActivities = todayActivitiesData as { child_id: string; type: string }[] | null
  const childActivityCounts = new Map<string, { meals: number; naps: number; photos: number }>()

  childIds.forEach(id => {
    childActivityCounts.set(id, { meals: 0, naps: 0, photos: 0 })
  })

  todayActivities?.forEach(activity => {
    const counts = childActivityCounts.get(activity.child_id)
    if (counts) {
      if (activity.type === 'meal') counts.meals++
      if (activity.type === 'nap') counts.naps++
      if (activity.type === 'photo') counts.photos++
    }
  })

  // Time of day greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
            <Baby className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{greeting}</h1>
            <p className="text-muted-foreground">
              Here&apos;s how your little ones are doing today
            </p>
          </div>
        </div>
      </div>

      {/* Children Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        {children.map((child) => {
          const counts = childActivityCounts.get(child.id) || { meals: 0, naps: 0, photos: 0 }
          const isCheckedIn = child.current_status === 'checked_in'
          const hasAllergies = (child.allergies?.length || 0) > 0

          return (
            <div key={child.id} className="rounded-2xl bg-white shadow-soft overflow-hidden hover-lift group">
              <div className={`h-1.5 ${isCheckedIn ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-slate-300 to-slate-200'}`} />
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16 ring-4 ring-white shadow-md">
                      <AvatarImage src={child.profile_photo_url || undefined} className="object-cover" />
                      <AvatarFallback className="text-xl bg-gradient-to-br from-rose-400 to-purple-500 text-white font-bold">
                        {getInitials(`${child.first_name} ${child.last_name}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-white shadow-sm ${isCheckedIn ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {hasAllergies && (
                      <div className="allergy-indicator">
                        <AlertTriangle className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold truncate mb-2">
                      {child.first_name} {child.last_name}
                    </h3>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={`rounded-lg font-semibold text-xs px-2.5 py-1 ${isCheckedIn ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-slate-100 text-slate-600 border-0'}`}>
                        {isCheckedIn ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> At Daycare</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> At Home</>
                        )}
                      </Badge>
                      {child.classroom && (
                        <Badge className="bg-purple-100 text-purple-700 border-0 rounded-lg text-xs font-medium">{child.classroom.name}</Badge>
                      )}
                    </div>

                    {/* Today's Activity Summary */}
                    {isCheckedIn && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 rounded-lg">
                          <Utensils className="h-3.5 w-3.5 text-amber-600" />
                          <span className="text-xs font-medium text-amber-700">{counts.meals}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 rounded-lg">
                          <Moon className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="text-xs font-medium text-indigo-700">{counts.naps}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-pink-50 rounded-lg">
                          <Camera className="h-3.5 w-3.5 text-pink-600" />
                          <span className="text-xs font-medium text-pink-700">{counts.photos}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Link href={`/parent/children/${child.id}`}>
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 group-hover:bg-primary/5">
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-8">
        <Link href="/parent/chat" className="flex-1">
          <Button variant="outline" className="w-full gap-2 rounded-xl py-6 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-all">
            <MessageSquare className="h-5 w-5" />
            Message Teacher
          </Button>
        </Link>
        <Link href="/parent/children" className="flex-1">
          <Button variant="outline" className="w-full gap-2 rounded-xl py-6 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all">
            <Baby className="h-5 w-5" />
            View All Children
          </Button>
        </Link>
      </div>

      {/* Activity Feed */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Today&apos;s Updates</h2>
            <p className="text-muted-foreground text-sm">Latest activities from your children</p>
          </div>
        </div>
      </div>

      <ActivityFeed activities={activities || []} childrenData={children as unknown as import('@/types/supabase').Child[]} />
    </div>
  )
}
