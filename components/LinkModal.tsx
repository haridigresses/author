'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface LinkModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (url: string, text?: string) => void
  initialUrl?: string
  initialText?: string
  hasSelection?: boolean
}

export default function LinkModal({
  isOpen,
  onClose,
  onSubmit,
  initialUrl = '',
  initialText = '',
  hasSelection = false,
}: LinkModalProps) {
  const [url, setUrl] = useState(initialUrl)
  const [text, setText] = useState(initialText)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl)
      setText(initialText)
      setError('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen, initialUrl, initialText])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      setError('URL is required')
      return
    }

    // Basic URL validation - allow relative URLs or add https://
    let finalUrl = trimmedUrl
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('#')) {
      finalUrl = 'https://' + trimmedUrl
    }

    onSubmit(finalUrl, hasSelection ? undefined : text.trim() || undefined)
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="link-modal-overlay" onClick={onClose}>
      <div className="link-modal" onClick={(e) => e.stopPropagation()}>
        <div className="link-modal-header">
          <h3>Insert Link</h3>
          <button className="link-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="link-modal-body">
            <div className="link-modal-field">
              <label htmlFor="link-url">URL</label>
              <input
                ref={inputRef}
                id="link-url"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError('')
                }}
                placeholder="https://example.com"
                className="link-modal-input"
                autoComplete="off"
              />
              {error && <span className="link-modal-error">{error}</span>}
            </div>
            {!hasSelection && (
              <div className="link-modal-field">
                <label htmlFor="link-text">Link Text (optional)</label>
                <input
                  id="link-text"
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Display text"
                  className="link-modal-input"
                />
              </div>
            )}
          </div>
          <div className="link-modal-footer">
            <button type="button" className="link-modal-btn link-modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="link-modal-btn link-modal-btn-submit">
              Insert Link
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
