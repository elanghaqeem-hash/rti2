type QuotationPdfData = {
  docNumber: string;
  company: string;
  projectName: string;
  serviceName: string;
  finalPrice: number;
  paymentTerms: Record<string, unknown>;
  validUntil: string;
  status: string;
};

function ascii(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function esc(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function paymentSummary(value: Record<string, unknown>) {
  if (Array.isArray(value.milestones)) {
    return `Milestone: ${value.milestones.map((v) => `${v}%`).join(' / ')}; TOP ${Number(value.topDays || 14)} hari`;
  }
  if (value.upfrontPct) {
    return `${Number(value.upfrontPct)}% di muka; TOP ${Number(value.topDays || 14)} hari`;
  }
  return `Sesuai kesepakatan; TOP ${Number(value.topDays || 14)} hari`;
}

export function buildQuotationPdf(data: QuotationPdfData) {
  const lines = [
    { text: 'RTI | PT Riset Teknologi Indonesia', bold: true, size: 16 },
    { text: 'COMMERCIAL QUOTATION', bold: true, size: 13 },
    { text: `Quotation No: ${data.docNumber}`, bold: true, size: 10 },
    { text: `Status: ${data.status}`, size: 9 },
    { text: '', size: 6 },
    { text: `Client: ${data.company}`, bold: true, size: 10 },
    { text: `Project: ${data.projectName}`, size: 10 },
    { text: `Service: ${data.serviceName}`, size: 10 },
    { text: '', size: 6 },
    { text: 'Commercial Value', bold: true, size: 11 },
    { text: money(data.finalPrice), bold: true, size: 15 },
    { text: `Payment Terms: ${paymentSummary(data.paymentTerms)}`, size: 9 },
    { text: `Valid Until: ${new Date(data.validUntil).toLocaleDateString('id-ID')}`, size: 9 },
    { text: '', size: 6 },
    { text: 'Notes', bold: true, size: 11 },
    { text: 'Nilai quotation mengikuti scope dan asumsi yang disetujui. Perubahan material pada scope dapat memerlukan revisi quotation.', size: 9 },
    { text: 'Pajak, biaya pihak ketiga, dan ketentuan kontraktual mengikuti quotation/kontrak final yang telah disetujui.', size: 9 },
    { text: 'Dokumen ini berlaku sesuai masa validitas di atas dan harus melalui approval internal RTI sebelum dikirim ke klien.', size: 9 },
  ];

  const commands: string[] = [
    '0.035 0.090 0.165 rg',
    'BT /F2 15 Tf 1 0 0 1 50 798 Tm (RTI | Riset Teknologi Indonesia) Tj ET',
    '0.72 0.52 0.16 rg 50 785 495 2 re f',
    '0.08 0.10 0.14 rg',
  ];
  let y = 755;
  for (const line of lines) {
    const size = line.size || 9;
    const font = line.bold ? 'F2' : 'F1';
    commands.push(`BT /${font} ${size} Tf 1 0 0 1 50 ${y} Tm (${esc(ascii(line.text))}) Tj ET`);
    y -= size * 1.8;
  }
  commands.push('0.35 0.37 0.42 rg');
  commands.push('BT /F1 7 Tf 1 0 0 1 50 30 Tm (risetin.co.id | PT Riset Teknologi Indonesia) Tj ET');
  const stream = commands.join('\n') + '\n';

  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Count 1 /Kids [5 0 R] >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  objects[5] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>';
  objects[6] = `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}endstream`;

  let output = '%PDF-1.4\n%RTI\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(output, 'ascii');
    output += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output, 'ascii');
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) {
    output += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output, 'ascii');
}
