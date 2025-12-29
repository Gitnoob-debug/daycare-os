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
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Users, Loader2 } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface Profile {
  id: string
  email: string
  full_name: string
  role: string
  avatar_url: string | null
  assignments?: { classroom: { id: string; name: string } }[]
}

interface Classroom {
  id: string
  name: string
}

export default function ManageStaffPage() {
  const [staff, setStaff] = useState<Profile[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    role: 'teacher',
    assignedClassrooms: [] as string[]
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // Load all profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select(`
        *,
        assignments:teacher_assignments(
          classroom:classrooms(id, name)
        )
      `)
      .order('full_name')

    // Load classrooms
    const { data: classroomsData } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    setStaff((profilesData as Profile[]) || [])
    setClassrooms((classroomsData as Classroom[]) || [])
    setLoading(false)
  }

  const handleEdit = (profile: Profile) => {
    setEditingStaff(profile)
    setFormData({
      role: profile.role,
      assignedClassrooms: profile.assignments?.map(a => a.classroom.id) || []
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStaff) return
    setSaving(true)

    // Update role
    const { error: roleError } = await supabase
      .from('profiles')
      .update({ role: formData.role } as never)
      .eq('id', editingStaff.id)

    if (roleError) {
      toast({ title: 'Error', description: roleError.message, variant: 'destructive' })
      setSaving(false)
      return
    }

    // Update classroom assignments
    // First delete existing
    await supabase
      .from('teacher_assignments')
      .delete()
      .eq('teacher_id', editingStaff.id)

    // Then add new ones
    if (formData.assignedClassrooms.length > 0 && formData.role !== 'parent') {
      const assignments = formData.assignedClassrooms.map((classroomId, index) => ({
        teacher_id: editingStaff.id,
        classroom_id: classroomId,
        is_primary: index === 0
      }))

      const { error: assignError } = await supabase
        .from('teacher_assignments')
        .insert(assignments as never)

      if (assignError) {
        toast({ title: 'Warning', description: 'Role updated but classroom assignment failed.', variant: 'destructive' })
      }
    }

    toast({ title: 'Success', description: 'Staff member updated!' })
    setDialogOpen(false)
    setSaving(false)
    loadData()
  }

  const toggleClassroom = (classroomId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedClassrooms: prev.assignedClassrooms.includes(classroomId)
        ? prev.assignedClassrooms.filter(id => id !== classroomId)
        : [...prev.assignedClassrooms, classroomId]
    }))
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700'
      case 'teacher': return 'bg-blue-100 text-blue-700'
      case 'parent': return 'bg-green-100 text-green-700'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const teachers = staff.filter(s => s.role === 'teacher' || s.role === 'owner')
  const parents = staff.filter(s => s.role === 'parent')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Manage Staff & Users</h1>
        <p className="text-muted-foreground">Manage roles and classroom assignments</p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editingStaff?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="owner">Owner/Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role !== 'parent' && (
              <div className="space-y-2">
                <Label>Assigned Classrooms</Label>
                <div className="space-y-2 max-h-48 overflow-auto border rounded-md p-3">
                  {classrooms.map((classroom) => (
                    <div key={classroom.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={classroom.id}
                        checked={formData.assignedClassrooms.includes(classroom.id)}
                        onCheckedChange={() => toggleClassroom(classroom.id)}
                      />
                      <label
                        htmlFor={classroom.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {classroom.name}
                      </label>
                    </div>
                  ))}
                  {classrooms.length === 0 && (
                    <p className="text-sm text-muted-foreground">No classrooms available. Create some first!</p>
                  )}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Staff Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Staff ({teachers.length})</h2>
        {teachers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Users className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No staff members yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teachers.map((person) => (
              <Card key={person.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={person.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(person.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold truncate">{person.full_name}</h3>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(person)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{person.email}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge className={getRoleBadgeColor(person.role)}>
                          {person.role}
                        </Badge>
                        {person.assignments?.map(a => (
                          <Badge key={a.classroom.id} variant="outline" className="text-xs">
                            {a.classroom.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Parents Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Parents ({parents.length})</h2>
        {parents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Users className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No parents registered yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {parents.map((person) => (
              <Card key={person.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={person.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(person.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold truncate">{person.full_name}</h3>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(person)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{person.email}</p>
                      <Badge className={getRoleBadgeColor(person.role)} >
                        {person.role}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
