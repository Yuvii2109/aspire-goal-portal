# Aspire Goal Portal - Project Context

## Overview
- Frontend app for goal setting and approvals with a manager and contributor flow.
- Built with TanStack Start (SSR) + TanStack Router + React Query.
- Styled with Tailwind CSS v4 and shadcn/ui components (New York style).
- Primary UX areas: landing page, "My Goals" drafting, "Team Approvals" review.

## Tech Stack
- React 19
- TanStack Start (SSR) + TanStack Router
- TanStack React Query for data fetching and caching
- Supabase JS client for database access
- Tailwind CSS v4 with CSS variables and OKLCH colors
- shadcn/ui component set + Radix primitives
- Vite build tooling via vite-tanstack-config helper
- Cloudflare Workers compatible SSR (wrangler.jsonc)

## App Structure
- Entry and SSR wrapper:
  - src/start.ts: createStart with request middleware
  - src/server.ts: Cloudflare-style fetch wrapper, SSR error normalization
- Router:
  - src/router.tsx: createRouter with routeTree
  - src/routeTree.gen.ts: auto-generated file routes (do not edit)
- Root route:
  - src/routes/__root.tsx: HTML shell, meta tags, error and not-found UI
  - AuthProvider wraps the app; Toaster is mounted globally
  - Favicon uses Aspire logo
- Layout:
  - src/components/AppShell.tsx: responsive sidebar + top bar shell
  - AppShell top bar includes a search input placeholder and notification dropdown
  - AppShell brand uses Aspire logo in sidebar and mobile header
- Styling:
  - src/styles.css: Tailwind theme variables, light/dark palettes, base styles

## Routes and UI
- / (src/routes/index.tsx)
  - Landing page with two cards linking to My Goals and Team Approvals.
- /my-goals (src/routes/my-goals.tsx)
  - Draft goals UI: create form, list of draft cards, sticky footer with weightage progress.
  - Tabs split: Planning (Drafts) and Execution (Active) with approved goals.
  - Execution tab shows empty state if no approved goals and active goal cards with Log Check-In.
  - Check-In dialog logs quarter/status/actual achievement into check_ins and shows a success toast.
  - Active goal cards show a soft success badge when a check-in is logged.
  - Execution cards show historical check-ins with quarter/status/actual and manager comments.
  - UoM dropdown uses value/label pairs (min, max, timeline, zero).
  - Submit disabled unless total weightage equals 100; max 8 draft goals.
  - Draft goals are fetched from Supabase (status = Draft) with React Query hooks.
  - Submit for Approval updates all Draft goals to Pending Approval and shows toast feedback.
  - Auth loading shows a centered spinner before data is queried.
- /login (src/routes/login.tsx)
  - Supabase email/password sign-in with remember-me, reset password link, and inline errors.
  - Redirects authenticated users to /my-goals via shared auth context.
  - Centered auth card with Aspire Goal Tracking Portal heading.
- /reset-password (src/routes/reset-password.tsx)
  - Password reset form using Supabase updateUser; redirects back to login on success.
  - Centered auth card with Aspire heading.
- /team-approvals (src/routes/team-approvals.tsx)
  - Tabs split: Goal Approvals and Check-In Reviews.
  - Goal Approvals: table on desktop, accordion cards on mobile.
  - Supabase-backed manager queue with join to profiles for employee name/email.
  - Empty state includes "Notify Team" CTA with toast.
  - Per-row approve/return with loading spinners and toasts.
  - Check-In Reviews: manager-scoped check_ins joined with goals + profiles.
  - Desktop table and mobile card layout (uses useMobile hook).
  - Add Comment dialog writes manager_comment with toast feedback.

## Components and Utilities
- UI components under src/components/ui are shadcn/ui wrappers.
- src/lib/utils.ts provides cn() for class merging.
- src/hooks/use-mobile.tsx exposes a breakpoint-based isMobile hook.

## Data and State
- Supabase-backed data for goals; local state for team approvals remains.
- totalWeightage derived from draft goals weightage; draftGoals array capped at 8 items.
- Form state stored in component state; draft goal create/delete goes through Supabase.
- Shared auth context provides session, user, profile, and loading state across the app.
- AppShell now uses auth profile for header (name/role/initials) and includes logout.
- Notifications are a Shadcn dropdown seeded with mock enterprise updates.
- Desktop search input is a visual placeholder; submit triggers a toast for v2.0.
- Profiles are fetched by user id from the profiles table via React Query.
- Goal mutations include: create draft, delete, submit for approval (bulk update).
- Check-in mutations include: create check-in and manager comment update.

## Error Handling
- src/lib/error-capture.ts captures unhandled errors for SSR diagnostics.
- src/server.ts converts certain swallowed SSR errors into a branded HTML response.
- Root route defines ErrorComponent and NotFoundComponent.

## Tooling and Config
- Vite config is provided by the vite-tanstack-config helper (do not add duplicated plugins).
- TypeScript in strict mode with bundler resolution.
- ESLint + Prettier configured.
- components.json describes shadcn/ui setup and aliases.
- Supabase client initialized in src/lib/supabase.ts; env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
- AuthProvider in src/lib/auth.tsx fetches profiles and listens to auth state changes.
- Global toast system uses shadcn/sonner (Toaster mounted in root).
- Supabase hooks (src/lib/supabase.ts) accept user id for query/mutations and gate queries with enabled.
- Approved goals query includes nested check_ins for employee dashboards.

## Commands
- npm run dev: start Vite dev server
- npm run build: production build
- npm run preview: preview production build
- npm run lint: run ESLint
- npm run format: run Prettier

## Notes for Future Updates
- Keep this file updated when routes, layout, data flow, or tooling change.
- Update any new backend integrations, API contracts, or persistence layers here.
