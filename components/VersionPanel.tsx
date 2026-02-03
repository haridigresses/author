'use client'

import { type Version } from './hooks/useVersionHistory'

interface VersionPanelProps {
  versions: Version[]
  onRestore: (version: Version) => void
  onSnapshot: () => void
  onClose: () => void
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function VersionPanel({ versions, onRestore, onSnapshot, onClose }: VersionPanelProps) {
  const sorted = [...versions].reverse()

  return (
    <div className="version-panel">
      <div className="version-panel-header">
        <h3>Version History</h3>
        <div className="version-panel-actions">
          <button onClick={onSnapshot} className="toolbar-btn">Snapshot now</button>
          <button onClick={onClose} className="version-panel-close">×</button>
        </div>
      </div>
      <div className="version-panel-list">
        {sorted.length === 0 && (
          <div className="version-panel-empty">No snapshots yet. They auto-save every minute.</div>
        )}
        {sorted.map((v) => (
          <div key={v.id} className="version-item">
            <div className="version-item-info">
              <span className="version-item-time">{timeAgo(v.timestamp)}</span>
              <span className="version-item-words">{v.wordCount} words</span>
            </div>
            <button onClick={() => onRestore(v)} className="version-item-restore">
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
