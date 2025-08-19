import { useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'

declare global {
  interface Window {
    google?: any
  }
}

type GoogleButtonProps = {
  clientId: string
  text?: 'signin_with' | 'signup_with' | 'continue_with'
  redirectPath?: string
}

export default function GoogleButton({ clientId, text = 'continue_with', redirectPath = '/dashboard' }: GoogleButtonProps) {
  const divRef = useRef<HTMLDivElement | null>(null)
  const { signInWithGoogle } = useAuth()

  useEffect(() => {
    // Load GIS script if not present
    if (!window.google?.accounts?.id) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = render
      document.head.appendChild(script)
      return
    }
    render()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  function render() {
    if (!window.google?.accounts?.id || !divRef.current) return
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          await signInWithGoogle(response.credential)
          window.history.replaceState({}, '', redirectPath)
          window.dispatchEvent(new PopStateEvent('popstate'))
        } catch (e) {
          // ignore
        }
      },
      ux_mode: 'popup',
      auto_select: false,
      context: text,
    })
    window.google.accounts.id.renderButton(divRef.current, { theme: 'filled_black', size: 'large', text })
  }

  return <div ref={divRef} />
}


