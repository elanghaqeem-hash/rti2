import React from 'react';
import Link from 'next/link';
import { LogoFull } from '../brand/LogoFull';
import { BRAND_CONFIG } from '@/lib/config/contact';
import {
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Shield,
  Calendar,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy-900 text-white border-t border-navy-700">
      {/* Pre-footer Consultation CTA Strip */}
      <div className="border-b border-navy-700/80 bg-navy-900/60 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 text-gold-300 text-xs font-bold uppercase tracking-wider mb-2 border border-gold-500/30">
              <Calendar className="w-3.5 h-3.5" />
              Complimentary Advisory Session
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Ready to Move Your Technology Capability Forward?
            </h3>
            <p className="text-sm text-slate-300 mt-1">
              Book a direct 30-minute initial discovery call with our enterprise architecture and security leads.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/contact"
              className="px-5 py-3 rounded-lg bg-gold-500 text-navy-900 font-bold text-sm hover:bg-gold-300 transition shadow-lg flex items-center gap-2"
            >
              <span>Schedule 30-Min Consultation</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand & Legal Info */}
          <div className="lg:col-span-2 space-y-4">
            <LogoFull variant="light" size="md" showLegalSubtext={true} />
            <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
              {BRAND_CONFIG.positioning.id}
            </p>
            <div className="pt-2 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                <span>{BRAND_CONFIG.contact.address.fullAddress}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-gold-500 shrink-0" />
                <a
                  href={BRAND_CONFIG.contact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-300 transition"
                >
                  WhatsApp: {BRAND_CONFIG.contact.whatsapp}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-gold-500 shrink-0" />
                <a
                  href={`mailto:${BRAND_CONFIG.contact.email}`}
                  className="hover:text-gold-300 transition"
                >
                  {BRAND_CONFIG.contact.email}
                </a>
              </div>
            </div>
          </div>

          {/* Column 1: Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gold-300 mb-4">
              Services Ecosystem
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <Link href="/services/technology-advisory" className="hover:text-white transition">
                  Technology Advisory
                </Link>
              </li>
              <li>
                <Link href="/services/software-development" className="hover:text-white transition">
                  Software Engineering
                </Link>
              </li>
              <li>
                <Link href="/services/technology-support" className="hover:text-white transition">
                  Technology Operations & Support
                </Link>
              </li>
              <li>
                <Link href="/services/technology-blueprint" className="hover:text-white transition">
                  Technology Blueprint & Master Plan
                </Link>
              </li>
              <li>
                <Link href="/services/policy-sop-governance" className="hover:text-white transition">
                  Policy, SOP & Governance
                </Link>
              </li>
              <li>
                <Link href="/services/cybersecurity" className="hover:text-white transition">
                  Cybersecurity Hub (Offensive/Defensive)
                </Link>
              </li>
              <li>
                <Link href="/services/iso-standards" className="hover:text-white transition">
                  ISO/IEC 27001 Readiness
                </Link>
              </li>
              <li>
                <Link href="/services/training-awareness" className="hover:text-white transition">
                  Training & Workforce Upskilling
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Interactive B2B Tools */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gold-300 mb-4">
              Interactive Tools
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <Link href="/tools/maturity-assessment" className="hover:text-white transition flex items-center justify-between">
                  <span>Maturity Assessment</span>
                  <span className="text-[10px] text-gold-400">10 Domains</span>
                </Link>
              </li>
              <li>
                <Link href="/tools/cyber-quick-check" className="hover:text-white transition">
                  Cyber Quick Check (NIST)
                </Link>
              </li>
              <li>
                <Link href="/tools/solution-finder" className="hover:text-white transition">
                  Solution Finder Wizard
                </Link>
              </li>
              <li>
                <Link href="/tools/project-estimator" className="hover:text-white transition">
                  Project Estimator & RFQ
                </Link>
              </li>
              <li>
                <Link href="/tools/security-headers-check" className="hover:text-white transition">
                  Security Headers Check
                </Link>
              </li>
              <li>
                <Link href="/tools/iso27001-readiness" className="hover:text-white transition">
                  ISO 27001 Checklist
                </Link>
              </li>
              <li>
                <Link href="/tools/pdp-readiness" className="hover:text-white transition">
                  UU PDP Readiness Check
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Governance & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gold-300 mb-4">
              Governance & Legal
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <Link href="/about" className="hover:text-white transition">
                  About PT Riset Teknologi Indonesia
                </Link>
              </li>
              <li>
                <Link href="/clients" className="hover:text-white transition">
                  Clients & Evidence Policy
                </Link>
              </li>
              <li>
                <Link href="/how-we-work" className="hover:text-white transition">
                  7-Step Delivery Model
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition">
                  Privacy Policy (UU PDP)
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-white transition">
                  Cookie Preferences
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-white transition">
                  Responsible Disclosure
                </Link>
              </li>
              <li>
                <a href="/.well-known/security.txt" className="hover:text-white transition font-mono text-[11px]">
                  security.txt
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer & PDP Compliance Strip */}
        <div className="mt-12 pt-8 border-t border-navy-700/80 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Resmi dioperasikan oleh <strong>{BRAND_CONFIG.legalName}</strong>. Patuh terhadap ketentuan UU No. 27/2022 tentang Pelindungan Data Pribadi (UU PDP).
            </span>
          </div>
          <div>
            &copy; {currentYear} {BRAND_CONFIG.legalName}. All rights reserved. Brand modern: {BRAND_CONFIG.brandName} ({BRAND_CONFIG.acronym}).
          </div>
        </div>
      </div>
    </footer>
  );
};
