import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    // SECURITY: Whitelist allowed buckets to prevent unauthorized bucket access
    const ALLOWED_BUCKETS = ['feed_media', 'avatars'] as const
    const requestedBucket = formData.get('bucket') as string
    const bucket = ALLOWED_BUCKETS.includes(requestedBucket as typeof ALLOWED_BUCKETS[number])
      ? requestedBucket
      : 'feed_media'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // SECURITY: Sanitize file extension to prevent path traversal
    const rawExt = file.name.split('.').pop() || ''
    const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'bin'
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `uploads/${fileName}`

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      path: data.path,
      url: publicUrl,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
