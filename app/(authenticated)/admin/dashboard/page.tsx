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
        <h1 className="text-3xl font-bold">{greeting}</h1>
        <p className="text-muted-foreground text-lg">
          Here&apos;s what&apos;s happening at your daycare today
        </p>
      </div>

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-bl-full opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <Baby className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              {checkedInCount || 0}
              <span className="text-xl text-muted-foreground font-normal">
                /{totalChildrenCount || 0}
              </span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${attendancePercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{attendancePercent}% checked in</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-bl-full opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Staff On Duty</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{uniqueStaffCount}</div>
            <p className="text-sm text-muted-foreground">of {totalStaffCount || 0} total staff</p>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-600">Active today</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-bl-full opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Staff Ratio</CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-600">{staffRatio}:1</div>
            <p className="text-sm text-muted-foreground">children per staff</p>
            {typeof staffRatio === 'string' && parseFloat(staffRatio) <= 4 ? (
              <Badge className="mt-2 bg-green-100 text-green-700">Excellent</Badge>
            ) : typeof staffRatio === 'string' && parseFloat(staffRatio) <= 6 ? (
              <Badge className="mt-2 bg-yellow-100 text-yellow-700">Good</Badge>
            ) : (
              <Badge className="mt-2 bg-red-100 text-red-700">Review Needed</Badge>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-bl-full opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Activities Today</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-600">
              {todayActivities?.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">logged updates</p>
            <div className="flex gap-1 mt-2">
              {Object.entries(activityCounts).slice(0, 3).map(([type]) => {
                const meta = activityMeta[type]
                if (!meta) return null
                const Icon = meta.icon
                return (
                  <div key={type} className={`p-1 rounded ${meta.bg}`}>
                    <Icon className={`h-3 w-3 ${meta.color}`} />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Classroom Status */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Classroom Status</CardTitle>
              <CardDescription>Real-time overview of all classrooms</CardDescription>
            </div>
            <Link href="/admin/classrooms">
              <Button variant="outline" size="sm" className="gap-1">
                Manage <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {classroomsWithChildren?.map((classroom) => {
                const checkedIn = classroom.children?.filter(c => c.current_status === 'checked_in').length || 0
                const total = classroom.children?.length || 0
                const fillPercent = classroom.capacity > 0 ? (checkedIn / classroom.capacity) * 100 : 0
                const isFull = fillPercent >= 100
                const isNearFull = fillPercent >= 80

                return (
                  <div key={classroom.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <School className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{classroom.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{classroom.age_group}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Attendance</span>
                      <span className="font-medium">
                        {checkedIn} / {classroom.capacity}
                        {isFull && <span className="ml-1 text-red-500">(Full)</span>}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isFull ? 'bg-red-500' : isNearFull ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, fillPercent)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {(!classroomsWithChildren || classroomsWithChildren.length === 0) && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <School className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No classrooms set up yet</p>
                  <Link href="/admin/classrooms">
                    <Button variant="link" className="mt-2">Create your first classroom</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Breakdown</CardTitle>
            <CardDescription>Today&apos;s logged activities by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(activityCounts).map(([type, count]) => {
                const meta = activityMeta[type] || { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100' }
                const Icon = meta.icon
                const total = todayActivities?.length || 1
                const percent = Math.round((count / total) * 100)

                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${meta.bg}`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{type}</span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${meta.bg.replace('100', '500')}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
              {Object.keys(activityCounts).length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activities logged today</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from all classrooms</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities?.map((activity) => {
              const meta = activityMeta[activity.type] || { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100' }
              const Icon = meta.icon
              const timeAgo = getTimeAgo(activity.created_at)

              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-full ${meta.bg}`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">
                        {activity.child?.first_name} {activity.child?.last_name}
                      </span>
                      {' - '}
                      <span className="capitalize">{activity.type}</span>
                      {activity.description && (
                        <span className="text-muted-foreground"> - {activity.description}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {activity.author?.full_name || 'Unknown'} • {timeAgo}
                    </p>
                  </div>
                </div>
              )
            })}
            {(!recentActivities || recentActivities.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activities</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
