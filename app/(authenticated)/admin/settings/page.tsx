'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Clock, Building, Save } from 'lucide-react'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    quiet_hours_start: '18:00',
    quiet_hours_end: '07:00',
    daycare_name: '',
    timezone: 'America/New_York',
  })

  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const { data } = await supabase.from('org_settings').select('*')

    if (data) {
      const settingsMap: Record<string, string> = {}
      const settingsData = data as { key: string; value: string }[]
      settingsData.forEach((s) => {
        settingsMap[s.key] = s.value
      })
      setSettings((prev) => ({ ...prev, ...settingsMap }))
    }

    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      // Upsert each setting
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from('org_settings')
          .upsert({ key, value } as never, { onConflict: 'key' })

        if (error) throw error
      }

      toast({
        title: 'Settings saved',
        description: 'Organization settings have been updated.',
      })
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your daycare organization settings
        </p>
      </div>

      {/* Organization Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Organization
          </CardTitle>
          <CardDescription>Basic information about your daycare</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="daycare_name">Daycare Name</Label>
            <Input
              id="daycare_name"
              value={settings.daycare_name}
              onChange={(e) =>
                setSettings({ ...settings, daycare_name: e.target.value })
              }
              placeholder="Enter daycare name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={settings.timezone}
              onChange={(e) =>
                setSettings({ ...settings, timezone: e.target.value })
              }
              placeholder="America/New_York"
            />
            <p className="text-xs text-muted-foreground">
              Used for calculating quiet hours
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Messages sent during quiet hours are queued and delivered when quiet
            hours end. This prevents late-night notifications to parents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet_start">Start Time</Label>
              <Input
                id="quiet_start"
                type="time"
                value={settings.quiet_hours_start}
                onChange={(e) =>
                  setSettings({ ...settings, quiet_hours_start: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quiet_end">End Time</Label>
              <Input
                id="quiet_end"
                type="time"
                value={settings.quiet_hours_end}
                onChange={(e) =>
                  setSettings({ ...settings, quiet_hours_end: e.target.value })
                }
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Current setting: Quiet hours from{' '}
            <strong>{settings.quiet_hours_start}</strong> to{' '}
            <strong>{settings.quiet_hours_end}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </>
        )}
      </Button>
    </div>
  )
}
