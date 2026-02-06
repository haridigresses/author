"use client"

import { Editor } from "@tiptap/react"
import { useEffect, useRef, useCallback, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"

const SAVE_INTERVAL = 2000
const LOCK_RENEW_INTERVAL = 10000 // Renew lock every 10 seconds

// Generate a unique session ID
const SESSION_ID = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export function useConvexDocument(editor: Editor | null, documentId: Id<"documents"> | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasLock, setHasLock] = useState(false)
  const [lockedByOther, setLockedByOther] = useState<string | null>(null)
  const lastSavedRef = useRef<string>("")

  const document = useQuery(
    api.documents.get,
    documentId ? { id: documentId } : "skip"
  )
  const updateDocument = useMutation(api.documents.update)
  const acquireLock = useMutation(api.documents.acquireLock)
  const releaseLock = useMutation(api.documents.releaseLock)

  // Acquire and maintain lock
  useEffect(() => {
    if (!documentId) return

    const tryAcquireLock = async () => {
      try {
        const result = await acquireLock({ id: documentId, sessionId: SESSION_ID })
        if (result.success) {
          setHasLock(true)
          setLockedByOther(null)
        } else {
          setHasLock(false)
          setLockedByOther(result.lockedBy || "another session")
        }
      } catch (error) {
        console.error("Failed to acquire lock:", error)
        setHasLock(false)
      }
    }

    // Try to acquire lock immediately
    tryAcquireLock()

    // Renew lock periodically
    lockTimerRef.current = setInterval(tryAcquireLock, LOCK_RENEW_INTERVAL)

    // Release lock on unmount
    return () => {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current)
      releaseLock({ id: documentId, sessionId: SESSION_ID })
      setHasLock(false)
    }
  }, [documentId, acquireLock, releaseLock])

  // Load document content when document changes
  useEffect(() => {
    if (!editor || !document) return

    const currentContent = JSON.stringify(editor.getJSON())
    // Only set content if it's different (avoid cursor jump)
    if (document.content && document.content !== currentContent) {
      try {
        const json = JSON.parse(document.content)
        editor.commands.setContent(json)
        lastSavedRef.current = document.content
      } catch {
        // Invalid JSON - ignore
      }
    }
  }, [editor, document])

  // Save function
  const save = useCallback(async () => {
    if (!editor || !documentId || !hasLock) return

    const content = JSON.stringify(editor.getJSON())
    // Skip if content hasn't changed
    if (content === lastSavedRef.current) return

    setIsSaving(true)
    try {
      await updateDocument({ id: documentId, content })
      lastSavedRef.current = content
    } finally {
      setIsSaving(false)
    }
  }, [editor, documentId, hasLock, updateDocument])

  // Auto-save on changes
  useEffect(() => {
    if (!editor || !documentId) return

    const debouncedSave = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(save, SAVE_INTERVAL)
    }

    editor.on("update", debouncedSave)

    // Save on unload
    const handleUnload = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      save()
    }
    window.addEventListener("beforeunload", handleUnload)

    return () => {
      editor.off("update", debouncedSave)
      window.removeEventListener("beforeunload", handleUnload)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [editor, documentId, save])

  return { document, isSaving, save, hasLock, lockedByOther }
}
