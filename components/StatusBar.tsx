'use client'

import { Editor } from '@tiptap/react'
import { useEffect, useState } from 'react'

interface StatusBarProps {
  editor: Editor
  isSaving?: boolean
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function StatusBar({ editor, isSaving }: StatusBarProps) {
  const [stats, setStats] = useState({ words: 0, chars: 0, readingTime: '' })

  useEffect(() => {
    const update = () => {
      const text = editor.state.doc.textContent
      const words = countWords(text)
      const chars = text.length
      const minutes = Math.max(1, Math.ceil(words / 238))
      const readingTime = minutes === 1 ? '1 min read' : `${minutes} min read`
      setStats({ words, chars, readingTime })
    }

    update()
    editor.on('update', update)
    return () => {
      editor.off('update', update)
    }
  }, [editor])

  return (
    <div className="status-bar">
      <span>{stats.words.toLocaleString()} words</span>
      <span className="status-sep">·</span>
      <span>{stats.chars.toLocaleString()} chars</span>
      <span className="status-sep">·</span>
      <span>{stats.readingTime}</span>
      {isSaving !== undefined && (
        <>
          <span className="status-sep">·</span>
          <span className={`status-save ${isSaving ? 'saving' : 'saved'}`}>
            {isSaving ? 'Saving...' : 'Saved'}
          </span>
        </>
      )}
    </div>
  )
}
