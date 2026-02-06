'use client'

import { Editor } from '@tiptap/react'
import AISidebar from './AISidebar'
import MenckenPanel from './MenckenPanel'
import TrackChangesPanel from './TrackChangesPanel'
import { Version } from './hooks/useVersionHistory'

type SidebarMode = 'ai' | 'mencken' | 'track'

interface SidebarProps {
  editor: Editor
  mode: SidebarMode
  // AI sidebar props
  tabAIEnabled: boolean
  onToggleTabAI: (enabled: boolean) => void
  // Track changes props
  versions: Version[]
  onRestore: (version: Version) => void
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
          onRestore={(id) => {
            const version = versions.find(v => v.id === id)
            if (version) onRestore(version)
          }}
          onSnapshot={onSnapshot}
        />
      )}
    </div>
  )
}
