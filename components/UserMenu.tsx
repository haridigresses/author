'use client'

import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useState, useEffect, useRef } from "react"
import type { Id } from "@/convex/_generated/dataModel"

export default function UserMenu() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const createAnonymous = useMutation(api.users.createAnonymous)

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (storedUserId) {
      setUserId(storedUserId as Id<"users">)
    }
    setIsLoading(false)
  }, [])

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

  const handleSignIn = async () => {
    const newUserId = await createAnonymous()
    localStorage.setItem('userId', newUserId)
    setUserId(newUserId)
    setShowMenu(false)
  }

  const handleSignOut = () => {
    localStorage.removeItem('userId')
    setUserId(null)
    setShowMenu(false)
  }

  if (isLoading) {
    return (
      <button className="toolbar-btn" disabled>
        ⋯
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        className={`toolbar-btn ${showMenu ? 'toolbar-btn-active' : ''}`}
        title={userId ? "Account" : "Sign in"}
      >
        👤
      </button>
      {showMenu && (
        <div ref={menuRef} className="user-menu">
          {userId ? (
            <>
              <div className="user-menu-status">Signed in</div>
              <button onClick={handleSignOut} className="user-menu-item">
                Sign out
              </button>
            </>
          ) : (
            <button onClick={handleSignIn} className="user-menu-item">
              Sign in
            </button>
          )}
        </div>
      )}
    </div>
  )
}
