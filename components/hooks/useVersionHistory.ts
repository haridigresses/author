import { Editor } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'author-versions'
const SNAPSHOT_INTERVAL = 60_000 // 1 minute

export interface Version {
  id: string
  timestamp: number
  label: string
  content: any // TipTap JSON
  wordCount: number
}

function getVersions(): Version[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveVersions(versions: Version[]) {
  // Keep last 50 versions
  const trimmed = versions.slice(-50)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function useVersionHistory(editor: Editor | null) {
  const [versions, setVersions] = useState<Version[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setVersions(getVersions())
  }, [])

  useEffect(() => {
    if (!editor) return

    const snapshot = () => {
      const content = editor.getJSON()
      const text = editor.state.doc.textContent
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length

      // Don't snapshot empty docs
      if (wordCount < 5) return

      const existing = getVersions()
      const last = existing[existing.length - 1]

      // Don't snapshot if content hasn't changed
      if (last && JSON.stringify(last.content) === JSON.stringify(content)) return

      const version: Version = {
        id: Date.now().toString(36),
        timestamp: Date.now(),
        label: new Date().toLocaleString(),
        content,
        wordCount,
      }

      const updated = [...existing, version]
      saveVersions(updated)
      setVersions(updated)
    }

    timerRef.current = setInterval(snapshot, SNAPSHOT_INTERVAL)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [editor])

  const restore = (version: Version) => {
    if (!editor) return
    editor.commands.setContent(version.content)
  }

  const snapshotNow = () => {
    if (!editor) return
    const content = editor.getJSON()
    const wordCount = editor.state.doc.textContent.trim().split(/\s+/).filter(Boolean).length
    const version: Version = {
      id: Date.now().toString(36),
      timestamp: Date.now(),
      label: 'Manual snapshot',
      content,
      wordCount,
    }
    const updated = [...getVersions(), version]
    saveVersions(updated)
    setVersions(updated)
  }

  return { versions, restore, snapshotNow }
}
