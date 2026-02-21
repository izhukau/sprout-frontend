# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sprout is an AI-powered adaptive learning platform. Built with Next.js 16 (App Router), React 19, TypeScript, and React Flow (`@xyflow/react`). Node layout is computed by Dagre (`@dagrejs/dagre`).

### Product Vision

**Input:** Text, file uploads, or voice (ElevenLabs) to define what to learn.

**Graph hierarchy (3 levels):**
1. **Global graph** — A mind map of all knowledge across projects. If a topic was studied in a previous pathway, nodes connect across projects.
2. **Linear pathway** — A linear branch of high-level topic nodes forming the study path (generated from learning objectives, can integrate professor-assigned tasks).
3. **Subgraph per node** — Each pathway node expands into a non-linear subgraph where each node has:
   - **Learn:** Flashcards / text content
   - **Practice/Test:** AI-chosen format — handwritten (Miro), code, text explanation. Includes a Hint button that sends context to chat.
   - **Recap:** Spaced-repetition checkpoints; must complete recap to unlock the next node.

**Edges** represent health/progress toward the next node. Node accuracy is shown via color shading and on hover.

**Dynamic graph generation:** The linear pathway (concepts) is generated upfront by AI from the topic. Subconcepts within each node are generated dynamically when the user first enters that node — not ahead of time. Before starting a topic, the user takes a baseline assessment (background selection + questions) to calibrate difficulty. Each subconcept node contains: 1 dense paragraph with all info + visualizations if needed, followed by active recall questions (MCQs or open-ended). Hints are personalized — the LLM references previous successful interactions with the user to frame hints effectively.

**Data model:** Topics → Concepts → Subconcepts.

**Multi-agent architecture:** A voice agent (ElevenLabs) talks with the user sharing a transcript as common knowledge, while a graph agent updates graphs in real time — both agents communicate concurrently.

**Engagement metrics:** Time, voice data (pauses etc.), graph progress rate, test/recap success rate, base knowledge level, hint usage.

**Predictive features:** Approximate exam score, career progression timeline, adaptive study pathway.

**Business model:** B2B (universities/companies/schools upload internal docs) + B2C (individual learners, student discounts).

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Lint with Biome
npm run format    # Format with Biome (auto-write)
```

No test runner is configured yet.

## Architecture

The app has two routes: `/` (default Next.js starter, untouched) and `/graph` (active development).

**Graph data flow:**
```
src/app/graph/page.tsx → GraphCanvas (client component)
  ├── lib/layout.ts        — Dagre auto-layout (TB direction, 280×52 nodes)
  └── components/graph-node.tsx — Custom node with 4 variants: problem, step, prereq, practice
```

Graph data is currently hardcoded mock data in `graph-canvas.tsx`. No backend or data-fetching layer exists yet.

## Key Conventions

- **Styling:** Tailwind CSS v4 (PostCSS plugin mode) + shadcn/ui (new-york style, neutral base, oklch color tokens in `globals.css`)
- **Linting/Formatting:** Biome 2 (not ESLint/Prettier). 2-space indent.
- **Path alias:** `@/*` maps to `./src/*`
- **React Compiler** is enabled (`reactCompiler: true` in next.config.ts)
- **Icons:** lucide-react
- Component variants use `class-variance-authority` (cva)
- `cn()` helper in `lib/utils.ts` combines clsx + tailwind-merge
