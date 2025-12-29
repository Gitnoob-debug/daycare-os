import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Users,
  Baby,
  AlertTriangle,
  Clock,
  TrendingUp,
  School,
  Camera,
  Utensils,
  Moon,
  Activity,
  ArrowRight,
  CheckCircle2,
  XCircle
} from 'lucide-react'

// SECURITY: Server component with authenticated access only
export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string } | null
  if (profile?.role !== 'owner') {
    redirect('/staff/dashboard')
  }

  // Get current time info
  const now = new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)

  // Parallel data fetching for performance
  const [
    { count: checkedInCount },
    { count: totalChildrenCount },
    { data: classroomsWithChildrenData },
    { data: activeStaffData },
    { data: todayActivitiesData },
    { data: recentActivitiesData },
    { count: totalStaffCount }
  ] = await Promise.all([
    supabase.from('children').select('*', { count: 'exact', head: true }).eq('current_status', 'checked_in'),
    supabase.from('children').select('*', { count: 'exact', head: true }),
    supabase.from('classrooms').select(`
      id, name, age_group, capacity, is_active,
      children:children(id, first_name, current_status)
    `).eq('is_active', true).order('name'),
    supabase.from('activity_logs').select('author_id').gte('created_at', today.toISOString()),
    supabase.from('activity_logs').select('type, created_at').gte('created_at', today.toISOString()),
    supabase.from('activity_logs').select(`
      id, type, description, created_at,
      child:children(first_name, last_name, profile_photo_url),
      author:profiles(full_name)
    `).order('created_at', { ascending: false }).limit(10),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['teacher', 'owner'])
  ])

  // Process classroom data
  interface ClassroomData {
    id: string
    name: string
    age_group: string
    capacity: number
    is_active: boolean
    children: { id: string; first_name: string; current_status: string }[]
  }
  const classroomsWithChildren = classroomsWithChildrenData as ClassroomData[] | null

  // Calculate active staff
  const activeStaff = activeStaffData as { author_id: string }[] | null
  const uniqueStaffCount = new Set(activeStaff?.map((a) => a.author_id)).size

  // Staff ratio
  const staffRatio = checkedInCount && uniqueStaffCount
    ? (checkedInCount / uniqueStaffCount).toFixed(1)
    : 'N/A'

  // Activity counts by type
  const todayActivities = todayActivitiesData as { type: string; created_at: string }[] | null
  const activityCounts = todayActivities?.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Process recent activities
  interface RecentActivity {
    id: string
    type: string
    description: string | null
    created_at: string
    child: { first_name: string; last_name: string; profile_photo_url: string | null } | null
    author: { full_name: string } | null
  }
  const recentActivities = recentActivitiesData as RecentActivity[] | null

  // Find classrooms with no recent activity
  const classroomLastActivity = new Map<string, Date>()
  todayActivities?.forEach(a => {
    // We'd need to join to get classroom, so we'll skip this for now
  })

  // Attendance percentage
  const attendancePercent = totalChildrenCount
    ? Math.round(((checkedInCount || 0) / totalChildrenCount) * 100)
    : 0

  // Activity type icons and colors
  const activityMeta: Record<string, { icon: typeof Camera; color: string; bg: string }> = {
    photo: { icon: Camera, color: 'text-blue-600', bg: 'bg-blue-100' },
    meal: { icon: Utensils, color: 'text-green-600', bg: 'bg-green-100' },
    nap: { icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    potty: { icon: Baby, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    mood: { icon: Activity, color: 'text-pink-600', bg: 'bg-pink-100' },
  }

  // Time of day greeting
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{greeting}</h1>
            <p className="text-muted-foreground">
              Here&apos;s what&apos;s happening at your daycare today
            </p>
          </div>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-soft hover-lift group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Attendance</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-md shadow-emerald-500/25">
                <Baby className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-4xl font-bold text-emerald-600">
              {checkedInCount || 0}
              <span className="text-xl text-muted-foreground font-normal ml-1">
                / {totalChildrenCount || 0}
              </span>
            </div>
            <div className="mt-3 h-2.5 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all rounded-full"
                style={{ width: `${attendancePercent}%` }}
              />
            </div>
            <p className="text-xs text-emerald-600 mt-2 font-medium">{attendancePercent}% checked in</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-soft hover-lift group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Staff On Duty</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/25">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-4xl font-bold text-blue-600">{uniqueStaffCount}</div>
            <p className="text-sm text-muted-foreground">of {totalStaffCount || 0} total staff</p>
            <div className="flex items-center gap-1.5 mt-3">
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium">Active today</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-soft hover-lift group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100 to-purple-50 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Staff Ratio</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/25">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-4xl font-bold text-purple-600">{staffRatio}:1</div>
            <p className="text-sm text-muted-foreground">children per staff</p>
            {typeof staffRatio === 'string' && parseFloat(staffRatio) <= 4 ? (
              <Badge className="mt-3 bg-emerald-100 text-emerald-700 border-0 px-3 py-1 rounded-lg font-semibold">Excellent</Badge>
            ) : typeof staffRatio === 'string' && parseFloat(staffRatio) <= 6 ? (
              <Badge className="mt-3 bg-amber-100 text-amber-700 border-0 px-3 py-1 rounded-lg font-semibold">Good</Badge>
            ) : (
              <Badge className="mt-3 bg-red-100 text-red-700 border-0 px-3 py-1 rounded-lg font-semibold">Review Needed</Badge>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-soft hover-lift group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-50 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Activities</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/25">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-4xl font-bold text-amber-600">
              {todayActivities?.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">logged updates today</p>
            <div className="flex gap-1.5 mt-3">
              {Object.entries(activityCounts).slice(0, 4).map(([type]) => {
                const meta = activityMeta[type]
                if (!meta) return null
                const Icon = meta.icon
                return (
                  <div key={type} className={`p-1.5 rounded-lg ${meta.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Classroom Status */}
        <div className="lg:col-span-2 rounded-2xl bg-white shadow-soft overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-border/30">
            <div>
              <h3 className="text-lg font-bold">Classroom Status</h3>
              <p className="text-sm text-muted-foreground">Real-time overview of all classrooms</p>
            </div>
            <Link href="/admin/classrooms">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700">
                Manage <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {classroomsWithChildren?.map((classroom) => {
                const checkedIn = classroom.children?.filter(c => c.current_status === 'checked_in').length || 0
                const total = classroom.children?.length || 0
                const fillPercent = classroom.capacity > 0 ? (checkedIn / classroom.capacity) * 100 : 0
                const isFull = fillPercent >= 100
                const isNearFull = fillPercent >= 80

                return (
                  <div key={classroom.id} className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all border border-border/30 hover:shadow-soft">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                          <School className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold">{classroom.name}</span>
                      </div>
                      <Badge className="bg-purple-100 text-purple-700 border-0 text-xs font-medium">{classroom.age_group}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Attendance</span>
                      <span className="font-semibold">
                        {checkedIn} / {classroom.capacity}
                        {isFull && <span className="ml-1 text-red-500 font-bold">(Full)</span>}
                      </span>
                    </div>
                    <div className="h-2.5 bg-white rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full transition-all rounded-full ${
                          isFull ? 'bg-gradient-to-r from-red-500 to-rose-400' : isNearFull ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-emerald-500 to-green-400'
                        }`}
                        style={{ width: `${Math.min(100, fillPercent)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {(!classroomsWithChildren || classroomsWithChildren.length === 0) && (
                <div className="col-span-2 text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <School className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">No classrooms set up yet</p>
                  <Link href="/admin/classrooms">
                    <Button variant="link" className="mt-2 text-primary">Create your first classroom</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Breakdown */}
        <div className="rounded-2xl bg-white shadow-soft overflow-hidden">
          <div className="p-6 border-b border-border/30">
            <h3 className="text-lg font-bold">Activity Breakdown</h3>
            <p className="text-sm text-muted-foreground">Today&apos;s activities by type</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(activityCounts).map(([type, count]) => {
                const meta = activityMeta[type] || { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100' }
                const Icon = meta.icon
                const total = todayActivities?.length || 1
                const percent = Math.round((count / total) * 100)

                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${meta.bg}`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold capitalize">{type}</span>
                        <span className="text-sm font-bold text-foreground">{count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${meta.bg.replace('100', '500')}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
              {Object.keys(activityCounts).length === 0 && (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Activity className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">No activities logged today</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-2xl bg-white shadow-soft overflow-hidden">
        <div className="p-6 border-b border-border/30">
          <h3 className="text-lg font-bold">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">Latest updates from all classrooms</p>
        </div>
        <div className="divide-y divide-border/30">
          {recentActivities?.map((activity) => {
            const meta = activityMeta[activity.type] || { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100' }
            const Icon = meta.icon
            const timeAgo = getTimeAgo(activity.created_at)

            return (
              <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                <div className={`p-2.5 rounded-xl ${meta.bg}`}>
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-bold">
                      {activity.child?.first_name} {activity.child?.last_name}
                    </span>
                    <span className="text-muted-foreground"> - </span>
                    <span className="capitalize font-medium">{activity.type}</span>
                    {activity.description && (
                      <span className="text-muted-foreground"> - {activity.description}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    by {activity.author?.full_name || 'Unknown'} • {timeAgo}
                  </p>
                </div>
              </div>
            )
          })}
          {(!recentActivities || recentActivities.length === 0) && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">No recent activities</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
