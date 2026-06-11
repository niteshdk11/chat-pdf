'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Only initialize Supabase after component is mounted on client
    const supabase = createClient()
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  const handleEmailSignIn = async () => {
    const supabase = createClient()
    const email = prompt('Enter your email:')
    if (email) {
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      alert('Check your email for the login link!')
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
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={handleEmailSignIn}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200"
      >
        Sign In
      </button>
      <button
        onClick={handleSignIn}
        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700"
      >
        Sign Up with Google
      </button>
    </div>
  )
}
