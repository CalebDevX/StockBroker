import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'

export default function AuthCallbackPage() {
  const [, navigate] = useLocation()
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken  = params.get('accessToken')
    const refreshToken = params.get('refreshToken')
    const err          = params.get('error')

    if (err) {
      setError(decodeURIComponent(err))
      setTimeout(() => navigate('/'), 3000)
      return
    }

    if (accessToken && refreshToken) {
      localStorage.setItem('access_token',  accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      window.location.replace('/dashboard')
    } else {
      navigate('/')
    }
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✕</span>
          </div>
          <h1 className="text-lg font-bold text-foreground mb-2">Sign-in failed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-3">Redirecting you back…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  )
}
