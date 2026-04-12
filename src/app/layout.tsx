import { type Metadata } from 'next'
import {
  ClerkProvider,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Navbar from '@/Components/Navbar/Navbar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MedicoTourism - Your Health Journey',
  description: 'AI-driven medical tourism platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      {/* Forcing color-scheme light at the HTML root to stop Safari/Chrome OS dark-mode overrides */}
      <html lang="en" className="light" style={{ colorScheme: 'light' }}>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}>
          <Navbar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
