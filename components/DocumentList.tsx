"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"

interface DocumentListProps {
  currentDocumentId: Id<"documents"> | null
  onSelect: (id: Id<"documents">) => void
}

export default function DocumentList({ currentDocumentId, onSelect }: DocumentListProps) {
  const documents = useQuery(api.documents.list) ?? []
  const createDocument = useMutation(api.documents.create)
  const removeDocument = useMutation(api.documents.remove)

  const handleCreate = async () => {
    const id = await createDocument({ title: "Untitled" })
    onSelect(id)
  }

  const handleDelete = async (e: React.MouseEvent, id: Id<"documents">) => {
    e.stopPropagation()
    if (!confirm("Delete this document?")) return
    await removeDocument({ id })
    if (currentDocumentId === id) {
      // Select another document or create new
      const remaining = documents.filter(d => d._id !== id)
      if (remaining.length > 0) {
        onSelect(remaining[0]._id)
      }
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="document-list">
      <div className="document-list-header">
        <span>Documents</span>
        <button onClick={handleCreate} className="document-new-btn" title="New document">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div className="document-list-items">
        {documents.length === 0 ? (
          <div className="document-list-empty">
            <p>No documents yet</p>
            <button onClick={handleCreate} className="document-create-btn">
              Create your first document
            </button>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc._id}
              className={`document-item ${currentDocumentId === doc._id ? "active" : ""}`}
              onClick={() => onSelect(doc._id)}
            >
              <div className="document-item-content">
                <span className="document-title">{doc.title || "Untitled"}</span>
                <span className="document-date">{formatDate(doc.updatedAt)}</span>
              </div>
              <button
                className="document-delete-btn"
                onClick={(e) => handleDelete(e, doc._id)}
                title="Delete"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3.5h8M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M6 6v4M8 6v4M4 3.5l.5 8a1 1 0 001 1h3a1 1 0 001-1l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
