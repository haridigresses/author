'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import Image from '@tiptap/extension-image'
import { CalloutExtension } from './extensions/CalloutExtension'
import { TldrawDiagramExtension } from './extensions/TldrawDiagramExtension'
import { TabCompleteExtension } from './extensions/TabCompleteExtension'
import { MenckenExtension } from './extensions/MenckenExtension'
import {
  HighlightShortcutsExtension,
  highlightShortcutsKey,
  type HighlightShortcutsState,
} from './extensions/HighlightShortcutsExtension'
import { SlashCommandExtension } from './extensions/SlashCommandExtension'
import { FixedHeaderExtension } from './extensions/FixedHeaderExtension'
import { BlockSelectionExtension } from './extensions/BlockSelectionExtension'
import Toolbar from './Toolbar'
import StatusBar from './StatusBar'
import { CommandPalette, DiffView } from './CommandPalette'
import ShortcutCheatsheet from './ShortcutCheatsheet'
import { AIProvider } from './AIContext'
import Sidebar from './Sidebar'
import Scratchpad from './Scratchpad'
import AICommandPalette from './AICommandPalette'
import { useConvexDocument } from './hooks/useConvexDocument'
import { useDarkMode } from './hooks/useDarkMode'
import { useSnapshots } from './hooks/useSnapshots'
import { exportMarkdown } from './hooks/useExportMarkdown'
import { useAI } from './AIContext'
import { useEffect, useState } from 'react'
import { Id } from '@/convex/_generated/dataModel'

type SidebarMode = 'ai' | 'mencken'

interface EditorProps {
  documentId: Id<"documents">
  onTitleChange?: (title: string) => void
}

export default function Editor({ documentId, onTitleChange }: EditorProps) {
  const [shortcutsState, setShortcutsState] = useState<HighlightShortcutsState | null>(null)
  const [menckenEnabled, setMenckenEnabled] = useState(false)
  const [tabAIEnabled, setTabAIEnabled] = useState(false)
  const [scratchpadOpen, setScratchpadOpen] = useState(() => {
    try { return localStorage.getItem('author-scratchpad-open') === 'true' } catch { return false }
  })
  const { dark, toggle: toggleDark } = useDarkMode()

  // Persist scratchpad open state
  useEffect(() => {
    try { localStorage.setItem('author-scratchpad-open', String(scratchpadOpen)) } catch {}
  }, [scratchpadOpen])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        showOnlyCurrent: true,
        includeChildren: false,
        placeholder: ({ node }) => {
          // Only show placeholder for headings and top-level paragraphs
          if (node.type.name === 'heading' && node.attrs.level === 1) return 'Title'
          if (node.type.name === 'heading' && node.attrs.level === 3) return 'Subtitle'
          if (node.type.name === 'heading') return `Heading ${node.attrs.level}`
          // Don't show placeholder in list items, task items, blockquotes, etc.
          if (node.type.name === 'listItem') return ''
          if (node.type.name === 'taskItem') return ''
          if (node.type.name === 'blockquote') return ''
          if (node.type.name === 'codeBlock') return ''
          if (node.type.name === 'tableCell') return ''
          if (node.type.name === 'tableHeader') return ''
          // Only show on regular paragraphs
          if (node.type.name === 'paragraph') return 'Type / for commands, ⌘K for AI'
          return ''
        },
      }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Superscript,
      Subscript,
      Image.configure({ inline: true, allowBase64: true }),
      CalloutExtension,
      TldrawDiagramExtension,
      TabCompleteExtension,
      MenckenExtension,
      HighlightShortcutsExtension,
      SlashCommandExtension,
      FixedHeaderExtension,
      BlockSelectionExtension,
    ],
    content: '<h1></h1><p></p>',
    editorProps: {
      attributes: {
        class: 'ProseMirror',
      },
      // Fix pasted HTML to keep links inline instead of breaking them into separate paragraphs
      transformPastedHTML(html) {
        // Create a temporary DOM to process the HTML
        const doc = new DOMParser().parseFromString(html, 'text/html')

        // Helper to check if a paragraph is empty (but not if it contains images)
        const isEmpty = (el: HTMLElement): boolean => {
          if (el.querySelector('img')) return false
          return !el.textContent?.trim()
        }

        // Helper to check if a paragraph contains only a link
        const isLinkOnly = (el: HTMLElement): boolean => {
          if (el.tagName !== 'P') return false
          const children = Array.from(el.childNodes)
          const nonEmptyChildren = children.filter(
            (child) => !(child.nodeType === Node.TEXT_NODE && !child.textContent?.trim())
          )
          return nonEmptyChildren.length === 1 && nonEmptyChildren[0].nodeName === 'A'
        }

        // Helper to check if text starts with continuation markers
        const startsWithContinuation = (text: string): boolean => {
          return /^[,.\-;:)\]'"'"\s]/.test(text) || /^[a-z]/.test(text)
        }

        // Helper to check if text ends without sentence termination (incomplete sentence)
        const endsIncomplete = (text: string): boolean => {
          const trimmed = text.trim()
          if (!trimmed) return false
          // Ends with a word (no sentence-ending punctuation)
          return !/[.!?]$/.test(trimmed)
        }

        // Helper to check if a paragraph starts with a link
        const startsWithLink = (el: HTMLElement): boolean => {
          const firstChild = el.firstChild
          if (!firstChild) return false
          if (firstChild.nodeName === 'A') return true
          // Check if first non-whitespace child is a link
          for (const child of Array.from(el.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim()) continue
            return child.nodeName === 'A'
          }
          return false
        }

        // Helper to check if parent is a valid merge context (body or list item)
        const isValidMergeContext = (parent: Element | null): boolean => {
          if (!parent) return false
          return parent === doc.body || parent.tagName === 'LI'
        }

        // FIRST: Unwrap div/span elements that contain only a link
        // This is critical for Twitter which wraps links in <div class="css-175oi2r">
        // Must happen before any paragraph processing
        let unwrapChanged = true
        while (unwrapChanged) {
          unwrapChanged = false
          const wrappers = doc.querySelectorAll('div, span')
          for (const wrapper of Array.from(wrappers)) {
            // Skip text-containing spans (Twitter uses span[data-text="true"])
            if (wrapper.tagName === 'SPAN' && wrapper.hasAttribute('data-text')) continue
            // Skip if parent is body (top-level blocks)
            if (wrapper.parentElement === doc.body) continue

            const children = Array.from(wrapper.childNodes)
            const nonEmptyChildren = children.filter(
              (node) => !(node.nodeType === Node.TEXT_NODE && !node.textContent?.trim())
            )

            if (nonEmptyChildren.length === 1) {
              const child = nonEmptyChildren[0]
              if (child.nodeName === 'A') {
                wrapper.replaceWith(child)
                unwrapChanged = true
                break
              }
            }
          }
        }

        // Second: remove empty paragraphs/divs that might be separating content
        const emptyParagraphs = Array.from(doc.body.querySelectorAll('p')).filter(isEmpty)
        emptyParagraphs.forEach((p) => p.remove())

        // Second pass: merge link-only paragraphs FORWARD into continuation text
        let changed = true
        while (changed) {
          changed = false
          const paragraphs = Array.from(doc.body.querySelectorAll('p'))

          for (const p of paragraphs) {
            if (!isLinkOnly(p)) continue
            if (!isValidMergeContext(p.parentElement)) continue

            // Find next paragraph sibling
            let next = p.nextElementSibling
            while (next && next.tagName !== 'P') {
              next = next.nextElementSibling
            }

            // If next paragraph starts with continuation text, merge forward
            if (next && next.tagName === 'P' && startsWithContinuation(next.textContent || '')) {
              // Prepend link to next paragraph
              const link = Array.from(p.childNodes).find((child) => child.nodeName === 'A')
              if (link) {
                next.insertBefore(doc.createTextNode(' '), next.firstChild)
                next.insertBefore(link, next.firstChild)
              }
              p.remove()
              changed = true
              break
            }
          }
        }

        // Third pass: merge paragraphs BACKWARD if previous ends incomplete
        // This handles: "...text like" + "[Link], more text" → "...text like [Link], more text"
        changed = true
        while (changed) {
          changed = false
          const paragraphs = Array.from(doc.body.querySelectorAll('p'))

          for (const p of paragraphs) {
            if (isEmpty(p)) continue
            if (!isValidMergeContext(p.parentElement)) continue

            // Check if this paragraph should merge backward:
            // - starts with continuation punctuation, OR
            // - starts with a link (result of forward merge that should continue backward)
            const shouldMergeBack =
              startsWithContinuation(p.textContent || '') || startsWithLink(p)

            if (!shouldMergeBack) continue

            // Find previous paragraph sibling
            let prev = p.previousElementSibling
            while (prev && prev.tagName !== 'P') {
              prev = prev.previousElementSibling
            }

            // Only merge if previous paragraph ends with incomplete sentence
            if (prev && prev.tagName === 'P' && endsIncomplete(prev.textContent || '')) {
              // Merge this paragraph into the previous one
              prev.appendChild(doc.createTextNode(' '))
              Array.from(p.childNodes).forEach((child) => {
                prev!.appendChild(child)
              })
              p.remove()
              changed = true
              break
            }
          }
        }

        return doc.body.innerHTML
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items
        if (!items) return false

        // If clipboard has HTML, let TipTap handle the full paste
        // (images embedded in HTML will be preserved as <img> tags)
        const hasHTML = Array.from(items).some(item => item.type === 'text/html')
        if (hasHTML) return false

        // Only handle standalone image pastes (no accompanying text/HTML)
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (!file) return false

            const reader = new FileReader()
            reader.onload = (e) => {
              const src = e.target?.result as string
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src })
                )
              )
            }
            reader.readAsDataURL(file)
            return true
          }
        }
        return false
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files
        if (!files?.length) return false

        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            const reader = new FileReader()
            reader.onload = (e) => {
              const src = e.target?.result as string
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
              if (pos) {
                view.dispatch(
                  view.state.tr.insert(
                    pos.pos,
                    view.state.schema.nodes.image.create({ src })
                  )
                )
              }
            }
            reader.readAsDataURL(file)
            return true
          }
        }
        return false
      },
    },
  })

  const { document, isSaving, hasLock, lockedByOther } = useConvexDocument(editor, documentId)
  const { snapshots, snapshotNow, snapshotBeforeAI, snapshotAfterAI, restore } = useSnapshots(editor, documentId)

  // Extract title from first H1 and sync
  useEffect(() => {
    if (!editor || !onTitleChange) return

    const extractTitle = () => {
      const json = editor.getJSON()
      const firstHeading = json.content?.find(
        (node) =>
          node.type === 'heading' && node.attrs?.level === 1
      )
      if (firstHeading && 'content' in firstHeading) {
        const textContent = (firstHeading.content as { text?: string }[])
          ?.map((c) => c.text || '')
          .join('') || 'Untitled'
        onTitleChange(textContent)
      }
    }

    editor.on('update', extractTitle)
    extractTitle() // Initial extraction
    return () => { editor.off('update', extractTitle) }
  }, [editor, onTitleChange])

  useEffect(() => {
    if (!editor) return

    const update = () => {
      const state = highlightShortcutsKey.getState(editor.view.state)
      setShortcutsState(state ? { ...state } : null)
    }

    editor.on('transaction', update)
    return () => {
      editor.off('transaction', update)
    }
  }, [editor])

  // Handle Tab AI toggle
  const handleToggleTabAI = (enabled: boolean) => {
    setTabAIEnabled(enabled)
    editor?.commands.toggleTabComplete(enabled)
  }

  // Determine sidebar mode based on active mode
  const getSidebarMode = (): SidebarMode => {
    if (menckenEnabled) return 'mencken'
    return 'ai'
  }

  if (!editor) return null

  return (
    <AIProvider>
      <SnapshotBridge snapshotBeforeAI={snapshotBeforeAI} snapshotAfterAI={snapshotAfterAI} />
      <div className="editor-layout editor-layout-with-panel">
        <Scratchpad
          editor={editor}
          open={scratchpadOpen}
          onClose={() => setScratchpadOpen(false)}
        />
        <div className="editor-main">
          <Toolbar
            editor={editor}
            onExportMarkdown={() => exportMarkdown(editor)}
            onToggleDark={toggleDark}
            dark={dark}
            menckenEnabled={menckenEnabled}
            onToggleMencken={(enabled: boolean) => {
              editor.commands.toggleMencken(enabled)
              setMenckenEnabled(enabled)
            }}
            tabAIEnabled={tabAIEnabled}
            onToggleTabAI={handleToggleTabAI}
            scratchpadOpen={scratchpadOpen}
            onToggleScratchpad={() => setScratchpadOpen(prev => !prev)}
          />
          {lockedByOther && (
            <div className="editor-lock-warning">
              This document is being edited by {lockedByOther}. Your changes will not be saved.
            </div>
          )}
          <div className="editor-scroll">
            <EditorContent editor={editor} />
          </div>
          <StatusBar editor={editor} isSaving={isSaving} />
          {shortcutsState && (
            <>
              <CommandPalette editor={editor} state={shortcutsState} />
              <DiffView editor={editor} state={shortcutsState} />
            </>
          )}
        </div>

        <Sidebar
          editor={editor}
          mode={getSidebarMode()}
          snapshots={snapshots}
          onSaveSnapshot={snapshotNow}
          onRestore={restore}
          onCloseMencken={() => {
            editor.commands.toggleMencken(false)
            setMenckenEnabled(false)
          }}
        />

        <AICommandPalette editor={editor} />
        <ShortcutCheatsheet />
      </div>
    </AIProvider>
  )
}

/** Bridge component to wire snapshot callbacks into the AI context */
function SnapshotBridge({
  snapshotBeforeAI,
  snapshotAfterAI,
}: {
  snapshotBeforeAI: () => void
  snapshotAfterAI: (prompt: string) => void
}) {
  const { setOnBeforeAI, setOnAfterAI } = useAI()

  useEffect(() => {
    setOnBeforeAI(() => snapshotBeforeAI)
    setOnAfterAI(() => snapshotAfterAI)
    return () => {
      setOnBeforeAI(null)
      setOnAfterAI(null)
    }
  }, [snapshotBeforeAI, snapshotAfterAI, setOnBeforeAI, setOnAfterAI])

  return null
}
