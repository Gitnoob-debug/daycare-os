'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Utensils, Moon, Camera, Baby, X, LogIn, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BulkActionBarProps {
  selectedCount: number
  onMeal: (mealType: string, amount: string) => void
  onNap: () => void
  onPhoto: () => void
  onPotty: (type: string) => void
  onCheckIn?: () => void
  onCheckOut?: () => void
  onClear: () => void
}

export function BulkActionBar({
  selectedCount,
  onMeal,
  onNap,
  onPhoto,
  onPotty,
  onCheckIn,
  onCheckOut,
  onClear,
}: BulkActionBarProps) {
  const [mealDrawerOpen, setMealDrawerOpen] = useState(false)
  const [pottyDrawerOpen, setPottyDrawerOpen] = useState(false)
  const [mealType, setMealType] = useState('lunch')
  const [mealAmount, setMealAmount] = useState('all')
  const [pottyType, setPottyType] = useState('wet')

  if (selectedCount === 0) return null

  const handleMealSubmit = () => {
    onMeal(mealType, mealAmount)
    setMealDrawerOpen(false)
  }

  const handlePottySubmit = () => {
    onPotty(pottyType)
    setPottyDrawerOpen(false)
  }

  return (
    <>
      <div
        className={cn(
          'fixed bottom-0 left-64 right-0 bg-card border-t shadow-lg p-4',
          'animate-in slide-in-from-bottom duration-200'
        )}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedCount} selected</span>
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {onCheckIn && (
              <Button
                variant="outline"
                onClick={onCheckIn}
                className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
              >
                <LogIn className="h-4 w-4" />
                Check In
              </Button>
            )}

            {onCheckOut && (
              <Button
                variant="outline"
                onClick={onCheckOut}
                className="gap-2 text-gray-600 border-gray-200 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" />
                Check Out
              </Button>
            )}

            <div className="w-px bg-border mx-1" />

            <Button
              variant="outline"
              onClick={() => setMealDrawerOpen(true)}
              className="gap-2"
            >
              <Utensils className="h-4 w-4" />
              Meals
            </Button>

            <Button variant="outline" onClick={onNap} className="gap-2">
              <Moon className="h-4 w-4" />
              Nap
            </Button>

            <Button variant="outline" onClick={onPhoto} className="gap-2">
              <Camera className="h-4 w-4" />
              Photo
            </Button>

            <Button
              variant="outline"
              onClick={() => setPottyDrawerOpen(true)}
              className="gap-2"
            >
              <Baby className="h-4 w-4" />
              Potty
            </Button>
          </div>
        </div>
      </div>

      {/* Meal Drawer */}
      <Dialog open={mealDrawerOpen} onOpenChange={setMealDrawerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Meal</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Meal Type</Label>
              <RadioGroup value={mealType} onValueChange={setMealType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="breakfast" id="breakfast" />
                  <Label htmlFor="breakfast">Breakfast</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lunch" id="lunch" />
                  <Label htmlFor="lunch">Lunch</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="snack" id="snack" />
                  <Label htmlFor="snack">Snack</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Amount Eaten</Label>
              <RadioGroup value={mealAmount} onValueChange={setMealAmount}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">All (100%)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="most" id="most" />
                  <Label htmlFor="most">Most (75%)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="some" id="some" />
                  <Label htmlFor="some">Some (50%)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none">None (0%)</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMealDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMealSubmit}>Log Meal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Potty Drawer */}
      <Dialog open={pottyDrawerOpen} onOpenChange={setPottyDrawerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Potty</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Label>Type</Label>
            <RadioGroup value={pottyType} onValueChange={setPottyType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="wet" id="wet" />
                <Label htmlFor="wet">Wet</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bm" id="bm" />
                <Label htmlFor="bm">BM</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both">Both</Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPottyDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePottySubmit}>Log Potty</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
