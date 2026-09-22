# GAP Marketplace Admin Implementation Plan

## Planning Status

This document records approved architecture and implementation phases. It does not authorize application implementation, database migrations, destructive operations, deployment, or schema assumptions.

Only creation of `GOALS.md`, `PLANS.md`, and `AGENTS.md` is currently authorized.

## Architecture Decisions

### Data Boundary

Marketplace application entities are `Car`, `Parts`, and `Media`. Approved reference-catalog and compatibility tables are `vehicle_brands`, `vehicle_models`, and `part_compatibilities` — the last being the authoritative vehicle-compatibility source (the retained `Parts.compatibility` column is never written).

Do not add further entities, tables, business fields, relationships, or CRUD modules without explicit approval. Do not add business fields beyond the approved nullable `Parts.oem_number`.

Primary keys and creation/update timestamps are approved technical additions. Their exact types and database implementation remain pending.

### Reference Data

The application uses a single shared vehicle catalog (`data/vehicle-catalog.json`) for both Cars and Car Parts navigation. At runtime the catalog is read from the approved tables `vehicle_brands` and `vehicle_models`, seeded from the JSON by `prisma/seed.ts` (`pnpm db:seed`). The JSON is read only by the seed script, never at runtime, and brands/models are never derived from Car records.

Approved catalog rules:

- Exactly 54 vehicle brands, grouped by region (American, European, Japanese).
- Brands come from the supplied allowlist; the list must not be silently expanded.
- Models are researched per brand covering current production, discontinued models from approximately 1990 onward, and international markets including the Philippines.
- Trims, engines, transmissions, and equipment variants are not separate models.
- Each model has `production_status`: `current`, `discontinued`, or `unknown` (enforced by a CHECK constraint on `vehicle_models.production_status`). Uncertain entries are flagged `unknown` for GAP review rather than guessed.
- Production status is catalog metadata and is never added to the Car or Parts fields.
- The isolated word "Automobiles" after BMW is branding noise, not a separate brand.
- Region grouping is optional visual UI organization; search covers all brands regardless of region, and region is never a required navigation step.
- Seeding is idempotent: brands upsert by name, models by (brand, name), existing IDs are preserved, and catalog rows are never deleted — entries missing from the JSON are reported, not removed.
- Catalog tables are read ordered by id, preserving the JSON file order.

### Navigation

```text
Cars -> Existing Brand -> Existing Model -> Car Listings CRUD

Car Parts -> Existing Brand -> Existing Model -> Parts Listings CRUD
```

The selected existing brand and model must remain visible in breadcrumbs and route context.

For Cars, the selected brand and model preselect the supplied `Car.brand` and `Car.model` fields in Add/Edit forms.

For Car Parts, `Parts.brand` remains the part manufacturer. The selected vehicle brand and model are recorded through the approved `PartCompatibility` junction (the authoritative compatibility source); the retained `Parts.compatibility` column is never written.

Catalog UI behavior: searchable brands, searchable models, current models shown first, discontinued/unknown models still selectable, and listings allowed under discontinued models. A model with no listings shows an empty listing state. No brand or model is hidden because it has no Car records.

### Parts Value Sets

`Parts.category` uses exactly (13 values, matching GOALS.md and AGENTS.md):

```text
engine
transmission
suspension
brakes
exhaust
electrical
tires_wheels
wheels
body_exterior
interior
fluids_lubricants
accessories
other
```

`Parts.condition` uses exactly:

```text
new
used
refurbished
```

These are predefined allowed values presented as dropdowns and filters. They are not entities, tables, routes, or CRUD modules.

### Server Architecture

Use Next.js App Router server-side capabilities for CRUD and uploads. Do not create a separate Express, NestJS, Spring Boot, or other backend service.

PostgreSQL and Prisma are proposed defaults only. No schema, migration, or database setup may begin until the existing field definitions and infrastructure are confirmed and separately approved.

### Frontend Architecture

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui as the default component library
- pnpm
- React Hook Form and Zod where appropriate
- TanStack Table for listing management

Preferred shadcn/ui components:

- `Sidebar` for main module navigation
- `Breadcrumb` for module, brand, and model context
- `Card` for brand/model selection and listing summaries
- `Table` with TanStack Table for listing management
- `Input`, `Textarea`, `Select`, `Checkbox`, and `Switch` for forms
- `Dialog` or `AlertDialog` for confirmations
- `Sheet` for contextual forms or details when appropriate
- `Badge` for listing status and part condition
- `Tabs` where they improve organization
- `Skeleton` for loading states
- Sonner for success and error notifications

Prefer existing shadcn/ui components over custom equivalents. Add components only when required by an approved feature, and avoid unnecessary dependencies or visual complexity.

The interface must be clean, modern, responsive, and consistent across Cars and Car Parts. CRUD usability takes priority over decorative dashboard content.

### Media And Storage

Preserve all supplied `Media` fields and `Parts.images`. Do not assign new formats, precedence, synchronization behavior, or ownership semantics until the existing formats and relationship are supplied.

The eventual server-side storage abstraction will use `UPLOAD_DIR`:

```text
Local:      ./storage/uploads
Production: /mnt/efs/uploads
```

Target directories are:

```text
uploads/
  cars/{car_id}/
  parts/{part_id}/
```

The production EFS resource is named `gap-marketplace`, but its mount and deployment status are unconfirmed. Do not invent credentials, treat an EFS DNS name as a public URL, deploy, mount EFS, or alter AWS resources without separate approval.

Media routes must eventually validate authorization, identifiers, paths, MIME types, and file sizes. Database and filesystem failure handling must avoid preventable orphaned files or records.

## Known Limitations

### Soft 404 for unknown brand/model slugs (accepted)

Dynamic routes under brand/model navigation call `notFound()` when a slug does
not exist in the catalog. Under the App Router's streamed responses (the route
segment has `loading.tsx` boundaries), Next.js renders the `not-found.tsx` UI
but returns HTTP 200 while injecting `<meta name="robots" content="noindex">`.

This is documented Next.js behavior for streamed responses (see
`not-found.js` docs and vercel/next.js#93253). It is accepted for this internal
admin application: the correct UI is served, the URL is marked noindex, and the
loading boundaries are not removed or restructured purely to change the HTTP
status. A real 404 status would require a middleware/data-layer pre-check or
dropping the loading boundaries.

## Phased Delivery

Each phase requires approval before work starts. For each phase, state its immediate goal, identify files to change, implement only that phase, run relevant checks, report results and open issues, and stop.

### Phase 1: Repository Inspection And Foundation

Immediate goal: establish documented constraints, create the shared vehicle catalog, and initialize the frontend foundation.

Planning-document portion:

- Create `GOALS.md`, `PLANS.md`, and `AGENTS.md`.
- Record pending inputs without inventing formats.

Foundation portion (approved, implemented):

- Initialize Next.js App Router with TypeScript, Tailwind CSS, shadcn/ui, and pnpm.
- Establish the responsive admin shell and module navigation.
- Create `data/vehicle-catalog.json` from the approved brand allowlist, with researched models and `production_status` metadata.
- Implement the reference-catalog loader (JSON, scoped to `data/`) and slug helpers.
- Implement searchable, region-groupable brand selection and searchable, current-first model selection.
- Configure linting, type checking, and environment validation.

Checks after Phase 1 implementation:

- Lint
- Type checking
- Production build

### Phase 2: Database Design And Migrations

Immediate goal: define the exact existing Car, Parts, and Media schema without changing field meanings.

#### Status: approved and applied to the local development database (`gap_admin`) only

The three supplied entities are the source of truth. The field-by-field proposal was approved with these conditions:

- Only `Car`, `Parts`, and `Media` are modeled. No foreign keys, no additional entities, no invented relationships.
- PostgreSQL/Prisma types, nullability, defaults, table names (`cars`, `parts`, `media`), and the three indexes are initial implementation assumptions.
- `Parts.compatibility` and `Parts.images` are provisional nullable `text` columns. Their internal formats, parsing logic, and any relationship to `Media` are uninterpreted and pending the supplied formats.
- No uniqueness constraints and no CHECK constraints on statuses or vehicle condition.
- `Parts.category` (13 values) and `Parts.condition` (`new`, `used`, `refurbished`) enforce the approved value sets via CHECK constraints in the migration SQL (Prisma datamodel cannot express CHECK constraints).
- `updated_at` is maintained by Prisma `@updatedAt` AND database `BEFORE UPDATE` triggers (raw-SQL safety).

Deliverables for review:

- `prisma/schema.prisma` — Prisma models `Car`, `Parts`, `Media` with `@map`-preserved column names.
- `prisma.config.ts` — Prisma 7 config (schema path, migrations path, datasource `DATABASE_URL`).
- `prisma/migrations/20260922134003_initial_entities/migration.sql` — baseline migration (three tables + indexes + CHECK constraints + `updated_at` triggers), generated from an empty state and applied to the local development database via `prisma migrate deploy` (approved). The baseline migration is immutable: never regenerate it with `prisma migrate dev` or `prisma migrate diff` (that would drop the hand-written CHECK constraints and triggers).

Provisional decisions to revisit when inputs arrive:

1. `Parts.compatibility` column type and validation (Phase 4) once the existing format is supplied.
2. `Parts.images` column type and the `Parts.images`/`Media` relationship (Phase 5) once those are supplied.
3. `Car.status`, `Parts.status`, and vehicle `condition` value sets — enforced at the application layer in Phases 3/4 once provided.

Apply the migration only with explicit approval; no database was touched during this phase. No seed records, OEM numbers, compatibility data, or listings were fabricated.

Applied later, after explicit Phase 2 approval, exclusively to the local development PostgreSQL 18 container (`gap_admin`). No other database was touched, and no seed data was created.

### Phase 3: Cars CRUD

Immediate goal: manage individual Car listings within the selected existing brand/model context.

Scope:

- Reference-data brand and model selection
- Contextual breadcrumbs
- Search and useful filters
- TanStack Table listing management
- Add, view, edit, and delete operations using every supplied Car field
- Preselected navigation brand/model in Add/Edit forms
- Logical form sections and validation
- Empty, loading, success, and error states
- Destructive-action confirmation

#### Status: approved, implemented, and verified

Implemented:

- Listings page reads real `Car` records from PostgreSQL filtered by exact
  catalog brand/model (`findCarsByBrandModel`), with an empty-added state and a
  TanStack Table (search, sorting, pagination) for listing management.
- Add/view/edit/delete routes under `.../listings/new`, `.../listings/[id]`,
  and `.../listings/[id]/edit` with breadcrumbs and loading skeletons.
- `CarForm` (React Hook Form + Zod) with logical sections covering every
  supplied Car field. The navigated brand/model are read-only and prefilled.
  Optional numerics, free-text fields, and `published_at`/`sold_at`
  (`datetime-local`) are supported.
- Shared Zod schema used by both the client resolver and the server actions
  (`src/lib/server/car-actions.ts`). Prisma is server-only
  (`src/lib/server/db.ts` with `@prisma/adapter-pg` and `server-only`);
  `DATABASE_URL` never reaches the client bundle.
- `Car.status` and `condition` are free-text fields (no invented value sets).
  Numeric sanity boundaries at the application layer only: year 1900-2100,
  price 0+, mileage 0+, rating 0-10, inspection score 0+.
- Delete confirmation dialog is scoped to the selected listing id and performs
  a physical delete. Sonner Toaster added to the root layout.

Checks:

- `pnpm exec tsc --noEmit` passes.
- `pnpm lint` passes (one informational `react-hooks/incompatible-library`
  warning on `useReactTable`; TanStack Table v8 vs React Compiler — accepted).
- `pnpm build` passes; all car routes are dynamic.
- Runtime verification against local `gap_admin`: create/read/update/delete
  and brand/model filtering confirmed at the Prisma level with a temporary
  verification script (deleted afterwards; DB returned to baseline row count);
  the running app rendered the created listing through list/view/edit pages
  and returned to the empty state after deletion. Cross brand/model leakage is
  zero; the `updated_at` trigger fires on update.
- An unknown catalog slug returns the documented soft 404 (HTTP 200 + noindex).

Decision records:

- TanStack Table is pinned to v8 (`@tanstack/react-table@^8`); the v9 default
  API is a rewrite and is intentionally avoided for this phase.
- Deletion is physical; there is no soft-delete field.
- `status`/`condition` remain free text until the value sets are supplied.
- shadcn/ui `form` wrapper was written by hand because the `base-nova` style
  registry ships an empty `form` component file list.

### Phase 3b: Vehicle Catalog Tables (Reference Data In PostgreSQL)

Immediate goal: make the vehicle catalog database-backed navigation source for both modules, seeded from the approved JSON.

#### Status: approved and implemented

Implemented:

- Added approved models `VehicleBrand` (`vehicle_brands`), `VehicleModel` (`vehicle_models`), and `PartCompatibility` (`part_compatibilities`) to `prisma/schema.prisma`. The junction uses composite key `(part_id, vehicle_model_id)` and is the authoritative vehicle-compatibility source for the future Parts phase; the retained `Parts.compatibility` column is never written.
- Additive migration `20260922150000_catalog_compatibility` generated offline via schema diff (baseline migration untouched) with hand-appended `production_status` CHECK constraint and `set_updated_at()` triggers on all three new tables, applied to local `gap_admin` via `prisma migrate deploy`.
- Seeding via `pnpm db:seed` (`tsx prisma/seed.ts`, `tsx` devDependency, `prisma.config.ts` `migrations.seed`). The seed reuses the validated `loadVehicleCatalog()` parser; it aborts on invalid JSON, upserts brands by name (updates region) and models by (brand, name) (updates production status), preserves existing IDs, never deletes rows, and reports brands/models in the DB but missing from the file. No fabricated records.
- Runtime catalog loader `loadDatabaseCatalog()` (`src/lib/reference/catalog-db.ts`) reads `vehicle_brands`/`vehicle_models` ordered by id (file order) and returns the same `VehicleCatalog` shape, so brand/model selection components are unchanged. No silent JSON fallback: an empty database or unreachable database returns an issue with an actionable message (seed / migrate instructions) surfaced by `CatalogGate`, whose messaging was updated to the database source.
- All nine navigation/listings pages under `/cars/brands...` and `/parts/brands...` now use `loadDatabaseCatalog()`; `loadVehicleCatalog()` remains only for the seed script.

Checks:

- `prisma validate` passes; `prisma migrate status` reports up to date.
- DB verified: 54 brands (14 American/27 European/13 Japanese), 825 models (416 current/383 discontinued/26 unknown), unique indexes (`vehicle_brands.name`, `vehicle_models(vehicle_brand_id, name)`), composite PK + model index on the junction, FK behaviors (part delete CASCADE, model delete RESTRICT, brand delete RESTRICT), CHECK rejects invalid `production_status`, `updated_at` trigger fires, seed rerun is idempotent with IDs preserved (0 created, all updated).
- `pnpm exec tsc --noEmit` passes; `pnpm lint` passes (known one-off informational warning); `pnpm build` passes.
- Runtime navigation verified on the dev server: 54 brand links, region groups present, Honda renders 25 models (Civic/Accord/CR-V, current-first), parts brands title correct, model listings route serves 200, unknown slug returns the accepted soft 404.
- Applies to local `gap_admin` only.

Decision records:

- `PartCompatibility` composite PK `(part_id, vehicle_model_id)`; part delete cascades to compatibility rows; a compatibility-referenced model and a brand with models cannot be deleted (RESTRICT).
- `production_status` CHECK `IN ('current','discontinued','unknown')` enforced in SQL (Prisma cannot express CHECK).
- Timestamps and `set_updated_at()` triggers on all three new tables (raw-SQL parity with Phase 2).
- Seed runner is `tsx` + `prisma db seed`; model IDs are resolved against the actual target database at seed time (no autoincrement-assumption across environments).
- No silent JSON fallback at runtime; the database catalog is the single runtime source.

### Phase 4: Car Parts CRUD

Immediate goal: manage individual Parts listings within the selected existing vehicle brand/model context.

Scope:

- Reference-data brand and model selection
- Compatibility recording and filtering through the approved `PartCompatibility` junction (authoritative; the retained `Parts.compatibility` column is never written)
- Parts manufacturer `brand` kept distinct from selected vehicle brand
- Exact category and condition dropdowns and filters
- Add, view, edit, and delete operations using every supplied Parts field
- Empty, loading, success, and error states
- Destructive-action confirmation

### Phase 5: Media Upload And EFS-Ready Storage

Immediate goal: implement confirmed Media and `Parts.images` behavior using secure server-side storage.

Scope after relationship approval:

- Multiple images per Car or Parts listing
- Image preview, ordering, primary-image selection, replacement, and deletion
- `UPLOAD_DIR` storage abstraction
- Safe generated or sanitized filenames
- File type and size validation
- Secure media-serving routes
- Failure compensation and orphan cleanup
- No live AWS changes

### Phase 6: Testing, Cleanup And Deployment Documentation

Immediate goal: verify behavior and document safe deployment.

Scope:

- Validation, CRUD, filtering, and media tests
- Responsive and accessibility checks
- Final lint, typecheck, test, and build runs
- Environment-variable documentation
- EFS mounting guidance using the team's confirmed existing access point
- Remaining limitations and operational checks

## Pending Inputs And Decisions

The following remain unresolved until evidence is provided. Type/nullability/defaults for Phase 2 are approved as implementation assumptions (see Phase 2 status) and are revised when the corresponding input arrives:

1. Existing `Parts.images` format and representative values — blocks its final column type and the media phase mapping. (`Parts.compatibility` is no longer a pending input: the approved `PartCompatibility` junction is the authoritative compatibility source and the retained text column is never written.)
2. Existing relationship and ownership behavior between `Parts.images` and `Media` — must be supplied before Phase 5.
3. `Car.status`, `Parts.status`, and vehicle `condition` value sets — needed for form validation/filters in Phases 3 and 4.
4. Existing GAP database and deployment infrastructure, if any — confirms whether migrations are applied to a fresh database or reconciled with existing tables.
5. GAP review of model entries flagged `unknown` in `data/vehicle-catalog.json`.

The vehicle brand/model catalog itself is now supplied and approved. No format or schema assumption may be introduced merely to complete a phase.
