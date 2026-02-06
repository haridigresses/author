import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'

interface CommandItem {
  title: string
  description: string
  command: (props: { editor: any; range: any }) => void
}

const COMMANDS: CommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
  },
  {
    title: 'Task List',
    description: 'Checklist with checkboxes',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    },
  },
  {
    title: 'Blockquote',
    description: 'Indented quote block',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
  },
  {
    title: 'Code Block',
    description: 'Fenced code block',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
  },
  {
    title: 'Table',
    description: '3×3 table with header row',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
  },
  {
    title: 'Callout',
    description: 'Colored callout box',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCallout().run()
    },
  },
  {
    title: 'Horizontal Rule',
    description: 'Divider line',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
  },
  {
    title: 'Diagram',
    description: 'Generate an AI diagram or flowchart',
    command: ({ editor, range }) => {
      const prompt = window.prompt('Describe the diagram:')
      if (prompt) {
        editor.chain().focus().deleteRange(range).run()
        editor.commands.insertDiagramFromPrompt(prompt)
      }
    },
  },
]

interface CommandListProps {
  items: CommandItem[]
  command: (item: CommandItem) => void
}

interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  // Scroll selected item into view
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const selected = menu.children[selectedIndex] as HTMLElement
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((i) => (i + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const item = items[selectedIndex]
        if (item) command(item)
        return true
      }
      return false
    },
  }), [items, selectedIndex, command])

  if (items.length === 0) {
    return <div className="slash-menu"><div className="slash-menu-empty">No results</div></div>
  }

  return (
    <div className="slash-menu" ref={menuRef}>
      {items.map((item, index) => (
        <button
          key={item.title}
          className={`slash-menu-item ${index === selectedIndex ? 'slash-menu-item-active' : ''}`}
          onClick={() => command(item)}
        >
          <span className="slash-menu-title">{item.title}</span>
          <span className="slash-menu-desc">{item.description}</span>
        </button>
      ))}
    </div>
  )
})

CommandList.displayName = 'CommandList'

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range })
        },
        items: ({ query }: { query: string }) => {
          return COMMANDS.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 10)
        },
        render: () => {
          let component: ReactRenderer<CommandListRef> | null = null
          let popup: TippyInstance[] | null = null

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
              })

              if (!props.clientRect) return

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })
            },
            onUpdate: (props: any) => {
              component?.updateProps(props)
              if (popup?.[0] && props.clientRect) {
                popup[0].setProps({ getReferenceClientRect: props.clientRect })
              }
            },
            onKeyDown: (props: any) => {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide()
                return true
              }
              return component?.ref?.onKeyDown(props) ?? false
            },
            onExit: () => {
              popup?.[0]?.destroy()
              component?.destroy()
            },
          }
        },
      } as Partial<SuggestionOptions>,
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
