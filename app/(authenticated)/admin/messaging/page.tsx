import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials, formatRelativeTime } from '@/lib/utils'
import { Clock, Mail, Eye } from 'lucide-react'

export default async function AdminMessagingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string } | null
  if (profile?.role !== 'owner') {
    redirect('/staff/dashboard')
  }

  // Fetch all messages (Shadow Inbox)
  interface MessageWithProfiles {
    id: string
    content: string
    is_queued: boolean
    is_read: boolean
    deliver_at: string
    created_at: string
    sender: { full_name: string; avatar_url: string | null; role: string }
    recipient: { full_name: string; avatar_url: string | null; role: string }
  }
  const { data: messagesData } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(full_name, avatar_url, role),
      recipient:profiles!messages_recipient_id_fkey(full_name, avatar_url, role)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const messages = messagesData as MessageWithProfiles[] | null

  // Fetch queued messages count
  const { count: queuedCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('is_queued', true)

  // Fetch unread messages count
  const { count: unreadCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Shadow Inbox</h1>
        <p className="text-muted-foreground">
          Monitor all communications between staff and parents
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{messages?.length || 0}</div>
            <p className="text-xs text-muted-foreground">in the last 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{queuedCount || 0}</div>
            <p className="text-xs text-muted-foreground">awaiting delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unreadCount || 0}</div>
            <p className="text-xs text-muted-foreground">by recipients</p>
          </CardContent>
        </Card>
      </div>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages?.map((message) => (
              <div
                key={message.id}
                className="flex items-start gap-4 p-4 rounded-lg border"
              >
                <Avatar>
                  <AvatarImage src={message.sender.avatar_url || undefined} />
                  <AvatarFallback>
                    {getInitials(message.sender.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{message.sender.full_name}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{message.recipient.full_name}</span>
                    <div className="flex gap-1 ml-auto">
                      {message.is_queued && (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Queued
                        </Badge>
                      )}
                      {!message.is_read && (
                        <Badge variant="outline">Unread</Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {message.sender.role}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm mb-2">{message.content}</p>

                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(message.created_at)}
                    {message.is_queued && (
                      <span className="ml-2">
                        • Delivers at {new Date(message.deliver_at).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}

            {(!messages || messages.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No messages yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
