'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from '@clerk/nextjs'
import { Activity } from 'lucide-react'

import { createClient } from '@/utils/supabase/client'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isSignedIn, isLoaded } = useUser()
  const [role, setRole] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)

  // Sync with Supabase on auth state change
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      setRole(null)
      localStorage.removeItem('role')
      setSynced(false)
      return;
    }

    if (synced) {
      // Just maintain state if already synced in this session
      const storedRole = localStorage.getItem('role');
      if (storedRole) setRole(storedRole);
      return;
    }

    const syncUser = async () => {
      const supabase = createClient()
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('role')
          .eq('clerk_id', user.id)
          .single()

        let currentRole = 'unknown'

        if (checkError && checkError.code === 'PGRST116') {
          // User not found, insert them
          const { error: insertError } = await supabase.from('users').insert({
            clerk_id: user.id,
            email: user.emailAddresses[0]?.emailAddress || '',
            name: user.fullName || "New User",
            role: 'unknown'
          })
          if (insertError) throw insertError;
        } else if (existingUser) {
          currentRole = existingUser.role
        }

        setRole(currentRole)
        localStorage.setItem('role', currentRole)
        setSynced(true)

        // Route protection for onboarding
        if (currentRole === 'unknown' && !pathname.includes('/onboarding')) {
          router.push('/onboarding')
        }
      } catch (err) {
        console.error("Supabase sync error:", err)
      }
    }

    syncUser()
  }, [isSignedIn, user, isLoaded, synced, pathname, router])

  const linkClass = (path: string) =>
    `transition-all font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-2 ${pathname === path
      ? 'bg-blue-50 text-blue-700'
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-2 bg-blue-600 rounded-xl group-hover:scale-105 transition-transform shadow-lg shadow-blue-600/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-black italic tracking-tighter">
            <span className="text-slate-900">Medico</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Tourism</span>
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-slate-200/60 shadow-sm backdrop-blur-xl">
          <SignedIn>
            {role === 'patient' && (
              <>
                <Link href="/patient-dashboard" className={linkClass('/patient-dashboard')}>
                  Dashboard
                </Link>
                <Link href="/patient-dashboard/new-visit" className={linkClass('/patient-dashboard/new-visit')}>
                  New Visit
                </Link>
              </>
            )}

            {role === 'doctor' && (
              <>
                <Link href="/doc" className={linkClass('/doc')}>
                  Doctor Portal
                </Link>
                <Link href="/reports" className={linkClass('/reports')}>
                  Reports
                </Link>
              </>
            )}

            {role === 'admin' && (
              <Link href="/admin" className={linkClass('/admin')}>
                Admin Panel
              </Link>
            )}
          </SignedIn>
        </nav>

        {/* Right side buttons */}
        <div className="flex items-center gap-4">
          <SignedOut>
            <div className="flex items-center gap-3">
              <SignInButton mode="redirect">
                <button className="text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-2 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="redirect">
                <button className="bg-slate-900 text-white rounded-xl font-bold text-sm px-6 py-2.5 shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-blue-600/20">
                  Get Started
                </button>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="p-1 rounded-full bg-slate-50 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-9 h-9" } }} />
            </div>
          </SignedIn>
        </div>

      </div>
    </header>
  )
}