# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Genesis is a modern NLP annotation tool built with Next.js 15, React 19, and TypeScript. The application enables users to create workspaces, manage annotation projects, collaborate with teams, and annotate documents for various NLP tasks like Named Entity Recognition, Sentiment Analysis, Text Classification, and Relation Extraction.

## Development Commands

### Running the application
```bash
pnpm dev              # Start development server with Turbopack
pnpm build            # Build production application with Turbopack
pnpm start            # Start production server
pnpm lint             # Run ESLint
```

The development server runs on `http://localhost:3000` by default.

## Architecture

### Framework & Tooling
- **Next.js 15** with App Router (not Pages Router)
- **React Server Components (RSC)** enabled
- **Turbopack** for both dev and build
- **TypeScript** with strict mode
- **Tailwind CSS v4** with custom CSS variables
- **shadcn/ui** components with "new-york" style preset

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Root route (redirects to /login)
│   ├── layout.tsx         # Root layout with Geist fonts
│   ├── globals.css        # Global styles with CSS variables
│   ├── login/             # Login page
│   ├── signup/            # Sign up page
│   ├── verify-email/      # Email verification page
│   ├── home/              # Main dashboard with workspace grid
│   └── workspace/[id]/    # Dynamic workspace detail page
├── components/
│   └── ui/                # shadcn/ui components
└── lib/
    └── utils.ts           # Utility functions (cn, etc.)
```

### Routing Strategy
- Root `/` redirects to `/login`
- Authentication flow: `/login` → `/signup` → `/verify-email`
- Authenticated routes: `/home` (dashboard) → `/workspace/[id]` (workspace detail) → `/workspace/[id]/editor` (annotation editor)

### Component Patterns

**Client vs Server Components:**
- Most pages use `'use client'` directive for interactivity
- Pages requiring routing hooks (`useRouter`, `useParams`) must be client components
- Layout components are server components by default

**UI Components:**
- All UI components are from shadcn/ui with customizations
- Import pattern: `@/components/ui/[component-name]`
- Components use CVA (class-variance-authority) for variants
- Tailwind classes merged with `cn()` utility from `@/lib/utils`

### Styling System

**CSS Variables Architecture:**
- Primary brand color: `#3950FE` (stored in `--primary`)
- Custom CSS variables defined in `globals.css` root scope
- Dark mode variables auto-switch via `@media (prefers-color-scheme: dark)`
- Uses oklch color space for Tailwind colors
- Custom gradients via `--primary-gradient-start` and `--primary-gradient-end`

**Tailwind Configuration:**
- Import path alias: `@/*` maps to `./src/*`
- No prefix for Tailwind classes
- Base color: neutral
- CSS variables mode enabled
- Custom radius: `0.625rem`

**Design Tokens:**
- Geist Sans (primary font)
- Geist Mono (monospace font)
- Gradient backgrounds: `from-slate-50 via-indigo-50/30 to-purple-50/30`
- Glassmorphism effects with backdrop blur

### State Management

Currently using React local state (`useState`) in client components. Mock data is defined inline within components:
- `recentWorkspaces` and `allWorkspaces` in `/home/page.tsx`
- `workspaceData` in `/workspace/[id]/page.tsx`

When implementing real data fetching, consider using React Server Components with async/await or client-side data fetching with SWR/React Query.

### Key Features

**Home Page (`/home`):**
- Workspace search and filtering
- Tabs for "Recent" vs "All" workspaces
- Dialog for creating new workspaces
- Workspace cards with progress tracking
- Import workspace functionality

**Workspace Page (`/workspace/[id]`):**
- Sidebar navigation with 5 sections: Getting Started, Documents, Collaborators, Annotation Schema, Settings
- Document list with filtering by status (completed, in-progress, unannotated)
- Annotation layer and label management
- Workspace settings and collaboration preferences
- Progress tracking in sidebar

**Annotation Schema:**
- Multi-layer annotation support (span, relation types)
- Customizable labels with colors and keyboard shortcuts
- Label examples: Sentiment (Positive, Negative, Neutral, Mixed), Entities (Product, Feature, Company)

**Annotation Editor (`/workspace/[id]/editor`):**
- Full-featured text annotation interface with real-time highlighting
- Text selection-based annotation workflow
- Keyboard shortcuts for rapid annotation (each label has a shortcut key)
- Multi-layer annotation support with layer switching
- Visual annotation highlighting with customizable colors
- Annotation management: hover to preview, delete with keyboard
- Document navigation (previous/next) with annotation persistence per document
- Sidebar label palette with real-time annotation list
- Tooltip-based annotation details on hover

## Adding shadcn/ui Components

The project is configured with shadcn/ui. To add new components:

```bash
pnpx shadcn@latest add [component-name]
```

Components are installed to `src/components/ui/` with the New York style.

## Path Aliases

TypeScript and Next.js are configured with the following import aliases:
- `@/*` → `./src/*`
- `@/components` → `./src/components`
- `@/lib` → `./src/lib`
- `@/hooks` → `./src/hooks` (directory not yet created)

## Important Conventions

1. **Client Components:** Use `'use client'` directive when components need:
   - React hooks (useState, useEffect, etc.)
   - Next.js navigation hooks (useRouter, useParams, useSearchParams)
   - Event handlers
   - Browser APIs

2. **Image Assets:** Logo and images are stored in `/public` directory
   - Example: `/genesis-logo.svg` referenced as `/genesis-logo.svg` in Image component

3. **Type Safety:** The project uses TypeScript strict mode. Always define types for props and state.

4. **CSS Variables in JSX:** Use inline styles for dynamic CSS variables:
   ```tsx
   style={{ width: `${workspace.progress}%` }}
   className="bg-[var(--primary)]"
   ```

5. **Icon Pattern:** Currently using inline SVG icons. Consider consolidating with lucide-react (already installed).

## Known Patterns

- **Redirect Pattern:** Home page (`/`) uses `redirect()` from `next/navigation` (server-side redirect)
- **Mock Data:** Workspace and document data is currently mocked inline. Plan for API integration.
- **Workspace ID Routing:** Uses Next.js dynamic routes with `[id]` segment
- **Status Badges:** Use helper function `getStatusBadge()` for consistent status styling
- **Text Selection Annotation:** Editor uses `window.getSelection()` API to capture text ranges and convert to character offsets
- **Annotation Storage:** Annotations are stored with start/end character positions, enabling accurate text highlighting
- **Keyboard Event Handling:** Editor uses global `keydown` listeners for label shortcuts and annotation deletion

## Future Considerations

- Backend API integration for authentication and data management
- Real-time collaboration features
- File upload handling for document import
- Export functionality for various annotation formats (JSON, CoNLL, WebAnno TSV, CSV, UIMA CAS XMI)
- Annotation persistence to backend (currently in-memory only)
- Inter-annotator agreement metrics
- Annotation history and versioning
