'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import {
  Loader2,
  Plus,
  List,
  Clock,
  Sun,
  Coffee,
  Utensils,
  Moon,
  Music,
  Palette,
  BookOpen,
  TreePine,
  Baby,
  Sparkles,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import Link from 'next/link'

interface PlanItem {
  id: string
  time: string
  activity: string
  type: string
  notes: string
  completed: boolean
}

interface Classroom {
  id: string
  name: string
  age_group: string
}

// Activity type icons and colors
const activityTypes: Record<string, { icon: typeof Sun; color: string; label: string }> = {
  arrival: { icon: Sun, color: 'bg-yellow-100 text-yellow-700', label: 'Arrival/Free Play' },
  circle: { icon: Music, color: 'bg-purple-100 text-purple-700', label: 'Circle Time' },
  snack: { icon: Coffee, color: 'bg-orange-100 text-orange-700', label: 'Snack' },
  lunch: { icon: Utensils, color: 'bg-green-100 text-green-700', label: 'Lunch' },
  nap: { icon: Moon, color: 'bg-indigo-100 text-indigo-700', label: 'Nap Time' },
  art: { icon: Palette, color: 'bg-pink-100 text-pink-700', label: 'Art & Crafts' },
  reading: { icon: BookOpen, color: 'bg-blue-100 text-blue-700', label: 'Story Time' },
  outdoor: { icon: TreePine, color: 'bg-emerald-100 text-emerald-700', label: 'Outdoor Play' },
  sensory: { icon: Sparkles, color: 'bg-cyan-100 text-cyan-700', label: 'Sensory Play' },
  diaper: { icon: Baby, color: 'bg-amber-100 text-amber-700', label: 'Diaper Check' },
  other: { icon: Circle, color: 'bg-gray-100 text-gray-700', label: 'Other' },
}

// Default schedule template
const defaultSchedule: Omit<PlanItem, 'id' | 'completed'>[] = [
  { time: '07:00', activity: 'Arrival & Free Play', type: 'arrival', notes: '' },
  { time: '08:30', activity: 'Breakfast/Snack', type: 'snack', notes: '' },
  { time: '09:00', activity: 'Circle Time', type: 'circle', notes: 'Songs, calendar, weather' },
  { time: '09:30', activity: 'Learning Activity', type: 'art', notes: '' },
  { time: '10:30', activity: 'Outdoor Play', type: 'outdoor', notes: '' },
  { time: '11:15', activity: 'Diaper Check/Potty', type: 'diaper', notes: '' },
  { time: '11:30', activity: 'Lunch', type: 'lunch', notes: '' },
  { time: '12:15', activity: 'Nap Time', type: 'nap', notes: '' },
  { time: '14:30', activity: 'Wake Up & Snack', type: 'snack', notes: '' },
  { time: '15:00', activity: 'Afternoon Activity', type: 'sensory', notes: '' },
  { time: '16:00', activity: 'Outdoor Play', type: 'outdoor', notes: '' },
  { time: '17:00', activity: 'Free Play & Pickup', type: 'arrival', notes: '' },
]

export default function ClassroomPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [planItems, setPlanItems] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null)
  const [formData, setFormData] = useState({
    time: '',
    activity: '',
    type: 'other',
    notes: '',
  })

  const supabase = createClient()
  const { toast } = useToast()

  // Get today's date key for localStorage
  const todayKey = `plan_${id}_${new Date().toISOString().split('T')[0]}`

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    // Load classroom info
    const { data: classroomData } = await supabase
      .from('classrooms')
      .select('id, name, age_group')
      .eq('id', id)
      .single()

    setClassroom(classroomData as Classroom | null)

    // Load plan from localStorage (persists per day)
    const savedPlan = localStorage.getItem(todayKey)
    if (savedPlan) {
      setPlanItems(JSON.parse(savedPlan))
    } else {
      // Initialize with default schedule
      const initialPlan = defaultSchedule.map((item, index) => ({
        ...item,
        id: `plan_${index}`,
        completed: false,
      }))
      setPlanItems(initialPlan)
      localStorage.setItem(todayKey, JSON.stringify(initialPlan))
    }

    setLoading(false)
  }

  const savePlan = (items: PlanItem[]) => {
    setPlanItems(items)
    localStorage.setItem(todayKey, JSON.stringify(items))
  }

  const toggleComplete = (itemId: string) => {
    const updated = planItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )
    savePlan(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingItem) {
      // Update existing
      const updated = planItems.map((item) =>
        item.id === editingItem.id
          ? { ...item, ...formData }
          : item
      )
      savePlan(updated)
      toast({ title: 'Updated', description: 'Activity updated' })
    } else {
      // Add new
      const newItem: PlanItem = {
        id: `plan_${Date.now()}`,
        ...formData,
        completed: false,
      }
      const updated = [...planItems, newItem].sort((a, b) =>
        a.time.localeCompare(b.time)
      )
      savePlan(updated)
      toast({ title: 'Added', description: 'Activity added to schedule' })
    }

    setDialogOpen(false)
    resetForm()
  }

  const handleDelete = (itemId: string) => {
    const updated = planItems.filter((item) => item.id !== itemId)
    savePlan(updated)
    toast({ title: 'Deleted', description: 'Activity removed' })
  }

  const handleEdit = (item: PlanItem) => {
    setEditingItem(item)
    setFormData({
      time: item.time,
      activity: item.activity,
      type: item.type,
      notes: item.notes,
    })
    setDialogOpen(true)
  }

  const resetForm = () => {
    setEditingItem(null)
    setFormData({ time: '', activity: '', type: 'other', notes: '' })
  }

  const resetToDefault = () => {
    const initialPlan = defaultSchedule.map((item, index) => ({
      ...item,
      id: `plan_${index}`,
      completed: false,
    }))
    savePlan(initialPlan)
    toast({ title: 'Reset', description: 'Schedule reset to default template' })
  }

  // Calculate progress
  const completedCount = planItems.filter((p) => p.completed).length
  const progressPercent = planItems.length > 0
    ? Math.round((completedCount / planItems.length) * 100)
    : 0

  // Get current time slot
  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{classroom?.name} - Daily Plan</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/staff/classroom/${id}`}>
            <Button variant="outline" className="gap-2">
              <List className="h-4 w-4" />
              Roster
            </Button>
          </Link>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Activity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Activity' : 'Add Activity'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(activityTypes).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activity">Activity Name</Label>
                  <Input
                    id="activity"
                    value={formData.activity}
                    onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                    placeholder="e.g., Finger painting"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special instructions or materials needed"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  {editingItem && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        handleDelete(editingItem.id)
                        setDialogOpen(false)
                        resetForm()
                      }}
                    >
                      Delete
                    </Button>
                  )}
                  <Button type="submit" className="flex-1">
                    {editingItem ? 'Update' : 'Add Activity'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Day Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedCount} of {planItems.length} activities completed
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-3">
        {planItems.map((item, index) => {
          const typeInfo = activityTypes[item.type] || activityTypes.other
          const Icon = typeInfo.icon
          const isPast = item.time < currentTime
          const isCurrent = index < planItems.length - 1 &&
            item.time <= currentTime &&
            planItems[index + 1].time > currentTime

          return (
            <Card
              key={item.id}
              className={`transition-all cursor-pointer hover:shadow-md ${
                item.completed ? 'opacity-60' : ''
              } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              onClick={() => handleEdit(item)}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <div
                    className="flex items-center justify-center w-8 h-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleComplete(item.id)
                    }}
                  >
                    {item.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Time */}
                  <div className="w-16 text-center">
                    <span className={`text-lg font-mono font-semibold ${
                      isPast && !item.completed ? 'text-orange-500' : ''
                    }`}>
                      {item.time}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${item.completed ? 'line-through' : ''}`}>
                        {item.activity}
                      </p>
                      {isCurrent && (
                        <Badge variant="default" className="animate-pulse">
                          Now
                        </Badge>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground truncate">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Type Badge */}
                  <Badge variant="outline" className="shrink-0">
                    {typeInfo.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Reset Button */}
      <div className="mt-6 flex justify-center">
        <Button variant="ghost" onClick={resetToDefault} className="text-muted-foreground">
          Reset to Default Schedule
        </Button>
      </div>
    </div>
  )
}
