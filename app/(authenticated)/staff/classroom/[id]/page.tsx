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
import { LayoutGrid, Search, Loader2, UserCheck, UserX, Users, Calendar } from 'lucide-react'
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
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse" />
            <Loader2 className="h-8 w-8 animate-spin text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground font-medium">Loading classroom...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{classroom?.name}</h1>
          </div>
          <p className="text-muted-foreground ml-13">
            Managing {children.length} children today
          </p>
        </div>

        <div className="flex gap-2">
          <Link href={`/staff/classroom/${id}/plan`}>
            <Button variant="outline" className="gap-2 rounded-xl hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all">
              <Calendar className="h-4 w-4" />
              Daily Plan
            </Button>
          </Link>
          <Link href={`/staff/classroom/${id}/grid`}>
            <Button variant="outline" className="gap-2 rounded-xl hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-all">
              <LayoutGrid className="h-4 w-4" />
              Faceboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-soft hover-lift">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full transform translate-x-6 -translate-y-6" />
          <div className="relative">
            <p className="text-3xl font-bold text-foreground">{children.length}</p>
            <p className="text-sm font-medium text-muted-foreground">Total Enrolled</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 p-5 shadow-soft hover-lift border border-emerald-100">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full transform translate-x-6 -translate-y-6" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              <p className="text-3xl font-bold text-emerald-600">{checkedInCount}</p>
            </div>
            <p className="text-sm font-medium text-emerald-600/80">Checked In</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-gray-50 p-5 shadow-soft hover-lift border border-slate-100">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-slate-100 to-gray-100 rounded-full transform translate-x-6 -translate-y-6" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-slate-500" />
              <p className="text-3xl font-bold text-slate-600">{checkedOutCount}</p>
            </div>
            <p className="text-sm font-medium text-slate-500">Checked Out</p>
          </div>
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
            className="pl-10 rounded-xl border-border/50 bg-white/80 focus:bg-white transition-colors"
          />
        </div>
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className={`gap-1.5 rounded-lg ${filter === 'all' ? 'shadow-md' : ''}`}
          >
            <Users className="h-4 w-4" />
            All
          </Button>
          <Button
            variant={filter === 'checked_in' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('checked_in')}
            className={`gap-1.5 rounded-lg ${filter === 'checked_in' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-md' : 'hover:bg-emerald-50 hover:text-emerald-700'}`}
          >
            <UserCheck className="h-4 w-4" />
            In
          </Button>
          <Button
            variant={filter === 'checked_out' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('checked_out')}
            className={`gap-1.5 rounded-lg ${filter === 'checked_out' ? 'bg-slate-500 hover:bg-slate-600 shadow-md' : 'hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <UserX className="h-4 w-4" />
            Out
          </Button>
        </div>
      </div>

      {/* Roster List */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden border border-border/30">
        <div className="divide-y divide-border/30">
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
      </div>

      {filteredChildren.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">No children found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search or filter</p>
        </div>
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
