'use client'

import { useState } from 'react'
import DiffView from './DiffView'
import { Doc, Id } from '@/convex/_generated/dataModel'

type Snapshot = Doc<"snapshots">

interface SnapshotTimelineProps {
  snapshots: Snapshot[]
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
  const [selected, setSelected] = useState<Set<Id<"snapshots">>>(new Set())
  const [comparing, setComparing] = useState(false)

  const toggleSelect = (id: Id<"snapshots">) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 2) {
          // Replace the oldest selection
          const first = next.values().next().value!
          next.delete(first)
        }
        next.add(id)
      }
      return next
    })
    setComparing(false)
  }

  const canCompare = selected.size === 2
  const selectedIds = Array.from(selected)

  const getCompareSnapshots = () => {
    if (selectedIds.length !== 2) return null
    const s1 = snapshots.find((s) => s._id === selectedIds[0])
    const s2 = snapshots.find((s) => s._id === selectedIds[1])
    if (!s1 || !s2) return null
    // Order by time (older first)
    return s1.createdAt <= s2.createdAt ? [s1, s2] : [s2, s1]
  }

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
              {canCompare && (
                <div className="snapshot-compare-bar">
                  <button
                    className="snapshot-compare-btn"
                    onClick={() => setComparing(!comparing)}
                  >
                    {comparing ? 'Hide diff' : 'Compare selected'}
                  </button>
                  <button
                    className="snapshot-clear-btn"
                    onClick={() => {
                      setSelected(new Set())
                      setComparing(false)
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}

              {comparing && (() => {
                const pair = getCompareSnapshots()
                if (!pair) return null
                return (
                  <div className="snapshot-diff-overlay">
                    <DiffView original={pair[0].markdown} suggested={pair[1].markdown} />
                  </div>
                )
              })()}

              {visibleSnapshots.map((snap) => (
                <div
                  key={snap._id}
                  className={`snapshot-item ${selected.has(snap._id) ? 'snapshot-item-selected' : ''}`}
                >
                  <button
                    className="snapshot-item-select"
                    onClick={() => toggleSelect(snap._id)}
                    title="Select for comparison"
                  >
                    <span className={`snapshot-checkbox ${selected.has(snap._id) ? 'snapshot-checkbox-checked' : ''}`} />
                  </button>
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
                  {snap.contentJson && (
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
