'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'
import { Camera, Upload, X, Loader2, Check } from 'lucide-react'

interface Child {
  id: string
  first_name: string
  last_name: string
  profile_photo_url: string | null
}

function CameraContent() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set())
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadChildren()
  }, [])

  const loadChildren = async () => {
    // Get pre-selected children from URL
    const preSelectedIds = searchParams.get('children')?.split(',') || []

    const { data } = await supabase
      .from('children')
      .select('id, first_name, last_name, profile_photo_url')
      .eq('current_status', 'checked_in')
      .order('first_name')

    if (data) {
      setChildren(data)
      if (preSelectedIds.length > 0) {
        setSelectedChildren(new Set(preSelectedIds))
      }
    }
  }

  const toggleChild = (childId: string) => {
    const newSelected = new Set(selectedChildren)
    if (newSelected.has(childId)) {
      newSelected.delete(childId)
    } else {
      newSelected.add(childId)
    }
    setSelectedChildren(newSelected)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!capturedImage || selectedChildren.size === 0) {
      toast({
        title: 'Missing information',
        description: 'Please capture a photo and select at least one child',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Convert base64 to blob
      const response = await fetch(capturedImage)
      const blob = await response.blob()

      // Upload to Supabase Storage
      const fileName = `photo-${Date.now()}.jpg`
      const filePath = `feed/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('feed_media')
        .upload(filePath, blob, { contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('feed_media')
        .getPublicUrl(filePath)

      // Create activity logs for each selected child
      const activities = Array.from(selectedChildren).map((childId) => ({
        child_id: childId,
        author_id: user.id,
        type: 'photo' as const,
        description: caption || null,
        media_url: publicUrl,
      }))

      const { error: insertError } = await supabase
        .from('activity_logs')
        .insert(activities as never)

      if (insertError) throw insertError

      toast({
        title: 'Photo shared!',
        description: `Shared with ${selectedChildren.size} children's parents`,
      })

      router.push('/staff/dashboard')
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Magic Camera</h1>
      <p className="text-muted-foreground mb-8">
        Take a photo and tag the children in it
      </p>

      {/* Photo Capture/Preview */}
      <div className="mb-8">
        {capturedImage ? (
          <div className="relative">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full max-h-[400px] object-contain rounded-lg border"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => setCapturedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Click to take or upload a photo</p>
            <p className="text-sm text-muted-foreground">
              Supports camera capture and file upload
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Caption */}
      <div className="mb-8">
        <Textarea
          placeholder="Add a caption... (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
        />
      </div>

      {/* Child Selection */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">
          Tag Children ({selectedChildren.size} selected)
        </h2>
        <div className="flex flex-wrap gap-2">
          {children.map((child) => {
            const isSelected = selectedChildren.has(child.id)
            return (
              <Badge
                key={child.id}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer py-2 px-3"
                onClick={() => toggleChild(child.id)}
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={child.profile_photo_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(`${child.first_name} ${child.last_name}`)}
                  </AvatarFallback>
                </Avatar>
                {child.first_name}
                {isSelected && <Check className="h-4 w-4 ml-2" />}
              </Badge>
            )
          })}
        </div>
      </div>

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
          onClick={handleUpload}
          disabled={uploading || !capturedImage || selectedChildren.size === 0}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Share Photo
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default function StaffCameraPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <CameraContent />
    </Suspense>
  )
}
