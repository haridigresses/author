'use client'

import { Editor } from '@tiptap/react'
import { useState, useEffect } from 'react'

interface TrackChangesPanelProps {
  editor: Editor
  versions: Array<{ id: string; timestamp: Date | string | number; content: string }>
  onRestore: (id: string) => void
  onSnapshot: () => void
}

interface TrackedChange {
  type: 'insertion' | 'deletion'
  text: string
  from: number
  to: number
}

export default function TrackChangesPanel({ editor, versions, onRestore, onSnapshot }: TrackChangesPanelProps) {
  const [changes, setChanges] = useState<TrackedChange[]>([])

  // Extract tracked changes from the document
  useEffect(() => {
    const updateChanges = () => {
      const found: TrackedChange[] = []
      editor.state.doc.descendants((node, pos) => {
        if (node.isText) {
          const insertionMark = node.marks.find(m => m.type.name === 'insertion')
          const deletionMark = node.marks.find(m => m.type.name === 'deletion')

          if (insertionMark) {
            found.push({
              type: 'insertion',
              text: node.text || '',
              from: pos,
              to: pos + node.nodeSize,
            })
          }
          if (deletionMark) {
            found.push({
              type: 'deletion',
              text: node.text || '',
              from: pos,
              to: pos + node.nodeSize,
            })
          }
        }
      })
      setChanges(found)
    }

    updateChanges()
    editor.on('transaction', updateChanges)
    return () => {
      editor.off('transaction', updateChanges)
    }
  }, [editor])

  const navigateToChange = (change: TrackedChange) => {
    editor.chain().focus().setTextSelection({ from: change.from, to: change.to }).run()
  }

  const acceptChange = (change: TrackedChange) => {
    if (change.type === 'insertion') {
      // Remove the insertion mark, keep the text
      editor.chain()
        .focus()
        .setTextSelection({ from: change.from, to: change.to })
        .unsetMark('insertion')
        .run()
    } else {
      // Remove the deletion-marked text entirely
      editor.chain()
        .focus()
        .setTextSelection({ from: change.from, to: change.to })
        .deleteSelection()
        .run()
    }
  }

  const rejectChange = (change: TrackedChange) => {
    if (change.type === 'insertion') {
      // Remove the inserted text entirely
      editor.chain()
        .focus()
        .setTextSelection({ from: change.from, to: change.to })
        .deleteSelection()
        .run()
    } else {
      // Remove the deletion mark, keep the text
      editor.chain()
        .focus()
        .setTextSelection({ from: change.from, to: change.to })
        .unsetMark('deletion')
        .run()
    }
  }

  const insertionCount = changes.filter(c => c.type === 'insertion').length
  const deletionCount = changes.filter(c => c.type === 'deletion').length

  return (
    <div className="track-panel">
      <div className="track-panel-header">
        <h3>Track Changes</h3>
      </div>

      {/* Summary */}
      <div className="track-panel-summary">
        <div className="track-summary-stats">
          <span className="track-stat track-stat-insertion">
            +{insertionCount} insertions
          </span>
          <span className="track-stat track-stat-deletion">
            -{deletionCount} deletions
          </span>
        </div>
        {changes.length > 0 && (
          <div className="track-summary-actions">
            <button
              className="track-accept-all-btn"
              onClick={() => editor.commands.acceptAllChanges()}
            >
              Accept All
            </button>
            <button
              className="track-reject-all-btn"
              onClick={() => editor.commands.rejectAllChanges()}
            >
              Reject All
            </button>
          </div>
        )}
      </div>

      {/* Version History */}
      <div className="track-panel-section">
        <div className="track-section-header">
          <h4>Snapshots</h4>
          <button className="track-snapshot-btn" onClick={onSnapshot}>
            + Save
          </button>
        </div>
        <div className="track-versions">
          {versions.length === 0 ? (
            <div className="track-empty">No snapshots yet</div>
          ) : (
            versions.slice(0, 5).map((version) => (
              <div key={version.id} className="track-version-item">
                <span className="track-version-time">
                  {new Date(version.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  className="track-restore-btn"
                  onClick={() => onRestore(version.id)}
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Changes List */}
      <div className="track-panel-section track-panel-changes">
        <h4>Changes</h4>
        <div className="track-changes-list">
          {changes.length === 0 ? (
            <div className="track-empty">No tracked changes</div>
          ) : (
            changes.slice(0, 20).map((change, idx) => (
              <div
                key={idx}
                className={`track-change-item track-change-${change.type}`}
              >
                <div
                  className="track-change-text"
                  onClick={() => navigateToChange(change)}
                >
                  <span className={`track-change-badge track-badge-${change.type}`}>
                    {change.type === 'insertion' ? '+' : '-'}
                  </span>
                  <span className="track-change-content">
                    {change.text.slice(0, 40)}{change.text.length > 40 ? '...' : ''}
                  </span>
                </div>
                <div className="track-change-actions">
                  <button
                    className="track-change-accept"
                    onClick={() => acceptChange(change)}
                    title="Accept this change"
                  >
                    ✓
                  </button>
                  <button
                    className="track-change-reject"
                    onClick={() => rejectChange(change)}
                    title="Reject this change"
                  >
                    ✗
                  </button>
                </div>
              </div>
            ))
          )}
          {changes.length > 20 && (
            <div className="track-more">+{changes.length - 20} more changes</div>
          )}
        </div>
      </div>
    </div>
  )
}
