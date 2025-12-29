'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { Loader2, Upload, X, Plus, AlertTriangle, Camera } from 'lucide-react'
import { use } from 'react'

interface Child {
  id: string
  first_name: string
  last_name: string
  profile_photo_url: string | null
  allergies: string[]
  medical_notes: string | null
}

export default function ChildSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [child, setChild] = useState<Child | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [hasAllergies, setHasAllergies] = useState(false)
  const [allergies, setAllergies] = useState<string[]>([])
  const [newAllergy, setNewAllergy] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')
  const [consentAI, setConsentAI] = useState(false)

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadChild()
  }, [id])

  const loadChild = async () => {
    // SECURITY: Get current user to verify authorization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // SECURITY: Only fetch child if current user is the parent (enforced by RLS + explicit check)
    const { data } = await supabase
      .from('children')
      .select('*')
      .eq('id', id)
      .eq('parent_id', user.id) // SECURITY: Verify parent ownership
      .single()

    if (data) {
      const childData = data as Child
      setChild(childData)
      const childAllergies = (childData.allergies as string[]) || []
      setAllergies(childAllergies)
      setHasAllergies(childAllergies.length > 0)
      setMedicalNotes(childData.medical_notes || '')
      setConsentAI(childData.medical_notes?.includes('Consented to AI') || false)
    } else {
      // SECURITY: Redirect if not authorized to view this child
      toast({
        title: 'Access denied',
        description: 'You do not have permission to edit this child.',
        variant: 'destructive',
      })
      router.push('/parent/children')
      return
    }
    setLoading(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !child) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file.',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)

    // SECURITY: Sanitize file extension to prevent path traversal
    const rawExt = file.name.split('.').pop() || ''
    const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'bin'
    const fileName = `${child.id}-${Date.now()}.${fileExt}`
    const filePath = `children/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file)

    if (uploadError) {
      toast({
        title: 'Upload failed',
        description: uploadError.message,
        variant: 'destructive',
      })
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('children')
      .update({ profile_photo_url: publicUrl } as never)
      .eq('id', child.id)

    if (updateError) {
      toast({
        title: 'Update failed',
        description: updateError.message,
        variant: 'destructive',
      })
    } else {
      setChild({ ...child, profile_photo_url: publicUrl })
      toast({
        title: 'Photo updated',
        description: 'Profile photo has been updated successfully.',
      })
    }

    setUploading(false)
  }

  const addAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()])
      setNewAllergy('')
    }
  }

  const removeAllergy = (allergy: string) => {
    setAllergies(allergies.filter((a) => a !== allergy))
  }

  const handleSave = async () => {
    if (!child) return

    setSaving(true)

    const finalAllergies = hasAllergies ? allergies : []
    let finalNotes = medicalNotes

    if (consentAI && !finalNotes.includes('Consented to AI')) {
      finalNotes = finalNotes ? `${finalNotes}\nConsented to AI` : 'Consented to AI'
    } else if (!consentAI) {
      finalNotes = finalNotes.replace(/\n?Consented to AI/g, '')
    }

    const { error } = await supabase
      .from('children')
      .update({
        allergies: finalAllergies,
        medical_notes: finalNotes || null,
      } as never)
      .eq('id', child.id)

    if (error) {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Settings saved',
        description: 'Child settings have been updated successfully.',
      })
      router.push(`/parent/children/${child.id}`)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!child) {
    return (
      <div className="p-8">
        <p>Child not found.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        Settings for {child.first_name}
      </h1>
      <p className="text-muted-foreground mb-8">
        Update your child&apos;s profile photo, allergies, and preferences.
      </p>

      {/* Photo Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Profile Photo
          </CardTitle>
          <CardDescription>
            Upload a clear photo of your child for the Faceboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={child.profile_photo_url || undefined} />
              <AvatarFallback className="text-xl">
                {getInitials(`${child.first_name} ${child.last_name}`)}
              </AvatarFallback>
            </Avatar>

            <div>
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                </div>
              </Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG up to 5MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Allergies
          </CardTitle>
          <CardDescription>
            List any allergies your child has
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="has-allergies"
              checked={hasAllergies}
              onCheckedChange={setHasAllergies}
            />
            <Label htmlFor="has-allergies">
              Does {child.first_name} have allergies?
            </Label>
          </div>

          {hasAllergies && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add allergy (e.g., Peanuts)"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addAllergy()}
                />
                <Button type="button" onClick={addAllergy} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {allergies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((allergy, i) => (
                    <Badge key={i} variant="destructive" className="pr-1">
                      {allergy}
                      <button
                        onClick={() => removeAllergy(allergy)}
                        className="ml-2 hover:bg-red-700 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical Notes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Medical Notes</CardTitle>
          <CardDescription>
            Any additional medical information staff should know
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g., Asthma inhaler in backpack, needs to take medication at noon..."
            value={medicalNotes.replace(/\n?Consented to AI/g, '')}
            onChange={(e) => setMedicalNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Privacy Consent */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Privacy & AI Consent</CardTitle>
          <CardDescription>
            Consent for facial recognition photo tagging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-2">
            <Switch
              id="consent-ai"
              checked={consentAI}
              onCheckedChange={setConsentAI}
            />
            <div>
              <Label htmlFor="consent-ai" className="cursor-pointer">
                I consent to facial recognition for photo tagging
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                This allows automatic tagging of your child in photos shared through the app.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSave}
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
