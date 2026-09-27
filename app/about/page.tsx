import React from 'react';
import type { Metadata } from 'next';
import { BRAND_CONFIG } from '@/lib/config/contact';
import {
  Compass,
  Layers,
  ShieldCheck,
  Wrench,
  TrendingUp,
  Users,
  MapPin,
  Mail,
  Phone,
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About PT Riset Teknologi Indonesia (Risetin)',
  description:
    'Profil resmi PT Riset Teknologi Indonesia (Risetin / RTI) sebagai mitra teknologi end-to-end yang menggabungkan strategi, rekayasa perangkat lunak, tata kelola, dan keamanan siber.',
};

export default function AboutPage() {
  const values = [
    {
      title: 'Business-Led',
      description:
        'Technology is an engine for business growth, not an expense center. Every architecture, blueprint, and code commit maps directly to measurable business outcomes.',
      icon: Compass,
    },
    {
      title: 'End-to-End Delivery',
      description:
        'From high-level strategic roadmap through production deployment, ongoing support, and compliance assurance, we eliminate fragmented multi-vendor finger-pointing.',
      icon: Layers,
    },
    {
      title: 'Security by Design',
      description:
        'Security, data privacy (UU PDP), and regulatory compliance are baked into the system architecture from day zero, never bolted on as an afterthought.',
      icon: ShieldCheck,
    },
    {
      title: 'Practical & Grounded',
      description:
        'We deliver battle-tested solutions tailored to local Indonesian regulatory realities (OJK, BI, BSSN, Kominfo) and operational enterprise constraints.',
      icon: Wrench,
    },
    {
      title: 'Scalable & Future-Proof',
      description:
        'Architectures designed for horizontal scale, resilient fault tolerance, and modular evolution as organizational complexity and data volumes grow.',
      icon: TrendingUp,
    },
    {
      title: 'Collaborative & Capability-Building',
      description:
        'We work alongside your internal teams, transferring institutional knowledge and fostering workforce maturity so your organization remains self-sufficient.',
      icon: Users,
    },
  ];

  return (
    <div className="w-full bg-white">
      {/* Hero Header */}
      <section className="bg-navy-900 text-white py-16 sm:py-24 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-bold uppercase tracking-wider mb-4">
              Corporate Identity
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              About {BRAND_CONFIG.legalName}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              Operating under the brand <strong>{BRAND_CONFIG.brandName} ({BRAND_CONFIG.acronym})</strong>, we are an integrated technology and cybersecurity consulting firm headquartered in Jakarta.
            </p>
          </div>
        </div>
      </section>

      {/* Corporate Positioning & Legal Mandate */}
      <section className="py-16 sm:py-20 border-b border-line bg-beige-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Strategic Foundation
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
                An Integrated Alternative to Fragmented IT Vendors
              </h2>
              <p className="text-navy-900 text-sm sm:text-base leading-relaxed">
                Modern enterprise technology demands more than isolated software vendors, standalone security penetration testers, or theoretical management consulting. Disconnected technology initiatives create operational friction, architectural dead ends, and compliance exposure.
              </p>
              <p className="text-muted text-sm sm:text-base leading-relaxed">
                {BRAND_CONFIG.legalName} was founded to provide a balanced, end-to-end partner capable of translating board-level strategy into robust software engineering, resilient cloud operations, proactive cybersecurity, and continuous workforce empowerment.
              </p>
            </div>

            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-line shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-navy-900 border-b border-line pb-3">
                Legal & Corporate Information
              </h3>
              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <span className="text-muted block text-[11px] uppercase font-semibold">Entity Legal Name</span>
                  <span className="font-bold text-navy-900">{BRAND_CONFIG.legalName}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px] uppercase font-semibold">Modern Brand Identity</span>
                  <span className="font-bold text-navy-900">{BRAND_CONFIG.brandName} &bull; Acronym: {BRAND_CONFIG.acronym}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px] uppercase font-semibold">Core Disciplines</span>
                  <span className="font-medium text-navy-900">
                    Technology Advisory, Software Engineering, Operations Support, Enterprise GRC, Cybersecurity, People Development
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[11px] uppercase font-semibold">Regulatory Alignment</span>
                  <span className="font-medium text-navy-900">
                    Compliant with UU No. 27/2022 (UU PDP), ISO/IEC Standards, and National Cybersecurity Frameworks
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Core Values: Why Risetin */}
      <section className="py-20 bg-white border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-600/20">
              Our Principles
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
              Why Forward-Thinking Enterprises Partner with Risetin
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted">
              Six foundational principles that govern every client engagement, technical review, and architecture decision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((val, idx) => {
              const Icon = val.icon;
              return (
                <div
                  key={idx}
                  className="bg-grey-50 rounded-2xl p-6 border border-line hover:border-gold-500/50 hover:bg-white hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white text-navy-900 flex items-center justify-center mb-5 border border-line group-hover:text-blue-600 group-hover:border-blue-600/30 transition shadow-sm">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-navy-900 mb-2">
                    {val.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    {val.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Head Office Location & Contact */}
      <section className="py-16 sm:py-20 bg-grey-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gold-600">
                Headquarters
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
                Located in Jakarta&apos;s Central Business Corridor
              </h2>
              <div className="space-y-3 pt-2 text-sm text-navy-900">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-navy-900">{BRAND_CONFIG.legalName}</strong>
                    <span className="text-muted leading-relaxed">{BRAND_CONFIG.contact.address.fullAddress}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gold-500 shrink-0" />
                  <a href={BRAND_CONFIG.contact.whatsappUrl} className="hover:text-blue-600">
                    WhatsApp: {BRAND_CONFIG.contact.whatsapp}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gold-500 shrink-0" />
                  <a href={`mailto:${BRAND_CONFIG.contact.email}`} className="hover:text-blue-600">
                    {BRAND_CONFIG.contact.email}
                  </a>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-navy-900 text-white font-bold text-xs hover:bg-navy-700 transition"
                >
                  Schedule an In-Person or Virtual Meeting &rarr;
                </Link>
              </div>
            </div>

            {/* Interactive OpenStreetMap preview frame */}
            <div className="lg:col-span-6 bg-white p-3 rounded-2xl border border-line shadow-sm overflow-hidden h-[300px] relative">
              <iframe
                title="Office Map - Graha Mustika Ratu"
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: '0.75rem' }}
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=106.8400%2C-6.2450%2C106.8480%2C-6.2390&layer=mapnik&marker=-6.2420%2C106.8440"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
