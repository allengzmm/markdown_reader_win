# Markdown Reader Win

Markdown Reader Win is a local Windows Markdown reader built for technical documents, research reports, and engineering notes. It focuses on stable rendering for long-form Markdown with math formulas, Mermaid diagrams, references, and PDF export.

Copyright: Alan Zou worked with Codex GPT

## Features

- Open local `.md` and `.markdown` files on Windows
- Side-by-side editor and preview layout
- Render LaTeX math formulas with KaTeX
- Render Mermaid diagram blocks
- Keep citation markers linked to the reference list
- Export rendered content to PDF
- View local debug logs from inside the app

## Best For

- Research reports
- Technical documentation
- Math-heavy Markdown files
- Markdown files exported from AI/deep research workflows

## Tech Stack

- Electron
- React
- Vite
- Markdown-it
- KaTeX
- Mermaid

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Windows Release

```bash
npm run dist:win
```

Release output is published to:

`d:/project/builds/Markdown Reader Win`

## Notes

- PDF export uses Electron `printToPDF`
- The app is designed for local/offline Windows usage
- GUI smoke tests are available with `npm run test:e2e`
