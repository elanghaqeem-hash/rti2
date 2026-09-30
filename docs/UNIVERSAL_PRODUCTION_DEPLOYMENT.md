# RTI Universal Production Deployment Profile

Dokumen ini mendefinisikan jalur deployment produksi web **PT Riset Teknologi Indonesia (RTI / Risetin)** yang tidak mengunci aplikasi ke satu penyedia hosting.

Target runtime yang didukung:

1. **Docker / container Linux** — jalur yang direkomendasikan untuk produksi portable.
2. **Standard Node.js standalone** — VPS, VM, bare metal, PaaS yang mendukung proses Node persisten.
3. **Cloudflare Workers/OpenNext** — tetap didukung melalui konfigurasi `wrangler.jsonc`, D1, dan R2 yang sudah ada.

## 1. Arsitektur portable

| Concern | Node / Docker | Cloudflare |
|---|---|---|
| Web runtime | Next.js standalone, Node 24 | OpenNext Worker |
| Database | SQLite pada persistent volume | D1 binding `RTI_DB` |
| Private storage | filesystem di luar `public/` | R2 binding `RTI_FILES` |
| Migration | `scripts/db-migrate.mjs` | Wrangler D1 migration / runtime adapter |
| Health check | `GET /api/health` | endpoint yang sama |
| Backup | `scripts/backup.mjs` | gunakan mekanisme export D1/R2 Cloudflare |
| Restore | `scripts/restore.mjs` | import melalui tooling Cloudflare |

Aplikasi tidak boleh menaruh database, upload, atau backup penting di filesystem ephemeral milik platform.

## 2. Environment production

Salin template:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Isi minimal:

- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `RATE_LIMIT_SALT`
- `RTI_DB_PATH`

Jika upload aktif, isi juga `RTI_UPLOAD_DIR` dan pastikan direktori private berada di luar `public/`.

Secret tidak boleh dimasukkan ke image Docker, Git repository, atau `NEXT_PUBLIC_*`.

## 3. Deployment Docker — recommended

Build:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://risetin.co.id \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY= \
  --build-arg NEXT_PUBLIC_CAL_LINK=risetin/30min \
  -t rti-web:production .
```

Buat persistent volume:

```bash
docker volume create rti-data
```

Run:

```bash
docker run -d \
  --name rti-web \
  --restart unless-stopped \
  --env-file .env.production \
  -e RTI_DB_PATH=/data/rti.sqlite \
  -e RTI_UPLOAD_DIR=/data/uploads \
  -v rti-data:/data \
  -p 127.0.0.1:3000:3000 \
  rti-web:production
```

Container menjalankan migration + verification sebelum server Next.js dimulai. Jika migration gagal, container tidak melanjutkan startup.

Health:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

Pasang Nginx, Caddy, HAProxy, load balancer, atau reverse proxy lain di depan port 3000 untuk TLS dan public ingress.

## 4. Deployment standard Node.js

Requirement: Node.js 24.x dan npm.

Load environment lalu build:

```bash
set -a
. ./.env.production
set +a

node scripts/deploy-node.mjs
```

Runner tersebut melakukan:

1. validasi environment wajib;
2. `npm ci`;
3. backup database existing apabila `RTI_BACKUP_DIR` dikonfigurasi;
4. database migration + integrity verification;
5. production preflight;
6. `next build`;
7. assembly `.next/standalone` termasuk `public` dan `.next/static`.

Start manual:

```bash
cd .next/standalone
HOSTNAME=0.0.0.0 PORT=3000 node server.js
```

Atau:

```bash
node scripts/deploy-node.mjs --skip-install --skip-migrate --skip-build --start
```

Untuk produksi, gunakan service manager seperti systemd/PM2/supervisor, bukan terminal interaktif.

### Contoh systemd

```ini
[Unit]
Description=RTI Web
After=network.target

[Service]
Type=simple
User=risetin
Group=risetin
WorkingDirectory=/opt/risetin/rti2/.next/standalone
EnvironmentFile=/etc/risetin/rti.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

## 5. Database migration CLI

Status:

```bash
node scripts/db-migrate.mjs status
```

Apply semua migration yang belum tercatat:

```bash
node scripts/db-migrate.mjs up
```

Integrity + migration readiness:

```bash
node scripts/db-migrate.mjs verify
```

CLI memakai ledger `schema_migrations` yang idempotent. Migration yang sudah tercatat tidak dijalankan ulang.

Sebelum migration production yang mengubah data penting, lakukan backup.

## 6. Storage abstraction

Application storage berada di `lib/server/object-storage.ts` dan memilih backend berdasarkan runtime:

- Cloudflare + binding `RTI_FILES` -> private R2.
- Standard Node / Docker -> private filesystem `RTI_UPLOAD_DIR`.
- Upload dinonaktifkan secara operasional bila `RTI_FILE_UPLOADS_ENABLED=false`.

Gunakan storage abstraction tersebut dari application code; jangan menulis file upload langsung ke `public/`.

Untuk Docker, tempatkan `RTI_UPLOAD_DIR` di persistent volume yang sama atau volume terpisah.

## 7. Health and readiness

Endpoint:

```text
GET /api/health
```

HTTP 200 berarti database dapat diakses dan, bila upload diaktifkan, storage tersedia. HTTP 503 berarti instance belum siap menerima trafik.

Response sengaja tidak mengekspos path database, path storage, credential, atau secret.

Gunakan endpoint ini untuk:

- Docker `HEALTHCHECK`;
- load balancer;
- Kubernetes readiness probe;
- external uptime monitor.

## 8. Backup

Untuk deployment Node / Docker dengan SQLite + filesystem:

```bash
node scripts/backup.mjs
```

Environment penting:

```text
RTI_DB_PATH=/var/lib/risetin/rti.sqlite
RTI_UPLOAD_DIR=/var/lib/risetin/uploads
RTI_BACKUP_DIR=/var/backups/risetin
RTI_BACKUP_INCLUDE_UPLOADS=true
RTI_BACKUP_RETENTION_DAYS=14
```

Database backup dibuat dengan SQLite `VACUUM INTO` sehingga menghasilkan database backup konsisten. Backup directory juga mempunyai `manifest.json`.

Contoh cron harian pukul 02:15:

```cron
15 2 * * * cd /opt/risetin/rti2 && /usr/bin/node scripts/backup.mjs >> /var/log/risetin-backup.log 2>&1
```

Untuk standar yang lebih tinggi, copy hasil backup ke media/storage terpisah dan terenkripsi. Jangan menganggap volume aplikasi sebagai satu-satunya backup.

## 9. Restore

**Stop aplikasi terlebih dahulu.**

Database only:

```bash
node scripts/restore.mjs \
  --from /var/backups/risetin/rti-backup-YYYYMMDDTHHMMSSZ \
  --confirm
```

Database + filesystem uploads:

```bash
node scripts/restore.mjs \
  --from /var/backups/risetin/rti-backup-YYYYMMDDTHHMMSSZ \
  --confirm \
  --with-uploads
```

Restore melakukan `PRAGMA integrity_check` terhadap database backup dan menyimpan database lama sebagai file `.pre-restore-...`.

Setelah restore:

```bash
node scripts/db-migrate.mjs verify
```

Kemudian baru start aplikasi dan periksa `/api/health`.

## 10. Cloudflare compatibility

Jalur Cloudflare tetap memakai:

```bash
npm run d1:migrate
npm run build:cloudflare
npx opennextjs-cloudflare deploy
```

Binding wajib:

- D1: `RTI_DB`
- R2: `RTI_FILES` jika upload diaktifkan

Backup Node di dokumen ini tidak melakukan export D1/R2. Untuk Cloudflare, gunakan export/backup native sebelum pemindahan hosting.

Jika pindah dari Cloudflare ke server Node, database D1 harus diekspor dan diimpor ke SQLite target; R2 objects harus disalin ke `RTI_UPLOAD_DIR` atau storage target. Pemindahan hosting tidak otomatis memindahkan data persisten.

## 11. Recommended production filesystem

```text
/opt/risetin/rti2              application source/releases
/etc/risetin/rti.env           production secrets, mode 600
/var/lib/risetin/rti.sqlite    persistent SQLite database
/var/lib/risetin/uploads       private uploaded objects
/var/backups/risetin           backups
/var/log/risetin               service/backup logs
```

Owner sebaiknya user service khusus, bukan root.

## 12. Release checklist

Sebelum mengalihkan trafik production:

- environment dan secret sudah terisi melalui secret manager / file mode 600;
- TLS aktif pada reverse proxy;
- database backup berhasil;
- migration `verify` menghasilkan `ready: true`;
- `GET /api/health` menghasilkan HTTP 200;
- persistent volume sudah benar;
- upload test memakai private storage, bukan `public/`;
- restart service/container tidak menghilangkan database atau upload;
- restore test pernah dilakukan di environment non-production;
- monitoring dan backup schedule aktif.

## 13. Rollback

Application rollback:

1. hentikan instance baru;
2. deploy image/release sebelumnya;
3. jika schema migration backward-compatible, start release sebelumnya;
4. jika perlu data rollback, restore backup dengan prosedur pada bagian 9;
5. verifikasi health endpoint sebelum membuka trafik.

Migration database harus diperlakukan sebagai perubahan forward-only kecuali migration tertentu mempunyai prosedur rollback yang telah diuji.
