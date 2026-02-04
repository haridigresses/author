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
import { ImageGenerationExtension } from './extensions/ImageGenerationExtension'
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
import { TrackChanges, InsertionMark, DeletionMark } from '../extensions/TrackChanges'
import Toolbar from './Toolbar'
import StatusBar from './StatusBar'
import { CommandPalette, DiffView } from './CommandPalette'
import ShortcutCheatsheet from './ShortcutCheatsheet'
import { AIProvider } from './AIContext'
import Sidebar from './Sidebar'
import AICommandPalette from './AICommandPalette'
import { useAutosave } from './hooks/useAutosave'
import { useDarkMode } from './hooks/useDarkMode'
import { useVersionHistory } from './hooks/useVersionHistory'
import { exportMarkdown } from './hooks/useExportMarkdown'
import { useEffect, useState } from 'react'

type SidebarMode = 'ai' | 'mencken' | 'track'

export default function Editor() {
  const [shortcutsState, setShortcutsState] = useState<HighlightShortcutsState | null>(null)
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(false)
  const [menckenEnabled, setMenckenEnabled] = useState(false)
  const [tabAIEnabled, setTabAIEnabled] = useState(false)
  const { dark, toggle: toggleDark } = useDarkMode()

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
      ImageGenerationExtension,
      TabCompleteExtension,
      MenckenExtension,
      HighlightShortcutsExtension,
      SlashCommandExtension,
      FixedHeaderExtension,
      BlockSelectionExtension,
      InsertionMark,
      DeletionMark,
      TrackChanges.configure({
        onToggle: setTrackChangesEnabled,
      }),
    ],
    content: '<h1></h1><h3></h3><p></p>',
    editorProps: {
      attributes: {
        class: 'ProseMirror',
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items
        if (!items) return false

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

  useAutosave(editor)
  const { versions, restore, snapshotNow } = useVersionHistory(editor)

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
    if (trackChangesEnabled) return 'track'
    return 'ai'
  }

  if (!editor) return null

  return (
    <AIProvider>
      <div className="editor-layout editor-layout-with-panel">
        <div className="editor-main">
          <Toolbar
            editor={editor}
            onExportMarkdown={() => exportMarkdown(editor)}
            onToggleDark={toggleDark}
            dark={dark}
            trackChangesEnabled={trackChangesEnabled}
            onToggleTrackChanges={() => editor.commands.toggleTrackChanges()}
            menckenEnabled={menckenEnabled}
            onToggleMencken={(enabled: boolean) => {
              editor.commands.toggleMencken(enabled)
              setMenckenEnabled(enabled)
            }}
          />
          <EditorContent editor={editor} />
          <StatusBar editor={editor} />
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
          tabAIEnabled={tabAIEnabled}
          onToggleTabAI={handleToggleTabAI}
          versions={versions}
          onRestore={restore}
          onSnapshot={snapshotNow}
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
