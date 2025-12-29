'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Baby, Loader2, AlertTriangle } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface Child {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  classroom_id: string | null
  parent_id: string | null
  profile_photo_url: string | null
  current_status: string
  allergies: string[]
  classroom?: { name: string }
  parent?: { full_name: string; email: string }
}

interface Classroom {
  id: string
  name: string
}

interface Parent {
  id: string
  full_name: string
  email: string
}

export default function ManageChildrenPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [parents, setParents] = useState<Parent[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    classroom_id: '',
    parent_id: ''
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // Load children with relations
    const { data: childrenData } = await supabase
      .from('children')
      .select(`
        *,
        classroom:classrooms(name),
        parent:profiles!children_parent_id_fkey(full_name, email)
      `)
      .order('first_name')

    // Load classrooms
    const { data: classroomsData } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    // Load parents (users with parent role)
    const { data: parentsData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name')

    setChildren((childrenData as Child[]) || [])
    setClassrooms((classroomsData as Classroom[]) || [])
    setParents((parentsData as Parent[]) || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      date_of_birth: formData.date_of_birth,
      classroom_id: formData.classroom_id || null,
      parent_id: formData.parent_id || null
    }

    if (editingChild) {
      const { error } = await supabase
        .from('children')
        .update(payload as never)
        .eq('id', editingChild.id)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Child updated!' })
        setDialogOpen(false)
        loadData()
      }
    } else {
      const { error } = await supabase
        .from('children')
        .insert(payload as never)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Child added!' })
        setDialogOpen(false)
        loadData()
      }
    }

    setSaving(false)
    resetForm()
  }

  const resetForm = () => {
    setEditingChild(null)
    setFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      classroom_id: '',
      parent_id: ''
    })
  }

  const handleEdit = (child: Child) => {
    setEditingChild(child)
    setFormData({
      first_name: child.first_name,
      last_name: child.last_name,
      date_of_birth: child.date_of_birth,
      classroom_id: child.classroom_id || '',
      parent_id: child.parent_id || ''
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this child?')) return

    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Deleted', description: 'Child removed.' })
      loadData()
    }
  }

  const openNewDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const calculateAge = (dob: string) => {
    const today = new Date()
    const birth = new Date(dob)
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())
    if (months < 12) return `${months} months`
    const years = Math.floor(months / 12)
    return `${years} year${years > 1 ? 's' : ''}`
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
          <h1 className="text-3xl font-bold">Manage Children</h1>
          <p className="text-muted-foreground">Add and manage enrolled children</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Child
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingChild ? 'Edit Child' : 'Add New Child'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classroom">Classroom</Label>
                <Select
                  value={formData.classroom_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, classroom_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a classroom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No classroom assigned</SelectItem>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Account</Label>
                <Select
                  value={formData.parent_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link to parent account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent linked</SelectItem>
                    {parents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingChild ? 'Update Child' : 'Add Child'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {children.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Baby className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No children enrolled</h3>
            <p className="text-muted-foreground mb-4">Add your first child to get started</p>
            <Button onClick={openNewDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Child
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Card key={child.id} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={child.profile_photo_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {getInitials(`${child.first_name} ${child.last_name}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {child.first_name} {child.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {calculateAge(child.date_of_birth)} old
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(child)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(child.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {child.classroom ? (
                        <Badge variant="secondary">{child.classroom.name}</Badge>
                      ) : (
                        <Badge variant="outline">No classroom</Badge>
                      )}
                      <Badge variant={child.current_status === 'checked_in' ? 'default' : 'outline'} className="ml-1">
                        {child.current_status === 'checked_in' ? 'Checked In' : 'Checked Out'}
                      </Badge>
                    </div>
                    {child.parent && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Parent: {child.parent.full_name}
                      </p>
                    )}
                    {child.allergies && child.allergies.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-xs">Has allergies</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
