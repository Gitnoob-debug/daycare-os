'use client'

import { Child } from '@/types/supabase'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getInitials, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Moon, LogIn, LogOut, AlertTriangle, Clock } from 'lucide-react'

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
  const statusConfig = {
    checked_in: { dot: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
    checked_out: { dot: 'bg-slate-400', ring: 'ring-slate-400/20' },
    asleep: { dot: 'bg-indigo-500', ring: 'ring-indigo-500/20' },
  }

  const allergies = (child.allergies as string[]) || []
  const hasAllergies = allergies.length > 0

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 transition-all duration-200',
        isSelected
          ? 'bg-gradient-to-r from-primary/10 to-primary/5'
          : 'hover:bg-muted/30'
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
          className="h-6 w-6 rounded-lg border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>

      {/* Avatar + Name + Last Activity */}
      <div
        className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
        onClick={() => onToggle(child.id)}
      >
        <div className="relative">
          <Avatar className={cn(
            "h-14 w-14 ring-4 transition-all",
            statusConfig[status].ring,
            isSelected && "ring-primary/30"
          )}>
            <AvatarImage src={child.profile_photo_url || undefined} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-rose-400 to-purple-500 text-white font-semibold text-lg">
              {getInitials(`${child.first_name} ${child.last_name}`)}
            </AvatarFallback>
          </Avatar>
          {/* Status dot on avatar */}
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[3px] border-white shadow-sm',
              statusConfig[status].dot
            )}
          />
          {/* Allergy indicator */}
          {hasAllergies && (
            <div className="allergy-indicator">
              <AlertTriangle className="h-3 w-3" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-foreground truncate text-lg">
              {child.first_name} {child.last_name}
            </p>
          </div>
          {child.last_activity ? (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="capitalize">{child.last_activity.type.replace('_', ' ')}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>{formatRelativeTime(child.last_activity.created_at)}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/70 italic">No activity logged yet</p>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <Badge
        className={cn(
          'shrink-0 px-3 py-1.5 rounded-full font-semibold text-xs',
          status === 'checked_in'
            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            : status === 'asleep'
            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
            : 'bg-slate-100 text-slate-600 border border-slate-200'
        )}
      >
        {status === 'asleep' && <Moon className="h-3 w-3 mr-1.5" />}
        {status === 'checked_in' ? 'Checked In' : status === 'asleep' ? 'Napping' : 'Checked Out'}
      </Badge>

      {/* Check-in/Check-out Button */}
      {status === 'checked_out' ? (
        <Button
          size="sm"
          className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 shadow-md shadow-emerald-500/20"
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
          className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 rounded-xl px-4"
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
