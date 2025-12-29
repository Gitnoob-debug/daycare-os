'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Users, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Classroom {
  id: string
  name: string
  age_group: string
  capacity: number
  is_active: boolean
  childCount?: number
}

export default function ManageClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null)
  const [formData, setFormData] = useState({ name: '', age_group: 'Infant', capacity: 12 })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadClassrooms()
  }, [])

  const loadClassrooms = async () => {
    const { data: classroomsData } = await supabase
      .from('classrooms')
      .select('*')
      .order('name')

    if (classroomsData) {
      // Get child counts for each classroom
      const classroomsWithCounts = await Promise.all(
        (classroomsData as Classroom[]).map(async (classroom) => {
          const { count } = await supabase
            .from('children')
            .select('*', { count: 'exact', head: true })
            .eq('classroom_id', classroom.id)
          return { ...classroom, childCount: count || 0 }
        })
      )
      setClassrooms(classroomsWithCounts)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    if (editingClassroom) {
      const { error } = await supabase
        .from('classrooms')
        .update(formData as never)
        .eq('id', editingClassroom.id)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Classroom updated!' })
        setDialogOpen(false)
        loadClassrooms()
      }
    } else {
      const { error } = await supabase
        .from('classrooms')
        .insert(formData as never)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Classroom created!' })
        setDialogOpen(false)
        loadClassrooms()
      }
    }

    setSaving(false)
    setEditingClassroom(null)
    setFormData({ name: '', age_group: 'Infant', capacity: 12 })
  }

  const handleEdit = (classroom: Classroom) => {
    setEditingClassroom(classroom)
    setFormData({
      name: classroom.name,
      age_group: classroom.age_group,
      capacity: classroom.capacity
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will remove all children from this classroom.')) return

    const { error } = await supabase
      .from('classrooms')
      .delete()
      .eq('id', id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Deleted', description: 'Classroom removed.' })
      loadClassrooms()
    }
  }

  const openNewDialog = () => {
    setEditingClassroom(null)
    setFormData({ name: '', age_group: 'Infant', capacity: 12 })
    setDialogOpen(true)
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Manage Classrooms</h1>
          <p className="text-muted-foreground">Create and manage your daycare classrooms</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Classroom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClassroom ? 'Edit Classroom' : 'New Classroom'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Classroom Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Butterfly Room"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age_group">Age Group</Label>
                <Select
                  value={formData.age_group}
                  onValueChange={(value) => setFormData({ ...formData, age_group: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Infant">Infant (0-12 months)</SelectItem>
                    <SelectItem value="Toddler">Toddler (1-2 years)</SelectItem>
                    <SelectItem value="Pre-K">Pre-K (3-4 years)</SelectItem>
                    <SelectItem value="Kindergarten">Kindergarten (5+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 12 })}
                  min={1}
                  max={30}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingClassroom ? 'Update Classroom' : 'Create Classroom'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {classrooms.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No classrooms yet</h3>
            <p className="text-muted-foreground mb-4">Create your first classroom to get started</p>
            <Button onClick={openNewDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Classroom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <Card key={classroom.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{classroom.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">{classroom.age_group}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(classroom)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(classroom.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Children enrolled:</span>
                  <span className="font-semibold">{classroom.childCount} / {classroom.capacity}</span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, ((classroom.childCount || 0) / classroom.capacity) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
