import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return then.toLocaleDateString()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function calculateAge(dateOfBirth: string | Date): { years: number; months: number } {
  const dob = new Date(dateOfBirth)
  const now = new Date()

  let years = now.getFullYear() - dob.getFullYear()
  let months = now.getMonth() - dob.getMonth()

  if (months < 0) {
    years--
    months += 12
  }

  if (now.getDate() < dob.getDate()) {
    months--
    if (months < 0) {
      years--
      months += 12
    }
  }

  return { years, months }
}

export function formatAge(dateOfBirth: string | Date): string {
  const { years, months } = calculateAge(dateOfBirth)

  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''}`
  }

  if (months === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`
  }

  return `${years}y ${months}m`
}
