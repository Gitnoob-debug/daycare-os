import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, LayoutGrid, List, Calendar } from 'lucide-react'

export default async function StaffDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string } | null

  // Get teacher's assigned classrooms
  const { data: assignmentsData } = await supabase
    .from('teacher_assignments')
    .select(`
      *,
      classroom:classrooms(*)
    `)
    .eq('teacher_id', user.id)

  const assignments = assignmentsData as { classroom: Record<string, unknown> }[] | null

  // If owner, get all classrooms
  const { data: allClassrooms } = profile?.role === 'owner'
    ? await supabase.from('classrooms').select('*').eq('is_active', true)
    : { data: null }

  const classrooms = profile?.role === 'owner'
    ? allClassrooms
    : assignments?.map((a) => a.classroom)

  // Get child counts for each classroom
  const classroomIds = classrooms?.map((c) => (c as Record<string, string>).id) || []
  const { data: childrenData } = await supabase
    .from('children')
    .select('classroom_id, current_status')
    .in('classroom_id', classroomIds)

  const childrenList = childrenData as { classroom_id: string; current_status: string }[] | null
  const getClassroomStats = (classroomId: string) => {
    const classroomChildren = childrenList?.filter((c) => c.classroom_id === classroomId) || []
    const checkedIn = classroomChildren.filter((c) => c.current_status === 'checked_in').length
    return { total: classroomChildren.length, checkedIn }
  }

  if (!classrooms || classrooms.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Staff Dashboard</h1>
        <p className="text-muted-foreground">
          You have not been assigned to any classrooms yet.
        </p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Your Classrooms</h1>
        <p className="text-muted-foreground">
          Select a classroom to view and manage children
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((classroom) => {
          const cr = classroom as Record<string, unknown>
          const stats = getClassroomStats(cr.id as string)

          return (
            <Card key={cr.id as string}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{cr.name as string}</span>
                  <Badge variant="outline">{cr.age_group as string}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{stats.total} children</span>
                  </div>
                  <Badge variant="success">
                    {stats.checkedIn} checked in
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Link href={`/staff/classroom/${cr.id}`}>
                    <Button variant="outline" className="w-full gap-1 text-xs px-2">
                      <List className="h-4 w-4" />
                      Roster
                    </Button>
                  </Link>
                  <Link href={`/staff/classroom/${cr.id}/grid`}>
                    <Button variant="outline" className="w-full gap-1 text-xs px-2">
                      <LayoutGrid className="h-4 w-4" />
                      Faces
                    </Button>
                  </Link>
                  <Link href={`/staff/classroom/${cr.id}/plan`}>
                    <Button variant="outline" className="w-full gap-1 text-xs px-2">
                      <Calendar className="h-4 w-4" />
                      Plan
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
