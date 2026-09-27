# Risetin | PT Riset Teknologi Indonesia

> **Technology That Moves Business Forward**  
> End-to-end enterprise technology partner: Strategy, Software Engineering, Technology Operations, Enterprise GRC, Cybersecurity, and Workforce Capability Development.

---

## 1. Identity & Legal Compliance

| Usage | Name |
|---|---|
| Modern Brand / Marketing / UI | **Risetin** |
| Acronym / Visual Mark | **RTI** |
| Legal Corporate Name | **PT Riset Teknologi Indonesia** |

> [!IMPORTANT]
> Any alteration replacing "Indonesia" with "Informasi" in the legal corporate name is strictly prohibited. Automated unit tests enforce this rule in CI (`npm test`).

### Official Contact
- **Headquarters:** Graha Mustika Ratu, 7th Floor, Jl. Jend. Gatot Subroto Kav. 74-75, Menteng Dalam, Tebet, South Jakarta, DKI Jakarta 12870
- **WhatsApp:** [+62 856-6872-2734](https://wa.me/6285668722734)
- **Email:** `admin@risetin.co.id`
- **Website:** `https://risetin.co.id`

---

## 2. Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript (Strict)
- **Styling:** Tailwind CSS + Custom Design Tokens (`--navy-900`, `--gold-500`, `--gold-grad`, etc.)
- **Icons & Motion:** Lucide React + Framer Motion (respects `prefers-reduced-motion`)
- **AI Assistant:** Website-grounded API route with automatic multi-provider failover: Anthropic primary, then OpenAI, Gemini, Groq, and OpenRouter, with local deterministic RAG as the final continuity fallback
- **Privacy & Compliance:** Granular cookie consent & explicit opt-in forms compliant with **UU No. 27/2022 (UU PDP)**
- **Security:** OWASP ASVS-aligned security headers, anti-SSRF protection on diagnostic tools, RFC 9116 `security.txt`

---

## 3. Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run unit and brand compliance tests
npm test

# 3. Start local development server
npm run dev

# 4. Open in browser
http://localhost:3000
```

---

## 4. Key Interactive Modules & Diagnostic Engines

1. **Technology & Cyber Maturity Self-Assessment (`/assessment`):** 20-domain diagnostic with 20-question Quick Assessment, 120-question Comprehensive Assessment, server-verified scoring, evidence confidence, gap analysis, risk exposure, roadmap, and print-ready executive report. The legacy `/tools/maturity-assessment` route redirects here.
2. **Cyber Quick Check (`/tools/cyber-quick-check`):** NIST CSF 2.0 evaluation with wheel scores and quick-win remediations.
3. **Passive Security Headers Check (`/tools/security-headers-check`):** Passive HTTP header evaluation with strict DNS resolution & anti-SSRF protections.
4. **Enterprise Solution Finder (`/tools/solution-finder`):** 4-step wizard matching sector challenges to service blueprints.
5. **Project Estimator & RFQ Builder (`/tools/project-estimator`):** Effort sizing for software builds and VAPT penetration testing scopes.
6. **ISO/IEC 27001 Readiness (`/tools/iso-27001-readiness`):** Versioned ISO/IEC 27001:2022 + Amd 1:2024 diagnostic with 39-question Quick Scan, Detailed Assessment, 93 Annex A control references, evidence maturity, deterministic scoring, readiness gates, Stage 1/2 preparation indicators, gap register, remediation roadmap, Draft SoA/Risk Assistants, optional consent-gated AI evidence advisory, and PDF reporting. Legacy `/tools/iso27001-readiness` redirects to the canonical route.
7. **UU PDP Readiness (`/tools/pdp-readiness`):** Data inventory, DPO, DPIA, and incident response readiness.
8. **Admin Lead Dashboard (`/admin/leads`):** Lead scoring, pipeline statuses, and CSV export.
9. **Risetin AI Assistant:** Slide-over assistant connected to `/api/chat`, website knowledge-base grounding, safety guardrails, automatic primary + 4-provider AI failover, and direct WhatsApp / Cal.com handoff.

### Risetin Assistant AI configuration

Configure the provider secrets in the deployment environment, not in client-side code or committed files:

```bash
AI_PROVIDER_ORDER=anthropic,openai,gemini,groq,openrouter,deepseek

ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
DEEPSEEK_API_KEY=...
```

Only configured providers are attempted. If the primary provider fails or times out, the server automatically moves to the next configured provider. If all external providers are unavailable, the assistant uses the local website knowledge-base fallback instead of fabricating an AI response.

---

## 5. Security & Verification

To verify brand compliance and legal naming integrity:
```bash
npm test
```


---

## 6. Production Server & Admin Control

RTI production targets a standard Node.js server. Cloudflare is optional for DNS,
proxy/WAF, Turnstile, or staging, but is not the production application runtime.

Required production server environment:

```bash
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...
RTI_DB_PATH=/var/lib/risetin/rti.sqlite
RTI_UPLOAD_DIR=/var/lib/risetin/evidence
RATE_LIMIT_SALT=...
```

Admin access starts at `/admin-access`. A successful login creates an HttpOnly,
SameSite=Strict signed session cookie. Protected pages under `/admin/*` require
the admin session.

Database initialization is deliberately **not automatic during deploy**. An
authenticated Admin opens `/admin/system` and explicitly runs
**Initialize / Apply Pending Migrations**. The process applies:

- `migrations/0001_leads.sql`
- `migrations/0002_system_parameters.sql`
- `migrations/0003_iso27001_readiness.sql`
- `migrations/0004_iso27001_rules.sql`
- `migrations/0005_iso27001_evidence_rules.sql`
- `migrations/0006_iso27001_adaptive_questions.sql`
- `migrations/0007_iso27001_stage_indicators.sql`
- `migrations/0008_iso27001_persisted_dimensions.sql`
- `migrations/0009_iso27001_applicability_parameters.sql`

The migration ledger prevents already-applied migrations from being run again.

### Centralized Parameter Manager

- Admin UI: `/admin/parameters`
- Public read API: `/api/parameters`
- Admin API: `/api/admin/parameters`
- Persistent table: `system_parameters`
- Admin authorization: signed server-side admin session
- Browser-side `RTI_ADMIN_TOKEN`: removed

Built-in identifiers used by scoring or routing remain immutable. Admin users can
change labels, descriptions, ordering, active/inactive status, and add options to
non-logic-bound groups.

If the parameter database has not been initialized, public forms retain their safe
catalog defaults. Admin write operations fail closed until the database migration
has been applied.

### Cloudflare

`.github/workflows/cloudflare-bootstrap.yml` is manual-only and retained as an
optional staging placeholder. Do not store RTI production database or admin
credentials in Cloudflare unless Cloudflare becomes the production runtime again.


### ISO/IEC 27001 Readiness production notes

- Admin CMS: `/admin/diagnostics/iso-27001`
- The published assessment framework is immutable. Clone it to a Draft, edit/review, then publish; historical assessments stay pinned to their original `version_id`.
- `RTI_UPLOAD_DIR` must be a private, writable server directory outside the public web root. Evidence is never exposed as a public static URL.
- Public assessment creation, evidence upload, and AI-advisory routes use the server rate-limit layer. Configure the production rate-limit backend before enabling public traffic.
- AI analysis is optional, requires explicit assessment-level consent, and returns suggestions for user review. It never changes deterministic readiness scoring.
- Direct text extraction currently supports TXT evidence. PDF/Office/image files are stored and tracked as evidence, but binary content requires a dedicated document parser or approved provider integration before AI can inspect file contents.
- The system stores no API keys in the browser or SQLite diagnostic configuration. Provider keys remain environment/server secrets.
