'use client'

import { Tldraw, Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import { useCallback, useRef, useEffect, useState } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TldrawSnapshot = any

interface TldrawCanvasProps {
  snapshot: TldrawSnapshot | null
  onSnapshotChange: (snapshot: TldrawSnapshot) => void
  isEditing: boolean
  width: number
  height: number
}

export default function TldrawCanvas({
  snapshot,
  onSnapshotChange,
  isEditing,
  width,
  height,
}: TldrawCanvasProps) {
  const editorRef = useRef<Editor | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isReady, setIsReady] = useState(false)

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor

      // Zoom to fit the content after mount
      setTimeout(() => {
        editor.zoomToFit({ animation: { duration: 0 } })
      }, 100)

      setIsReady(true)

      // Listen for changes and save
      const cleanup = editor.sideEffects.registerAfterChangeHandler('shape', () => {
        // Debounce saves
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
        saveTimeoutRef.current = setTimeout(() => {
          const newSnapshot = editor.getSnapshot()
          onSnapshotChange(newSnapshot)
        }, 500)
      })

      return () => {
        cleanup()
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
      }
    },
    [onSnapshotChange]
  )

  // Update editing mode
  useEffect(() => {
    if (editorRef.current && isReady) {
      editorRef.current.updateInstanceState({
        isReadonly: !isEditing,
      })
    }
  }, [isEditing, isReady])

  return (
    <div
      className="tldraw-embed"
      style={{
        width,
        height,
        pointerEvents: isEditing ? 'auto' : 'none',
      }}
    >
      <Tldraw
        snapshot={snapshot}
        onMount={handleMount}
        hideUi={!isEditing}
        inferDarkMode
      />
    </div>
  )
}
