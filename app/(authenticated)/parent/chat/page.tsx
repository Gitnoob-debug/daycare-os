import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { MessagingInterface } from '@/components/messaging/messaging-interface'

export default async function ParentChatPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get staff members to message
  const { data: staff } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['owner', 'teacher'])

  // Get existing messages
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role),
      recipient:profiles!messages_recipient_id_fkey(id, full_name, avatar_url, role)
    `)
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .lte('deliver_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return (
    <div className="h-[calc(100vh-2rem)] p-4">
      <MessagingInterface
        currentUser={profile!}
        contacts={staff || []}
        messages={messages || []}
      />
    </div>
  )
}
