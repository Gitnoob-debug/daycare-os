import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getInitials, formatAge } from '@/lib/utils'
import { Settings, AlertTriangle } from 'lucide-react'

export default async function ParentChildrenPage() {
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
    classroom: { name: string; age_group: string } | null
  }
  const { data: childrenData } = await supabase
    .from('children')
    .select(`
      *,
      classroom:classrooms(name, age_group)
    `)
    .eq('parent_id', user.id)

  const children = childrenData as ChildWithClassroom[] | null
  if (!children || children.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">My Children</h1>
        <p className="text-muted-foreground">
          No children have been added to your account yet.
        </p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">My Children</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {children.map((child) => {
          const allergies = child.allergies as string[] || []
          const hasAllergies = allergies.length > 0

          return (
            <Card key={child.id}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={child.profile_photo_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(`${child.first_name} ${child.last_name}`)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {child.first_name} {child.last_name}
                    {hasAllergies && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatAge(child.date_of_birth)}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={child.current_status === 'checked_in' ? 'success' : 'secondary'}
                  >
                    {child.current_status === 'checked_in' ? 'At Daycare' : 'At Home'}
                  </Badge>
                  {child.classroom && (
                    <Badge variant="outline">
                      {child.classroom.name}
                    </Badge>
                  )}
                </div>

                {hasAllergies && (
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-1">Allergies:</p>
                    <div className="flex flex-wrap gap-1">
                      {allergies.map((allergy, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Link href={`/parent/children/${child.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      View Profile
                    </Button>
                  </Link>
                  <Link href={`/parent/children/${child.id}/settings`}>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
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
