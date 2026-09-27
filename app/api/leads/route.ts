import { NextResponse } from 'next/server';
import { saveLead, getLeads } from '@/lib/scoring/leads';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, role, company, sector, email, whatsapp, needSummary, toolSlug, source, consent } = body;

    // Strict UU PDP Consent validation
    if (!consent) {
      return NextResponse.json(
        { error: 'Persetujuan pemrosesan data pribadi (UU PDP) wajib diberikan.' },
        { status: 400 }
      );
    }

    if (!name || !email || !company) {
      return NextResponse.json(
        { error: 'Nama, email kerja, dan nama instansi wajib diisi.' },
        { status: 400 }
      );
    }

    const lead = saveLead({
      name: String(name).trim(),
      role: String(role || 'Not Specified').trim(),
      company: String(company).trim(),
      sector: String(sector || 'general').trim(),
      email: String(email).trim().toLowerCase(),
      whatsapp: whatsapp ? String(whatsapp).trim() : undefined,
      needSummary: needSummary ? String(needSummary).trim() : undefined,
      toolSlug: toolSlug ? String(toolSlug).trim() : undefined,
      source: source ? String(source).trim() : 'website_tool',
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      score: lead.score,
      status: lead.status,
      message: 'Inquiry successfully registered under UU PDP compliance.',
    });
  } catch (error) {
    console.error('Lead submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing lead submission.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const leads = getLeads();
  return NextResponse.json({ success: true, leads });
}
