import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

// This endpoint should be called by a Vercel Cron job
// Configure in vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/release-messages",
//     "schedule": "0 * * * *"
//   }]
// }

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // In development, allow without auth
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const supabase = await createAdminClient()

    // Update all queued messages that should be delivered
    const now = new Date().toISOString()

    const { data: releasedMessages, error } = await supabase
      .from('messages')
      .update({ is_queued: false } as never)
      .eq('is_queued', true)
      .lte('deliver_at', now)
      .select('id')

    if (error) {
      console.error('Failed to release messages:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      released: releasedMessages?.length || 0,
      timestamp: now,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
