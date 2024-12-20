"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Auth } from '@/components/Auth'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'

export function Navigation() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)

    // Get initial session
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      window.removeEventListener('resize', checkIfMobile)
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const toggleMenu = () => setIsOpen(!isOpen)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsOpen(false)
  }

  const NavLinks = () => {
    return (
      <div className={`${isMobile ? 'flex flex-col' : 'flex flex-row items-center space-x-4'}`}>
        {user && (
          <>
            <Link 
              href="/analytics" 
              className={`py-2 px-4 text-gray-600 hover:text-blue-500 ${pathname === '/analytics' ? 'text-blue-500 font-semibold' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              Analytics
            </Link>
            <Link 
              href="/tasks" 
              className={`py-2 px-4 text-gray-600 hover:text-blue-500 ${pathname === '/tasks' ? 'text-blue-500 font-semibold' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              Tasks
            </Link>
          </>
        )}
        {isMobile && (
          user ? (
            <Button variant="outline" size="sm" onClick={handleLogout} className="mt-4">
              Cerrar sesión
            </Button>
          ) : (
            <Auth />
          )
        )}
      </div>
    );
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          {isMobile ? (
            <button onClick={toggleMenu} className="text-gray-500 hover:text-gray-600">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          ) : (
            <div className="flex-1">
              <NavLinks />
            </div>
          )}
          <div className="flex-1 flex justify-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/Bicing_logo.svg"
                alt="Bicing Logo"
                width={100}
                height={40}
                priority
              />
            </Link>
          </div>
          {!isMobile && (
            <div className="flex-1 flex justify-end">
              {user ? (
                <div className="flex items-center">
                  <span className="mr-4">Welcome, {user.email}</span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Cerrar sesión
                  </Button>
                </div>
              ) : (
                <Auth />
              )}
            </div>
          )}
        </div>
      </div>
      {isMobile && isOpen && (
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out">
          <div className="flex justify-end p-4">
            <button onClick={toggleMenu} className="text-gray-500 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col">
            <NavLinks />
          </div>
        </div>
      )}
    </nav>
  )
}