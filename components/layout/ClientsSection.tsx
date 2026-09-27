'use client';

import React, { useState } from 'react';
import { CLIENT_DATA, ClientRecord } from '@/lib/data/clients';
import { Building2, Shield, Landmark, Zap } from 'lucide-react';

const SECTORS = [
  { id: 'all', label: 'All Sectors', icon: Building2 },
  { id: 'banking_insurance', label: 'Banking & Financial', icon: Landmark },
  { id: 'government_bumn', label: 'Government & BUMN', icon: Shield },
  { id: 'fintech_payments', label: 'Fintech & Payments', icon: Zap },
  { id: 'energy_foundation', label: 'Energy & Corporate', icon: Building2 },
];

export const ClientsSection: React.FC = () => {
  const [activeSector, setActiveSector] = useState<string>('all');

  const visibleClients = CLIENT_DATA.filter((client) => {
    // Strict consent enforcement: only 'approved' and 'text_only'
    if (client.consentStatus !== 'approved' && client.consentStatus !== 'text_only') {
      return false;
    }
    if (activeSector === 'all') return true;
    return client.sector === activeSector;
  });

  return (
    <section className="py-20 bg-grey-50 border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-600/20">
            Selected Organizations
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
            Trusted by Regulated Enterprises & Public Institutions
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted">
            Delivering software engineering, cybersecurity, technology blueprints, and governance across Indonesia&apos;s critical industries.
          </p>
        </div>

        {/* Sector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {SECTORS.map((s) => {
            const Icon = s.icon;
            const isActive = activeSector === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSector(s.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-navy-900 text-white shadow'
                    : 'bg-white text-navy-700 border border-line hover:border-gold-500/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-gold-300' : 'text-muted'}`} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Client Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {visibleClients.map((client) => (
            <div
              key={client.id}
              className="bg-white p-5 rounded-xl border border-line hover:border-gold-500/40 hover:shadow-md transition-all flex flex-col justify-center items-center text-center min-h-[100px] group"
            >
              <span className="font-bold text-sm text-navy-900 group-hover:text-blue-600 transition-colors">
                {client.name}
              </span>
              <span className="text-[10px] text-muted uppercase tracking-wider font-semibold mt-1">
                {client.sectorLabel}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-muted">
            Organizations represented include past and ongoing advisory, architecture, security, and technology capability engagements.
          </p>
        </div>
      </div>
    </section>
  );
};
