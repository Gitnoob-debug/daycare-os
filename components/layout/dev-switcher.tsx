'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Baby, Users, Shield } from 'lucide-react'

export function DevSwitcher() {
  const pathname = usePathname()

  const portals = [
    {
      name: 'Parent',
      href: '/parent/dashboard',
      icon: Baby,
      active: pathname.startsWith('/parent')
    },
    {
      name: 'Teacher',
      href: '/staff/dashboard',
      icon: Users,
      active: pathname.startsWith('/staff')
    },
    {
      name: 'Admin',
      href: '/admin/dashboard',
      icon: Shield,
      active: pathname.startsWith('/admin')
    },
  ]

  return (
    <div className="bg-gray-900 text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">DEV MODE - Portal Switcher</span>
        <div className="flex gap-1">
          {portals.map((portal) => {
            const Icon = portal.icon
            return (
              <Link
                key={portal.name}
                href={portal.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium transition-colors",
                  portal.active
                    ? "bg-white text-gray-900"
                    : "text-gray-300 hover:bg-gray-800"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {portal.name}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
