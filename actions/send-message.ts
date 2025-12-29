'use server'

import { createClient } from '@/utils/supabase/server'

interface SendMessageInput {
  content: string
  recipientId: string
  childContextId?: string
}

interface SendMessageResult {
  success: boolean
  queued: boolean
  error?: string
}

interface OrgSetting {
  key: string
  value: string
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, queued: false, error: 'Not authenticated' }
  }

  // Validate input
  if (!input.content.trim()) {
    return { success: false, queued: false, error: 'Message content is required' }
  }

  if (!input.recipientId) {
    return { success: false, queued: false, error: 'Recipient is required' }
  }

  try {
    // Fetch quiet hours settings
    const { data: settingsData } = await supabase
      .from('org_settings')
      .select('key, value')
      .in('key', ['quiet_hours_start', 'quiet_hours_end'])

    const settings = settingsData as OrgSetting[] | null
    const quietStart = settings?.find((s) => s.key === 'quiet_hours_start')?.value || '18:00'
    const quietEnd = settings?.find((s) => s.key === 'quiet_hours_end')?.value || '07:00'

    // Check if current time is in quiet hours
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

    const isQuietHours = isTimeInQuietHours(currentTime, quietStart, quietEnd)

    // Calculate deliver_at time
    let deliverAt = now
    let isQueued = false

    if (isQuietHours) {
      // Calculate next morning at quiet_hours_end
      const [endHour, endMinute] = quietEnd.split(':').map(Number)
      deliverAt = new Date(now)

      // If we're before midnight, set to tomorrow
      if (currentTime >= quietStart) {
        deliverAt.setDate(deliverAt.getDate() + 1)
      }

      deliverAt.setHours(endHour, endMinute, 0, 0)
      isQueued = true
    }

    // Insert the message
    const messageInsert = {
      sender_id: user.id,
      recipient_id: input.recipientId,
      child_context_id: input.childContextId || null,
      content: input.content.trim(),
      is_queued: isQueued,
      deliver_at: deliverAt.toISOString(),
    }
    const { error } = await supabase.from('messages').insert(messageInsert as never)

    if (error) {
      console.error('Failed to send message:', error)
      return { success: false, queued: false, error: error.message }
    }

    return {
      success: true,
      queued: isQueued,
    }
  } catch (error) {
    console.error('Send message error:', error)
    return {
      success: false,
      queued: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Checks if a given time is within quiet hours
 * Handles overnight quiet hours (e.g., 18:00 to 07:00)
 */
function isTimeInQuietHours(currentTime: string, startTime: string, endTime: string): boolean {
  // Handle overnight quiet hours (start > end means it spans midnight)
  if (startTime > endTime) {
    // Quiet hours from 18:00 to 07:00
    // Current time is in quiet hours if:
    // - currentTime >= startTime (e.g., 19:00 >= 18:00)
    // - OR currentTime <= endTime (e.g., 06:00 <= 07:00)
    return currentTime >= startTime || currentTime <= endTime
  } else {
    // Normal range (e.g., 09:00 to 17:00)
    return currentTime >= startTime && currentTime <= endTime
  }
}
