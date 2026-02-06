"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import Editor from "./Editor"
import DocumentList from "./DocumentList"

const LAST_DOC_KEY = "author-last-document"

export default function DocumentApp() {
  const [documentId, setDocumentId] = useState<Id<"documents"> | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userId, setUserId] = useState<Id<"users"> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const createAnonymous = useMutation(api.users.createAnonymous)

  // Load userId from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (storedUserId) {
      setUserId(storedUserId as Id<"users">)
    }
    setIsLoading(false)
  }, [])

  // Listen for sign-out events from UserMenu
  useEffect(() => {
    const handleAuthChange = () => {
      const storedUserId = localStorage.getItem('userId')
      setUserId(storedUserId ? storedUserId as Id<"users"> : null)
      if (!storedUserId) setDocumentId(null)
    }
    window.addEventListener('auth-change', handleAuthChange)
    return () => window.removeEventListener('auth-change', handleAuthChange)
  }, [])

  const handleSignIn = useCallback(async () => {
    const newUserId = await createAnonymous()
    localStorage.setItem('userId', newUserId)
    setUserId(newUserId)
    window.dispatchEvent(new Event('auth-change'))
  }, [createAnonymous])

  const documents = useQuery(api.documents.list, userId ? { userId } : "skip")
  const createDocument = useMutation(api.documents.create)
  const updateDocument = useMutation(api.documents.update)

  // On mount, restore last document or create one
  useEffect(() => {
    if (!userId || documents === undefined) return // Still loading or no user

    const lastDocId = localStorage.getItem(LAST_DOC_KEY)

    if (lastDocId && documents.some(d => d._id === lastDocId)) {
      setDocumentId(lastDocId as Id<"documents">)
    } else if (documents.length > 0) {
      setDocumentId(documents[0]._id)
    } else {
      // No documents - create one
      createDocument({ title: "Untitled", userId }).then((id) => {
        setDocumentId(id)
      })
    }
  }, [documents, createDocument, userId])

  // Persist selected document
  useEffect(() => {
    if (documentId) {
      localStorage.setItem(LAST_DOC_KEY, documentId)
    }
  }, [documentId])

  const handleTitleChange = (title: string) => {
    if (documentId && title) {
      updateDocument({ id: documentId, title })
    }
  }

  const handleSelectDocument = (id: Id<"documents">) => {
    setDocumentId(id)
  }

  // Show landing page if no user
  if (!userId && !isLoading) {
    return (
      <div className="landing-page">
        <div className="landing-content">
          <h1 className="landing-title">Author</h1>
          <p className="landing-subtitle">A writing environment with AI assistance</p>
          <button onClick={handleSignIn} className="landing-cta">
            Start writing
          </button>
        </div>
      </div>
    )
  }

  // Show loading while we determine initial document
  if (documents === undefined || documentId === null) {
    return (
      <div className="document-app-loading">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className={`document-app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="document-sidebar">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Show documents" : "Hide documents"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {sidebarCollapsed ? (
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>
        {!sidebarCollapsed && userId && (
          <DocumentList
            currentDocumentId={documentId}
            onSelect={handleSelectDocument}
            userId={userId}
          />
        )}
      </div>
      <div className="document-editor-container">
        <Editor
          key={documentId}
          documentId={documentId}
          onTitleChange={handleTitleChange}
        />
      </div>
    </div>
  )
}
