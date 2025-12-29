import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Baby, Users, Shield } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Get user's role and redirect accordingly
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string } | null
    if (profile) {
      switch (profile.role) {
        case 'owner':
          redirect('/admin/dashboard')
        case 'teacher':
          redirect('/staff/dashboard')
        case 'parent':
          redirect('/parent/dashboard')
      }
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-primary mb-4">
            Mommy & Me
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Modern daycare management made simple. Keep parents connected,
            staff efficient, and children safe.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          <div className="bg-card p-6 rounded-xl shadow-lg border">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Baby className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">For Parents</h3>
            <p className="text-muted-foreground text-sm">
              Real-time updates, photos, and daily reports about your child&apos;s activities.
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-lg border">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">For Teachers</h3>
            <p className="text-muted-foreground text-sm">
              Quick check-ins, bulk actions, and easy activity logging for your classroom.
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-lg border">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">For Owners</h3>
            <p className="text-muted-foreground text-sm">
              Complete oversight with dashboards, staff management, and communication tools.
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/login">
            <Button size="lg" className="text-lg px-8">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
