import type { PdpProfile, PdpScoreResult } from '@/lib/pdp/types';

type Line = {
  text: string;
  kind: 'title' | 'heading' | 'body' | 'small';
};

function ascii(value: string) {
  return value
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/•/g, '-')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '');
}

function escapePdf(value: string) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrap(text: string, width = 92) {
  const words = ascii(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if ((current + ' ' + word).length <= width) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function pushWrapped(lines: Line[], text: string, kind: Line['kind'], width?: number) {
  wrap(text, width || (kind === 'title' ? 62 : 92)).forEach((row) =>
    lines.push({ text: row, kind }),
  );
}

function section(lines: Line[], heading: string, body: string[]) {
  lines.push({ text: heading, kind: 'heading' });
  body.forEach((item) => pushWrapped(lines, item, 'body'));
  lines.push({ text: '', kind: 'small' });
}

function buildLines(profile: PdpProfile, result: PdpScoreResult): Line[] {
  const lines: Line[] = [];
  pushWrapped(lines, 'UU PDP Data Protection Readiness - Executive Report', 'title');
  pushWrapped(lines, 'PT Riset Teknologi Indonesia (RTI / Risetin)', 'body');
  lines.push({ text: '', kind: 'small' });

  section(lines, 'Confidentiality Notice', [
    'Confidential diagnostic output prepared from information provided by the assessment user. Distribution should be limited to authorized stakeholders.',
  ]);

  section(lines, 'Executive Summary', [
    'Overall PDP Readiness Score: ' + result.overallScore + '%',
    'Maturity: Level ' + result.maturityLevel + ' - ' + result.maturityLabel,
    'Evidence Confidence: ' + result.evidenceConfidence + '%',
    'Assessment Completion: ' + result.completion + '%',
    'Critical Findings: ' + result.criticalFindings.length,
  ]);

  section(lines, 'Organization Profile', [
    'Organization: ' + (profile.companyName || 'Guest Organization'),
    'Industry: ' + (profile.industry || '-'),
    'Organization Size: ' + (profile.organizationSize || '-'),
    'Employee Count: ' + String(profile.employeeCount ?? '-'),
    'Estimated Data Subjects: ' + String(profile.dataSubjectCount ?? '-'),
    'International Transfer: ' + (profile.internationalTransfer ? 'Yes' : 'No'),
    'Children Data: ' + (profile.childrenData ? 'Yes' : 'No'),
    'Automated Decision Making: ' + (profile.automatedDecisionMaking ? 'Yes' : 'No'),
  ]);

  section(lines, 'Assessment Scope & Methodology', [
    'The diagnostic evaluates privacy governance, data inventory, RoPA, processing basis, consent, data subject rights, transparency, retention, DPIA, DPO/privacy function, third parties, security, breach response, cross-border transfers, privacy by design, HR privacy, digital tracking, children/vulnerable data subjects, training, and assurance.',
    'Scoring uses domain weight x control weight x answer score x evidence/confidence factor x control criticality. Critical findings are reported separately and cannot be hidden by a high overall score.',
  ]);

  lines.push({ text: 'Domain Results', kind: 'heading' });
  result.domainScores.forEach((domain) => {
    pushWrapped(
      lines,
      domain.name + ': ' + domain.score + '% | answered ' + domain.answered + '/' + domain.applicable + ' | critical gaps ' + domain.criticalGaps,
      'body',
    );
  });
  lines.push({ text: '', kind: 'small' });

  lines.push({ text: 'Key Regulatory Gaps & Critical Findings', kind: 'heading' });
  const critical = result.criticalFindings.length
    ? result.criticalFindings
    : result.findings.slice(0, 8);
  critical.slice(0, 12).forEach((finding, index) => {
    pushWrapped(
      lines,
      String(index + 1) + '. [' + finding.priority + '] ' + finding.domain + ' - ' + finding.gap,
      'body',
    );
    pushWrapped(lines, 'Action: ' + finding.recommendedAction, 'small');
    pushWrapped(lines, 'Reference: ' + (finding.regulatoryReference || 'UU No. 27 Tahun 2022'), 'small');
  });
  lines.push({ text: '', kind: 'small' });

  section(lines, 'DPIA Readiness', [
    'Screening Result: ' + result.dpia.status,
    ...(result.dpia.reasons.length ? result.dpia.reasons.map((item) => '- ' + item) : ['- No trigger recorded from the current profile.']),
  ]);

  section(lines, 'DPO / Privacy Function Readiness', [
    'Screening Result: ' + result.dpo.status,
    ...(result.dpo.reasons.length ? result.dpo.reasons.map((item) => '- ' + item) : ['- No explicit trigger recorded from the current profile.']),
  ]);

  lines.push({ text: 'Privacy Risk Heat Map - Top Risks', kind: 'heading' });
  result.topRisks.slice(0, 10).forEach((risk) => {
    pushWrapped(
      lines,
      risk.id + ' | ' + risk.domain + ' | Impact ' + risk.impact + ' x Likelihood ' + risk.likelihood + ' = ' + risk.inherentRisk + ' (' + risk.priority + ')',
      'body',
    );
  });
  lines.push({ text: '', kind: 'small' });

  lines.push({ text: 'Priority Remediation & 12-Month Roadmap', kind: 'heading' });
  result.roadmap.slice(0, 16).forEach((item) => {
    pushWrapped(
      lines,
      item.phase + ' | ' + item.priority + ' | ' + item.domain + ' | Owner: ' + item.owner,
      'body',
    );
    pushWrapped(lines, item.action, 'small');
  });
  lines.push({ text: '', kind: 'small' });

  lines.push({ text: 'RTI Advisory Opportunities', kind: 'heading' });
  result.serviceRecommendations.slice(0, 8).forEach((item) => {
    pushWrapped(lines, item.service + ' - ' + item.reason, 'body');
  });
  lines.push({ text: '', kind: 'small' });

  section(lines, 'Disclaimer', [result.disclaimer]);

  return lines;
}

function pageContent(pageLines: Line[], pageNumber: number, totalPages: number) {
  const commands: string[] = [];
  commands.push('0.035 0.10 0.19 rg 0 770 595 72 re f');
  commands.push('0.80 0.60 0.18 rg 0 766 595 4 re f');
  commands.push('BT /F2 18 Tf 1 1 1 rg 42 808 Td (RTI - UU PDP READINESS) Tj ET');
  commands.push('BT /F1 8 Tf 0.82 0.86 0.91 rg 42 790 Td (Privacy Diagnostic & Advisory Platform) Tj ET');

  let y = 742;
  for (const line of pageLines) {
    if (line.kind === 'heading') {
      y -= 7;
      commands.push('BT /F2 11 Tf 0.67 0.48 0.10 rg 42 ' + y + ' Td (' + escapePdf(line.text) + ') Tj ET');
      y -= 16;
      continue;
    }
    if (line.kind === 'title') {
      commands.push('BT /F2 15 Tf 0.035 0.10 0.19 rg 42 ' + y + ' Td (' + escapePdf(line.text) + ') Tj ET');
      y -= 20;
      continue;
    }
    if (!line.text) {
      y -= 7;
      continue;
    }
    const fontSize = line.kind === 'small' ? 7.2 : 8.5;
    const font = line.kind === 'small' ? 'F1' : 'F1';
    const tone = line.kind === 'small' ? '0.30 0.34 0.40' : '0.10 0.14 0.20';
    commands.push('BT /' + font + ' ' + fontSize + ' Tf ' + tone + ' rg 42 ' + y + ' Td (' + escapePdf(line.text) + ') Tj ET');
    y -= line.kind === 'small' ? 10 : 12;
  }

  commands.push('0.88 0.89 0.91 RG 42 45 511 0.5 re S');
  commands.push(
    'BT /F1 7 Tf 0.40 0.44 0.50 rg 42 28 Td (Risetin - Confidential | Diagnostic readiness indicator, not legal opinion) Tj ET',
  );
  commands.push(
    'BT /F1 7 Tf 0.40 0.44 0.50 rg 500 28 Td (Page ' +
      pageNumber +
      '/' +
      totalPages +
      ') Tj ET',
  );
  return commands.join('\n');
}

export function generatePdpPdf(profile: PdpProfile, result: PdpScoreResult) {
  const allLines = buildLines(profile, result);
  const pages: Line[][] = [];
  let current: Line[] = [];
  let used = 0;

  for (const line of allLines) {
    const cost =
      line.kind === 'title' ? 2.1 : line.kind === 'heading' ? 2 : line.kind === 'small' ? 0.8 : 1;
    if (used + cost > 48 && current.length > 0) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(line);
    used += cost;
  }
  if (current.length) pages.push(current);

  const objects: string[] = [];
  const pageIds: number[] = [];
  const contentIds: number[] = [];

  for (let i = 0; i < pages.length; i += 1) {
    pageIds.push(5 + i * 2);
    contentIds.push(6 + i * 2);
  }

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] =
    '<< /Type /Pages /Count ' +
    pages.length +
    ' /Kids [' +
    pageIds.map((id) => id + ' 0 R').join(' ') +
    '] >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  pages.forEach((pageLines, index) => {
    const pageId = pageIds[index];
    const contentId = contentIds[index];
    const stream = pageContent(pageLines, index + 1, pages.length);
    objects[pageId] =
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      '/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> ' +
      '/Contents ' +
      contentId +
      ' 0 R >>';
    objects[contentId] =
      '<< /Length ' + Buffer.byteLength(stream, 'latin1') + ' >>\nstream\n' + stream + '\nendstream';
  });

  let pdf = '%PDF-1.4\n%RTI\n';
  const offsets: number[] = [0];
  const maxId = Math.max(...pageIds, ...contentIds, 4);

  for (let id = 1; id <= maxId; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'latin1');
    pdf += id + ' 0 obj\n' + objects[id] + '\nendobj\n';
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n0 ' + (maxId + 1) + '\n';
  pdf += '0000000000 65535 f \n';
  for (let id = 1; id <= maxId; id += 1) {
    pdf += String(offsets[id]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf +=
    'trailer\n<< /Size ' +
    (maxId + 1) +
    ' /Root 1 0 R >>\nstartxref\n' +
    xrefOffset +
    '\n%%EOF';

  return Buffer.from(pdf, 'latin1');
}
