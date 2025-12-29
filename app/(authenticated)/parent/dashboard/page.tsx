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
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Baby className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Welcome to Mommy & Me</h2>
            <p className="text-muted-foreground text-center max-w-md">
              No children have been added to your account yet. Please contact the daycare administrator to link your child to your account.
            </p>
          </CardContent>
        </Card>
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
        <h1 className="text-3xl font-bold">{greeting}</h1>
        <p className="text-muted-foreground text-lg">
          Here&apos;s how your little ones are doing today
        </p>
      </div>

      {/* Children Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        {children.map((child) => {
          const counts = childActivityCounts.get(child.id) || { meals: 0, naps: 0, photos: 0 }
          const isCheckedIn = child.current_status === 'checked_in'
          const hasAllergies = (child.allergies?.length || 0) > 0

          return (
            <Card key={child.id} className="overflow-hidden">
              <div className={`h-1 ${isCheckedIn ? 'bg-green-500' : 'bg-gray-300'}`} />
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={child.profile_photo_url || undefined} />
                      <AvatarFallback className="text-xl">
                        {getInitials(`${child.first_name} ${child.last_name}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${isCheckedIn ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold truncate">
                        {child.first_name} {child.last_name}
                      </h3>
                      {hasAllergies && (
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={isCheckedIn ? 'default' : 'secondary'} className={isCheckedIn ? 'bg-green-100 text-green-700' : ''}>
                        {isCheckedIn ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> At Daycare</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> At Home</>
                        )}
                      </Badge>
                      {child.classroom && (
                        <Badge variant="outline">{child.classroom.name}</Badge>
                      )}
                    </div>

                    {/* Today's Activity Summary */}
                    {isCheckedIn && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Utensils className="h-3.5 w-3.5" />
                          <span>{counts.meals} meals</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Moon className="h-3.5 w-3.5" />
                          <span>{counts.naps} naps</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Camera className="h-3.5 w-3.5" />
                          <span>{counts.photos} photos</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Link href={`/parent/children/${child.id}`}>
                    <Button variant="ghost" size="icon">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-8">
        <Link href="/parent/chat" className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <MessageSquare className="h-4 w-4" />
            Message Teacher
          </Button>
        </Link>
        <Link href="/parent/children" className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <Baby className="h-4 w-4" />
            View All Children
          </Button>
        </Link>
      </div>

      {/* Activity Feed */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-1">Today&apos;s Updates</h2>
        <p className="text-muted-foreground text-sm">Latest activities from your children</p>
      </div>

      <ActivityFeed activities={activities || []} childrenData={children as unknown as import('@/types/supabase').Child[]} />
    </div>
  )
}
