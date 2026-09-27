export interface KbChunk {
  id: string;
  sourceUrl: string;
  title: string;
  section: string;
  lang: 'id' | 'en';
  content: string;
}

export const KNOWLEDGE_BASE_CHUNKS: KbChunk[] = [
  {
    id: 'kb_brand_identity',
    sourceUrl: '/about',
    title: 'Brand Identity & Legal Name',
    section: 'Corporate Governance',
    lang: 'id',
    content:
      'PT Riset Teknologi Indonesia adalah entitas legal resmi perusahaan. Brand modern yang digunakan adalah Risetin, dan singkatan visualnya adalah RTI. Risetin bergerak sebagai mitra teknologi end-to-end yang menggabungkan 6 pilar seimbang: Strategy (Technology Advisory), Software (Rekayasa Perangkat Lunak), Support (Operasional Teknologi), Governance (Kebijakan, SOP & ISO 27001), Cybersecurity (Offensive, Defensive & Governance), dan People (Pelatihan & Pengembangan Kapabilitas).',
  },
  {
    id: 'kb_services_overview',
    sourceUrl: '/services',
    title: '13 Layanan Terintegrasi',
    section: 'Ecosystem',
    lang: 'id',
    content:
      '13 layanan resmi Risetin mencakup: 1) Technology Advisory (Roadmap & Strategi TI), 2) Software Development (Aplikasi Web, Mobile & API Skala Enterprise), 3) Technology Support (Managed Service Cloud & Operasional 24/7), 4) Technology Blueprint (IT Master Plan & Arsitektur Enterprise), 5) Policy, SOP & Governance (GRC & Piramida Dokumen), 6) Maturity Assessment (Asesmen Kematangan 10 Domain), 7) Cybersecurity Hub, 8) Offensive Security & VAPT (Uji Penetrasi Web/Mobile/API/Network), 9) Defensive Security & SOC/MDR (Pemantauan 24/7), 10) Cybersecurity Governance (NIST CSF & POJK/SEOJK), 11) ISO & Standards (Kesiapan ISO/IEC 27001:2022), 12) Training & Awareness (Upskilling & Secure Coding), 13) Arsitektur Solusi.',
  },
  {
    id: 'kb_tools_overview',
    sourceUrl: '/tools',
    title: 'Modul Interaktif & Diagnostik B2B',
    section: 'Interactive Tools',
    lang: 'id',
    content:
      'Risetin menyediakan alat asesmen mandiri gratis tanpa login: Maturity Assessment (10 domain dengan radar chart), Cyber Quick Check (kuesioner 15 pertanyaan berbasis NIST CSF 2.0), Solution Finder (rekomendasi paket layanan dalam 4 langkah), Website Security Headers Check (analisis pasif header HTTP dan sertifikat TLS anti-SSRF), Project Estimator & RFQ Builder, ISO 27001 Readiness Checklist, dan UU PDP Readiness Check.',
  },
  {
    id: 'kb_contact_info',
    sourceUrl: '/contact',
    title: 'Kontak Resmi & Alamat Kantor',
    section: 'Contact',
    lang: 'id',
    content:
      'Alamat kantor pusat PT Riset Teknologi Indonesia: Graha Mustika Ratu Lantai 7, Jl. Jend. Gatot Subroto Kav. 74-75, Menteng Dalam, Tebet, Jakarta Selatan, DKI Jakarta 12870. WhatsApp resmi: +62 856-6872-2734 (link: https://wa.me/6285668722734). Email resmi: admin@risetin.co.id. Situs web: risetin.co.id. Pengunjung dapat menjadwalkan konsultasi awal 30 menit (30-Minute Initial Consultation) secara gratis melalui Cal.com.',
  },
  {
    id: 'kb_compliance_pdp',
    sourceUrl: '/privacy',
    title: 'Pelindungan Data Pribadi (UU PDP)',
    section: 'Legal & Privacy',
    lang: 'id',
    content:
      'PT Riset Teknologi Indonesia mematuhi Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). Seluruh formulir menggunakan persetujuan eksplisit (consent) yang tidak dicentang otomatis, data pribadi diminimalkan, IP mentah di-hash, dan log percakapan AI anonim dibersihkan setelah 30 hari. Hubungi dpo@risetin.co.id untuk permohonan hak subjek data.',
  },
];

export function searchKnowledgeBase(query: string, limit = 4): KbChunk[] {
  const q = query.toLowerCase();
  const scored = KNOWLEDGE_BASE_CHUNKS.map((chunk) => {
    let score = 0;
    const words = q.split(/\s+/).filter(Boolean);
    for (const w of words) {
      if (chunk.content.toLowerCase().includes(w)) score += 3;
      if (chunk.title.toLowerCase().includes(w)) score += 5;
      if (chunk.section.toLowerCase().includes(w)) score += 2;
    }
    return { chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, limit)
    .map((item) => item.chunk);
}
