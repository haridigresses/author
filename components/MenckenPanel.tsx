'use client'

import { Editor } from '@tiptap/react'
import { useState, useEffect } from 'react'
import { menckenKey, MenckenIssue } from './extensions/MenckenExtension'
import { useAI } from './AIContext'

interface MenckenPanelProps {
  editor: Editor
  onClose: () => void
}

interface AISuggestion {
  issue: MenckenIssue
  suggestion: string
  loading: boolean
}

const ISSUE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  'very-long-sentence': {
    label: 'Very Long',
    color: '#ef4444',
    description: 'Sentences over 30 words are difficult to follow. Break into smaller sentences.'
  },
  'long-sentence': {
    label: 'Long',
    color: '#f59e0b',
    description: 'Sentences over 20 words can be hard to read. Consider simplifying.'
  },
  'passive': {
    label: 'Passive',
    color: '#22c55e',
    description: 'Passive voice can make writing less direct. Consider active voice.'
  },
  'adverb': {
    label: 'Adverb',
    color: '#3b82f6',
    description: 'Adverbs often weaken prose. Consider using stronger verbs instead.'
  },
  'complex-word': {
    label: 'Complex',
    color: '#a855f7',
    description: 'Complex words can alienate readers. Use simpler alternatives.'
  },
  'weak-transition': {
    label: 'Transition',
    color: '#f97316',
    description: 'Weak transitions break flow. Build stronger logical connections.'
  },
}

export default function MenckenPanel({ editor, onClose }: MenckenPanelProps) {
  const { selectedModel } = useAI()
  const [issues, setIssues] = useState<MenckenIssue[]>([])
  const [suggestions, setSuggestions] = useState<Map<number, AISuggestion>>(new Map())
  const [loadingAll, setLoadingAll] = useState(false)

  // Get issues from the Mencken plugin state
  useEffect(() => {
    const updateIssues = () => {
      const pluginState = menckenKey.getState(editor.view.state)
      if (pluginState?.issues) {
        setIssues(pluginState.issues)
      }
    }

    updateIssues()
    editor.on('transaction', updateIssues)
    return () => {
      editor.off('transaction', updateIssues)
    }
  }, [editor])

  // Group issues by type
  const groupedIssues = issues.reduce((acc, issue) => {
    if (!acc[issue.type]) acc[issue.type] = []
    acc[issue.type].push(issue)
    return acc
  }, {} as Record<string, MenckenIssue[]>)

  // Get text for an issue from the editor
  const getIssueText = (issue: MenckenIssue): string => {
    try {
      const { from, to } = issue
      return editor.state.doc.textBetween(from, to)
    } catch {
      return ''
    }
  }

  // Navigate to an issue in the editor
  const navigateToIssue = (issue: MenckenIssue) => {
    editor.chain().focus().setTextSelection({ from: issue.from, to: issue.to }).run()
  }

  // Generate AI suggestion for a single issue
  const generateSuggestion = async (issue: MenckenIssue, index: number) => {
    const text = getIssueText(issue)
    if (!text) return

    setSuggestions(prev => {
      const newMap = new Map(prev)
      newMap.set(index, { issue, suggestion: '', loading: true })
      return newMap
    })

    try {
      // Get surrounding context
      const contextStart = Math.max(0, issue.from - 100)
      const contextEnd = Math.min(editor.state.doc.content.size, issue.to + 100)
      const context = editor.state.doc.textBetween(contextStart, contextEnd)

      const res = await fetch('/api/mencken-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueType: issue.type,
          text,
          context,
          message: issue.message,
          model: selectedModel,
        }),
      })
      const data = await res.json()

      setSuggestions(prev => {
        const newMap = new Map(prev)
        newMap.set(index, { issue, suggestion: data.suggestion || 'No suggestion available', loading: false })
        return newMap
      })
    } catch (e) {
      setSuggestions(prev => {
        const newMap = new Map(prev)
        newMap.set(index, { issue, suggestion: 'Error generating suggestion', loading: false })
        return newMap
      })
    }
  }

  // Generate suggestions for all issues
  const generateAllSuggestions = async () => {
    setLoadingAll(true)
    const limitedIssues = issues.slice(0, 10) // Limit to first 10 issues

    for (let i = 0; i < limitedIssues.length; i++) {
      if (!suggestions.has(i)) {
        await generateSuggestion(limitedIssues[i], i)
      }
    }
    setLoadingAll(false)
  }

  // Apply a suggestion
  const applySuggestion = (issue: MenckenIssue, suggestion: string) => {
    editor.chain()
      .focus()
      .setTextSelection({ from: issue.from, to: issue.to })
      .deleteSelection()
      .insertContent(suggestion)
      .run()
  }

  return (
    <div className="mencken-panel">
      <div className="mencken-panel-header">
        <h3>Writing Analysis</h3>
        <button className="mencken-panel-close" onClick={onClose}>
          &times;
        </button>
      </div>

      {/* Legend */}
      <div className="mencken-panel-legend">
        <h4>Legend</h4>
        <div className="mencken-legend-grid">
          {Object.entries(ISSUE_LABELS).map(([type, { label, color, description }]) => (
            <div key={type} className="mencken-legend-item" title={description}>
              <span className="mencken-legend-dot" style={{ backgroundColor: color }} />
              <span className="mencken-legend-label">{label}</span>
              <span className="mencken-legend-count">
                {groupedIssues[type]?.length || 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mencken-panel-summary">
        <span>{issues.length} issues found</span>
        {issues.length > 0 && (
          <button
            className="mencken-analyze-btn"
            onClick={generateAllSuggestions}
            disabled={loadingAll}
          >
            {loadingAll ? 'Analyzing...' : 'Get AI Suggestions'}
          </button>
        )}
      </div>

      {/* Issues List */}
      <div className="mencken-panel-issues">
        {issues.length === 0 ? (
          <div className="mencken-empty">
            No issues detected. Your writing looks clean!
          </div>
        ) : (
          issues.slice(0, 20).map((issue, idx) => {
            const text = getIssueText(issue)
            const { label, color } = ISSUE_LABELS[issue.type] || { label: issue.type, color: '#888' }
            const suggestion = suggestions.get(idx)

            return (
              <div key={idx} className="mencken-issue-card">
                <div className="mencken-issue-header" onClick={() => navigateToIssue(issue)}>
                  <span className="mencken-issue-badge" style={{ backgroundColor: color }}>
                    {label}
                  </span>
                  <span className="mencken-issue-text">
                    {text.slice(0, 50)}{text.length > 50 ? '...' : ''}
                  </span>
                </div>
                <div className="mencken-issue-message">{issue.message}</div>

                {suggestion ? (
                  <div className="mencken-issue-suggestion">
                    {suggestion.loading ? (
                      <span className="mencken-suggestion-loading">Generating suggestion...</span>
                    ) : (
                      <>
                        <div className="mencken-suggestion-text">{suggestion.suggestion}</div>
                        {suggestion.suggestion && !suggestion.suggestion.startsWith('Error') && (
                          <button
                            className="mencken-apply-btn"
                            onClick={() => applySuggestion(issue, suggestion.suggestion)}
                          >
                            Apply
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    className="mencken-suggest-btn"
                    onClick={() => generateSuggestion(issue, idx)}
                  >
                    Get suggestion
                  </button>
                )}
              </div>
            )
          })
        )}
        {issues.length > 20 && (
          <div className="mencken-more">
            +{issues.length - 20} more issues
          </div>
        )}
      </div>
    </div>
  )
}
