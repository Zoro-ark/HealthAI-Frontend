'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from '@clerk/nextjs'

export default function Navbar() {
  const router = useRouter()
  const { user, isSignedIn } = useUser()
  const [role, setRole] = useState<string | null>(null)
  const [activePath, setActivePath] = useState('');

  // Track current path
  useEffect(() => {
    setActivePath(window.location.pathname)
  }, [])

  // Example: Fetch custom role from backend (if Clerk user is linked to your DB)
  useEffect(() => {
    if (isSignedIn && user) {
      const storedRole = localStorage.getItem('role')
      setRole(storedRole || 'patient') // fallback
    } else {
      setRole(null)
    }
  }, [isSignedIn, user])


  const linkClass = (path: string) =>
        `transition-colors text-sm sm:text-base ${ // Adjusted text size
          activePath === path
            ? 'text-vibrant-blue font-semibold' // Make active link bold
            : 'text-gray-700 hover:text-vibrant-orange'
        }`

  const myrole='user';

  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (!isSignedIn || !user || synced) return;

    const createUser = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/addUser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            name: user.fullName,
            role: myrole
          }),
        });

        if (res.ok) console.log("User synced");
        setSynced(true); // prevent multiple calls
      } catch (err) {
        console.error(err);
      }
    };

    createUser();
  }, [user, isSignedIn, synced]);


return (
    <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-gray-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between"> {/* Adjusted height */}
        <Link href="/" className="text-xl sm:text-2xl font-extrabold gradient-text"> {/* Adjusted text size */}
          MedicoTourism
        </Link>

        {/* Navigation links */}
        <nav className="hidden sm:flex items-center gap-4 md:gap-6"> {/* Hide on small screens, adjust gap */}
           {/* Add common links if any */}
           {/* <Link href="/about" className={linkClass('/about')}>About</Link> */}

          {/* Role-based AND SignedIn Check */}
           <SignedIn>
               {/* Link to Visits page for all signed-in users */}
               <Link href="/visits" className={linkClass('/visits')}>
                    My Visits
               </Link>

                {/* Existing role-specific links */}
                {/* Conditionally render links based on the 'role' state */}
                {role === 'patient' && (
                    <>
                        {/* Example: Add patient-specific links if needed, maybe profile handled by UserButton */}
                        {/* <Link href="/profile" className={linkClass('/profile')}>Profile</Link> */}
                     </>
                )}
                {role === 'doctor' && (
                    <>
                      <Link href="/doctor" className={linkClass('/doctor')}>
                        Doctor Panel
                      </Link>
                      <Link href="/reports" className={linkClass('/reports')}>
                        Reports
                      </Link>
                    </>
                )}
                {role === 'admin' && (
                    <Link href="/admin" className={linkClass('/admin')}>
                      Admin Dashboard
                    </Link>
                )}
           </SignedIn>

        </nav>

        {/* Right side buttons */}
        <div className="flex items-center">
          <SignedOut>
               {/* Using the Sign In/Up buttons provided by Clerk */}
               <div className="flex gap-2 sm:gap-3">
                 <SignInButton mode="redirect">
                    <button className="bg-[#6c47ff] cursor-pointer text-white rounded-full font-medium text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 transition-transform hover:scale-105">
                      Sign In
                    </button>
                 </SignInButton>
                 <SignUpButton mode="redirect">
                     <button className="border border-[#6c47ff] cursor-pointer text-[#6c47ff] rounded-full font-medium text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 transition-transform hover:scale-105 bg-white hover:bg-purple-50">
                       Sign Up
                     </button>
                 </SignUpButton>
                </div>
          </SignedOut>

          <SignedIn>
             {/* UserButton handles profile, sign out etc. */}
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
           {/* Optional: Add a mobile menu button here for smaller screens */}
         </div>
      </div>
    </header>
  )
}