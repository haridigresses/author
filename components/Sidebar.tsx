'use client'

import { Editor } from '@tiptap/react'
import AISidebar from './AISidebar'
import MenckenPanel from './MenckenPanel'
import TrackChangesPanel from './TrackChangesPanel'

type SidebarMode = 'ai' | 'mencken' | 'track'

interface SidebarProps {
  editor: Editor
  mode: SidebarMode
  // AI sidebar props
  tabAIEnabled: boolean
  onToggleTabAI: (enabled: boolean) => void
  // Track changes props
  versions: Array<{ id: string; timestamp: Date; content: string }>
  onRestore: (id: string) => void
  onSnapshot: () => void
  // Mencken props
  onCloseMencken: () => void
}

export default function Sidebar({
  editor,
  mode,
  tabAIEnabled,
  onToggleTabAI,
  versions,
  onRestore,
  onSnapshot,
  onCloseMencken,
}: SidebarProps) {
  return (
    <div className="sidebar-container">
      {mode === 'ai' && (
        <AISidebar
          editor={editor}
          tabAIEnabled={tabAIEnabled}
          onToggleTabAI={onToggleTabAI}
        />
      )}

      {mode === 'mencken' && (
        <MenckenPanel
          editor={editor}
          onClose={onCloseMencken}
        />
      )}

      {mode === 'track' && (
        <TrackChangesPanel
          editor={editor}
          versions={versions}
          onRestore={onRestore}
          onSnapshot={onSnapshot}
        />
      )}
    </div>
  )
}
