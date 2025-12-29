'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
// Simplified profile type for sidebar
interface SidebarProfile {
  id: string
  email: string
  full_name: string
  role: string
  avatar_url: string | null
}
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import {
  Home,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  Baby,
  LayoutGrid,
  Camera,
  BarChart3,
  Mail,
  School,
  UserCog,
} from 'lucide-react'

interface SidebarProps {
  profile: SidebarProfile
}

const parentLinks = [
  { href: '/parent/dashboard', label: 'Feed', icon: Home },
  { href: '/parent/chat', label: 'Messages', icon: MessageSquare },
]

const staffLinks = [
  { href: '/staff/dashboard', label: 'Dashboard', icon: Home },
  { href: '/staff/camera', label: 'Camera', icon: Camera },
]

const adminLinks = [
  { href: '/admin/dashboard', label: 'The Pulse', icon: BarChart3 },
  { href: '/admin/classrooms', label: 'Classrooms', icon: School },
  { href: '/admin/children', label: 'Children', icon: Baby },
  { href: '/admin/staff', label: 'Staff', icon: UserCog },
  { href: '/admin/messaging', label: 'Shadow Inbox', icon: Mail },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const getLinks = () => {
    switch (profile.role) {
      case 'owner':
        return [...adminLinks, ...staffLinks]
      case 'teacher':
        return staffLinks
      case 'parent':
        return parentLinks
      default:
        return []
    }
  }

  const links = getLinks()

  return (
    <div className="w-64 bg-card border-r flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b">
        <Link href="/" className="text-xl font-bold text-primary">
          Mommy & Me
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname.startsWith(link.href)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          )
        })}

        {profile.role === 'parent' && (
          <Link
            href="/parent/children"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              pathname.startsWith('/parent/children')
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <Baby className="h-5 w-5" />
            <span>My Children</span>
          </Link>
        )}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-4">
          <Avatar>
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
