'use client'

import { useState } from 'react'
import { Id } from '@/convex/_generated/dataModel'

interface SnapshotMeta {
  _id: Id<"snapshots">
  _creationTime: number
  documentId: Id<"documents">
  wordCount: number
  label: string
  trigger: "auto" | "manual" | "ai-before" | "ai-after"
  createdAt: number
  hasContentJson: boolean
}

interface SnapshotTimelineProps {
  snapshots: SnapshotMeta[]
  onSaveSnapshot: () => void
  onRestore: (id: Id<"snapshots">) => void
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

function triggerBadge(trigger: string): string {
  switch (trigger) {
    case 'auto': return 'Auto'
    case 'manual': return 'Manual'
    case 'ai-before': return 'AI Before'
    case 'ai-after': return 'AI After'
    default: return trigger
  }
}

export default function SnapshotTimeline({
  snapshots,
  onSaveSnapshot,
  onRestore,
}: SnapshotTimelineProps) {
  const [expanded, setExpanded] = useState(false)

  const visibleSnapshots = expanded ? snapshots : snapshots.slice(0, 5)

  return (
    <div className="snapshot-timeline">
      <div className="snapshot-timeline-header">
        <button
          className="snapshot-timeline-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="snapshot-timeline-arrow">{expanded ? '▾' : '▸'}</span>
          <span>Snapshots</span>
          <span className="snapshot-timeline-count">{snapshots.length}</span>
        </button>
        <button className="snapshot-save-btn" onClick={onSaveSnapshot}>
          + Save
        </button>
      </div>

      {(expanded || snapshots.length <= 5) && (
        <div className="snapshot-timeline-list">
          {snapshots.length === 0 ? (
            <div className="snapshot-empty">
              No snapshots yet. They auto-save every 5 minutes.
            </div>
          ) : (
            <>
              {visibleSnapshots.map((snap) => (
                <div key={snap._id} className="snapshot-item">
                  <div className="snapshot-item-info">
                    <span className="snapshot-item-time">{timeAgo(snap.createdAt)}</span>
                    <span className={`snapshot-item-trigger snapshot-trigger-${snap.trigger}`}>
                      {triggerBadge(snap.trigger)}
                    </span>
                    <span className="snapshot-item-words">{snap.wordCount}w</span>
                  </div>
                  <div className="snapshot-item-label" title={snap.label}>
                    {snap.label}
                  </div>
                  {snap.hasContentJson && (
                    <button
                      className="snapshot-restore-btn"
                      onClick={() => onRestore(snap._id)}
                      title="Restore this snapshot"
                    >
                      Restore
                    </button>
                  )}
                </div>
              ))}

              {!expanded && snapshots.length > 5 && (
                <button
                  className="snapshot-show-more"
                  onClick={() => setExpanded(true)}
                >
                  Show {snapshots.length - 5} more...
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
