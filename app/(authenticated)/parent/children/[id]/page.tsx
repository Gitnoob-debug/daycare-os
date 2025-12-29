import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getInitials, formatAge } from '@/lib/utils'
import { ActivityFeed } from '@/components/parent/activity-feed'
import { AlertTriangle, Calendar, Heart } from 'lucide-react'

export default async function ChildProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  interface ChildWithClassroom {
    id: string
    first_name: string
    last_name: string
    date_of_birth: string
    profile_photo_url: string | null
    current_status: string
    allergies: string[] | null
    medical_notes: string | null
    classroom_id: string | null
    parent_id: string | null
    embedding: number[] | null
    checked_in_at: string | null
    created_at: string
    updated_at: string
    classroom: { name: string; age_group: string } | null
  }
  const { data: childData } = await supabase
    .from('children')
    .select(`
      *,
      classroom:classrooms(name, age_group)
    `)
    .eq('id', id)
    .eq('parent_id', user.id)
    .single()

  const child = childData as ChildWithClassroom | null
  if (!child) {
    notFound()
  }

  const { data: activities } = await supabase
    .from('activity_logs')
    .select(`
      *,
      author:profiles!activity_logs_author_id_fkey(full_name, avatar_url),
      child:children!activity_logs_child_id_fkey(first_name, last_name, profile_photo_url)
    `)
    .eq('child_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const allergies = child.allergies as string[] || []

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Child Header */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={child.profile_photo_url || undefined} />
              <AvatarFallback className="text-2xl">
                {getInitials(`${child.first_name} ${child.last_name}`)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {child.first_name} {child.last_name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge
                  variant={child.current_status === 'checked_in' ? 'success' : 'secondary'}
                  className="text-sm"
                >
                  {child.current_status === 'checked_in' ? 'Checked In' : 'Checked Out'}
                </Badge>
                {child.classroom && (
                  <Badge variant="outline">
                    {child.classroom.name}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Age: {formatAge(child.date_of_birth)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <span>DOB: {new Date(child.date_of_birth).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allergies Card */}
      {allergies.length > 0 && (
        <Card className="mb-8 border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Allergy Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy, i) => (
                <Badge key={i} variant="destructive">
                  {allergy}
                </Badge>
              ))}
            </div>
            {child.medical_notes && (
              <p className="mt-3 text-sm text-red-700">{child.medical_notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity History */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <ActivityFeed activities={activities || []} childrenData={[child as unknown as import('@/types/supabase').Child]} />
      </div>
    </div>
  )
}
