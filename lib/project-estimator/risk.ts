import { randomUUID } from 'node:crypto';
import { getRuntimeDatabase } from '@/lib/server/runtime-database';
import { getEstimatorSessionByToken } from '@/lib/project-estimator/repository';
import type { ProjectEstimate } from '@/lib/project-estimator/types';

export type EstimatorRiskFlag = {
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  evidence?: Record<string, unknown>;
};

const AUTO_CODES = [
  'SCOPE_CREEP_RISK',
  'NO_UI_DESIGN',
  'CORE_INTEGRATION',
  'DATA_MIGRATION_UNKNOWN',
  'PROD_TESTING',
  'REGULATED_DATA',
  'UNREALISTIC_TIMELINE',
  'BUDGET_MISMATCH',
  'THIRD_PARTY_PRICE_BUDGETARY',
];

function allText(answers: Record<string, unknown>) {
  return Object.entries(answers)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' ') : String(value ?? '')}`)
    .join('\n')
    .toLowerCase();
}

function parseBudget(value?: string) {
  if (!value) return null;
  const text = value.toLowerCase().replace(/\s+/g, ' ');
  const nums = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(m|jt|juta|b|miliar|rb|ribu)?/g)]
    .map((match) => {
      const raw = Number(String(match[1]).replace(',', '.'));
      const unit = match[2] || '';
      if (!Number.isFinite(raw)) return null;
      const multiplier =
        unit === 'b' || unit === 'miliar' ? 1_000_000_000 :
        unit === 'm' || unit === 'jt' || unit === 'juta' ? 1_000_000 :
        unit === 'rb' || unit === 'ribu' ? 1_000 : 1;
      return raw * multiplier;
    })
    .filter((n): n is number => n !== null);
  return nums.length ? Math.max(...nums) : null;
}

export function deriveRiskFlags(params: {
  input: {
    serviceId: string;
    targetTimeline?: string;
    budgetExpectation?: string;
    profile: { industry?: string };
    answers: Record<string, unknown>;
  };
  estimate: Omit<ProjectEstimate, 'trace'> | ProjectEstimate;
}) {
  const flags: EstimatorRiskFlag[] = [];
  const answers = params.input.answers || {};
  const text = allText(answers);
  const industry = String(params.input.profile?.industry || '').toLowerCase();
  const estimate = params.estimate;

  if (/fitur lain|sesuai kebutuhan|as needed|other features|dan lain-lain|tbd scope|scope terbuka/.test(text)) {
    flags.push({
      code: 'SCOPE_CREEP_RISK',
      severity: 'high',
      message: 'Scope memuat kebutuhan terbuka. Tetapkan baseline scope dan mekanisme change request sebelum quotation.',
    });
  }

  if (/(ui_design|design_status|wireframe):\s*(none|unknown|belum|tidak ada)/.test(text)) {
    flags.push({
      code: 'NO_UI_DESIGN',
      severity: 'medium',
      message: 'Desain UI/UX belum final sehingga effort desain perlu diperlakukan sebagai asumsi.',
    });
  }

  if (/core_integration:\s*legacy/.test(text) || /integration_complexity:\s*high/.test(text)) {
    flags.push({
      code: 'CORE_INTEGRATION',
      severity: 'high',
      message: 'Integrasi core/legacy berpotensi menaikkan kompleksitas. Dokumentasi API dan akses sandbox perlu dikonfirmasi.',
    });
  }

  if (/(migration|data_migration)[^\n]*\b(unknown|tbd|belum tahu|belum diketahui)\b/.test(text)) {
    flags.push({
      code: 'DATA_MIGRATION_UNKNOWN',
      severity: 'medium',
      message: 'Volume/format migrasi data belum diketahui dan perlu dikonfirmasi sebelum scope final.',
    });
  }

  if (/(test_environment|environment)[^\n]*\b(prod|production|produksi)\b/.test(text)) {
    flags.push({
      code: 'PROD_TESTING',
      severity: 'high',
      message: 'Pengujian pada lingkungan produksi memerlukan test window, rollback plan, dan mitigasi dampak operasional.',
    });
  }

  const regulatedIndustries = [
    'banking','islamic_banking','insurance','securities','multifinance','fintech',
    'payment','government','state_owned','healthcare',
  ];
  if (
    regulatedIndustries.some((key) => industry.includes(key)) ||
    /regulatory_pressure:\s*high/.test(text)
  ) {
    flags.push({
      code: 'REGULATED_DATA',
      severity: 'high',
      message: 'Konteks industri/regulasi menunjukkan kebutuhan kontrol keamanan, privasi, dan evidence yang lebih kuat.',
    });
  }

  const timeline = String(params.input.targetTimeline || '').toLowerCase();
  const shortTarget =
    /\b(1|2)\s*(week|weeks|minggu)\b/.test(timeline) ||
    /timeline_pressure:\s*accelerated/.test(text);
  if (shortTarget && Number(estimate.durationMinWeeks || 0) > 2) {
    flags.push({
      code: 'UNREALISTIC_TIMELINE',
      severity: 'high',
      message: 'Target delivery lebih agresif dibanding baseline P50. Pertimbangkan pengurangan scope atau skema rush yang disetujui.',
      evidence: { durationMinWeeks: estimate.durationMinWeeks },
    });
  }

  const budget = parseBudget(params.input.budgetExpectation);
  if (budget && estimate.priceConfigured && budget < Number(estimate.priceMin || 0)) {
    flags.push({
      code: 'BUDGET_MISMATCH',
      severity: 'high',
      message: 'Ekspektasi anggaran berada di bawah rentang indikatif saat ini. Pertimbangkan fase/MVP atau scope reduction.',
    });
  }

  if (
    /cloud_provider|license|third_party|vendor/.test(text) &&
    !estimate.priceConfigured
  ) {
    flags.push({
      code: 'THIRD_PARTY_PRICE_BUDGETARY',
      severity: 'medium',
      message: 'Komponen pihak ketiga/cloud teridentifikasi sementara baseline komersial belum dikalibrasi. Nilai pass-through perlu penawaran resmi.',
    });
  }

  return flags;
}

export async function refreshEstimatorRiskFlags(params: {
  sessionId: string;
  resumeToken: string;
  estimate: Omit<ProjectEstimate, 'trace'> | ProjectEstimate;
}) {
  const state = await getEstimatorSessionByToken(params.resumeToken);
  if (state.sessionId !== params.sessionId) throw new Error('Estimator session mismatch.');
  const flags = deriveRiskFlags({ input: state.input, estimate: params.estimate });
  const db = await getRuntimeDatabase();
  const now = new Date().toISOString();

  await db.batch([
    {
      sql: `DELETE FROM estimator_risk_flags_v2
            WHERE session_id=? AND code IN (${AUTO_CODES.map(() => '?').join(',')})`,
      params: [params.sessionId, ...AUTO_CODES],
    },
    ...flags.map((flag) => ({
      sql: `INSERT INTO estimator_risk_flags_v2
        (id,session_id,estimate_id,code,severity,message,evidence_json,status,created_at)
       VALUES (?,?,?,?,?,?,?,'open',?)`,
      params: [
        randomUUID(),
        params.sessionId,
        params.estimate.id,
        flag.code,
        flag.severity,
        flag.message,
        flag.evidence ? JSON.stringify(flag.evidence) : null,
        now,
      ],
    })),
  ]);

  return flags;
}

export async function listEstimatorRiskFlags(sessionId: string) {
  const db = await getRuntimeDatabase();
  const rows = await db.queryAll<any>(
    `SELECT code,severity,message,evidence_json,status,created_at
     FROM estimator_risk_flags_v2
     WHERE session_id=? AND status='open'
     ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC`,
    [sessionId],
  );
  return rows.map((row) => ({
    code: row.code,
    severity: row.severity,
    message: row.message,
    evidence: row.evidence_json ? JSON.parse(row.evidence_json) : undefined,
    status: row.status,
    createdAt: row.created_at,
  }));
}
