import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('RTI sync watcher aktif dalam mode aman.');
console.log('Auto-push hanya berjalan bila RTI_ALLOW_AUTO_PUSH=YES dan branch bukan main/master.');

let debounceTimer = null;
let isSyncing = false;

function sync() {
  if (isSyncing) return;

  const allowAutoPush = process.env.RTI_ALLOW_AUTO_PUSH === 'YES';
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();

  if (!allowAutoPush) {
    console.log('[Auto-Sync] Push dilewati: set RTI_ALLOW_AUTO_PUSH=YES untuk opt-in eksplisit.');
    return;
  }

  if (branch === 'main' || branch === 'master') {
    console.error('[Auto-Sync] DIBLOKIR: auto-push ke branch production tidak diizinkan.');
    return;
  }

  isSyncing = true;
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    if (status) {
      console.log('\n[Auto-Sync] Perubahan terdeteksi:');
      console.log(status);
      console.log('[Auto-Sync] Menambahkan perubahan (git add)...');
      execSync('git add .', { stdio: 'inherit' });

      const now = new Date().toLocaleString();
      const commitMsg = `Auto update: ${now}`;
      console.log(`[Auto-Sync] Membuat commit: "${commitMsg}"...`);
      execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });

      console.log(`[Auto-Sync] Mendorong ke origin ${branch}...`);
      execSync(`git push origin ${branch}`, { stdio: 'inherit' });
      console.log('[Auto-Sync] Berhasil ter-push ke GitHub!\n');
    }
  } catch (err) {
    console.error('[Auto-Sync] Error saat sync:', err.message);
  } finally {
    isSyncing = false;
  }
}

fs.watch(__dirname, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  const normalized = filename.replace(/\\/g, '/');
  if (
    normalized.startsWith('.git') ||
    normalized.startsWith('node_modules') ||
    normalized.startsWith('.next') ||
    normalized.endsWith('.tmp')
  ) {
    return;
  }

  console.log(`[Watcher] Terdeteksi perubahan pada: ${normalized} (${eventType})`);
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    sync();
  }, 3000);
});

// Initial check
sync();
