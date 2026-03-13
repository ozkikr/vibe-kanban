# Apps Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an Apps area to the local frontend that talks directly to the personal-platform Go sidecar over Connect-style JSON POST endpoints.

**Architecture:** Add a small typed RPC client in `web-core`, extend local app navigation with Apps destinations, and add two local-web routes for the apps list and app detail pages. The UI stays frontend-only and reads/writes directly to the Go backend without touching the Rust server or Electric state.

**Tech Stack:** React, TanStack Router, TypeScript, Tailwind, `@vibe/ui` components, fetch API.

---

### Task 1: Navigation and Route Surface

**Files:**
- Modify: `packages/web-core/src/shared/lib/routes/appNavigation.ts`
- Modify: `packages/local-web/src/app/navigation/AppNavigation.ts`
- Create: `packages/local-web/src/routes/_app.apps.tsx`
- Create: `packages/local-web/src/routes/_app.apps.$appId.tsx`

**Step 1: Write the failing test**

Document route expectations in code by adding the missing `apps` and `app-detail` destination cases and new route files that import components not yet implemented.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @vibe/local-web check`
Expected: Type errors for unresolved route/component/navigation cases.

**Step 3: Write minimal implementation**

Add destination variants plus local route resolution/target mapping for `/apps` and `/apps/$appId`, and create placeholder route components.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @vibe/local-web check`
Expected: those navigation type errors are gone.

**Step 5: Commit**

```bash
git add packages/web-core/src/shared/lib/routes/appNavigation.ts packages/local-web/src/app/navigation/AppNavigation.ts packages/local-web/src/routes/_app.apps.tsx packages/local-web/src/routes/_app.apps.$appId.tsx
git commit -m "feat: add apps routes"
```

### Task 2: Platform API Client

**Files:**
- Create: `packages/web-core/src/shared/api/platform.ts`
- Modify: `packages/web-core/package.json`

**Step 1: Write the failing test**

Create a focused test for `callRPC` URL building, JSON headers/body, and typed wrapper methods.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @vibe/web-core exec vitest run packages/web-core/src/shared/api/platform.test.ts`
Expected: fail because the client module and/or vitest setup is missing.

**Step 3: Write minimal implementation**

Add the client, supporting types, default base URL behavior, error handling, and package test dependency if needed.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @vibe/web-core exec vitest run packages/web-core/src/shared/api/platform.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/web-core/src/shared/api/platform.ts packages/web-core/package.json
git commit -m "feat: add platform rpc client"
```

### Task 3: Apps List Page

**Files:**
- Modify: `packages/web-core/src/shared/components/ui-new/containers/SharedAppLayout.tsx`
- Modify: `packages/ui/src/components/AppBar.tsx`
- Create: `packages/local-web/src/routes/_app.apps.tsx`

**Step 1: Write the failing test**

Add a route/component test or, if the repo lacks route testing support, wire the page and confirm `check` fails until required props/types/state are implemented.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @vibe/local-web check`
Expected: route/UI typing failures for the new Apps page and AppBar wiring.

**Step 3: Write minimal implementation**

Render the Apps entry in navigation, fetch projects/deploys, show cards, and add the create dialog/form.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @vibe/local-web check`
Expected: no local-web type errors from the Apps list page.

**Step 5: Commit**

```bash
git add packages/web-core/src/shared/components/ui-new/containers/SharedAppLayout.tsx packages/ui/src/components/AppBar.tsx packages/local-web/src/routes/_app.apps.tsx
git commit -m "feat: add apps list page"
```

### Task 4: App Detail Page

**Files:**
- Create: `packages/local-web/src/routes/_app.apps.$appId.tsx`

**Step 1: Write the failing test**

Add the page shape and actions so `check` fails on missing component state/helpers.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @vibe/local-web check`
Expected: missing symbol/type failures for detail-page logic.

**Step 3: Write minimal implementation**

Implement project/version/deploy loading, action buttons, tabs/tables, copyable Neon URIs, GitHub/live links, and delete flow.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @vibe/local-web check`
Expected: detail page compiles cleanly.

**Step 5: Commit**

```bash
git add packages/local-web/src/routes/_app.apps.$appId.tsx
git commit -m "feat: add app detail page"
```

### Task 5: Final Verification and Finish

**Files:**
- Modify: generated route files if updated by tooling

**Step 1: Run focused verification**

Run:
- `pnpm --filter @vibe/web-core exec vitest run packages/web-core/src/shared/api/platform.test.ts`
- `pnpm --filter @vibe/local-web check`

**Step 2: Run full required formatting**

Run: `pnpm run format`
Expected: formatting applied cleanly.

**Step 3: Run broader verification**

Run:
- `pnpm run check`
- `pnpm run lint`

**Step 4: Commit**

```bash
git add docs/plans/2026-03-13-apps-frontend.md
git add -A
git commit -m "feat: add apps frontend for personal platform"
```

**Step 5: Notify**

Run:

```bash
openclaw system event --text "Done: Added Apps page to vibe-kanban — connects to personal-platform Go sidecar via Connect RPC" --mode now
```
