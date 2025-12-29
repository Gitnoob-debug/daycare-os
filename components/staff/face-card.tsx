'use client'

import { useState } from 'react'
import { Child } from '@/types/supabase'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import Image from 'next/image'

interface FaceCardProps {
  child: Child
  isSelected?: boolean
  onSelect?: (id: string) => void
}

export function FaceCard({ child, isSelected, onSelect }: FaceCardProps) {
  const [showAllergyModal, setShowAllergyModal] = useState(false)
  const allergies = (child.allergies as string[]) || []
  const hasAllergies = allergies.length > 0

  return (
    <>
      <div
        className={cn(
          'relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all',
          'hover:ring-2 hover:ring-primary hover:ring-offset-2',
          isSelected && 'ring-2 ring-primary ring-offset-2'
        )}
        onClick={() => onSelect?.(child.id)}
      >
        {/* Image */}
        {child.profile_photo_url ? (
          <Image
            src={child.profile_photo_url}
            alt={`${child.first_name} ${child.last_name}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-4xl font-bold text-muted-foreground">
              {getInitials(`${child.first_name} ${child.last_name}`)}
            </span>
          </div>
        )}

        {/* Allergy Warning Icon */}
        {hasAllergies && (
          <button
            className="allergy-indicator"
            onClick={(e) => {
              e.stopPropagation()
              setShowAllergyModal(true)
            }}
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        )}

        {/* Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <p className="text-white text-2xl font-bold">
            {child.first_name}
          </p>
        </div>

        {/* Status indicator */}
        <div
          className={cn(
            'absolute top-2 left-2 w-3 h-3 rounded-full',
            child.current_status === 'checked_in' ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      </div>

      {/* Allergy Alert Modal */}
      <Dialog open={showAllergyModal} onOpenChange={setShowAllergyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              ALLERGY ALERT: {child.first_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy, i) => (
                <Badge key={i} variant="destructive" className="text-lg px-4 py-2">
                  {allergy}
                </Badge>
              ))}
            </div>
            {child.medical_notes && (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-800">Medical Notes:</p>
                <p className="text-sm text-red-700 mt-1">{child.medical_notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
