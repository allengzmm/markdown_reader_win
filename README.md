# Markdown Reader Win

## &#20013;&#25991;&#20171;&#32461;

Markdown Reader Win &#26159;&#19968;&#27454;&#38754;&#21521; Windows &#26412;&#22320;&#29615;&#22659;&#30340; Markdown &#38405;&#35835;&#22120;&#65292;&#19987;&#38376;&#29992;&#20110;&#35299;&#20915; ChatGPT &#28145;&#24230;&#30740;&#31350;&#36755;&#20986;&#25991;&#26723;&#22312;&#26412;&#22320;&#25171;&#24320;&#26102;&#24120;&#35265;&#30340;&#26684;&#24335;&#38382;&#39064;&#12290;&#23427;&#38024;&#23545;&#36825;&#31867;&#30740;&#31350;&#22411; Markdown &#20013;&#24120;&#35265;&#30340;&#25968;&#23398;&#20844;&#24335;&#12289; Mermaid &#22270;&#34920;&#12289;&#24341;&#29992;&#26631;&#35760;&#12289;&#22270;&#29255;&#21644;&#22797;&#26434;&#32467;&#26500;&#20869;&#23481;&#20570;&#20102;&#19987;&#38376;&#36866;&#37197;&#65292;&#24110;&#21161;&#29992;&#25143;&#26356;&#31283;&#23450;&#22320;&#26597;&#30475;&#21644;&#23548;&#20986;&#25991;&#26723;&#12290;

&#36825;&#27454;&#24037;&#20855;&#36866;&#21512;&#31185;&#30740;&#25253;&#21578;&#12289;&#25216;&#26415;&#25991;&#26723;&#12289;&#26041;&#26696;&#35828;&#26126;&#21644;&#24037;&#31243;&#31508;&#35760;&#31561;&#22330;&#26223;&#65292;&#25903;&#25345;&#26412;&#22320;&#25171;&#24320; `.md` &#25991;&#20214;&#12289;&#24038;&#21491;&#20998;&#26639;&#38405;&#35835;&#12289;&#20844;&#24335;&#28210;&#26579;&#12289;&#22270;&#34920;&#28210;&#26579;&#21644; PDF &#23548;&#20986;&#65292;&#37325;&#28857;&#25552;&#21319;&#38271;&#25991;&#26723;&#21644;&#22797;&#26434; Markdown &#20869;&#23481;&#22312; Windows &#26700;&#38754;&#31471;&#30340;&#21487;&#35835;&#24615;&#19982;&#21487;&#29992;&#24615;&#12290;

## English

Markdown Reader Win is a local Windows Markdown reader built for technical documents, research reports, and engineering notes. It focuses on stable rendering for long-form Markdown with math formulas, Mermaid diagrams, references, images, and PDF export.

It is especially useful for Markdown documents produced by ChatGPT deep research workflows, where formulas, diagrams, citations, and complex structure often do not render cleanly in local tools.

Copyright: Alan Zou worked with Codex GPT

This software and source code are provided for free sharing and learning only, and may not be used for commercial purposes.

## Features

- Open local `.md` and `.markdown` files on Windows
- Side-by-side editor and preview layout
- Render LaTeX math formulas with KaTeX
- Render Mermaid diagram blocks
- Render images embedded in Markdown
- Keep citation markers linked to the reference list
- Export rendered content to PDF
- View local debug logs from inside the app

## Best For

- Research reports
- Technical documentation
- Math-heavy Markdown files
- Markdown files exported from AI and deep research workflows

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
- The app is designed for local and offline Windows usage
- GUI smoke tests are available with `npm run test:e2e`
