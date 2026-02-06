"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import Editor from "./Editor"
import DocumentList from "./DocumentList"

const LAST_DOC_KEY = "author-last-document"

export default function DocumentApp() {
  const [documentId, setDocumentId] = useState<Id<"documents"> | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const documents = useQuery(api.documents.list)
  const createDocument = useMutation(api.documents.create)
  const updateDocument = useMutation(api.documents.update)

  // On mount, restore last document or create one
  useEffect(() => {
    if (documents === undefined) return // Still loading

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
  }, [documents, createDocument])

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
