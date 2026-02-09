'use client'

import { useConvexAuth } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { useState, useRef, useEffect } from "react"

export default function UserMenu() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return

    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  const handleSignIn = () => {
    void signIn("google")
  }

  const handleSignOut = () => {
    void signOut()
    setShowMenu(false)
  }

  if (isLoading) {
    return (
      <button className="toolbar-btn" disabled>
        &#x22EF;
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        className={`toolbar-btn ${showMenu ? 'toolbar-btn-active' : ''}`}
        title={isAuthenticated ? "Account" : "Sign in"}
      >
        &#x1F464;
      </button>
      {showMenu && (
        <div ref={menuRef} className="user-menu">
          {isAuthenticated ? (
            <>
              <div className="user-menu-status">Signed in</div>
              <button onClick={handleSignOut} className="user-menu-item">
                Sign out
              </button>
            </>
          ) : (
            <button onClick={handleSignIn} className="user-menu-item">
              Sign in with Google
            </button>
          )}
        </div>
      )}
    </div>
  )
}
