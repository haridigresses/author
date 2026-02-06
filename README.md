# Author - AI-Native Writing App

A long-form writing application built with TipTap, featuring AI-powered editing tools and ergonomic writing features.

## Features

- **TipTap Editor**: Rich text editing with extensible architecture
- **Inline Tables**: Notion-style tables for structured content
- **Callout Boxes**: Highlight important information
- **AI Diagram Generation**: Inline diagram/flowchart generation using tldraw with Claude AI
- **Tab Completion**: Optional AI-powered autocomplete
- **Hemingway Mode**: Writing quality analysis with toggle
- **Highlight Shortcuts**: Cmd+X for quick editing actions (copyediting, grammar, redundancy, cadence, expansion)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `app/` - Next.js app directory
- `components/` - React components
  - `Editor.tsx` - Main editor component
  - `Toolbar.tsx` - Editor toolbar
  - `extensions/` - TipTap extensions
    - `CalloutExtension.tsx` - Callout box support
    - `TldrawDiagramExtension.tsx` - AI diagram generation with tldraw
    - `TabCompleteExtension.tsx` - Tab completion
    - `HemingwayExtension.tsx` - Writing quality analysis
    - `HighlightShortcutsExtension.tsx` - Cmd+X editing shortcuts

## Next Steps

- Build out Hemingway analysis logic
- Add formula rendering support (LaTeX/KaTeX)
