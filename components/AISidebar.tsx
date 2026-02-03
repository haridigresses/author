'use client'

import { Editor } from '@tiptap/react'
import { useState } from 'react'

interface AISidebarProps {
  editor: Editor
}

const REWRITE_TONES = [
  { key: 'formal', label: 'Formal' },
  { key: 'casual', label: 'Casual' },
  { key: 'academic', label: 'Academic' },
  { key: 'witty', label: 'Witty' },
  { key: 'poetic', label: 'Poetic' },
] as const

const EDIT_ACTIONS = [
  { key: 'copyedit', label: 'Copyedit', desc: 'Fix spelling, punctuation, formatting' },
  { key: 'grammar', label: 'Grammar', desc: 'Fix grammatical errors' },
  { key: 'redundancy', label: 'Trim redundancy', desc: 'Remove unnecessary words' },
  { key: 'cadence', label: 'Improve cadence', desc: 'Better rhythm and flow' },
  { key: 'expand', label: 'Expand', desc: 'Add examples and elaboration' },
  { key: 'clarity', label: 'Clarity', desc: 'Make meaning clearer' },
  { key: 'simplify', label: 'Simplify', desc: 'Simpler words and sentences' },
  { key: 'strengthen', label: 'Strengthen', desc: 'Sharpen the argument' },
  { key: 'shorten', label: 'Shorten', desc: 'Cut to essential meaning' },
] as const

export default function AISidebar({ editor }: AISidebarProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [resultType, setResultType] = useState<'rewrite' | 'edit' | 'outline' | 'factcheck' | null>(null)

  const getSelectedText = () => {
    const { from, to } = editor.state.selection
    if (from === to) return null
    return editor.state.doc.textBetween(from, to)
  }

  const getDocContent = () => editor.state.doc.textContent.slice(0, 3000)

  const rewrite = async (tone: string) => {
    const text = getSelectedText()
    if (!text) { setResult('Select some text first.'); setResultType(null); return }
    setLoading(true)
    setResult('')
    setResultType('rewrite')
    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, text, documentContext: getDocContent() }),
      })
      const data = await res.json()
      setResult(data.result || data.error || 'No result')
    } catch (e: any) {
      setResult('Error: ' + e.message)
    }
    setLoading(false)
  }

  const editAction = async (action: string) => {
    const text = getSelectedText()
    if (!text) { setResult('Select some text first.'); setResultType(null); return }
    setLoading(true)
    setResult('')
    setResultType('edit')
    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text, documentContext: getDocContent() }),
      })
      const data = await res.json()
      setResult(data.result || data.error || 'No result')
    } catch (e: any) {
      setResult('Error: ' + e.message)
    }
    setLoading(false)
  }

  const generateOutline = async (mode: 'title' | 'outline') => {
    const content = getDocContent()
    if (content.trim().length < 20) { setResult('Write more content first.'); setResultType(null); return }
    setLoading(true)
    setResult('')
    setResultType('outline')
    try {
      const res = await fetch('/api/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mode }),
      })
      const data = await res.json()
      setResult(data.result || data.error || 'No result')
    } catch (e: any) {
      setResult('Error: ' + e.message)
    }
    setLoading(false)
  }

  const factCheck = async () => {
    const content = getDocContent()
    if (content.trim().length < 20) { setResult('Write more content first.'); setResultType(null); return }
    setLoading(true)
    setResult('')
    setResultType('factcheck')
    try {
      const res = await fetch('/api/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      })
      const data = await res.json()
      if (data.issues?.length === 0) {
        setResult('No factual issues detected.')
      } else {
        setResult(
          data.issues
            .map((i: any) => `**${i.confidence}**: "${i.claim}"\n${i.issue}`)
            .join('\n\n')
        )
      }
    } catch (e: any) {
      setResult('Error: ' + e.message)
    }
    setLoading(false)
  }

  const applyResult = () => {
    const { from, to } = editor.state.selection
    if (from !== to && result && (resultType === 'rewrite' || resultType === 'edit')) {
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run()
      setResult('')
      setResultType(null)
    }
  }

  return (
    <div className="ai-sidebar">
      <div className="ai-sidebar-header">
        <h3>AI Tools</h3>
      </div>

      <div className="ai-sidebar-body">
        {/* Rewrite Tones */}
        <div className="ai-section">
          <h4>Rewrite in tone</h4>
          <p className="ai-section-hint">Select text, then pick a tone</p>
          <div className="ai-btn-grid">
            {REWRITE_TONES.map((t) => (
              <button key={t.key} className="ai-action-btn" onClick={() => rewrite(t.key)} disabled={loading}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Edit Actions */}
        <div className="ai-section">
          <h4>Edit selection</h4>
          <p className="ai-section-hint">Select text, then pick an action (or use Cmd+Alt+1-9)</p>
          <div className="ai-action-list">
            {EDIT_ACTIONS.map((a, i) => (
              <button key={a.key} className="ai-action-row" onClick={() => editAction(a.key)} disabled={loading}>
                <span className="ai-action-key">{i + 1}</span>
                <span className="ai-action-label">{a.label}</span>
                <span className="ai-action-desc">{a.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Document Tools */}
        <div className="ai-section">
          <h4>Document tools</h4>
          <div className="ai-btn-grid">
            <button className="ai-action-btn" onClick={() => generateOutline('title')} disabled={loading}>
              Generate titles
            </button>
            <button className="ai-action-btn" onClick={() => generateOutline('outline')} disabled={loading}>
              Generate outline
            </button>
            <button className="ai-action-btn" onClick={factCheck} disabled={loading}>
              Fact-check
            </button>
          </div>
        </div>

        {/* Result */}
        {loading && <div className="ai-sidebar-loading">Thinking...</div>}

        {result && !loading && (
          <div className="ai-sidebar-result">
            <pre>{result}</pre>
            {(resultType === 'rewrite' || resultType === 'edit') && (
              <button className="ai-apply-btn" onClick={applyResult}>
                Apply to selection
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
