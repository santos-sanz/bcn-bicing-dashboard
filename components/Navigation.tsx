"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/Bicing_logo.svg"
              alt="Bicing Logo"
              width={100}
              height={40}
              priority
            />
          </Link>
          <div className="flex space-x-4">
            <Link 
              href="/" 
              className={`text-gray-600 hover:text-blue-500 ${pathname === '/' ? 'text-blue-500 font-semibold' : ''}`}
            >
              Dashboard
            </Link>
            <Link 
              href="/analytics" 
              className={`text-gray-600 hover:text-blue-500 ${pathname === '/analytics' ? 'text-blue-500 font-semibold' : ''}`}
            >
              Analytics
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}