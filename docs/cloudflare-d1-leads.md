# RTI Production Lead Database — Cloudflare D1

This project uses a Cloudflare D1 binding named `RTI_DB` for production lead persistence.

The application **fails closed** when the binding is absent or the schema has not been migrated. It never falls back to in-memory, localStorage, sample, or dummy operational data.

## 1. Create the database

Run this from an authenticated Cloudflare Wrangler environment:

```bash
npx wrangler@4.141.0 d1 create rti-production
```

Cloudflare returns a database UUID. Do not invent or commit a fake UUID.

## 2. Add the production binding

Add the returned UUID to `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "RTI_DB",
    "database_name": "rti-production",
    "database_id": "<REAL_DATABASE_UUID>"
  }
]
```

The binding name must remain exactly `RTI_DB`.

## 3. Apply the migration

```bash
npx wrangler@4.141.0 d1 execute rti-production --remote --file=migrations/0001_leads.sql
```

The migration creates only the schema and indexes. It inserts no sample rows.

## 4. Configure required production security

Before public lead submission is enabled, configure these Worker secrets/variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RATE_LIMIT_SALT`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

AI provider keys are required only for external AI providers that are enabled.

## 5. Verification

After deployment:

1. Open `/admin/leads` without credentials and confirm it returns an authentication challenge.
2. Submit one real test inquiry through `/contact` after completing Turnstile.
3. Confirm the POST response is HTTP 201 and reports `database.connected=true`.
4. Authenticate to `/admin/leads` and confirm only the test record appears.
5. Export CSV and verify formula-like user input is neutralized.
6. Delete the test record through an approved operational process when testing is complete.
7. Confirm that removing the D1 binding causes lead endpoints to fail closed with HTTP 503.

## Data minimisation

The lead table stores only the submitted business contact fields, lead score/status, and consent metadata required by the current workflow. Client IP addresses are not stored in the lead database.
