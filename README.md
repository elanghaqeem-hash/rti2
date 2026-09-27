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
6. **ISO 27001 Readiness (`/tools/iso27001-readiness`):** Clauses 4–10 & Annex A readiness checklist.
7. **UU PDP Readiness (`/tools/pdp-readiness`):** Data inventory, DPO, DPIA, and incident response readiness.
8. **Admin Lead Dashboard (`/admin/leads`):** Lead scoring, pipeline statuses, and CSV export.
9. **Risetin AI Assistant:** Slide-over assistant connected to `/api/chat`, website knowledge-base grounding, safety guardrails, automatic primary + 4-provider AI failover, and direct WhatsApp / Cal.com handoff.

### Risetin Assistant AI configuration

Configure the provider secrets in the deployment environment, not in client-side code or committed files:

```bash
AI_PROVIDER_ORDER=anthropic,openai,gemini,groq,openrouter

ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
```

Only configured providers are attempted. If the primary provider fails or times out, the server automatically moves to the next configured provider. If all external providers are unavailable, the assistant uses the local website knowledge-base fallback instead of fabricating an AI response.

---

## 5. Security & Verification

To verify brand compliance and legal naming integrity:
```bash
npm test
```


---

## 6. Centralized Parameter Manager

All selectable business field options are managed through a centralized parameter registry.

- Admin UI: `/admin/parameters`
- Public read API: `/api/parameters`
- Admin API: `/api/admin/parameters`
- Persistent store: Cloudflare D1 table `system_parameters`
- Migration: `migrations/0002_system_parameters.sql`
- Admin write protection: server-side secret `RTI_ADMIN_TOKEN`

Built-in identifiers used by scoring or routing are immutable. Admins can change labels,
descriptions, ordering, active/inactive status, and add options to non-logic-bound groups.
When RTI_DB is unavailable, public forms retain safe catalog defaults; admin writes fail closed.
