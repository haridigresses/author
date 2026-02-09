"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useConvexAuth } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import Editor from "./Editor"
import DocumentList from "./DocumentList"

const LAST_DOC_KEY = "author-last-document"

export default function DocumentApp() {
  const [documentId, setDocumentId] = useState<Id<"documents"> | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn } = useAuthActions()

  const handleSignIn = useCallback(() => {
    void signIn("google")
  }, [signIn])

  const documents = useQuery(api.documents.list, isAuthenticated ? {} : "skip")
  const createDocument = useMutation(api.documents.create)
  const updateDocument = useMutation(api.documents.update)

  // On mount, restore last document or create one
  useEffect(() => {
    if (!isAuthenticated || documents === undefined) return

    const lastDocId = localStorage.getItem(LAST_DOC_KEY)

    if (lastDocId && documents.some(d => d._id === lastDocId)) {
      setDocumentId(lastDocId as Id<"documents">)
    } else if (documents.length > 0) {
      setDocumentId(documents[0]._id)
    } else {
      // No documents - create one
      createDocument({ title: "Untitled" }).then((id) => {
        setDocumentId(id)
      })
    }
  }, [documents, createDocument, isAuthenticated])

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

  // Show landing page if not authenticated
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="landing-page">
        <div className="landing-content">
          <h1 className="landing-title">Author</h1>
          <p className="landing-subtitle">A writing environment with AI assistance</p>
          <button onClick={handleSignIn} className="landing-cta">
            Sign in with Google
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
        {!sidebarCollapsed && (
          <DocumentList
            currentDocumentId={documentId}
            onSelect={handleSelectDocument}
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
