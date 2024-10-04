import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Navigation } from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bicing Barcelona',
  description: 'Dashboard and analytics for Bicing Barcelona',
}

function NavigationWrapper() {
  return <Navigation />
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100`}>
        <NavigationWrapper />
        <main className="container mx-auto p-4 mt-8">
          {children}
        </main>
      </body>
    </html>
  )
}
