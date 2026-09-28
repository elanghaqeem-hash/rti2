import type { RfqContent, RfqRecord } from '@/lib/project-estimator/types';

type PdfLine = { text: string; bold?: boolean; size?: number; gap?: number };

function ascii(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdf(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrap(value: unknown, width = 88) {
  const text = ascii(value);
  if (!text) return ['-'];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function heading(title: string): PdfLine[] {
  return [{ text: title, bold: true, size: 11, gap: 5 }];
}

function paragraph(value: unknown): PdfLine[] {
  return wrap(value).map((text, index, all) => ({ text, size: 9, gap: index === all.length - 1 ? 7 : 1 }));
}

function bullets(items: string[] | undefined): PdfLine[] {
  if (!items?.length) return paragraph('-');
  const out: PdfLine[] = [];
  for (const item of items) {
    const wrapped = wrap(item, 84);
    wrapped.forEach((text, index) => out.push({
      text: `${index === 0 ? '- ' : '  '}${text}`,
      size: 9,
      gap: index === wrapped.length - 1 ? 3 : 1,
    }));
  }
  out.push({ text: '', size: 4, gap: 3 });
  return out;
}

function addSection(lines: PdfLine[], title: string, content: string | string[] | undefined) {
  lines.push(...heading(title));
  lines.push(...(Array.isArray(content) ? bullets(content) : paragraph(content)));
}

function contentLines(rfq: RfqRecord) {
  const c: RfqContent = rfq.content;
  const p = c.projectInformation;
  const lines: PdfLine[] = [
    { text: `RFQ Number: ${rfq.rfqNumber}`, bold: true, size: 10, gap: 3 },
    { text: `Version: ${rfq.version} | Status: ${rfq.status}`, size: 8, gap: 9 },
  ];
  addSection(lines, 'Project Information', [
    `Project: ${p.projectName || '-'}`,
    `Company: ${p.company || '-'}`,
    `Industry: ${p.industry || '-'}`,
    `Contact: ${p.contactPerson || '-'}`,
    `Service: ${p.service || '-'}`,
  ]);
  addSection(lines, 'Background', c.background);
  addSection(lines, 'Project Objectives', c.projectObjective);
  addSection(lines, 'Scope of Work', c.scopeOfWork);
  addSection(lines, 'Technical Requirements', c.technicalRequirements);
  addSection(lines, 'Deliverables', c.deliverables);
  addSection(lines, 'Assumptions', c.assumptions);
  addSection(lines, 'Customer Responsibilities', c.customerResponsibilities);
  addSection(lines, 'RTI Responsibilities', c.rtiResponsibilities);
  addSection(lines, 'Timeline Expectation', c.timelineExpectation);
  addSection(lines, 'Service Level Expectation', c.serviceLevelExpectation);
  addSection(lines, 'Compliance Requirement', c.complianceRequirement);
  addSection(lines, 'Security Requirement', c.securityRequirement);
  addSection(lines, 'Commercial Requirement', c.commercialRequirement);
  if (c.missingInformation?.length) addSection(lines, 'Information Requiring Clarification', c.missingInformation);
  if (c.aiAssistedDraft) addSection(lines, 'AI-assisted Draft (review required)', c.aiAssistedDraft);
  lines.push({ text: 'Indicative scoping document only. This RFQ is not a binding commercial quotation, certification, or audit assurance.', size: 7, gap: 0 });
  return lines;
}

function paginate(lines: PdfLine[]) {
  const pages: PdfLine[][] = [];
  let page: PdfLine[] = [];
  let used = 0;
  const max = 630;
  for (const line of lines) {
    const size = line.size || 9;
    const height = size * 1.35 + (line.gap || 0);
    if (page.length && used + height > max) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(line);
    used += height;
  }
  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}

function streamForPage(lines: PdfLine[], pageNumber: number, pageCount: number) {
  const commands: string[] = [];
  commands.push('0.035 0.090 0.165 rg');
  commands.push('BT /F2 15 Tf 1 0 0 1 50 798 Tm (RTI | Riset Teknologi Indonesia) Tj ET');
  commands.push('0.72 0.52 0.16 rg 50 785 495 2 re f');
  commands.push('0.08 0.10 0.14 rg');
  commands.push('BT /F2 12 Tf 1 0 0 1 50 765 Tm (Request for Quotation) Tj ET');
  let y = 744;
  for (const line of lines) {
    const size = line.size || 9;
    const font = line.bold ? 'F2' : 'F1';
    const safe = escapePdf(ascii(line.text));
    commands.push(`BT /${font} ${size} Tf 1 0 0 1 50 ${y.toFixed(2)} Tm (${safe}) Tj ET`);
    y -= size * 1.35 + (line.gap || 0);
  }
  commands.push('0.35 0.37 0.42 rg');
  commands.push(`BT /F1 7 Tf 1 0 0 1 50 30 Tm (risetin.co.id | Page ${pageNumber} of ${pageCount}) Tj ET`);
  return commands.join('\n') + '\n';
}

export function buildRfqPdf(rfq: RfqRecord) {
  const pages = paginate(contentLines(rfq));
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  const kids: string[] = [];
  let objectNumber = 5;
  pages.forEach((lines, index) => {
    const pageObject = objectNumber++;
    const contentObject = objectNumber++;
    kids.push(`${pageObject} 0 R`);
    const stream = streamForPage(lines, index + 1, pages.length);
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject] = `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}endstream`;
  });
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(' ')}] >>`;

  let pdf = '%PDF-1.4\n%RTI\n';
  const offsets: number[] = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = Buffer.byteLength(pdf, 'ascii');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}
