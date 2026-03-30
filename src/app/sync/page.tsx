'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

function SyncContent() {
  const { user, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [synced, setSynced] = useState(false)

  // Read the optionally passed role from Navbar e.g. /sync?role=doctor
  // Prioritize localStorage to prevent OAuth providers from stripping the URL queries
  const pendingRole = typeof window !== 'undefined' ? localStorage.getItem('pendingRole') : null;
  const requestedRole = pendingRole || searchParams.get('role') || 'patient'

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      router.push('/')
      return;
    }

    if (synced) return;

    const syncUser = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/addUser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            name: user.fullName,
            role: requestedRole, // Use the role selected in the UI
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // The backend returns user inside `data.user`
          const role = data.user?.role || requestedRole || 'patient';
          localStorage.setItem('role', role);
          setSynced(true);

          if (role === 'doctor') {
            window.location.href = '/doctor';
          } else if (role === 'admin') {
            window.location.href = '/admin';
          } else {
            // patient / user
            if (data.user?.is_verified) {
              window.location.href = '/visits';
            } else {
              window.location.href = '/verification';
            }
          }
        } else {
          // fallback
          window.location.href = '/verification';
        }
      } catch (err) {
        console.error('Failed to sync user', err);
        window.location.href = '/verification'; // fallback
      }
    };

    syncUser();
  }, [user, isLoaded, isSignedIn, router, synced, requestedRole]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Loading Spinner */}
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-600 font-medium animate-pulse">Setting up your account...</p>
    </div>
  )
}

export default function SyncPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense fallback={<div>Loading...</div>}>
        <SyncContent />
      </Suspense>
    </div>
  )
}
