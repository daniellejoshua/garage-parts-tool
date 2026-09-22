# GAP Marketplace Admin

Internal CRUD web application for managing GAP Marketplace car listings and
car-part listings. This is not a customer-facing marketplace.

## Guidance and planning

- `GOALS.md` — project outcomes, scope, non-goals, and acceptance criteria.
- `PLANS.md` — architecture decisions and the phased implementation plan.
- `AGENTS.md` — repository guidance and hard data-model boundaries.
- `data/REFERENCE.md` — expected vehicle brand/model reference-catalog input.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, pnpm.

## Prerequisites

- Node.js and pnpm.

The vehicle brand/model reference catalog lives at `data/vehicle-catalog.json`.
It is shared by both modules. See `data/REFERENCE.md` for its format.

## Developing

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Checks

```bash
pnpm lint
pnpm build
```

PostgreSQL and Prisma are proposed defaults and are not configured yet. No
database migrations, persistence, media uploads, or authentication exist in
this phase.# garage-parts-tool
