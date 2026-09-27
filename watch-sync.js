import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(' Auto-push watcher aktif untuk RTI 2...');
console.log('Setiap perubahan file akan otomatis di-commit & push ke GitHub dalam 3 detik.');

let debounceTimer = null;
let isSyncing = false;

function sync() {
  if (isSyncing) return;
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

      console.log('[Auto-Sync] Mendorong ke origin main (git push)...');
      execSync('git push origin main', { stdio: 'inherit' });
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
