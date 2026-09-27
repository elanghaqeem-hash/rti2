# RTI Production Security Checklist

## Before go-live

- DNS points only to the approved production origin.
- Server OS and Docker are fully patched.
- SSH uses administrative accounts and key-based authentication.
- Root remote login is disabled where operationally possible.
- Only ports 22, 80, and 443 are exposed.
- .env.production is mode 600 and is not committed.
- ADMIN_PASSWORD is unique and strong.
- ADMIN_SESSION_SECRET and RATE_LIMIT_SALT are independently random.
- At least one tested database backup exists before application upgrades.
- All npm tests and the production build pass.
- High-severity production dependency audit findings are resolved or formally
  accepted with documented compensating controls.

## After go-live

- Verify TLS, redirects, security headers, and health endpoint.
- Verify Admin migration status.
- Verify forms persist real submissions to SQLite.
- Verify no fake/sample data is visible.
- Verify AI providers are only those explicitly configured.
- Monitor repeated authentication failures and unusual request spikes.
- Review backups and copy them off-server.

## Secrets that stay server-side

- ADMIN_PASSWORD
- ADMIN_SESSION_SECRET
- RATE_LIMIT_SALT
- AI provider API keys
- TURNSTILE_SECRET_KEY
- RESEND_API_KEY
- CAL_API_KEY
- UPSTASH_REDIS_REST_TOKEN

Public browser variables are limited to values intentionally prefixed with
NEXT_PUBLIC_, such as NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_TURNSTILE_SITE_KEY.
