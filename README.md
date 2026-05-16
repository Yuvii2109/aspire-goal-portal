# Aspire — Enterprise Goal Setting & Continuous Execution Portal

Deployed on the Edge: [Live Demo Link](https://tanstack-start-app.aspire-yuvraj-goal-portal.workers.dev/)

## Overview
Aspire is a modern, high-performance, full-stack enterprise performance management workspace. Built to bridge the gap between strategic planning and daily execution, Aspire features a strict asynchronous two-sided marketplace architecture for Employees (to draft goals and log progress) and Managers (to approve pipelines and review check-ins).

The platform leverages cutting-edge web technologies to achieve edge-rendered Server-Side Rendering (SSR), bulletproof data synchronization, and rigorous cryptographic role security.

---

## Core Feature Engine

### 1. The Employee Workflow (Planning and Execution)
- Drafting Sandbox: Employees can build up to 8 draft goals. A smart sticky progress tracker calculates weights in real time; submissions are locked until the total weight equals exactly `100%`.
- Active Execution Pipeline: Once approved, goals transition to a read-only execution state where users can launch a contextual flow to log quarterly progress (`Q1-Q4`, status metrics, and numerical actuals).
- Feedback Loops: Historic check-ins are rendered inline on the active goal dashboard, surfacing real-time manager comments and guidance.

### 2. The Manager Dashboard (Governance and Reviews)
- Goal Approvals Queue: High-density, reactive review workflow featuring an asynchronous approve/return system equipped with dynamic loading states.
- Continuous Check-In Reviews: A ledger displaying employee performance data joined from the core database, allowing managers to inject granular comments directly into execution timelines.

### 3. Role-Based Access Control (RBAC)
- Strict client-side router guarding and server-side visibility layers. Protected manager modules (like `/team-approvals`) are inaccessible to base employees, with navigation links automatically pruned from the layout shell based on authenticated identity tokens.

---

## Technical Architecture

### Tech Stack
- Frontend Core: React 19 (leveraging advanced UI concurrency paradigms)
- Meta-Framework and Routing: TanStack Start (SSR) + TanStack Router (fully type-safe routing tree)
- Server Cache and Async State: TanStack React Query (automatic background invalidation, declarative cache pruning)
- Database Architecture: Supabase / PostgreSQL (relational structure with normalized foreign key configurations)
- Design Language: Tailwind CSS v4 + shadcn/ui (New York style primitives styled via fluid OKLCH color space systems)
- Infrastructure and Deployment: Cloudflare Workers (compiled SSR edge runtime serving global distribution channels)

### Data Architecture and Relations
The backend engine operates over three tightly coupled entities:
- `profiles`: Holds user metadata, hierarchical structures (employee -> manager relations), and RBAC role levels (Employee, Manager, Admin).
- `goals`: Handles quantitative metrics, weights, and status lifecycles (Draft, Pending Approval, Approved).
- `check_ins`: Relational execution historical log. Leverages a deep nested JOIN query structure (profiles -> goals -> check_ins) to serve contextual manager review metrics.

---

## Developer Setup Guide

### 1. Prerequisites
Ensure you have Node.js and a package manager configured.

### 2. Clone and Install
```bash
git clone https://github.com/yuvii2109/aspire-goal-portal.git
cd aspire-goal-portal
npm install
```

### 3. Environment Configurations
Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

### 4. Directives and Production Management
- `npm run dev` — Starts the local Vite SSR hydration development pipeline.
- `npm run build` — Compiles optimized code artifacts for Cloudflare edge compilation.
- `npm run preview` — Spins up a localized staging container to audit production builds.
- `npm run lint` / `npm run format` — Validates formatting constraints via ESLint and Prettier.

### Production Edge Deployment
The system builds seamlessly into a Cloudflare Worker footprint using the Wrangler engine:

```bash
npx wrangler login
npm run build
npx wrangler secret put VITE_SUPABASE_URL
npx wrangler secret put VITE_SUPABASE_ANON_KEY
npx wrangler deploy
```