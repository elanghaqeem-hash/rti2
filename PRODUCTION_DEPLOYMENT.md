# RTI / Risetin - Production Deployment Guide

Target domain: https://risetin.co.id

This bundle is designed for a standard Linux production server. The primary
deployment method is Docker Compose with Caddy for automatic HTTPS. Cloudflare
may still be used for DNS, proxy, WAF, and Turnstile, but it is not required as
the application runtime.

## 1. Recommended server baseline

- Ubuntu 22.04 LTS or 24.04 LTS, 64-bit
- 2 vCPU minimum; 4 vCPU recommended
- 4 GB RAM minimum; 8 GB recommended when traffic and AI integrations grow
- 30 GB SSD minimum plus external/off-server backup capacity
- Public IPv4 address
- TCP 22, 80, and 443 reachable
- Docker Engine and Docker Compose v2

Set the server timezone when desired:

    sudo timedatectl set-timezone Asia/Jakarta

## 2. DNS before deployment

Create DNS records so the domain points to the production server:

- A record: risetin.co.id -> SERVER_PUBLIC_IPV4
- CNAME: www -> risetin.co.id

If Cloudflare DNS is used, DNS-only mode is the simplest initial setup while
Caddy obtains the first TLS certificate. Proxy/WAF can be enabled afterward.

## 3. Place the bundle on the server

Recommended location:

    sudo mkdir -p /opt/risetin
    sudo chown "$USER":"$USER" /opt/risetin

Extract the ZIP into /opt/risetin and enter the application directory.

## 4. Configure secrets

Create the production environment:

    cp .env.production.example .env.production
    chmod 600 .env.production

Generate strong random secrets:

    openssl rand -hex 32
    openssl rand -hex 32

Use separate generated values for ADMIN_SESSION_SECRET and RATE_LIMIT_SALT.

Fill at least:

- ADMIN_USERNAME
- ADMIN_PASSWORD
- ADMIN_SESSION_SECRET
- RATE_LIMIT_SALT

Keep:

    NEXT_PUBLIC_SITE_URL=https://risetin.co.id
    RTI_DB_PATH=/var/lib/risetin/rti.sqlite

Configure at least one AI API key only when external AI is required. Never put
production secrets in Git, screenshots, tickets, or public documentation.

## 5. Install Docker on Ubuntu

Use Docker's official installation method for the selected Ubuntu release.
After installation, verify:

    docker --version
    docker compose version

## 6. Firewall

Example UFW baseline:

    sudo ufw allow OpenSSH
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw enable
    sudo ufw status

Do not expose application port 3000 directly to the internet. In this bundle,
only Caddy publishes ports 80 and 443.

## 7. Deploy

Make the operational scripts executable:

    chmod +x scripts/*.sh

Run:

    ./scripts/deploy-production.sh

Then inspect:

    docker compose -f docker-compose.production.yml ps
    docker compose -f docker-compose.production.yml logs --tail=200 app
    docker compose -f docker-compose.production.yml logs --tail=200 caddy

Health endpoint:

    https://risetin.co.id/api/health

## 8. First-time database initialization

The live database path is persistent and server-side. The application uses:

    /var/lib/risetin/rti.sqlite

First log in at:

    https://risetin.co.id/admin-access

Then open:

    https://risetin.co.id/admin/system

Apply pending migrations from the authenticated Admin screen. The expected
migration files are:

- 0001_leads.sql
- 0002_system_parameters.sql

No fake/sample lead records are inserted by these migrations.

A clean schema-only template is also included at:

    database/rti.sqlite.template

It is a deployment reference/restore bootstrap, not the live database volume.

## 9. Verification after deployment

Verify all of the following:

- https://risetin.co.id loads with a valid TLS certificate
- http://risetin.co.id redirects to HTTPS
- https://www.risetin.co.id redirects to https://risetin.co.id
- /api/health returns service status
- /admin-access accepts the production Admin credentials
- /admin/system reports both migrations applied
- /admin/parameters can read and update configured parameter groups
- public lead/contact forms write to the persistent database
- AI Assistant works only for providers whose API keys are configured
- application logs show no repeated 4xx/5xx or database errors

## 10. Backup

Manual backup:

    ./scripts/backup-db.sh

Backups are stored under ./backups and include SHA-256 checksum files. The script
retains approximately 30 days of matching local backup files.

For automatic daily backup:

    sudo cp ops/systemd/risetin-backup.service /etc/systemd/system/
    sudo cp ops/systemd/risetin-backup.timer /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable --now risetin-backup.timer
    systemctl list-timers | grep risetin

Also copy backups to a separate storage location. A backup on the same server is
not sufficient protection against server loss.

## 11. Restore

Choose a verified backup and run:

    ./scripts/restore-db.sh backups/rti-YYYYMMDD-HHMMSS.sqlite

After restore, re-check /api/health, Admin, forms, and database status.

## 12. Upgrade / redeploy

Before every production upgrade:

    ./scripts/backup-db.sh

Then replace source files with the approved release and run:

    ./scripts/deploy-production.sh

The database lives in a named Docker volume, so rebuilding the application image
does not delete it.

## 13. Rollback

Keep the previous approved ZIP and its BUILD_INFO.txt. To roll back application
code, restore that release directory and redeploy. Restore the database only when
a database migration makes it necessary and only from a verified backup.

## 14. Security operations

- Keep Ubuntu and Docker patched.
- SSH with keys; disable password login where operationally possible.
- Do not expose Docker API or port 3000 publicly.
- Protect .env.production with mode 600.
- Rotate Admin/API credentials after suspected disclosure.
- Restrict repository and server access to authorized administrators.
- Review Caddy/app logs and disk usage.
- Copy backups off-server and test restore periodically.
- If Cloudflare proxy/WAF is enabled, keep origin ports limited and use Full
  (strict) TLS mode.
