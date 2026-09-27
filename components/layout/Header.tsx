'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LogoFull } from '../brand/LogoFull';
import {
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Shield,
  Layers,
  Wrench,
  MessageSquare,
} from 'lucide-react';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesDropdown, setServicesDropdown] = useState(false);
  const [toolsDropdown, setToolsDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-line transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div className="flex-shrink-0">
            <LogoFull variant="dark" size="md" href="/" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-semibold text-navy-900">
            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setServicesDropdown(true)}
              onMouseLeave={() => setServicesDropdown(false)}
            >
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-grey-50 transition"
                aria-expanded={servicesDropdown}
              >
                Services
                <ChevronDown className="w-4 h-4 text-muted" />
              </button>

              {servicesDropdown && (
                <div className="absolute top-full left-0 w-80 bg-white rounded-xl shadow-2xl border border-line p-3 grid gap-1 z-50">
                  <Link
                    href="/services/technology-advisory"
                    className="p-2.5 rounded-lg hover:bg-grey-50 transition flex items-start gap-3"
                    onClick={() => setServicesDropdown(false)}
                  >
                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-navy-900">Technology Advisory</div>
                      <div className="text-[11px] text-muted">Strategy & Roadmap Blueprints</div>
                    </div>
                  </Link>

                  <Link
                    href="/services/software-development"
                    className="p-2.5 rounded-lg hover:bg-grey-50 transition flex items-start gap-3"
                    onClick={() => setServicesDropdown(false)}
                  >
                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-navy-900">Software Engineering</div>
                      <div className="text-[11px] text-muted">Custom Platforms & Architecture</div>
                    </div>
                  </Link>

                  <Link
                    href="/services/cybersecurity"
                    className="p-2.5 rounded-lg hover:bg-grey-50 transition flex items-start gap-3"
                    onClick={() => setServicesDropdown(false)}
                  >
                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-navy-900">Cybersecurity Hub</div>
                      <div className="text-[11px] text-muted">Offensive, Defensive & GRC</div>
                    </div>
                  </Link>

                  <Link
                    href="/services/technology-support"
                    className="p-2.5 rounded-lg hover:bg-grey-50 transition flex items-start gap-3"
                    onClick={() => setServicesDropdown(false)}
                  >
                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-navy-900">Technology Support</div>
                      <div className="text-[11px] text-muted">Managed Ops & SLA Guarantee</div>
                    </div>
                  </Link>

                  <div className="pt-2 border-t border-line mt-1">
                    <Link
                      href="/services"
                      className="block text-center text-xs font-bold text-blue-600 hover:underline py-1"
                      onClick={() => setServicesDropdown(false)}
                    >
                      View All 13 Services Overview →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Tools Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setToolsDropdown(true)}
              onMouseLeave={() => setToolsDropdown(false)}
            >
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-grey-50 transition"
                aria-expanded={toolsDropdown}
              >
                Interactive Tools
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gold-500/20 text-gold-600 font-bold">
                  B2B
                </span>
                <ChevronDown className="w-4 h-4 text-muted" />
              </button>

              {toolsDropdown && (
                <div className="absolute top-full left-0 w-80 bg-white rounded-xl shadow-2xl border border-line p-3 grid gap-1 z-50">
                  <Link
                    href="/tools/maturity-assessment"
                    className="p-2 rounded-lg hover:bg-grey-50 transition text-xs font-semibold text-navy-900 flex items-center justify-between"
                    onClick={() => setToolsDropdown(false)}
                  >
                    <span>Maturity Self-Assessment (10 Domains)</span>
                    <span className="text-[10px] text-gold-600 font-bold">Radar</span>
                  </Link>
                  <Link
                    href="/tools/cyber-quick-check"
                    className="p-2 rounded-lg hover:bg-grey-50 transition text-xs font-semibold text-navy-900 flex items-center justify-between"
                    onClick={() => setToolsDropdown(false)}
                  >
                    <span>NIST Cyber Quick Check</span>
                    <span className="text-[10px] text-blue-600 font-bold">5 Mins</span>
                  </Link>
                  <Link
                    href="/tools/solution-finder"
                    className="p-2 rounded-lg hover:bg-grey-50 transition text-xs font-semibold text-navy-900"
                    onClick={() => setToolsDropdown(false)}
                  >
                    Solution Finder Wizard
                  </Link>
                  <Link
                    href="/tools/security-headers-check"
                    className="p-2 rounded-lg hover:bg-grey-50 transition text-xs font-semibold text-navy-900"
                    onClick={() => setToolsDropdown(false)}
                  >
                    Passive Security Headers Check
                  </Link>
                  <Link
                    href="/tools/project-estimator"
                    className="p-2 rounded-lg hover:bg-grey-50 transition text-xs font-semibold text-navy-900"
                    onClick={() => setToolsDropdown(false)}
                  >
                    Project Estimator & RFQ Builder
                  </Link>
                  <div className="pt-2 border-t border-line mt-1">
                    <Link
                      href="/tools"
                      className="block text-center text-xs font-bold text-blue-600 hover:underline py-1"
                      onClick={() => setToolsDropdown(false)}
                    >
                      Browse All Interactive Tools →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/industries"
              className="px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-grey-50 transition"
            >
              Industries
            </Link>

            <Link
              href="/clients"
              className="px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-grey-50 transition"
            >
              Clients
            </Link>

            <Link
              href="/how-we-work"
              className="px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-grey-50 transition"
            >
              How We Work
            </Link>

            <Link
              href="/about"
              className="px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-grey-50 transition"
            >
              About
            </Link>

            <Link
              href="/contact"
              className="px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-grey-50 transition"
            >
              Contact
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/tools/maturity-assessment"
              className="px-4 py-2 rounded-lg bg-beige-50 border border-beige-200 text-xs font-bold text-navy-900 hover:bg-white transition"
            >
              Request Assessment
            </Link>

            <Link
              href="/contact"
              className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-bold hover:bg-navy-700 transition shadow flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-gold-500" />
              Talk to Risetin
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-navy-900 hover:bg-grey-50"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-line px-4 pt-3 pb-6 space-y-2">
          <Link
            href="/services"
            className="block px-3 py-2 rounded-lg font-bold text-navy-900 hover:bg-grey-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Services (All 13 Pillars)
          </Link>
          <Link
            href="/tools"
            className="block px-3 py-2 rounded-lg font-bold text-navy-900 hover:bg-grey-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Interactive Tools Hub
          </Link>
          <Link
            href="/industries"
            className="block px-3 py-2 rounded-lg font-bold text-navy-900 hover:bg-grey-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Industries
          </Link>
          <Link
            href="/clients"
            className="block px-3 py-2 rounded-lg font-bold text-navy-900 hover:bg-grey-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Clients & Case Studies
          </Link>
          <Link
            href="/how-we-work"
            className="block px-3 py-2 rounded-lg font-bold text-navy-900 hover:bg-grey-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            How We Work
          </Link>
          <Link
            href="/about"
            className="block px-3 py-2 rounded-lg font-bold text-navy-900 hover:bg-grey-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            About PT Riset Teknologi Indonesia
          </Link>
          <Link
            href="/contact"
            className="block px-3 py-2 rounded-lg font-bold text-navy-900 hover:bg-grey-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Contact & 30-Min Consultation
          </Link>

          <div className="pt-4 border-t border-line flex flex-col gap-2">
            <Link
              href="/tools/maturity-assessment"
              className="w-full text-center py-2.5 rounded-lg bg-navy-900 text-white font-bold text-xs"
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
