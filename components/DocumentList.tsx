"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useState, useRef, useEffect } from "react"

const STATUS_OPTIONS = [
  { value: "idea", label: "Idea", color: "bg-sky-400" },
  { value: "draft", label: "Draft", color: "bg-yellow-400" },
  { value: "review", label: "Review", color: "bg-orange-500" },
  { value: "completed", label: "Completed", color: "bg-emerald-500" },
  { value: "published", label: "Published", color: "bg-violet-500" },
  { value: "archived", label: "Archived", color: "bg-stone-400" },
] as const

interface DocumentListProps {
  currentDocumentId: Id<"documents"> | null
  onSelect: (id: Id<"documents">) => void
}

export default function DocumentList({ currentDocumentId, onSelect }: DocumentListProps) {
  const documents = useQuery(api.documents.list, {}) ?? []
  const createDocument = useMutation(api.documents.create)
  const updateDocument = useMutation(api.documents.update)

  const [statusPickerId, setStatusPickerId] = useState<Id<"documents"> | null>(null)
  const statusPickerRef = useRef<HTMLDivElement>(null)

  // Close status picker on outside click
  useEffect(() => {
    if (!statusPickerId) return
    const handleClick = (e: MouseEvent) => {
      if (statusPickerRef.current && !statusPickerRef.current.contains(e.target as Node)) {
        setStatusPickerId(null)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [statusPickerId])

  const handleCreate = async () => {
    const id = await createDocument({ title: "Untitled" })
    onSelect(id)
  }

  const handleStatusChange = async (id: Id<"documents">, status: string) => {
    await updateDocument({ id, status })
    setStatusPickerId(null)
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

  const getStatusOption = (status?: string) =>
    STATUS_OPTIONS.find(s => s.value === status)

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
          documents.map((doc) => {
            const statusOpt = getStatusOption(doc.status)
            return (
              <div
                key={doc._id}
                className={`document-item ${currentDocumentId === doc._id ? "active" : ""}`}
                onClick={() => onSelect(doc._id)}
              >
                <div className="document-item-content">
                  <div className="document-title-row">
                    <span className="document-title">{doc.title || "Untitled"}</span>
                    <div className="document-status-wrapper" ref={statusPickerId === doc._id ? statusPickerRef : undefined}>
                      <span className={`document-status-dot-inline ${statusOpt?.color ?? "bg-gray-300"}`} />
                      <button
                        className="document-status-caret"
                        title={statusOpt?.label ?? "Set status"}
                        onClick={(e) => {
                          e.stopPropagation()
                          setStatusPickerId(statusPickerId === doc._id ? null : doc._id)
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {statusPickerId === doc._id && (
                        <div className="document-status-picker">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              className={`document-status-option ${doc.status === opt.value ? "document-status-option-active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange(doc._id, opt.value)
                              }}
                            >
                              <span className={`document-status-dot-sm ${opt.color}`} />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="document-date">{formatDate(doc.updatedAt)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
