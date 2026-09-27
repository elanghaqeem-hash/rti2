# RTI NIST Cyber Quick Check

## Purpose

RTI NIST Cyber Quick Check is an integrated RTI/Risetin web diagnostic aligned to NIST Cybersecurity Framework (CSF) 2.0. It converts a short self-assessment into an RTI Cyber Readiness Score, function/category posture, evidence confidence, prioritized risk findings, quick wins, an implementation roadmap, relevant RTI solution mappings, an executive report, and consultation/RFQ conversion.

It is an independent RTI diagnostic. It is **not** an official NIST certification, audit, accreditation, endorsement, legal-compliance opinion, or assurance engagement.

## Architecture

The tool is part of the existing Next.js RTI website and uses the same server runtime, admin authentication, centralized parameter registry, lead pipeline, bot protection, rate limiting, brand configuration, and production database path.

Primary components:

- UI: `/tools/cyber-quick-check`
- Public config: `GET /api/nist-assessment/config`
- Start: `POST /api/nist-assessment/start`
- Resume: `GET /api/nist-assessment/session`
- Answer persistence: `POST /api/nist-assessment/:id/answer`
- Completion/scoring: `POST /api/nist-assessment/:id/complete`
- Results: `GET /api/nist-assessment/:id/results`
- Executive advisor: `POST /api/nist-assessment/:id/advisor`
- Executive PDF: `GET /api/nist-assessment/:id/report`
- Admin CMS/API: `/admin/nist` and `/api/admin/nist`
- Database migration: `migrations/0004_nist_cyber_quick_check.sql`

## Framework and versioning

Initial configuration:

- Framework: `NIST-CSF-2.0`
- Questionnaire: `QC-2026.1`
- Scoring model: `SCORE-2026.1`
- Recommendation model: `REC-2026.1`
- Report version: `NIST-CSF-2.0-QC-v1.0`

The seed contains six CSF Functions and 22 CSF 2.0 Categories. Quick Check has 24 active core questions. Subcategory storage is included for Detailed Assessment expansion.

Historical assessments store their framework, questionnaire, scoring, and recommendation versions. Stored result tables are used after completion so changes to live configuration do not silently overwrite historical results.

## Scoring

The readiness score is deterministic and server-side.

Conceptually:

`Question score × Question weight → Category score × Category weight → Function score × Function weight → normalized 0–100 RTI Cyber Readiness Score`

Configured default answer scale:

- Not Implemented: 0
- Ad Hoc: 25
- Defined: 50
- Implemented: 75
- Measured & Improved: 100
- Not Sure: 0 + Verification Required

Evidence status is deliberately separate from the readiness score and contributes to Assessment Confidence:

- Evidence Available
- Partially Available
- No Evidence
- Not Specified

The Indicative CSF Tier is rule-based and considers at least overall readiness, Govern posture, and confidence. It is not a simple linear conversion of the 0–100 score.

## Risk and recommendation engine

Each category gap is translated into:

- current vs target posture;
- status;
- likelihood and impact coordinates;
- explained risk rating;
- prioritized recommendation;
- effort/impact/timeline;
- accountable-owner suggestion;
- expected outcome;
- RTI service mapping only when a configured relationship exists.

Commercial lead scoring remains separate from cybersecurity readiness scoring.

## Security model

The platform assumes assessment data may disclose sensitive organizational weaknesses.

Controls implemented for this tool include:

- server-side persistence;
- opaque UUID assessment identifiers;
- 256-bit random guest capability token;
- only the SHA-256 capability hash is stored;
- HttpOnly, SameSite guest-session cookie;
- Secure cookie in production;
- timing-safe token comparison;
- no assessment findings in query-string URLs;
- protected per-assessment answer/result/report/advisor APIs;
- protected admin API;
- rate limiting;
- Turnstile on assessment creation;
- request-size limits;
- validated input;
- no AI API keys in browser bundles;
- audit logging for start, completion, report generation/download, and admin changes.

The tool inherits the website's HTTPS/reverse-proxy, secure headers, session, monitoring, backup, and production-host hardening requirements.

## Database initialization

Migration `0004_nist_cyber_quick_check.sql` is registered in the existing migration runner.

After deploying code to a production Node server with `RTI_DB_PATH` configured:

1. Sign in at `/admin-access`.
2. Open `/admin/system`.
3. Review pending migrations.
4. Run **Initialize / Apply Pending Migrations**.
5. Confirm `0004_nist_cyber_quick_check.sql` is applied.
6. Confirm `nist_assessments` and `nist_questions` show READY.
7. Open `/admin/nist` to review the active framework, questions, target scores, thresholds, tier rules, service mappings, analytics, and audit trail.

Do not manually seed production assessment rows.

## Required / relevant environment secrets

Use the production server's secret manager. Do not put secrets in the repository or client-side environment variables.

Core platform:

- `RTI_DB_PATH`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RATE_LIMIT_SALT`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

Optional AI providers:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`

Model names can be configured using the corresponding model environment variables in `.env.example`.

The admin parameter group `ai.provider_order` controls primary/fallback order without exposing provider API keys.

## Admin-managed parameters

Central Parameter Manager includes:

- assessment industries;
- organization sizes;
- NIST technology-context choices;
- NIST feature flags;
- AI provider priority/fallback order.

NIST Admin includes:

- Functions and weights;
- 22 Categories and target scores;
- Question Bank;
- answer scale;
- readiness thresholds;
- Indicative CSF Tier rules;
- RTI service mappings;
- recent assessments;
- gap analytics;
- audit logs.

## AI guardrails

RTI Cyber Advisor receives structured assessment results, not authority to recalculate scores. The system prompt explicitly prohibits:

- changing deterministic scores;
- inventing evidence;
- inventing regulatory obligations;
- claiming NIST certification or official NIST assessment;
- declaring legal or compliance assurance from a Quick Check.

If no provider succeeds, the user still receives deterministic results and a deterministic explanatory fallback.

## PDF report

The protected report endpoint creates a PDF containing:

- organization/report metadata;
- RTI Cyber Readiness Score;
- Indicative CSF Tier;
- evidence confidence;
- six Function scores;
- 22 Category results;
- risk findings;
- quick wins;
- roadmap;
- relevant RTI services;
- methodology and limitations.

Each generation is recorded in `nist_generated_reports` with report, framework, questionnaire, and scoring versions.

## Production acceptance

The repository production-readiness workflow is the merge gate. It runs:

- locked dependency installation;
- automated tests;
- lint;
- TypeScript type checking;
- production dependency audit;
- Next.js production build.

Do not mark the feature production-ready unless all gates pass and the production database migration is actually applied.

## Planned Phase 2 / Phase 3 extensions

The current implementation provides the Quick Check foundation and architecture hooks for later expansion. Detailed subcategory-level assessment, full evidence repository/upload lifecycle, industry-specific target-profile datasets, anonymized benchmarking, cross-framework mappings, multi-respondent comparison, corporate account history/trend dashboards, consultant validation workflow, and deeper RFQ integration should be implemented as separate versioned modules rather than silently inferred from Quick Check data.
