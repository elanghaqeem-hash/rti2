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

1. **Maturity Self-Assessment (`/tools/maturity-assessment`):** 10-domain diagnostic with current vs. target radar charts and gap analysis.
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

## 6. Super Admin Control Center

The protected control plane is available at `/admin` and manages:

- Website CMS fields used by the homepage hero and public contact/footer.
- AI provider priority, model selection, enable/disable state, and API keys.
- SMTP server configuration and sender identity.
- Link to the existing operational lead dashboard at `/admin/leads`.

All `/admin/*` and `/api/admin/*` routes are protected by a signed HttpOnly session cookie. The public login endpoint is `/admin/login`.

### Bootstrap the administrator

Configure these values as deployment secrets, not source-code variables:

```bash
ADMIN_EMAIL=admin@risetin.co.id
ADMIN_PASSWORD=<strong-unique-password>
ADMIN_SESSION_SECRET=<long-random-secret>
ADMIN_SETTINGS_ENCRYPTION_KEY=<separate-long-random-secret>
```

### Enable persistent CMS/API/SMTP settings

Create a dedicated Cloudflare KV namespace and configure:

```bash
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_KV_NAMESPACE_ID=...
CLOUDFLARE_KV_API_TOKEN=...
```

The application encrypts the complete control-plane settings payload with AES-GCM before writing it to KV. Stored API keys and SMTP passwords are never returned to the browser; the UI only receives a boolean indicating whether each secret is configured.

If KV is not configured, the website continues using the existing environment-based defaults, but the Save button remains disabled to avoid pretending that configuration changes are persistent.

### SMTP baseline

The control plane stores the following runtime SMTP settings securely:

```bash
SMTP_ENABLED=false
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_NAME=Risetin
SMTP_FROM_EMAIL=admin@risetin.co.id
SMTP_REPLY_TO=admin@risetin.co.id
```

The current admin validation checks that the SMTP configuration is complete. An actual outbound test email should only be enabled after the selected Cloudflare runtime/SMTP relay is confirmed to support the required network transport.
