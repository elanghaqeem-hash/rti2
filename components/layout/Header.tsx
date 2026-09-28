'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogoFull } from '../brand/LogoFull';
import {
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Shield,
  BarChart3,
  Layers,
  Wrench,
  MessageSquare,
  ArrowRight,
  Compass,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesDropdown, setServicesDropdown] = useState(false);
  const [assessmentDropdown, setAssessmentDropdown] = useState(false);
  const [toolsDropdown, setToolsDropdown] = useState(false);
  const [companyDropdown, setCompanyDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-navy-900/95 backdrop-blur-xl border-b border-navy-700/80 shadow-2xl py-0'
          : 'bg-navy-900 border-b border-navy-700/40 py-1'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 xl:px-8">
        <div className="flex items-center justify-between gap-5 h-20">
          {/* Brand Logo - Light variant on Dark Navy header */}
          <div className="flex-shrink-0 flex items-center">
            <LogoFull variant="light" size="md" href="/" showLegalSubtext={false} />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex flex-1 items-center justify-center gap-1 text-[13px] font-semibold text-slate-200 whitespace-nowrap">
            {/* Services Mega Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setServicesDropdown(true)}
              onMouseLeave={() => setServicesDropdown(false)}
              onFocus={() => setServicesDropdown(true)}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setServicesDropdown(false); }}
            >
              <button
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-colors hover:text-white hover:bg-navy-700/60 ${
                  servicesDropdown ? 'text-white bg-navy-700/70' : ''
                }`}
                aria-expanded={servicesDropdown}
                aria-haspopup="true"
                type="button"
              >
                <span>Services</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-gold-300" />
              </button>

              {servicesDropdown && (
                <div className="absolute top-full left-0 w-[420px] bg-navy-900/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-navy-700/80 p-4 grid gap-2 z-50 animate-fade-in text-white">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-gold-300/90 border-b border-navy-700/60">
                    Enterprise Capabilities
                  </div>

                  <Link
                    href="/services/technology-advisory"
                    className="p-3 rounded-xl hover:bg-navy-700/70 transition flex items-start gap-3 group"
                    onClick={() => setServicesDropdown(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-400/20 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white group-hover:text-gold-300 transition">
                        Technology Advisory & Strategy
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Enterprise architecture, IT blueprints & digital roadmaps
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/services/software-development"
                    className="p-3 rounded-xl hover:bg-navy-700/70 transition flex items-start gap-3 group"
                    onClick={() => setServicesDropdown(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 flex items-center justify-center shrink-0 group-hover:bg-cyan-600 group-hover:text-white transition">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white group-hover:text-gold-300 transition">
                        Software Engineering
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        High-throughput web, mobile apps & microservices
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/services/cybersecurity"
                    className="p-3 rounded-xl hover:bg-navy-700/70 transition flex items-start gap-3 group"
                    onClick={() => setServicesDropdown(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-400/20 flex items-center justify-center shrink-0 group-hover:bg-orange-600 group-hover:text-white transition">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white group-hover:text-gold-300 transition">
                        Cybersecurity Hub
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Offensive VAPT, 24/7 Managed SOC & Governance
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/services/technology-support"
                    className="p-3 rounded-xl hover:bg-navy-700/70 transition flex items-start gap-3 group"
                    onClick={() => setServicesDropdown(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white group-hover:text-gold-300 transition">
                        Technology Support & Cloud Ops
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        SRE reliability, 24/7 telemetry & SLA guarantees
                      </div>
                    </div>
                  </Link>

                  <div className="pt-2 border-t border-navy-700/60 mt-1">
                    <Link
                      href="/services"
                      className="block text-center text-xs font-bold text-gold-400 hover:text-gold-300 py-1"
                      onClick={() => setServicesDropdown(false)}
                    >
                      View All 13 Capabilities Overview &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Assessment Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setAssessmentDropdown(true)}
              onMouseLeave={() => setAssessmentDropdown(false)}
              onFocus={() => setAssessmentDropdown(true)}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setAssessmentDropdown(false); }}
            >
              <button
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-colors hover:text-white hover:bg-navy-700/60 ${
                  assessmentDropdown ? 'text-white bg-navy-700/70' : ''
                }`}
                aria-expanded={assessmentDropdown}
                aria-haspopup="true"
                type="button"
              >
                <span>Assessment</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-gold-500 text-navy-900">
                  FREE
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {assessmentDropdown && (
                <div className="absolute top-full left-0 w-[390px] bg-navy-900/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-navy-700/80 p-3 grid gap-1 z-50 text-white animate-fade-in">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-gold-300/90 border-b border-navy-700/60">
                    RTI Technology & Cyber Diagnostic
                  </div>
                  <Link
                    href="/assessment"
                    className="p-3 rounded-xl hover:bg-navy-700/70 transition flex items-start gap-3"
                    onClick={() => setAssessmentDropdown(false)}
                  >
                    <BarChart3 className="w-4 h-4 mt-0.5 text-gold-300 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Technology & Cyber Maturity</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">20 domains · quick or 120-question comprehensive path</div>
                    </div>
                  </Link>
                  <Link
                    href="/tools/cyber-quick-check"
                    className="p-3 rounded-xl hover:bg-navy-700/70 transition flex items-start gap-3"
                    onClick={() => setAssessmentDropdown(false)}
                  >
                    <Shield className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Cybersecurity Maturity / Quick Check</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Rapid cybersecurity posture diagnostic</div>
                    </div>
                  </Link>
                  <Link
                    href="/tools/iso27001-readiness"
                    className="p-3 rounded-xl hover:bg-navy-700/70 transition flex items-start gap-3"
                    onClick={() => setAssessmentDropdown(false)}
                  >
                    <FileCheck className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">ISO 27001 Readiness</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">ISMS readiness diagnostic</div>
                    </div>
                  </Link>
                  <Link
                    href="/tools/pdp-readiness"
                    className="p-3 rounded-xl hover:bg-navy-700/70 transition flex items-start gap-3"
                    onClick={() => setAssessmentDropdown(false)}
                  >
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Data Protection & Privacy</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Privacy, RoPA, DPIA and governance readiness</div>
                    </div>
                  </Link>
                  <div className="pt-2 border-t border-navy-700/60 mt-1">
                    <Link
                      href="/assessment"
                      className="block text-center text-xs font-bold text-gold-400 hover:text-gold-300 py-1"
                      onClick={() => setAssessmentDropdown(false)}
                    >
                      Start Free Maturity Assessment &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Tools Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setToolsDropdown(true)}
              onMouseLeave={() => setToolsDropdown(false)}
              onFocus={() => setToolsDropdown(true)}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setToolsDropdown(false); }}
            >
              <button
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-colors hover:text-white hover:bg-navy-700/60 ${
                  toolsDropdown ? 'text-white bg-navy-700/70' : ''
                }`}
                aria-expanded={toolsDropdown}
                aria-haspopup="true"
                type="button"
              >
                <span>Interactive Tools</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-gold-500/20 text-gold-300 border border-gold-500/30">
                  B2B
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {toolsDropdown && (
                <div className="absolute top-full left-0 w-84 bg-navy-900/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-navy-700/80 p-3 grid gap-1 z-50 text-white animate-fade-in">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-gold-300/90 border-b border-navy-700/60">
                    Self-Service Diagnostic Suite
                  </div>
                  <Link
                    href="/assessment"
                    className="p-2.5 rounded-xl hover:bg-navy-700/70 transition text-xs font-semibold flex items-center justify-between text-slate-200 hover:text-white"
                    onClick={() => setToolsDropdown(false)}
                  >
                    <span>Technology & Cyber Maturity</span>
                    <span className="text-[10px] font-mono text-gold-400 font-bold">20 Domains</span>
                  </Link>
                  <Link
                    href="/tools/cyber-quick-check"
                    className="p-2.5 rounded-xl hover:bg-navy-700/70 transition text-xs font-semibold flex items-center justify-between text-slate-200 hover:text-white"
                    onClick={() => setToolsDropdown(false)}
                  >
                    <span>NIST Cyber Quick Check</span>
                    <span className="text-[10px] font-mono text-blue-400 font-bold">5 Mins</span>
                  </Link>
                  <Link
                    href="/tools/security-headers-check"
                    className="p-2.5 rounded-xl hover:bg-navy-700/70 transition text-xs font-semibold text-slate-200 hover:text-white"
                    onClick={() => setToolsDropdown(false)}
                  >
                    Passive Security Headers Check
                  </Link>
                  <Link
                    href="/tools/solution-finder"
                    className="p-2.5 rounded-xl hover:bg-navy-700/70 transition text-xs font-semibold text-slate-200 hover:text-white"
                    onClick={() => setToolsDropdown(false)}
                  >
                    Enterprise Solution Finder
                  </Link>
                  <Link
                    href="/tools/project-estimator"
                    className="p-2.5 rounded-xl hover:bg-navy-700/70 transition text-xs font-semibold text-slate-200 hover:text-white"
                    onClick={() => setToolsDropdown(false)}
                  >
                    Project Estimator & RFQ Builder
                  </Link>
                  <div className="pt-2 border-t border-navy-700/60 mt-1">
                    <Link
                      href="/tools"
                      className="block text-center text-xs font-bold text-gold-400 hover:text-gold-300 py-1"
                      onClick={() => setToolsDropdown(false)}
                    >
                      Browse All 7 Diagnostic Engines &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" onMouseEnter={() => setCompanyDropdown(true)} onMouseLeave={() => setCompanyDropdown(false)} onFocus={() => setCompanyDropdown(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setCompanyDropdown(false); }}>
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-colors hover:text-white hover:bg-navy-700/60"
                aria-expanded={companyDropdown}
                aria-haspopup="true"
              >
                Explore RTI <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {companyDropdown && (
                <div className="absolute top-full right-0 w-52 rounded-xl border border-navy-700/80 bg-navy-900 shadow-2xl p-2 text-white">
                  {[
                    ['/industries', 'Industries'],
                    ['/clients', 'Clients'],
                    ['/how-we-work', 'How We Work'],
                    ['/about', 'About'],
                    ['/contact', 'Contact'],
                  ].map(([href, label]) => (
                    <Link key={href} href={href} className="block rounded-lg px-3 py-2.5 hover:bg-navy-700/70 hover:text-gold-300" onClick={() => setCompanyDropdown(false)}>{label}</Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Action CTAs */}
          <div className="hidden xl:flex shrink-0 items-center gap-2">
            <Link
              href="/assessment"
              className="whitespace-nowrap px-3 py-2.5 rounded-lg bg-transparent border border-navy-500/80 text-xs font-bold text-slate-200 hover:text-white hover:bg-navy-700 transition"
            >
              Free Assessment
            </Link>

            <Link
              href="/contact"
              className="whitespace-nowrap px-4 py-2.5 rounded-lg bg-gold-500 hover:bg-gold-300 text-navy-900 text-xs font-extrabold transition-all flex items-center gap-2 group"
            >
              <MessageSquare className="w-3.5 h-3.5 text-navy-900 group-hover:scale-110 transition-transform" />
              <span>Talk to Risetin</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="xl:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-navy-700/60"
              aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="rti-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div id="rti-mobile-menu" className="xl:hidden max-h-[calc(100dvh-5rem)] overflow-y-auto bg-navy-900/98 backdrop-blur-2xl border-b border-navy-700 px-5 pt-4 pb-6 space-y-2 text-white">
          <Link
            href="/services"
            className="block px-3 py-2 rounded-lg font-bold text-slate-200 hover:text-white hover:bg-navy-700/50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Services (All 13 Pillars)
          </Link>
          <Link
            href="/assessment"
            className="block px-3 py-2 rounded-lg font-bold text-gold-300 hover:text-white hover:bg-navy-700/50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Assessment
          </Link>
          <Link
            href="/tools"
            className="block px-3 py-2 rounded-lg font-bold text-slate-200 hover:text-white hover:bg-navy-700/50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Interactive Tools Hub
          </Link>
          <Link
            href="/industries"
            className="block px-3 py-2 rounded-lg font-bold text-slate-200 hover:text-white hover:bg-navy-700/50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Industries
          </Link>
          <Link
            href="/clients"
            className="block px-3 py-2 rounded-lg font-bold text-slate-200 hover:text-white hover:bg-navy-700/50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Clients & Case Studies
          </Link>
          <Link
            href="/how-we-work"
            className="block px-3 py-2 rounded-lg font-bold text-slate-200 hover:text-white hover:bg-navy-700/50"
            onClick={() => setMobileMenuOpen(false)}
          >
            How We Work
          </Link>
          <Link
            href="/about"
            className="block px-3 py-2 rounded-lg font-bold text-slate-200 hover:text-white hover:bg-navy-700/50"
            onClick={() => setMobileMenuOpen(false)}
          >
            About PT Riset Teknologi Indonesia
          </Link>
          <Link
            href="/contact"
            className="block px-3 py-2 rounded-lg font-bold text-slate-200 hover:text-white hover:bg-navy-700/50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Contact & 30-Min Consultation
          </Link>

          <div className="pt-4 border-t border-navy-700/60 flex flex-col gap-2">
            <Link
              href="/assessment"
              className="w-full text-center py-3 rounded-xl bg-gold-500 text-navy-900 font-extrabold text-xs"
              onClick={() => setMobileMenuOpen(false)}
            >
              Start Free Maturity Assessment
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
