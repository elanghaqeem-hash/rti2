function ascii(value: unknown): string {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, ' ');
}

function escapePdf(value: string) {
  return ascii(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrap(text: string, width = 92): string[] {
  const words = ascii(text).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (candidate.length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export type PdpPdfInput = {
  reportTitle: string;
  companyName: string;
  assessmentId: string;
  assessmentDate: string;
  frameworkVersion: string;
  assessmentType: string;
  implementationScore: number;
  evidenceScore: number;
  overallScore: number;
  readinessLevel: string;
  gatesCompleted: number;
  gatesTotal: number;
  domainScores: Array<{
    domainCode: string;
    domainName: string;
    implementationScore: number;
    evidenceScore: number;
    overallScore: number;
    status: string;
  }>;
  findings: Array<{
    questionCode: string;
    severity: string;
    title: string;
    currentCondition: string;
    risk: string;
    recommendation: string;
    legalReference: string | null;
  }>;
  roadmap: Array<{
    phase: string;
    domainCode: string;
    action: string;
    ownerSuggestion: string;
    expectedOutcome: string;
  }>;
  disclaimer: string;
};

export function buildPdpReadinessPdf(input: PdpPdfInput): Buffer {
  const lines: string[] = [];
  const push = (value = '') => lines.push(...wrap(value));

  push('PT Riset Teknologi Indonesia');
  push(input.reportTitle || 'RTI UU PDP Data Protection Readiness Assessment');
  push('');
  push('Organization: ' + input.companyName);
  push('Assessment ID: ' + input.assessmentId);
  push('Assessment date: ' + input.assessmentDate);
  push('Framework: ' + input.frameworkVersion);
  push('Assessment type: ' + input.assessmentType);
  push('');
  push('EXECUTIVE SUMMARY');
  push('Overall readiness: ' + input.overallScore.toFixed(1) + '%');
  push('Readiness level: ' + input.readinessLevel);
  push('Implementation readiness: ' + input.implementationScore.toFixed(1) + '%');
  push('Evidence readiness: ' + input.evidenceScore.toFixed(1) + '%');
  push('Readiness gates: ' + input.gatesCompleted + '/' + input.gatesTotal);
  push('');
  push('DOMAIN READINESS');
  for (const domain of input.domainScores) {
    push(
      domain.domainCode +
        ' - ' +
        domain.domainName +
        ': overall ' +
        domain.overallScore.toFixed(1) +
        '%, implementation ' +
        domain.implementationScore.toFixed(1) +
        '%, evidence ' +
        domain.evidenceScore.toFixed(1) +
        '% (' +
        domain.status +
        ')',
    );
  }
  push('');
  push('PRIORITY GAP REGISTER');
  if (input.findings.length === 0) {
    push('No generated gaps were identified from the submitted answers and evidence status.');
  } else {
    input.findings.slice(0, 35).forEach((finding, index) => {
      push(
        String(index + 1) +
          '. [' +
          finding.severity +
          '] ' +
          finding.questionCode +
          ' - ' +
          finding.title,
      );
      if (finding.legalReference) push('   Legal reference: ' + finding.legalReference);
      push('   Current condition: ' + finding.currentCondition);
      push('   Risk: ' + finding.risk);
      push('   Recommendation: ' + finding.recommendation);
    });
  }
  push('');
  push('REMEDIATION ROADMAP');
  if (input.roadmap.length === 0) {
    push('No remediation roadmap items are available.');
  } else {
    input.roadmap.slice(0, 35).forEach((item, index) => {
      push(
        String(index + 1) +
          '. ' +
          item.phase +
          ' | ' +
          item.domainCode +
          ' | ' +
          item.action,
      );
      push('   Suggested owner: ' + item.ownerSuggestion);
      push('   Expected outcome: ' + item.expectedOutcome);
    });
  }
  push('');
  push('DISCLAIMER');
  push(input.disclaimer);
  push('');
  push('Confidential | Generated through RTI UU PDP Data Protection Readiness Tool');

  const lineHeight = 12;
  const top = 800;
  const bottom = 50;
  const linesPerPage = Math.floor((top - bottom) / lineHeight);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push(['']);

  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const fontObject = 3;
  objects[fontObject] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  const pageObjectNumbers: number[] = [];
  pages.forEach((pageLines, pageIndex) => {
    const pageObj = 4 + pageIndex * 2;
    const contentObj = pageObj + 1;
    pageObjectNumbers.push(pageObj);

    const streamLines = ['BT', '/F1 10 Tf', '50 800 Td'];
    pageLines.forEach((line, index) => {
      if (index > 0) streamLines.push('0 -' + lineHeight + ' Td');
      streamLines.push('(' + escapePdf(line) + ') Tj');
    });
    streamLines.push('ET');
    const stream = streamLines.join('\n');

    objects[pageObj] =
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' +
      fontObject +
      ' 0 R >> >> /Contents ' +
      contentObj +
      ' 0 R >>';
    objects[contentObj] =
      '<< /Length ' +
      Buffer.byteLength(stream, 'utf8') +
      ' >>\nstream\n' +
      stream +
      '\nendstream';
  });

  objects[2] =
    '<< /Type /Pages /Kids [' +
    pageObjectNumbers.map((n) => n + ' 0 R').join(' ') +
    '] /Count ' +
    pages.length +
    ' >>';

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = Buffer.byteLength(pdf, 'utf8');
    pdf += i + ' 0 obj\n' + objects[i] + '\nendobj\n';
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n0 ' + objects.length + '\n';
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < objects.length; i += 1) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf +=
    'trailer\n<< /Size ' +
    objects.length +
    ' /Root 1 0 R >>\nstartxref\n' +
    xrefOffset +
    '\n%%EOF';

  return Buffer.from(pdf, 'utf8');
}
