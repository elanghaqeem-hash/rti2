# RTI — UU PDP Data Protection Readiness

## 1. Purpose

This module turns the former static UU PDP checklist into an integrated, database-driven Privacy Diagnostic & Advisory Conversion Platform inside the RTI website.

Primary route:

- Public tool: `/tools/pdp-readiness`
- Admin CMS: `/admin/pdp-readiness`

Baseline regulatory pack: **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi**.

The platform is a diagnostic readiness indicator. It is not a certification, legal opinion, or audit opinion.

## 2. Architecture

```text
RTI Website
  |
  +-- /tools/pdp-readiness
  |     |
  |     +-- Profile & applicability
  |     +-- Quick / Comprehensive smart questionnaire
  |     +-- Evidence confidence
  |     +-- Save / resume
  |     +-- Weighted scoring
  |     +-- Critical red flags
  |     +-- DPIA screening
  |     +-- DPO screening
  |     +-- Risk register
  |     +-- Executive dashboard
  |     +-- AI Privacy Advisor
  |     +-- PDF / JSON export
  |     +-- RTI advisory conversion
  |
  +-- /api/tools/pdp-readiness/*
  |     +-- config
  |     +-- assessment
  |     +-- score
  |     +-- evidence
  |     +-- ai
  |     +-- report
  |     +-- export
  |
  +-- /admin/pdp-readiness
        |
        +-- Questions
        +-- Domains
        +-- Regulations
        +-- Industry packs
        +-- Scoring parameters
        +-- Maturity levels
        +-- Evidence types
        +-- AI prompts
        +-- Report templates
```

Runtime data is persisted through the existing RTI server database abstraction in `lib/server/database.ts`.

## 3. User Journey

```text
RTI Tools Hub
  -> UU PDP Data Protection Readiness
  -> Select Quick / Comprehensive
  -> Organization Profile
  -> Conditional Question Set
  -> Evidence / Confidence
  -> Save / Resume
  -> Automated Scoring
  -> Executive Dashboard
  -> DPIA & DPO Screening
  -> Gap / Risk / Roadmap
  -> AI Executive Analysis
  -> Download PDF / Export JSON
  -> Request RTI Consultation
```

## 4. Assessment Methodology

### Quick Readiness

The initial seed contains 30 high-level controls across the 20 domains. Quick mode is designed for a 6–10 minute initial diagnostic.

### Comprehensive

The initial seed contains 100 controls: five controls for each of the 20 domains. The architecture supports adding further controls through the Admin CMS without frontend code changes.

### Domains

1. Privacy Governance & Accountability
2. Data Inventory & Data Mapping
3. Record of Processing Activities / RoPA
4. Lawful Basis & Purpose Limitation
5. Consent Management
6. Data Subject Rights
7. Privacy Notice & Transparency
8. Data Retention & Secure Disposal
9. Data Protection Impact Assessment / DPIA
10. DPO / Privacy Function
11. Processor & Third-Party Management
12. Information Security for Personal Data
13. Personal Data Breach Management
14. Cross-Border Data Transfer
15. Privacy by Design & Privacy by Default
16. Employee & HR Privacy
17. Marketing, Cookies & Digital Tracking
18. Children & Vulnerable Data Subjects
19. Training & Awareness
20. Audit, Assurance & Continuous Monitoring

Conditional examples:

- Cross-border controls are activated when international transfer is declared.
- Children controls are activated when children data is declared.
- HR controls are activated when employee data is processed.
- Marketing/tracking controls are activated when cookies/tracking or marketing database use is declared.

## 5. Scoring

Primary formula:

```text
weighted contribution =
domain weight
x control weight
x control criticality factor
x answer score
x confidence factor
x evidence factor
```

The overall readiness score is normalized to 0–100.

Scoring values, criticality factors, risk thresholds, maturity ranges, and related settings are stored in database tables and can be maintained by an authenticated RTI Admin.

A defensive source fallback exists so the application can fail predictably if configuration data becomes invalid, but the operational configuration is database-driven.

### Evidence Confidence

The score separately reports evidence confidence so a high self-declared maturity cannot be represented as equivalent to independently evidenced operation.

### N/A Handling

Questions are first filtered by applicability rules. A user-selected N/A is not silently excluded from scoring; it is flagged for validation. This prevents inappropriate N/A answers from inflating readiness.

## 6. Maturity

Default seeded model:

| Level | Label | Default score range |
|---|---|---:|
| 0 | Not Established | 0–<20 |
| 1 | Initial | 20–<40 |
| 2 | Developing | 40–<60 |
| 3 | Defined | 60–<75 |
| 4 | Managed | 75–<90 |
| 5 | Optimized | 90–100 |

These thresholds and labels are stored in `pdp_maturity_levels`.

Level 5 does not mean certified compliant.

## 7. Database

Migration: `migrations/0003_pdp_readiness.sql`

Core entities:

- organizations
- pdp_regulations
- pdp_regulation_articles
- pdp_domains
- pdp_question_sets
- pdp_questions
- pdp_answer_options
- pdp_industry_packs
- pdp_assessments
- pdp_responses
- pdp_evidences
- pdp_risk_findings
- pdp_recommendations
- pdp_roadmap_items
- pdp_service_mappings
- pdp_scoring_parameters
- pdp_maturity_levels
- pdp_evidence_types
- pdp_ai_prompts
- pdp_report_templates
- pdp_report_versions
- pdp_audit_logs

The migration is registered in the existing RTI migration mechanism and therefore is applied through the protected system setup flow rather than an unauthenticated endpoint.

## 8. API Design

### GET `/api/tools/pdp-readiness/config`

Returns active database-backed configuration required by the public assessment UI.

### POST `/api/tools/pdp-readiness/assessment`

Creates a new guest assessment and returns an opaque resume token.

Only a SHA-256 hash of the resume token is stored in the database.

### GET `/api/tools/pdp-readiness/assessment?id=...`

Resumes an assessment when the corresponding bearer resume token is supplied.

### PUT `/api/tools/pdp-readiness/assessment`

Persists response progress.

### DELETE `/api/tools/pdp-readiness/assessment`

Deletes an assessment and dependent database records. When private evidence storage is configured, the assessment evidence directory is removed as well.

### POST `/api/tools/pdp-readiness/score`

Calculates and persists readiness, maturity, evidence confidence, findings, top risks, screening, roadmap, and service mapping.

### POST `/api/tools/pdp-readiness/evidence`

Accepts evidence only for a valid assessment/resume token.

Security controls include:

- database-managed extension/MIME allowlist
- file signature validation
- size limits
- private server directory
- randomized stored filenames
- SHA-256 checksum
- malware scanning gate
- no public evidence URL
- audit metadata

### POST `/api/tools/pdp-readiness/ai`

Creates a grounded executive analysis using the existing RTI multi-provider AI failover.

The system prompt prevents final compliance declarations and prohibits invented regulation/article references.

### GET `/api/tools/pdp-readiness/report?id=...`

Generates an authenticated executive PDF and records report version plus checksum.

### GET `/api/tools/pdp-readiness/export?id=...`

Exports safe structured JSON without the resume token, evidence bytes, storage paths, or internal security metadata.

### `/api/admin/pdp-readiness`

Protected by the existing signed RTI Admin session.

- GET: catalog
- POST: create supported configuration records
- PUT: update
- DELETE: soft deactivate/version-safe removal

## 9. Evidence Security

Production requirements:

```env
PDP_EVIDENCE_DIR=/var/lib/risetin/pdp-evidence
PDP_EVIDENCE_MAX_BYTES=10485760
PDP_CLAMSCAN_COMMAND=/usr/bin/clamscan
PDP_REQUIRE_MALWARE_SCAN=true
```

The evidence directory must not be inside `public/`.

Do not allow the application process to serve evidence directly as static content.

Production defaults to fail closed when malware scanning is required but unavailable.

## 10. API Protection

PDP public APIs use the existing RTI rate limiting helper.

In production, configure:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RATE_LIMIT_SALT=
```

Without the rate-limit backend, the existing RTI production helper fails closed.

Admin CRUD uses the existing signed admin session:

```env
ADMIN_USERNAME=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

## 11. AI Architecture

The platform reuses `lib/ai/provider-router.ts` and therefore can fail over across configured providers.

The PDP module sends only structured assessment context to the AI route. Evidence file bytes are not sent.

The output contract distinguishes:

- FACT
- ASSESSMENT RESULT
- AI ANALYSIS
- RECOMMENDATION
- REQUIRES HUMAN VALIDATION

The admin-managed analysis instruction is stored in `pdp_ai_prompts`. Non-negotiable anti-hallucination and no-final-legal-opinion guardrails remain server-side.

## 12. Executive Dashboard

The current implementation includes:

- overall readiness
- maturity
- evidence confidence
- completion
- radar visualization
- domain heatmap
- RoPA readiness
- DSAR readiness
- breach readiness
- cross-border readiness
- third-party readiness
- security readiness
- privacy-by-design readiness
- assurance readiness
- critical findings
- DPIA screening
- DPO screening
- data-flow visualization
- prioritized roadmap
- service recommendations
- AI executive analysis
- PDF and JSON export

## 13. Executive PDF Structure

The generated report contains:

- confidentiality notice
- executive summary
- organization profile
- scope/methodology
- overall readiness/maturity
- domain results
- key gaps/critical findings
- DPIA screening
- DPO screening
- top privacy risks
- roadmap
- RTI advisory opportunities
- disclaimer

The database contains a versioned report-template configuration so later layout/section revisions can be governed without changing historical assessments.

## 14. Privacy Controls for the Tool

Implemented:

- data minimization notice
- no need for NIK/customer database/passwords
- guest opaque resume token
- assessment-specific access isolation
- evidence is private and not publicly addressable
- safe assessment JSON export
- assessment deletion
- audit log
- report version/checksum
- evidence upload safeguards

## 15. Admin CMS

Route: `/admin/pdp-readiness`

Admin can manage:

- question text and metadata
- quick/comprehensive inclusion
- control weight/criticality
- applicability JSON
- domains and domain weights
- regulation records
- industry packs
- scoring parameters
- maturity thresholds
- evidence types
- AI analysis prompt
- report-template configuration

Global field-option parameters continue to use `/admin/parameters`.

## 16. Deployment

1. Deploy the code only after CI passes.
2. Configure required environment variables.
3. Ensure the RTI DB path is persistent and backed up.
4. Ensure the evidence directory is private, persistent, writable by the application user, and excluded from the web root.
5. Install/configure ClamAV or an equivalent malware scanner and set `PDP_CLAMSCAN_COMMAND`.
6. Configure the production rate-limit backend.
7. Through authenticated RTI Admin, run the existing protected migration/setup operation. Confirm `0003_pdp_readiness.sql` is applied.
8. Open `/admin/pdp-readiness` and review the active baseline question/regulation/scoring configuration.
9. Run Quick and Comprehensive UAT.
10. Verify PDF generation, export, delete, evidence rejection/acceptance, and tenant token isolation.
11. Only then promote the branch/PR to production.

## 17. UAT / Acceptance Matrix

| Control | Expected result |
|---|---|
| Quick mode | Database returns ~30 baseline questions, filtered by profile |
| Comprehensive | Database returns up to 100 seeded controls before applicability filtering |
| Branching | XFER/CHILD/HR/MKT questions only appear when applicable |
| Save/resume | Correct token resumes; wrong token returns not found |
| Scoring | Weighted score and maturity generated from DB configuration |
| Critical finding | Critical gap remains visible independently of overall score |
| DPIA | Profile triggers produce one of the defined screening statuses |
| DPO | Profile triggers produce one of the defined screening statuses |
| Evidence | Invalid extension/MIME/magic is rejected |
| Malware scan | Production fails closed when required scanner is unavailable |
| PDF | Valid authenticated assessment downloads an executive PDF |
| Export | Safe JSON excludes token and evidence bytes |
| Delete | Assessment rows cascade and evidence directory is removed |
| Admin | Unauthenticated request is rejected |
| Admin update | Active configuration changes are returned by config/scoring engine |
| Rate limit | Public compute/upload/report APIs enforce protection |
| Mobile | No horizontal overflow at supported mobile breakpoints |

## 18. Current Scope Boundary

This implementation fully supports **guest self-assessment isolation** plus the existing **RTI System Administrator** session.

A separate registered-organization identity lifecycle (self-registration, organization membership invitation, Organization Admin, Organization User, and RTI Consultant login/SSO) should be integrated with RTI's final production identity provider before those roles are enabled. The PDP data model is intentionally separated so that this can be added without changing the assessment engine.

Do not represent registered multi-user tenant RBAC as complete until that identity integration is implemented and end-to-end tested.
