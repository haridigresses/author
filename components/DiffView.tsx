'use client'

import { useMemo } from 'react'

interface DiffViewProps {
  original: string
  suggested: string
}

interface DiffPart {
  type: 'equal' | 'insert' | 'delete'
  text: string
}

// Simple word-based diff algorithm
function computeDiff(original: string, suggested: string): DiffPart[] {
  const originalWords = original.split(/(\s+)/)
  const suggestedWords = suggested.split(/(\s+)/)

  // LCS-based diff
  const m = originalWords.length
  const n = suggestedWords.length

  // Build LCS table
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (originalWords[i - 1] === suggestedWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find diff
  const parts: DiffPart[] = []
  let i = m, j = n
  const stack: DiffPart[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalWords[i - 1] === suggestedWords[j - 1]) {
      stack.push({ type: 'equal', text: originalWords[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'insert', text: suggestedWords[j - 1] })
      j--
    } else {
      stack.push({ type: 'delete', text: originalWords[i - 1] })
      i--
    }
  }

  // Reverse and merge consecutive parts of same type
  while (stack.length > 0) {
    const part = stack.pop()!
    if (parts.length > 0 && parts[parts.length - 1].type === part.type) {
      parts[parts.length - 1].text += part.text
    } else {
      parts.push(part)
    }
  }

  return parts
}

export default function DiffView({ original, suggested }: DiffViewProps) {
  const diff = useMemo(() => computeDiff(original, suggested), [original, suggested])

  // Check if there are actual changes
  const hasChanges = diff.some(part => part.type !== 'equal')

  if (!hasChanges) {
    return (
      <div className="diff-view-container">
        <div className="diff-no-changes">No changes</div>
      </div>
    )
  }

  return (
    <div className="diff-view-container">
      <div className="diff-content">
        {diff.map((part, i) => {
          if (part.type === 'equal') {
            return <span key={i} className="diff-equal">{part.text}</span>
          } else if (part.type === 'delete') {
            return <span key={i} className="diff-delete">{part.text}</span>
          } else {
            return <span key={i} className="diff-insert">{part.text}</span>
          }
        })}
      </div>
    </div>
  )
}
