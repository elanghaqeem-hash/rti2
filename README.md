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
- **AI Assistant:** Anthropic Claude API route with local deterministic RAG fallback
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
9. **Risetin AI Assistant:** Slide-over assistant with safety guardrails and direct WhatsApp / Cal.com handoff.

---

## 5. Security & Verification

To verify brand compliance and legal naming integrity:
```bash
npm test
```
