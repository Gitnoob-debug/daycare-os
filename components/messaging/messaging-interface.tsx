'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Profile, Message } from '@/types/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { getInitials, formatRelativeTime, cn } from '@/lib/utils'
import { Send, Clock, Loader2 } from 'lucide-react'
import { sendMessage } from '@/actions/send-message'

interface MessageWithProfiles extends Message {
  sender: Profile
  recipient: Profile
}

interface MessagingInterfaceProps {
  currentUser: Profile
  contacts: Profile[]
  messages: MessageWithProfiles[]
}

export function MessagingInterface({
  currentUser,
  contacts,
  messages: initialMessages,
}: MessagingInterfaceProps) {
  const [messages, setMessages] = useState<MessageWithProfiles[]>(initialMessages)
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { toast } = useToast()
  const supabase = createClient()

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        async (payload) => {
          // Fetch the full message with relations
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey(*),
              recipient:profiles!messages_recipient_id_fkey(*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages((prev) => [data as MessageWithProfiles, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser.id, supabase])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedContact])

  const getConversationMessages = () => {
    if (!selectedContact) return []
    return messages
      .filter(
        (m) =>
          (m.sender_id === currentUser.id && m.recipient_id === selectedContact.id) ||
          (m.sender_id === selectedContact.id && m.recipient_id === currentUser.id)
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }

  const getUnreadCount = (contactId: string) => {
    return messages.filter(
      (m) => m.sender_id === contactId && m.recipient_id === currentUser.id && !m.is_read
    ).length
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedContact) return

    setSending(true)

    const result = await sendMessage({
      content: newMessage,
      recipientId: selectedContact.id,
    })

    if (result.error) {
      toast({
        title: 'Failed to send',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      // Optimistically add the message
      const newMsg: MessageWithProfiles = {
        id: crypto.randomUUID(),
        sender_id: currentUser.id,
        recipient_id: selectedContact.id,
        content: newMessage,
        is_read: false,
        is_queued: result.queued || false,
        deliver_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        child_context_id: null,
        sender: currentUser,
        recipient: selectedContact,
      }

      setMessages((prev) => [...prev, newMsg])
      setNewMessage('')

      if (result.queued) {
        toast({
          title: 'Message queued',
          description: 'Sent silently during quiet hours. Will be delivered in the morning.',
        })
      }
    }

    setSending(false)
  }

  const conversationMessages = getConversationMessages()

  return (
    <div className="flex h-full gap-4">
      {/* Contacts List */}
      <Card className="w-80 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Messages</h2>
        </div>
        <div className="flex-1 overflow-auto">
          {contacts.map((contact) => {
            const unread = getUnreadCount(contact.id)
            const lastMessage = messages.find(
              (m) =>
                (m.sender_id === contact.id && m.recipient_id === currentUser.id) ||
                (m.sender_id === currentUser.id && m.recipient_id === contact.id)
            )

            return (
              <div
                key={contact.id}
                className={cn(
                  'flex items-center gap-3 p-4 cursor-pointer hover:bg-muted transition-colors',
                  selectedContact?.id === contact.id && 'bg-muted'
                )}
                onClick={() => setSelectedContact(contact)}
              >
                <Avatar>
                  <AvatarImage src={contact.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(contact.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{contact.full_name}</p>
                    {unread > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {unread}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate capitalize">
                    {contact.role}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <Avatar>
                <AvatarImage src={selectedContact.avatar_url || undefined} />
                <AvatarFallback>{getInitials(selectedContact.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{selectedContact.full_name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedContact.role}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {conversationMessages.map((message) => {
                const isMine = message.sender_id === currentUser.id

                return (
                  <div
                    key={message.id}
                    className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] rounded-lg p-3',
                        isMine
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p>{message.content}</p>
                      <div
                        className={cn(
                          'flex items-center gap-1 mt-1 text-xs',
                          isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}
                      >
                        {message.is_queued && <Clock className="h-3 w-3" />}
                        <span>{formatRelativeTime(message.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a contact to start messaging
          </div>
        )}
      </Card>
    </div>
  )
}
