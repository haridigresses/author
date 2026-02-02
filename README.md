# Author - AI-Native Writing App

A long-form writing application built with TipTap, featuring AI-powered editing tools and ergonomic writing features.

## Features

- **TipTap Editor**: Rich text editing with extensible architecture
- **Inline Tables**: Notion-style tables for structured content
- **Callout Boxes**: Highlight important information
- **AI Image Generation**: Inline image generation using nano-banana with context awareness
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
    - `ImageGenerationExtension.tsx` - AI image generation
    - `TabCompleteExtension.tsx` - Tab completion
    - `HemingwayExtension.tsx` - Writing quality analysis
    - `HighlightShortcutsExtension.tsx` - Cmd+X editing shortcuts

## Next Steps

- Implement AI API integrations
- Add styling for callouts and generated images
- Build out Hemingway analysis logic
- Create command palette for editing actions
- Add image generation context gathering
- Implement tab completion logic
