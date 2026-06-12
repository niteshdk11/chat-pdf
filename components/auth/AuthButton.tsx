'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  email: string
}

export default function AuthButton() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      router.push('/')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center space-x-4">
        <div className="h-8 w-20 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="h-8 w-32 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">{user.email}</span>
        <Link href="/dashboard">
          <Button variant="outline" className="rounded-full">
            Dashboard
          </Button>
        </Link>
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="rounded-full"
        >
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <Link href="/login">
        <Button variant="outline" className="rounded-full">
          Sign In
        </Button>
      </Link>
      <Link href="/signup">
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700">
          Sign Up
        </Button>
      </Link>
    </div>
  )
}
