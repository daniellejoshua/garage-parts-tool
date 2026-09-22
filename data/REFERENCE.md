# Vehicle Brand / Model Reference Data

The GAP Marketplace Admin navigation uses a shared vehicle brand/model
catalog for **both** the Cars and Car Parts modules.

## Location and loading

- The catalog is a single read-only reference file: `data/vehicle-catalog.json`.
- The loader (`src/lib/reference/loader.ts`) reads JSON only and resolves the
  file strictly inside the project `data/` directory.
- Override the file name with the `VEHICLE_REFERENCE_PATH` environment variable
  (for example `VEHICLE_REFERENCE_PATH=vehicle-catalog.json`). The value is
  resolved inside `data/` only; absolute paths and `..` are rejected.

If the file is missing or unreadable the pages show an explanatory empty state
instead of crashing.

## Expected format

The catalog is a JSON object with `catalog_meta` (informational, not parsed)
and a `regions` array. Brands are grouped by approved region: American,
European, and Japanese.

```json
{
  "catalog_meta": {
    "name": "GAP Marketplace Vehicle Brand/Model Catalog",
    "research_date": "YYYY-MM-DD"
  },
  "regions": [
    {
      "region": "American",
      "brands": [
        {
          "name": "Buick",
          "models": [
            { "name": "Enclave", "production_status": "current" },
            { "name": "LeSabre", "production_status": "discontinued" }
          ]
        }
      ]
    }
  ]
}
```

Rules enforced by the loader:

- `regions` must be an array; each entry needs a `region` string and a `brands`
  array.
- Each brand needs a non-empty `name` and a `models` array.
- Each model needs a non-empty `name` and a `production_status` of exactly
  `current`, `discontinued`, or `unknown`. Any other value makes the whole file
  invalid.
- Names are trimmed and consecutive whitespace collapsed. Duplicate brands are
  dropped (first spelling wins).

`production_status` is catalog metadata only. It drives UI ordering and status
badges; it is never added to the Car or Parts entity.

## Navigation and slugs

Route segments use slugs derived from names (lowercased, non-alphanumeric
characters collapsed to `-`). If two names produce the same slug, the first one
wins and the rest are unreachable through navigation. Brand/model names shown in
the UI keep their original spelling from the catalog file.

## Review status

Models flagged `unknown` are marked for GAP review. They remain selectable and
may host listings; they appear after current models and carry a "Needs review"
badge.