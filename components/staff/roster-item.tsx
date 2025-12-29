'use client'

import { Child } from '@/types/supabase'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Moon } from 'lucide-react'

interface RosterItemProps {
  child: Child & {
    last_activity?: { type: string; created_at: string } | null
  }
  isSelected: boolean
  onToggle: (id: string) => void
  status: 'checked_in' | 'checked_out' | 'asleep'
}

export function RosterItem({ child, isSelected, onToggle, status }: RosterItemProps) {
  const statusIndicator = {
    checked_in: 'bg-green-500',
    checked_out: 'bg-gray-400',
    asleep: 'bg-blue-400',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer',
        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
      )}
      onClick={() => onToggle(child.id)}
    >
      {/* Large Checkbox - 44x44px touch target */}
      <div className="flex items-center justify-center w-11 h-11">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(child.id)}
          className="h-6 w-6"
        />
      </div>

      {/* Avatar + Name + Last Activity */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={child.profile_photo_url || undefined} />
          <AvatarFallback>
            {getInitials(`${child.first_name} ${child.last_name}`)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <p className="font-semibold truncate">
            {child.first_name} {child.last_name}
          </p>
          {child.last_activity ? (
            <p className="text-sm text-muted-foreground truncate">
              {child.last_activity.type} {formatRelativeTime(child.last_activity.created_at)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          )}
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        {status === 'asleep' && (
          <Moon className="h-4 w-4 text-blue-500" />
        )}
        <div
          className={cn(
            'w-3 h-3 rounded-full',
            statusIndicator[status]
          )}
        />
      </div>
    </div>
  )
}
