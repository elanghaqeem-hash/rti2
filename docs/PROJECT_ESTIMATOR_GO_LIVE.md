# RTI Project Estimator & RFQ Builder — Go-Live Readiness

Status: **PRE-GO-LIVE / KALIBRASI RTI**

This document is the operational gate for the Project Estimator & RFQ Builder. A successful application build is not, by itself, authorization to publish commercial pricing or production AI document processing.

## 1. Mandatory migrations

Apply all migrations in order through the protected RTI system setup flow:

- 0005_project_estimator_rfq.sql
- 0006_project_estimator_ai_scoping.sql
- 0007_project_estimator_copilot.sql
- 0008_project_estimator_studio_quotation.sql

Verify the protected admin migration status reports no pending estimator migrations before enabling the public widget.

## 2. Required runtime configuration

Core application:
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `RATE_LIMIT_SALT`
- `NEXT_PUBLIC_SITE_URL=https://risetin.co.id`

Cloudflare:
- D1 binding: `RTI_DB`
- Private R2 binding: `RTI_FILES`
- Do not store D1/R2 resource credentials in source code.
- Production document upload fails closed when private storage or malware scanning is unavailable.

AI Scoping Copilot:
- `ANTHROPIC_API_KEY`
- `AI_MODEL_PRIMARY`
- `AI_MODEL_FAST`
- `RTI_ALLOW_BINARY_AI_EXTRACTION=false` by default.
- Enable binary PDF/image extraction only after RTI privacy/security review. Text extracted locally from supported text/Office files is redacted before structured AI mapping.

Document security:
- `RTI_FILE_UPLOADS_ENABLED=true` only after controls below are ready.
- `RTI_FILE_UPLOAD_MAX_BYTES`
- `RTI_MALWARE_SCAN_URL`
- `RTI_MALWARE_SCAN_TOKEN` if required by the scanner.

Public form protection:
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Outbound email:
- Configure the supported production mail provider and verified RTI sender identity before enabling automatic RFQ/quotation delivery.

## 3. Open management decisions — MUST close before commercial go-live

### K-1 — Rate card & margin RTI
Approve:
- internal cost per role / MD;
- floor margin;
- minimum margin alert;
- market adjustment;
- client segment multipliers;
- rush factor;
- third-party/pass-through treatment.

The policy remains a draft until an authorized administrator types the exact activation phrase in **Admin → Project Estimator → Policy Simulation**. Always run the 20-session impact simulation first.

### K-2 — Visual identity
Confirm final:
- navy/gold brand tokens;
- official logo assets;
- primary typeface.

### K-3 — Document numbering
Confirm:
- `RTI-RFQ/{MM}/{YYYY}/{seq}`
- `RTI-QUO/{MM}/{YYYY}/{seq}`

### K-4 — Public price display
Choose exactly one production mode:
- range;
- “starting from”;
- hidden.

Do not show a fabricated range while the RTI rate card remains unapproved.

### K-5 — Launch catalog
Confirm whether all 15 service codes launch together or in waves:
`SWDEV-WEB`, `SWDEV-MOB`, `SWDEV-API`, `SWDEV-AI`, `SUPPORT`,
`VAPT-WEB`, `VAPT-MOB`, `VAPT-API`, `VAPT-NET`, `CODEREV`,
`GOV-ISO`, `GOV-PDP`, `GOV-AUDIT`, `ADVISORY`, `TRAIN`.

### K-6 — Warranty / retest
Approve:
- SWDEV bug warranty duration;
- VAPT free retest window and scope;
- exceptions requiring a new engagement.

### K-7 — Hosting
Confirm the authoritative production topology:
- Cloudflare/OpenNext + D1/R2;
- standard Node server;
- hybrid.

The current repository supports Node SQLite and Cloudflare D1 for the operational application database. A migration to PostgreSQL/Redis/BullMQ is a separate architecture change and must not be implied as complete unless deployed and tested.

### K-8 — Training partner economics
Approve the configurable partner/revenue-sharing treatment in internal BoQ. Do not expose partner economics to public/client serializers.

## 4. Production acceptance checklist

Before deployment:
- `npm ci`
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm audit --omit=dev --audit-level=high`
- `npm run build`

Estimator-specific verification:
- deterministic golden tests pass;
- ≥30 synthetic AI-eval scenarios pass offline guardrail tests;
- public serializer never exposes internal cost/Floor/margin/benchmarks;
- Studio routes require signed internal session;
- portal access requires capability token;
- quotation PDF is unavailable to unauthorized users;
- prompt injection in documents raises a flag;
- binary document AI processing is opt-in;
- malware scanning fails closed in production;
- R2/private storage is configured;
- embed CSP allows only Risetin-controlled origins;
- 90-day abandoned public-session retention job is executed on schedule;
- policy simulation reviewed before policy activation.

## 5. Data protection and retention

- Public scoping/contact data is stored only as required for RFQ qualification and follow-up.
- Avoid passwords, credentials, NIK, account numbers and unnecessary sensitive personal data.
- Sensitive numeric identifiers and email patterns are redacted before text-model structured mapping.
- Public draft sessions that remain uncontinued for 90 days are eligible for anonymization.
- The protected retention action clears answers, Copilot conversation, provenance, document metadata, capability token and direct contact identifiers; stored private document objects are removed when storage is reachable.
- Schedule the retention action in the production operations platform. Do not rely on manual execution as the long-term operating model.

## 6. Deployment verification

After production deployment:
1. Load `/estimator` at 360px, tablet and desktop widths.
2. Test all service tabs and Quick Estimate parameter sets.
3. Create a synthetic session and verify deterministic estimate output.
4. Run Copilot with a synthetic scope and verify no model-created price/MD/week number is accepted.
5. Upload synthetic DOCX/XLSX and a prompt-injection test document.
6. Verify Risk Flags and provenance in Studio.
7. Complete BoQ A–E using approved test policy values.
8. Create quotation, verify required approval level, approve, mark sent and download PDF.
9. Open the client portal with its capability link and confirm internal commercial fields are absent.
10. Test iframe embedding only from approved Risetin origins.
11. Confirm logs contain no secrets or raw credentials.
12. Record the production commit SHA and policy version in the release record.

## 7. Release rule

Commercial go-live is permitted only after:
- technical CI/build is green;
- database migrations are applied;
- security/storage controls are operational;
- K-1 through K-8 are explicitly decided;
- the intended pricing policy version is approved and activated;
- a synthetic end-to-end production smoke test passes.

Until then, the public estimator may remain in indicative/non-commercial mode with **KALIBRASI RTI** safeguards.
