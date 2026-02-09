"use client"

import { Editor } from "@tiptap/react"
import { useEffect, useRef, useCallback, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"

const SAVE_INTERVAL = 2000

export function useConvexDocument(editor: Editor | null, documentId: Id<"documents"> | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const lastSavedRef = useRef<string>("")
  const initialLoadDone = useRef(false)

  const document = useQuery(
    api.documents.get,
    documentId ? { id: documentId } : "skip"
  )
  const updateDocument = useMutation(api.documents.update)

  // Reset initial load flag when document ID changes
  useEffect(() => {
    initialLoadDone.current = false
  }, [documentId])

  // Load document content only on initial load (not on reactive updates)
  useEffect(() => {
    if (!editor || !document || initialLoadDone.current) return

    if (document.content) {
      try {
        const json = JSON.parse(document.content)
        editor.commands.setContent(json)
        lastSavedRef.current = document.content
      } catch {
        // Invalid JSON - ignore
      }
    }
    initialLoadDone.current = true
  }, [editor, document])

  // Save function
  const save = useCallback(async () => {
    if (!editor || !documentId) return

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
  }, [editor, documentId, updateDocument])

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

  return { document, isSaving, save, hasLock: true, lockedByOther: null }
}
