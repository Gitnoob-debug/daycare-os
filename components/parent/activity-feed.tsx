'use client'

import { ActivityLog, Child } from '@/types/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import {
  Camera,
  Video,
  Moon,
  Utensils,
  Baby,
  Pill,
  AlertTriangle,
  Smile,
  Clock,
} from 'lucide-react'
import Image from 'next/image'

interface ActivityFeedProps {
  activities: Array<ActivityLog & {
    author: { full_name: string; avatar_url: string | null }
    child: { first_name: string; last_name: string; profile_photo_url: string | null }
  }>
  childrenData: Child[]
}

const activityIcons: Record<string, typeof Camera> = {
  photo: Camera,
  video: Video,
  nap: Moon,
  meal: Utensils,
  potty: Baby,
  meds: Pill,
  incident: AlertTriangle,
  mood: Smile,
}

const activityConfig: Record<string, { bg: string; text: string; iconBg: string }> = {
  photo: { bg: 'bg-pink-50', text: 'text-pink-700', iconBg: 'from-pink-500 to-rose-500' },
  video: { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'from-purple-500 to-violet-500' },
  nap: { bg: 'bg-indigo-50', text: 'text-indigo-700', iconBg: 'from-indigo-500 to-blue-500' },
  meal: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'from-amber-500 to-orange-500' },
  potty: { bg: 'bg-cyan-50', text: 'text-cyan-700', iconBg: 'from-cyan-500 to-teal-500' },
  meds: { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'from-red-500 to-rose-500' },
  incident: { bg: 'bg-orange-50', text: 'text-orange-700', iconBg: 'from-orange-500 to-amber-500' },
  mood: { bg: 'bg-pink-50', text: 'text-pink-700', iconBg: 'from-pink-500 to-rose-500' },
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl bg-white shadow-soft p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">No activities yet today</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Check back soon for updates!</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white shadow-soft overflow-hidden">
      <div className="divide-y divide-border/30">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type] || Camera
          const config = activityConfig[activity.type] || activityConfig.photo

          return (
            <div key={activity.id} className="p-5 hover:bg-muted/20 transition-colors">
              <div className="flex gap-4">
                <Avatar className="h-14 w-14 shrink-0 ring-4 ring-white shadow-md">
                  <AvatarImage src={activity.child.profile_photo_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-rose-400 to-purple-500 text-white font-bold">
                    {getInitials(`${activity.child.first_name} ${activity.child.last_name}`)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-foreground">
                      {activity.child.first_name} {activity.child.last_name}
                    </span>
                    <Badge className={`${config.bg} ${config.text} border-0 rounded-lg text-xs font-semibold px-2.5 py-1`}>
                      <Icon className="h-3 w-3 mr-1.5" />
                      <span className="capitalize">{activity.type}</span>
                    </Badge>
                  </div>

                  {activity.description && (
                    <p className="text-sm text-foreground/80 mb-3 leading-relaxed">
                      {activity.description}
                    </p>
                  )}

                  {activity.media_url && (
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-3 max-w-md shadow-soft">
                      <Image
                        src={activity.media_url}
                        alt="Activity photo"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {activity.metadata && Object.keys(activity.metadata as object).length > 0 && (() => {
                    const meta = activity.metadata as Record<string, unknown>
                    return (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {meta.nap_duration ? (
                          <Badge className="bg-indigo-100 text-indigo-700 border-0 rounded-lg font-medium">
                            <Moon className="h-3 w-3 mr-1" />
                            {String(meta.nap_duration)} min nap
                          </Badge>
                        ) : null}
                        {meta.meal_percentage !== undefined ? (
                          <Badge className="bg-amber-100 text-amber-700 border-0 rounded-lg font-medium">
                            <Utensils className="h-3 w-3 mr-1" />
                            Ate {String(meta.meal_percentage)}%
                          </Badge>
                        ) : null}
                        {meta.mood ? (
                          <Badge className="bg-pink-100 text-pink-700 border-0 rounded-lg font-medium">
                            <Smile className="h-3 w-3 mr-1" />
                            {String(meta.mood)}
                          </Badge>
                        ) : null}
                      </div>
                    )
                  })()}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">by {activity.author.full_name}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>{formatRelativeTime(activity.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
