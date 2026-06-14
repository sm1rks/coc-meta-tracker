# Project Context

## Codebase Info
- **Framework**: Astro (static output)
- **Styling**: Tailwind CSS (version 4.3.0)
- **Data pipeline**: TypeScript + Node fetch (`scripts/fetch-meta.ts`)
- **Key dependencies**: `clashofclans.js`, `tailwindcss`, `tsx`, `@astrojs/node`

## Directories & Layout
- `src/`: Application source code (pages, components, layouts, utils)
- `data/`: Extracted player meta data (`meta.json`, `player.json`, `seasons.json`)
- `scripts/`: Data fetching script
- `scratch/`: Experimental scripts
- `.agents/`: Coordination and agent metadata files

## Targets (from ORIGINAL_REQUEST.md)
- **R1. Safe Performance Optimizations**: Unoptimized assets, blocking scripts, redundant renders, keeping tech stack same.
- **R2. Visual & UI/UX Polish**: Accessibility improvements, responsive layouts, micro-animations, preserving aesthetics.
- **Acceptance**: `npm run build` must succeed; no broken features or layouts.
