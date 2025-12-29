'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Child } from '@/types/supabase'
import { FaceCard } from '@/components/staff/face-card'
import { Button } from '@/components/ui/button'
import { List, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function ClassroomFaceboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [children, setChildren] = useState<Child[]>([])
  const [classroom, setClassroom] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    // Load classroom
    const { data: classroomData } = await supabase
      .from('classrooms')
      .select('name')
      .eq('id', id)
      .single()

    setClassroom(classroomData)

    // Load children
    const { data: childrenData } = await supabase
      .from('children')
      .select('*')
      .eq('classroom_id', id)
      .eq('current_status', 'checked_in')
      .order('first_name')

    if (childrenData) {
      setChildren(childrenData)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{classroom?.name}</h1>
          <p className="text-muted-foreground">
            Faceboard - {children.length} children checked in
          </p>
        </div>

        <Link href={`/staff/classroom/${id}`}>
          <Button variant="outline" className="gap-2">
            <List className="h-4 w-4" />
            Roster View
          </Button>
        </Link>
      </div>

      {/* Faceboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {children.map((child) => (
          <FaceCard key={child.id} child={child} />
        ))}
      </div>

      {children.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No children currently checked in</p>
        </div>
      )}
    </div>
  )
}
