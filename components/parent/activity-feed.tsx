'use client'

import { ActivityLog, Child } from '@/types/supabase'
import { Card, CardContent } from '@/components/ui/card'
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
} from 'lucide-react'
import Image from 'next/image'

interface ActivityFeedProps {
  activities: Array<ActivityLog & {
    author: { full_name: string; avatar_url: string | null }
    child: { first_name: string; last_name: string; profile_photo_url: string | null }
  }>
  childrenData: Child[]
}

const activityIcons = {
  photo: Camera,
  video: Video,
  nap: Moon,
  meal: Utensils,
  potty: Baby,
  meds: Pill,
  incident: AlertTriangle,
  mood: Smile,
}

const activityColors = {
  photo: 'bg-blue-100 text-blue-700',
  video: 'bg-purple-100 text-purple-700',
  nap: 'bg-indigo-100 text-indigo-700',
  meal: 'bg-green-100 text-green-700',
  potty: 'bg-yellow-100 text-yellow-700',
  meds: 'bg-red-100 text-red-700',
  incident: 'bg-orange-100 text-orange-700',
  mood: 'bg-pink-100 text-pink-700',
}

export function ActivityFeed({ activities, childrenData }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No activities yet today. Check back soon!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.type]
        const colorClass = activityColors[activity.type]

        return (
          <Card key={activity.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={activity.child.profile_photo_url || undefined} />
                  <AvatarFallback>
                    {getInitials(`${activity.child.first_name} ${activity.child.last_name}`)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      {activity.child.first_name} {activity.child.last_name}
                    </span>
                    <Badge variant="secondary" className={colorClass}>
                      <Icon className="h-3 w-3 mr-1" />
                      {activity.type}
                    </Badge>
                  </div>

                  {activity.description && (
                    <p className="text-sm text-foreground mb-2">
                      {activity.description}
                    </p>
                  )}

                  {activity.media_url && (
                    <div className="relative aspect-video rounded-lg overflow-hidden mb-2 max-w-md">
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
                      <div className="flex flex-wrap gap-2 mb-2">
                        {meta.nap_duration ? (
                          <Badge variant="outline">
                            Nap: {String(meta.nap_duration)} min
                          </Badge>
                        ) : null}
                        {meta.meal_percentage !== undefined ? (
                          <Badge variant="outline">
                            Ate: {String(meta.meal_percentage)}%
                          </Badge>
                        ) : null}
                        {meta.mood ? (
                          <Badge variant="outline">
                            Mood: {String(meta.mood)}
                          </Badge>
                        ) : null}
                      </div>
                    )
                  })()}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>by {activity.author.full_name}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(activity.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
