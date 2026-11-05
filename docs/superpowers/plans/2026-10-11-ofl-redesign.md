# Open Fight Latam Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Apply the approved OFL identity, public layout and admin design without changing business data or flows.

**Architecture:** Central brand constants and semantic theme tokens feed existing server-rendered pages and shared controls. Reuse the current public and admin components, adding small presentation-only components for the brand motif and route transitions. No new queries, dependencies or database writes.

**Tech Stack:** Next.js, React, TypeScript, Tailwind, existing GSAP/Lenis, Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-ofl-redesign-design.md` (approved by user on 2026-10-11).

## Global Constraints

- Work exclusively in OFL on `codex/ofl-redesign`; keep Guerra Campal intact.
- Palette: `#000000`, `#FFFFFF`, `#151218`, `#C51B3A`, `#643374`, `#C59BE5`.
- Existing photos, names, slugs, dates, records, contacts and stored settings remain intact.
- Server layouts/pages remain server components; interactive leaves only are client components.
- Animate transform and opacity; preserve reduced motion, keyboard navigation, visible content and 44 px touch targets.
- Standard Postgres/storage, requireAdmin, Zod and audit behaviors remain unchanged.

## Review Focus

- Existing historical event names must survive branding changes: SEO tests preserve fixture names.
- Red primary buttons must use white text, including hover; check computed contrast and accessible focus.
- Intro and page transitions must not block content or keyboard input; add reduced-motion e2e assertions.
- Long titles and mobile tables must not overflow: smoke 320/375/1440 px and representative admin forms.
- Photo fallback and uploaded hero variants must survive the new layout: keep existing event hero tests and media e2e.

### Task 1: Brand foundation

**Files:** `src/domain/brand.ts`, `src/domain/brand.test.ts`, `src/components/brand/logo*`, `src/domain/seo*`, `src/app/layout.tsx`, `src/app/admin/layout.tsx`, `src/emails/*`, `src/lib/create-auth.ts`, metadata in `src/app/(site)`, `public/ofl-logo.webp`, favicon and OG fallback.

**Interfaces:** Produce `BRAND = { name, shortName, description, instagramUrl, colors } as const`; retain `Logo({size?: 'sm'|'md'|'lg'})`; SEO constants derive from BRAND.

- [x] Write and run failing tests for OFL constants, accessible logo and OFL metadata/organization names while keeping event names.
- [x] Implement central constants, supplied logo and updated metadata/authentication/email copy; retain all business behavior.
- [x] Run affected unit tests and inspect optimized static assets.

### Task 2: Semantic theme and controls

**Files:** `src/app/globals.css`, `src/components/ui-gc/*`, `src/components/ui/button.tsx`, public feature components using yellow tokens.

**Interfaces:** Produce `brand`, `brand-hover`, `accent`, `accent-bright` Tailwind colors; retain existing button/tag props (tone names migrate to brand as required).

- [x] Update button test expectations to check readable controls and slot/link behavior before implementation.
- [x] Replace yellow brand classes with semantic classes; correct foregrounds on all colored surfaces. Keep red/blue fight corners and state colors distinct.
- [x] Apply shared hover/focus/pressed treatments and restrained admin radii; validate controls.

### Task 3: Public composition and motion

**Files:** `src/components/brand/brand-mark.tsx`, site header/footer/page shell/mobile menu, `src/features/events/components/event-hero.tsx` and focused hero presentation components, home hero/intro/marquee/news/stats/tickets, `src/components/motion/page-transition.tsx`, public layout/template.

**Interfaces:** `BrandMark({className?:string})` decorative SVG; `PageTransition({children: ReactNode})` reusable route-entry presentation preserving all content. EventHero props and data-slots remain stable.

- [x] Change watermark/brand tests and add reduced-motion/brand e2e expectations; observe failure against the old design.
- [x] Build the split event hero and mobile photo-first composition, real OFL branding, editorial sections, dark stats and ticket panel.
- [x] Replace the GC intro with OFL logo/diagonal presentation, animate via transform/opacity and keep content unobstructed; integrate short page-entry transitions.
- [x] Check home/events/photos/navigation at mobile and desktop, including reduced motion and keyboard menu behavior.

### Task 4: Admin presentation

**Files:** `src/components/admin/auth-card.tsx`, admin sidebar/page, protected layout, dashboard quick actions/event/inbox/pending components; shared admin controls receive theme from Task 2.

**Interfaces:** Existing AdminPage/AuthCard props and admin routes remain unchanged; protected layout retains requireAdmin and inbox query.

- [x] Add e2e expectations for OFL login/sidebar identity and functional site link, preserving login/authorization/save behavior.
- [x] Implement dark login, black grouped navigation, contextual toolbar, refined page headings and dashboard cards/quick actions. Reuse PageTransition and BRAND.
- [x] Verify forms, tables, mobile sidebar, night-of-fight, settings and media editor with existing e2e.

### Task 5: Integration, verification and review

**Files:** relevant existing tests, new `e2e/ofl-design.spec.ts`, `docs/decisions.md`, `docs/OFL.md`, redesign report, inherited OFL project rules.

- [x] Record the approved design override of Guerra Campal aesthetics and update OFL-specific documentation.
- [x] Run `pnpm test --maxWorkers=2`, lint, typecheck, relevant e2e and production build; inspect every result.
- [x] Compare screenshots and audit contrast, overflow, reduced motion, page transitions and real local media.
- [x] Obtain fresh whole-branch review; fix material issues with focused regression tests and repeat affected checks.
- [x] Commit the verified work conventionally, retain the OFL branch and report the local preview and inherited-content limitation.
