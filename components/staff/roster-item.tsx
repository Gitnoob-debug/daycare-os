'use client'

import { Child } from '@/types/supabase'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getInitials, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Moon, LogIn, LogOut, AlertTriangle } from 'lucide-react'

interface RosterItemProps {
  child: Child & {
    last_activity?: { type: string; created_at: string } | null
  }
  isSelected: boolean
  onToggle: (id: string) => void
  status: 'checked_in' | 'checked_out' | 'asleep'
  onCheckIn?: () => void
  onCheckOut?: () => void
}

export function RosterItem({ child, isSelected, onToggle, status, onCheckIn, onCheckOut }: RosterItemProps) {
  const statusIndicator = {
    checked_in: 'bg-green-500',
    checked_out: 'bg-gray-400',
    asleep: 'bg-blue-400',
  }

  const allergies = (child.allergies as string[]) || []
  const hasAllergies = allergies.length > 0

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border transition-colors',
        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
      )}
    >
      {/* Large Checkbox - 44x44px touch target */}
      <div
        className="flex items-center justify-center w-11 h-11 cursor-pointer"
        onClick={() => onToggle(child.id)}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(child.id)}
          className="h-6 w-6"
        />
      </div>

      {/* Avatar + Name + Last Activity */}
      <div
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={() => onToggle(child.id)}
      >
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={child.profile_photo_url || undefined} />
            <AvatarFallback>
              {getInitials(`${child.first_name} ${child.last_name}`)}
            </AvatarFallback>
          </Avatar>
          {/* Status dot on avatar */}
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white',
              statusIndicator[status]
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">
              {child.first_name} {child.last_name}
            </p>
            {hasAllergies && (
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            )}
          </div>
          {child.last_activity ? (
            <p className="text-sm text-muted-foreground truncate">
              {child.last_activity.type} • {formatRelativeTime(child.last_activity.created_at)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <Badge
        variant={status === 'checked_in' ? 'default' : 'secondary'}
        className={cn(
          'shrink-0',
          status === 'checked_in' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''
        )}
      >
        {status === 'asleep' && <Moon className="h-3 w-3 mr-1" />}
        {status === 'checked_in' ? 'In' : 'Out'}
      </Badge>

      {/* Check-in/Check-out Button */}
      {status === 'checked_out' ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
          onClick={(e) => {
            e.stopPropagation()
            onCheckIn?.()
          }}
        >
          <LogIn className="h-4 w-4" />
          Check In
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-gray-600 border-gray-200 hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation()
            onCheckOut?.()
          }}
        >
          <LogOut className="h-4 w-4" />
          Check Out
        </Button>
      )}
    </div>
  )
}
