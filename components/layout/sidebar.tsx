'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
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
  Camera,
  BarChart3,
  Mail,
  School,
  UserCog,
  Sparkles,
  Heart,
} from 'lucide-react'

// Simplified profile type for sidebar
interface SidebarProfile {
  id: string
  email: string
  full_name: string
  role: string
  avatar_url: string | null
}

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

  const getRoleColor = () => {
    switch (profile.role) {
      case 'owner':
        return 'from-purple-500 to-pink-500'
      case 'teacher':
        return 'from-teal-500 to-cyan-500'
      case 'parent':
        return 'from-rose-500 to-orange-500'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const getRoleBadge = () => {
    switch (profile.role) {
      case 'owner':
        return { label: 'Admin', color: 'bg-purple-100 text-purple-700' }
      case 'teacher':
        return { label: 'Teacher', color: 'bg-teal-100 text-teal-700' }
      case 'parent':
        return { label: 'Parent', color: 'bg-rose-100 text-rose-700' }
      default:
        return { label: profile.role, color: 'bg-gray-100 text-gray-700' }
    }
  }

  const roleBadge = getRoleBadge()

  return (
    <div className="w-72 bg-white border-r border-border/50 flex flex-col h-screen sticky top-0 shadow-soft">
      {/* Logo Section */}
      <div className="p-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getRoleColor()} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent">
              Mommy & Me
            </h1>
            <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
              Daycare Management
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-auto">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
          Navigation
        </p>
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname.startsWith(link.href)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-white/20'
                  : 'bg-muted group-hover:bg-background'
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="font-medium">{link.label}</span>
              {isActive && (
                <Sparkles className="h-3 w-3 ml-auto animate-pulse" />
              )}
            </Link>
          )
        })}

        {profile.role === 'parent' && (
          <>
            <div className="h-px bg-border/50 my-4" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
              Family
            </p>
            <Link
              href="/parent/children"
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                pathname.startsWith('/parent/children')
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-lg transition-colors',
                pathname.startsWith('/parent/children')
                  ? 'bg-white/20'
                  : 'bg-muted group-hover:bg-background'
              )}>
                <Baby className="h-4 w-4" />
              </div>
              <span className="font-medium">My Children</span>
            </Link>
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border/50 bg-muted/30">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white shadow-soft">
          <div className="relative">
            <Avatar className="h-11 w-11 ring-2 ring-white shadow-md">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className={`bg-gradient-to-br ${getRoleColor()} text-white font-semibold`}>
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{profile.full_name}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBadge.color}`}>
              {roleBadge.label}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
