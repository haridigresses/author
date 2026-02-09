"use client"

import { Editor } from "@tiptap/react"
import { useEffect, useRef, useCallback } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { jsonToMarkdown } from "@/lib/markdown"

const AUTO_SNAPSHOT_INTERVAL = 5 * 60_000 // 5 minutes
const IMAGE_DATA_REGEX = /data:image\/[^)\s"']+/g
const IMAGE_PLACEHOLDER = "[image]"

function stripImages(text: string): string {
  return text.replace(IMAGE_DATA_REGEX, IMAGE_PLACEHOLDER)
}

function stripImagesFromJson(json: any): any {
  const str = JSON.stringify(json)
  return JSON.parse(stripImages(str))
}

function countWords(editor: Editor): number {
  return editor.state.doc.textContent.trim().split(/\s+/).filter(Boolean).length
}

export function useSnapshots(editor: Editor | null, documentId: Id<"documents"> | null) {
  const snapshots = useQuery(
    api.snapshots.list,
    documentId ? { documentId } : "skip"
  )
  const createSnapshot = useMutation(api.snapshots.create)
  const lastMarkdownRef = useRef<string>("")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep last markdown in sync with most recent snapshot
  useEffect(() => {
    if (snapshots && snapshots.length > 0) {
      lastMarkdownRef.current = snapshots[0].markdown
    }
  }, [snapshots])

  const takeSnapshot = useCallback(
    async (
      label: string,
      trigger: "auto" | "manual" | "ai-before" | "ai-after"
    ) => {
      if (!editor || !documentId) return

      const json = editor.getJSON()
      const markdown = stripImages(jsonToMarkdown(json))
      const wordCount = countWords(editor)

      // Skip if content unchanged
      if (markdown === lastMarkdownRef.current) return

      // Skip empty docs
      if (wordCount < 5) return

      const isRestorePoint = trigger === "manual" || trigger === "ai-after"
      const contentJson = isRestorePoint
        ? JSON.stringify(stripImagesFromJson(json))
        : undefined

      await createSnapshot({
        documentId,
        markdown,
        contentJson,
        wordCount,
        label,
        trigger,
      })

      lastMarkdownRef.current = markdown
    },
    [editor, documentId, createSnapshot]
  )

  // Auto-snapshot timer
  useEffect(() => {
    if (!editor || !documentId) return

    timerRef.current = setInterval(() => {
      takeSnapshot("Auto-save", "auto")
    }, AUTO_SNAPSHOT_INTERVAL)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [editor, documentId, takeSnapshot])

  const snapshotNow = useCallback(() => {
    takeSnapshot("Manual snapshot", "manual")
  }, [takeSnapshot])

  const snapshotBeforeAI = useCallback(() => {
    takeSnapshot("Before AI edit", "ai-before")
  }, [takeSnapshot])

  const snapshotAfterAI = useCallback(
    (prompt: string) => {
      takeSnapshot(`AI: ${prompt.slice(0, 50)}`, "ai-after")
    },
    [takeSnapshot]
  )

  const restore = useCallback(
    (snapshotId: Id<"snapshots">) => {
      if (!editor || !snapshots) return
      const snap = snapshots.find((s) => s._id === snapshotId)
      if (!snap?.contentJson) return
      try {
        const json = JSON.parse(snap.contentJson)
        editor.commands.setContent(json)
      } catch {
        // Invalid JSON — ignore
      }
    },
    [editor, snapshots]
  )

  return {
    snapshots: snapshots ?? [],
    snapshotNow,
    snapshotBeforeAI,
    snapshotAfterAI,
    restore,
  }
}
