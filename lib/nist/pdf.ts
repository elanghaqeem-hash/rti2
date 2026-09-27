import type {
  NistAssessmentRecord,
  NistAssessmentResult,
} from '@/lib/nist/types';
import { BRAND_CONFIG } from '@/lib/config/contact';

type PdfLine = {
  text: string;
  bold?: boolean;
  size?: number;
  gapBefore?: number;
};

function ascii(value: unknown) {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/→/g, '->')
    .replace(/•/g, '-')
    .replace(/“|”/g, '"')
    .replace(/’/g, "'")
    .replace(/[^\x20-\x7E]/g, ' ');
}

function escapePdf(value: string) {
  return ascii(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrap(text: string, max = 88) {
  const words = ascii(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function pageBreak(lines: PdfLine[], maxHeight = 700) {
  const pages: PdfLine[][] = [];
  let current: PdfLine[] = [];
  let used = 0;

  for (const line of lines) {
    const size = line.size || 10;
    const height = size + 5 + (line.gapBefore || 0);
    if (current.length && used + height > maxHeight) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(line);
    used += height;
  }

  if (current.length) pages.push(current);
  return pages;
}

function addWrapped(
  target: PdfLine[],
  text: string,
  options?: Omit<PdfLine, 'text'> & { max?: number },
) {
  for (const [index, line] of wrap(text, options?.max || 88).entries()) {
    target.push({
      text: line,
      bold: options?.bold,
      size: options?.size,
      gapBefore: index === 0 ? options?.gapBefore : 0,
    });
  }
}

function buildLines(
  assessment: NistAssessmentRecord,
  result: NistAssessmentResult,
): PdfLine[] {
  const lines: PdfLine[] = [];

  lines.push({ text: 'RTI NIST CYBER QUICK CHECK', bold: true, size: 22 });
  lines.push({ text: 'Executive Cybersecurity Readiness Report', bold: true, size: 16, gapBefore: 8 });
  lines.push({ text: assessment.organization.companyName, bold: true, size: 14, gapBefore: 18 });
  lines.push({ text: `Assessment ID: ${assessment.id}`, size: 9 });
  lines.push({ text: `Framework: ${assessment.frameworkVersion}`, size: 9 });
  lines.push({ text: `Questionnaire: ${assessment.questionnaireVersion}`, size: 9 });
  lines.push({ text: `Scoring model: ${assessment.scoringModelVersion}`, size: 9 });
  lines.push({ text: 'Report version: NIST-CSF-2.0-QC-v1.0', size: 9 });
  lines.push({ text: `Assessment date: ${assessment.completedAt || assessment.startedAt}`, size: 9 });

  lines.push({ text: 'ORGANIZATION PROFILE', bold: true, size: 14, gapBefore: 22 });
  lines.push({ text: `Industry: ${assessment.organization.industry}`, size: 10 });
  lines.push({ text: `Organization size: ${assessment.organization.companySize}`, size: 10 });
  if (assessment.organization.country) lines.push({ text: `Country: ${assessment.organization.country}`, size: 10 });
  if (assessment.organization.region) lines.push({ text: `Region: ${assessment.organization.region}`, size: 10 });

  lines.push({ text: 'EXECUTIVE POSTURE', bold: true, size: 14, gapBefore: 24 });
  lines.push({ text: `RTI Cyber Readiness Score: ${result.overallScore}/100`, bold: true, size: 13 });
  lines.push({ text: `Risk / readiness interpretation: ${result.riskRating}`, size: 11 });
  lines.push({ text: `Indicative CSF Tier: Tier ${result.indicativeTier.tier} - ${result.indicativeTier.label}`, size: 11 });
  lines.push({ text: `Assessment Confidence: ${result.confidenceScore}%`, size: 11 });
  lines.push({ text: `Critical Category Gaps: ${result.criticalGapCount}`, size: 11 });
  if (result.strongestFunction) {
    lines.push({ text: `Highest Function: ${result.strongestFunction.functionName} (${result.strongestFunction.score})`, size: 11 });
  }
  if (result.weakestFunction) {
    lines.push({ text: `Lowest Function: ${result.weakestFunction.functionName} (${result.weakestFunction.score})`, size: 11 });
  }

  lines.push({ text: 'EXECUTIVE SUMMARY', bold: true, size: 14, gapBefore: 22 });
  addWrapped(
    lines,
    `The self-assessment produced an RTI Cyber Readiness Score of ${result.overallScore}/100 with the configured interpretation "${result.riskRating}". Evidence confidence is ${result.confidenceScore}%. ${result.strongestFunction ? `The highest-scoring Function is ${result.strongestFunction.functionName} at ${result.strongestFunction.score}.` : ''} ${result.weakestFunction ? `The lowest-scoring Function is ${result.weakestFunction.functionName} at ${result.weakestFunction.score}.` : ''} Priority actions should focus on the largest validated gaps and should be confirmed against supporting evidence before assurance or compliance conclusions are made.`,
    { size: 9, max: 92 },
  );

  lines.push({ text: 'NIST CSF 2.0 FUNCTION POSTURE', bold: true, size: 14, gapBefore: 22 });
  for (const item of result.functionScores) {
    lines.push({
      text: `${item.functionCode}  ${item.functionName}: Current ${item.score} | Target ${item.targetScore} | Gap ${item.gap}`,
      size: 10,
    });
  }

  lines.push({ text: 'CATEGORY HEAT MAP', bold: true, size: 14, gapBefore: 22 });
  for (const item of result.categoryScores) {
    lines.push({
      text: `${item.categoryCode}  ${item.categoryName}: ${item.score}/100 | Target ${item.targetScore} | ${item.status}`,
      size: 9,
    });
  }

  lines.push({ text: 'TOP CYBER RISK FINDINGS', bold: true, size: 14, gapBefore: 22 });
  for (const [index, item] of result.findings.slice(0, 8).entries()) {
    lines.push({
      text: `${index + 1}. ${item.categoryCode} - ${item.title} [${item.rating}; L${item.likelihood} x I${item.impact}]`,
      bold: true,
      size: 10,
      gapBefore: index ? 8 : 0,
    });
    addWrapped(lines, item.reason, { size: 9, max: 92 });
  }

  lines.push({ text: 'PRIORITIZED QUICK WINS', bold: true, size: 14, gapBefore: 22 });
  for (const [index, item] of result.recommendations.slice(0, 10).entries()) {
    lines.push({
      text: `${index + 1}. ${item.categoryCode} - ${item.title}`,
      bold: true,
      size: 10,
      gapBefore: index ? 8 : 0,
    });
    lines.push({
      text: `Priority: ${item.priority} | Effort: ${item.effort} | Impact: ${item.impact} | Timeline: ${item.suggestedTimeline}`,
      size: 9,
    });
    addWrapped(lines, item.reason, { size: 9, max: 92 });
    if (item.serviceName) {
      lines.push({
        text: `Relevant RTI service: ${item.serviceName}`,
        size: 9,
      });
    }
  }

  lines.push({ text: '30 / 60 / 90-DAY AND STRATEGIC ROADMAP', bold: true, size: 14, gapBefore: 22 });
  for (const item of result.roadmap.slice(0, 14)) {
    lines.push({
      text: `${item.phase} | ${item.categoryCode} | ${item.priority}`,
      bold: true,
      size: 10,
      gapBefore: 8,
    });
    addWrapped(lines, `Action: ${item.action}`, { size: 9, max: 92 });
    addWrapped(lines, `Owner suggestion: ${item.ownerSuggestion}`, { size: 9, max: 92 });
    addWrapped(lines, `Expected outcome: ${item.expectedOutcome}`, { size: 9, max: 92 });
  }

  lines.push({ text: 'RECOMMENDED RTI SERVICES', bold: true, size: 14, gapBefore: 22 });
  const serviceNames = Array.from(
    new Set(
      result.recommendations
        .map((item) => item.serviceName)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  if (serviceNames.length === 0) {
    lines.push({ text: 'No RTI service is mapped to the current priority findings.', size: 9 });
  } else {
    for (const serviceName of serviceNames.slice(0, 10)) {
      lines.push({ text: `- ${serviceName}`, size: 9 });
    }
  }

  lines.push({ text: 'METHODOLOGY & LIMITATIONS', bold: true, size: 14, gapBefore: 22 });
  addWrapped(lines, result.methodologyDisclaimer, { size: 9, max: 92 });
  addWrapped(
    lines,
    'RTI Cyber Readiness Score is an RTI diagnostic score. It is not an official NIST score. The Indicative CSF Tier is derived from configurable RTI rules using questionnaire and evidence-confidence inputs and should be validated through a deeper assessment where assurance is required.',
    { size: 9, max: 92, gapBefore: 6 },
  );
  addWrapped(
    lines,
    'Benchmarking is not shown unless sufficient anonymized comparison data is available. No synthetic industry benchmark is presented as actual market data.',
    { size: 9, max: 92, gapBefore: 6 },
  );

  lines.push({ text: 'CONTACT RTI', bold: true, size: 14, gapBefore: 22 });
  lines.push({ text: BRAND_CONFIG.legalName, bold: true, size: 10 });
  lines.push({ text: `Email: ${BRAND_CONFIG.contact.email}`, size: 9 });
  lines.push({ text: `WhatsApp: ${BRAND_CONFIG.contact.whatsapp}`, size: 9 });
  lines.push({ text: `Website: ${BRAND_CONFIG.contact.website}`, size: 9 });

  return lines;
}

function renderPage(lines: PdfLine[], pageNumber: number, totalPages: number) {
  let y = 792;
  const commands: string[] = [];

  commands.push('0.08 0.18 0.33 rg');
  commands.push('BT /F2 10 Tf 50 816 Td (RTI | NIST Cyber Quick Check) Tj ET');
  commands.push('0.15 0.15 0.15 rg');

  for (const line of lines) {
    y -= line.gapBefore || 0;
    const size = line.size || 10;
    const font = line.bold ? 'F2' : 'F1';
    commands.push(
      `BT /${font} ${size} Tf 1 0 0 1 50 ${roundCoordinate(y)} Tm (${escapePdf(line.text)}) Tj ET`,
    );
    y -= size + 5;
  }

  commands.push('0.35 0.35 0.35 rg');
  commands.push(
    `BT /F1 8 Tf 1 0 0 1 50 28 Tm (Confidential diagnostic report - Page ${pageNumber} of ${totalPages}) Tj ET`,
  );

  return commands.join('\n');
}

function roundCoordinate(value: number) {
  return Math.round(value * 10) / 10;
}

export function buildNistExecutivePdf(
  assessment: NistAssessmentRecord,
  result: NistAssessmentResult,
): Buffer {
  const pages = pageBreak(buildLines(assessment, result));
  const objects: string[] = [];

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';

  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];
  let nextId = 5;
  for (let i = 0; i < pages.length; i += 1) {
    pageObjectIds.push(nextId++);
    contentObjectIds.push(nextId++);
  }

  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds
    .map((id) => `${id} 0 R`)
    .join(' ')}] >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  pages.forEach((pageLines, index) => {
    const pageId = pageObjectIds[index];
    const contentId = contentObjectIds[index];
    const stream = renderPage(pageLines, index + 1, pages.length);

    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> ` +
      `/Contents ${contentId} 0 R >>`;

    objects[contentId] =
      `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = '%PDF-1.4\n%RTI\n';
  const offsets: number[] = [0];

  for (let id = 1; id < objects.length; id += 1) {
    const object = objects[id];
    if (!object) continue;
    offsets[id] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${id} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let id = 1; id < objects.length; id += 1) {
    const offset = offsets[id] || 0;
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf +=
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}
