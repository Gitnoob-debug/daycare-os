import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Baby, AlertTriangle, Clock } from 'lucide-react'

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

  // Fetch metrics
  // 1. Attendance count
  const { count: checkedInCount } = await supabase
    .from('children')
    .select('*', { count: 'exact', head: true })
    .eq('current_status', 'checked_in')

  const { count: totalChildrenCount } = await supabase
    .from('children')
    .select('*', { count: 'exact', head: true })

  // 2. Staff on duty (teachers who have logged activity today)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: activeStaffData } = await supabase
    .from('activity_logs')
    .select('author_id')
    .gte('created_at', today.toISOString())

  const activeStaff = activeStaffData as { author_id: string }[] | null
  const uniqueStaffCount = new Set(activeStaff?.map((a) => a.author_id)).size

  // 3. Staff ratio calculation
  const staffRatio = checkedInCount && uniqueStaffCount
    ? (checkedInCount / uniqueStaffCount).toFixed(1)
    : 'N/A'

  // 4. Rooms with no recent activity (3+ hours)
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)

  const { data: classroomsData } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('is_active', true)

  const classrooms = classroomsData as { id: string; name: string }[] | null

  const { data: recentActivityData } = await supabase
    .from('activity_logs')
    .select('child_id, children!inner(classroom_id)')
    .gte('created_at', threeHoursAgo.toISOString())

  const recentActivity = recentActivityData as { child_id: string; children: { classroom_id: string } }[] | null
  const activeClassroomIds = new Set(
    recentActivity?.map((a) => a.children.classroom_id)
  )

  const inactiveClassrooms = classrooms?.filter(
    (c) => !activeClassroomIds.has(c.id)
  ) || []

  // 5. Today's activity summary
  const { data: todayActivitiesData } = await supabase
    .from('activity_logs')
    .select('type')
    .gte('created_at', today.toISOString())

  const todayActivities = todayActivitiesData as { type: string }[] | null
  const activityCounts = todayActivities?.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">The Pulse</h1>
        <p className="text-muted-foreground">
          Real-time overview of your daycare operations
        </p>
      </div>

      {/* Main Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {checkedInCount || 0}
              <span className="text-lg text-muted-foreground">
                /{totalChildrenCount || 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">children checked in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Staff Active</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{uniqueStaffCount}</div>
            <p className="text-xs text-muted-foreground">logged activity today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Staff Ratio</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{staffRatio}:1</div>
            <p className="text-xs text-muted-foreground">children per staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Activities Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {todayActivities?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">logged activities</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Flags */}
      {inactiveClassrooms.length > 0 && (
        <Card className="mb-8 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700 mb-4">
              The following classrooms have no activity logged in the past 3 hours:
            </p>
            <div className="flex flex-wrap gap-2">
              {inactiveClassrooms.map((classroom) => (
                <Badge key={classroom.id} variant="outline" className="border-orange-300">
                  {classroom.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Activity Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(activityCounts).map(([type, count]) => (
              <div key={type} className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-muted-foreground capitalize">{type}</p>
              </div>
            ))}
            {Object.keys(activityCounts).length === 0 && (
              <p className="text-muted-foreground col-span-4 text-center py-4">
                No activities logged today
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
