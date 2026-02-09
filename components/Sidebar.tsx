'use client'

import { Editor } from '@tiptap/react'
import AISidebar from './AISidebar'
import MenckenPanel from './MenckenPanel'
import { Doc, Id } from '@/convex/_generated/dataModel'

type Snapshot = Doc<"snapshots">
type SidebarMode = 'ai' | 'mencken'

interface SidebarProps {
  editor: Editor
  mode: SidebarMode
  // Snapshot props
  snapshots: Snapshot[]
  onSaveSnapshot: () => void
  onRestore: (id: Id<"snapshots">) => void
  // Mencken props
  onCloseMencken: () => void
}

export default function Sidebar({
  editor,
  mode,
  snapshots,
  onSaveSnapshot,
  onRestore,
  onCloseMencken,
}: SidebarProps) {
  return (
    <div className="sidebar-container">
      {mode === 'ai' && (
        <AISidebar
          editor={editor}
          snapshots={snapshots}
          onSaveSnapshot={onSaveSnapshot}
          onRestore={onRestore}
        />
      )}

      {mode === 'mencken' && (
        <MenckenPanel
          editor={editor}
          onClose={onCloseMencken}
        />
      )}
    </div>
  )
}
