import { Editor } from '@tiptap/react'
import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'author-document'
const SAVE_INTERVAL = 3000

export function useAutosave(editor: Editor | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore on mount
  useEffect(() => {
    if (!editor) return

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const json = JSON.parse(saved)
        editor.commands.setContent(json)
      } catch {
        // Corrupted — ignore
      }
    }
  }, [editor])

  // Save on changes
  useEffect(() => {
    if (!editor) return

    const save = () => {
      const json = editor.getJSON()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json))
    }

    const debouncedSave = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(save, SAVE_INTERVAL)
    }

    editor.on('update', debouncedSave)
    // Save on unload
    const handleUnload = () => save()
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      editor.off('update', debouncedSave)
      window.removeEventListener('beforeunload', handleUnload)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [editor])
}
