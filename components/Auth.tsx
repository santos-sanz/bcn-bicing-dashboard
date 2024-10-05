import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from "@/components/ui/button"
import { FcGoogle } from 'react-icons/fc' // Importamos el icono de Google
import { User } from '@supabase/supabase-js'

export function Auth() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleLogin = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error: any) {  // Especifica el tipo de error como 'any'
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
    } catch (error: any) {  // Especifica el tipo de error como 'any'
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm">{user.email}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loading}
        >
          {loading ? 'Logging out...' : 'Log out'}
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={handleLogin}
      disabled={loading}
      variant="outline"
      size="sm"
      className="flex items-center space-x-2"
    >
      <FcGoogle className="w-5 h-5" />
      <span>{loading ? 'Loading...' : 'Sign in'}</span>
    </Button>
  )
}