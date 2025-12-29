'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Child } from '@/types/supabase'
import { RosterItem } from '@/components/staff/roster-item'
import { BulkActionBar } from '@/components/staff/bulk-action-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { LayoutGrid, Search, Loader2, UserCheck, UserX, Users } from 'lucide-react'
import Link from 'next/link'

interface ChildWithActivity extends Child {
  last_activity?: { type: string; created_at: string } | null
}

export default function ClassroomRosterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [children, setChildren] = useState<ChildWithActivity[]>([])
  const [classroom, setClassroom] = useState<{ name: string; capacity: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'checked_in' | 'checked_out'>('all')

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    // Load classroom
    const { data: classroomRaw } = await supabase
      .from('classrooms')
      .select('name, capacity')
      .eq('id', id)
      .single()

    setClassroom(classroomRaw as { name: string; capacity: number } | null)

    // Load children with their last activity
    const { data: childrenRaw } = await supabase
      .from('children')
      .select('*')
      .eq('classroom_id', id)
      .order('first_name')

    const childrenData = childrenRaw as Child[] | null
    if (childrenData) {
      // Get last activity for each child
      const childrenWithActivity = await Promise.all(
        childrenData.map(async (child) => {
          const { data: activityData } = await supabase
            .from('activity_logs')
            .select('type, created_at')
            .eq('child_id', child.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          const activity = activityData as { type: string; created_at: string } | null
          return {
            ...child,
            last_activity: activity,
          }
        })
      )

      setChildren(childrenWithActivity)
    }

    setLoading(false)
  }

  const toggleSelection = (childId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(childId)) {
      newSelected.delete(childId)
    } else {
      newSelected.add(childId)
    }
    setSelectedIds(newSelected)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const getChildStatus = (child: Child): 'checked_in' | 'checked_out' | 'asleep' => {
    // Check if child has an active nap
    return child.current_status === 'checked_in' ? 'checked_in' : 'checked_out'
  }

  const handleBulkMeal = async (mealType: string, amount: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const percentages: Record<string, number> = {
      all: 100,
      most: 75,
      some: 50,
      none: 0,
    }

    const activities = Array.from(selectedIds).map((childId) => ({
      child_id: childId,
      author_id: user.id,
      type: 'meal' as const,
      description: `${mealType} - ate ${amount}`,
      metadata: { meal_type: mealType, meal_percentage: percentages[amount] },
    }))

    const { error } = await supabase.from('activity_logs').insert(activities as never)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: `Logged ${mealType} for ${selectedIds.size} children` })
      clearSelection()
    }
  }

  const handleBulkNap = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const activities = Array.from(selectedIds).map((childId) => ({
      child_id: childId,
      author_id: user.id,
      type: 'nap' as const,
      description: 'Started nap',
      metadata: { status: 'started' },
    }))

    const { error } = await supabase.from('activity_logs').insert(activities as never)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: `Logged nap for ${selectedIds.size} children` })
      clearSelection()
    }
  }

  const handleBulkPhoto = () => {
    // Navigate to camera with selected children
    const ids = Array.from(selectedIds).join(',')
    router.push(`/staff/camera?children=${ids}`)
  }

  const handleBulkPotty = async (type: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const activities = Array.from(selectedIds).map((childId) => ({
      child_id: childId,
      author_id: user.id,
      type: 'potty' as const,
      description: `Diaper change - ${type}`,
      metadata: { potty_type: type },
    }))

    const { error } = await supabase.from('activity_logs').insert(activities as never)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: `Logged potty for ${selectedIds.size} children` })
      clearSelection()
    }
  }

  // Check-in/Check-out handlers
  const handleCheckIn = async (childId: string) => {
    const { error } = await supabase
      .from('children')
      .update({ current_status: 'checked_in' } as never)
      .eq('id', childId)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      // Log the check-in activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert({
          child_id: childId,
          author_id: user.id,
          type: 'check_in',
          description: 'Checked in',
        } as never)
      }
      toast({ title: 'Checked In', description: 'Child has been checked in' })
      loadData()
    }
  }

  const handleCheckOut = async (childId: string) => {
    const { error } = await supabase
      .from('children')
      .update({ current_status: 'checked_out' } as never)
      .eq('id', childId)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      // Log the check-out activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert({
          child_id: childId,
          author_id: user.id,
          type: 'check_out',
          description: 'Checked out',
        } as never)
      }
      toast({ title: 'Checked Out', description: 'Child has been checked out' })
      loadData()
    }
  }

  const handleBulkCheckIn = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (const childId of selectedIds) {
      await supabase
        .from('children')
        .update({ current_status: 'checked_in' } as never)
        .eq('id', childId)

      await supabase.from('activity_logs').insert({
        child_id: childId,
        author_id: user.id,
        type: 'check_in',
        description: 'Checked in',
      } as never)
    }

    toast({ title: 'Success', description: `Checked in ${selectedIds.size} children` })
    clearSelection()
    loadData()
  }

  const handleBulkCheckOut = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (const childId of selectedIds) {
      await supabase
        .from('children')
        .update({ current_status: 'checked_out' } as never)
        .eq('id', childId)

      await supabase.from('activity_logs').insert({
        child_id: childId,
        author_id: user.id,
        type: 'check_out',
        description: 'Checked out',
      } as never)
    }

    toast({ title: 'Success', description: `Checked out ${selectedIds.size} children` })
    clearSelection()
    loadData()
  }

  // Apply filters
  const filteredChildren = children
    .filter((child) =>
      `${child.first_name} ${child.last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
    .filter((child) => {
      if (filter === 'all') return true
      return child.current_status === filter
    })

  // Stats
  const checkedInCount = children.filter(c => c.current_status === 'checked_in').length
  const checkedOutCount = children.filter(c => c.current_status === 'checked_out').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{classroom?.name}</h1>
          <p className="text-muted-foreground">
            {checkedInCount} checked in • {checkedOutCount} checked out
          </p>
        </div>

        <Link href={`/staff/classroom/${id}/grid`}>
          <Button variant="outline" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Faceboard
          </Button>
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{children.length}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
          <p className="text-2xl font-bold text-green-600">{checkedInCount}</p>
          <p className="text-sm text-green-600">Checked In</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
          <p className="text-2xl font-bold text-gray-600">{checkedOutCount}</p>
          <p className="text-sm text-gray-600">Checked Out</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search children..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="gap-1"
          >
            <Users className="h-4 w-4" />
            All
          </Button>
          <Button
            variant={filter === 'checked_in' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('checked_in')}
            className="gap-1"
          >
            <UserCheck className="h-4 w-4" />
            In
          </Button>
          <Button
            variant={filter === 'checked_out' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('checked_out')}
            className="gap-1"
          >
            <UserX className="h-4 w-4" />
            Out
          </Button>
        </div>
      </div>

      {/* Roster List */}
      <div className="space-y-2">
        {filteredChildren.map((child) => (
          <RosterItem
            key={child.id}
            child={child}
            isSelected={selectedIds.has(child.id)}
            onToggle={toggleSelection}
            status={getChildStatus(child)}
            onCheckIn={() => handleCheckIn(child.id)}
            onCheckOut={() => handleCheckOut(child.id)}
          />
        ))}
      </div>

      {filteredChildren.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No children found
        </p>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onMeal={handleBulkMeal}
        onNap={handleBulkNap}
        onPhoto={handleBulkPhoto}
        onPotty={handleBulkPotty}
        onCheckIn={handleBulkCheckIn}
        onCheckOut={handleBulkCheckOut}
        onClear={clearSelection}
      />
    </div>
  )
}
