'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LeadModal } from '@/components/tools/LeadModal';
import { useParameterGroups } from '@/components/parameters/useParameterOptions';
import {
  Calculator,
  Code2,
  Shield,
  Layers,
  Clock,
  ArrowRight,
  FileCheck,
} from 'lucide-react';

export default function ProjectEstimatorPage() {
  const [projectType, setProjectType] = useState<'software' | 'vapt'>('software');

  // Software inputs
  const [appType, setAppType] = useState('web_mobile');
  const [modulesCount, setModulesCount] = useState('mid');
  const [integrationsCount, setIntegrationsCount] = useState('multiple');
  const [aiCapability, setAiCapability] = useState('yes');

  // VAPT inputs
  const [vaptScope, setVaptScope] = useState('web_api');
  const [assetCount, setAssetCount] = useState('standard');
  const [testType, setTestType] = useState('grey_box');

  const [showLeadModal, setShowLeadModal] = useState(false);
  const parameterGroups = useParameterGroups([
    'project.types',
    'project.app_types',
    'project.module_complexity',
    'project.integrations',
    'project.ai_capability',
    'project.vapt_scope',
    'project.asset_count',
    'project.test_type',
  ]);
  const projectTypes = parameterGroups['project.types'] || [];
  const appTypeOptions = parameterGroups['project.app_types'] || [];
  const moduleOptions = parameterGroups['project.module_complexity'] || [];
  const integrationOptions = parameterGroups['project.integrations'] || [];
  const aiOptions = parameterGroups['project.ai_capability'] || [];
  const vaptOptions = parameterGroups['project.vapt_scope'] || [];
  const assetOptions = parameterGroups['project.asset_count'] || [];
  const testTypeOptions = parameterGroups['project.test_type'] || [];

  // Estimate computation (Weeks & Sprints)
  let estimatedWeeks = '8 – 12 Weeks';
  let tShirtSize = 'Large (L)';
  let recommendedTeam = '1 Lead Architect, 2 Senior Engineers, 1 QA Engineer, 1 DevSecOps Specialist';

  if (projectType === 'software') {
    if (modulesCount === 'low' && integrationsCount === 'single') {
      estimatedWeeks = '4 – 6 Weeks';
      tShirtSize = 'Medium (M)';
      recommendedTeam = '1 Tech Lead, 2 Fullstack Engineers';
    } else if (modulesCount === 'high' || aiCapability === 'complex') {
      estimatedWeeks = '14 – 20 Weeks';
      tShirtSize = 'Extra-Large (XL)';
      recommendedTeam = '1 Solutions Architect, 4 Senior Engineers, 1 AI Specialist, 1 QA Automation';
    }
  } else {
    // VAPT
    if (assetCount === 'small') {
      estimatedWeeks = '1 – 2 Weeks';
      tShirtSize = 'Small (S)';
      recommendedTeam = '2 Offensive Security Engineers + Retest Support';
    } else if (assetCount === 'large') {
      estimatedWeeks = '3 – 5 Weeks';
      tShirtSize = 'Large (L)';
      recommendedTeam = '1 Lead Pentester, 3 Security Specialists + Executive Briefing';
    } else {
      estimatedWeeks = '2 – 3 Weeks';
      tShirtSize = 'Medium (M)';
      recommendedTeam = '2 Certified Pentesters (OSCP/CEH) + Verification Retest';
    }
  }

  return (
    <div className="w-full bg-white min-h-screen">
      <section className="bg-navy-900 text-white py-12 sm:py-16 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-400/30 text-purple-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Calculator className="w-3.5 h-3.5" />
              Sizing & Effort Calculator
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Project Estimator & RFQ Builder
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              Calculate realistic engineering sprint efforts, team composition, and delivery timelines for custom software and penetration testing engagements.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-grey-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Project Type Switcher */}
          <div className="flex rounded-xl bg-white p-1.5 border border-line shadow-sm max-w-md mx-auto">
            {projectTypes.map((option) => {
              const Icon = option.value === 'vapt' ? Shield : Code2;
              return (
                <button
                  key={option.value}
                  onClick={() => setProjectType(option.value as 'software' | 'vapt')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                    projectType === option.value
                      ? 'bg-navy-900 text-white shadow'
                      : 'text-muted hover:text-navy-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input Controls */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-line shadow-sm space-y-5">
              {projectType === 'software' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                      Platform Form Factor
                    </label>
                    <select
                      value={appType}
                      onChange={(e) => setAppType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-line text-xs font-semibold bg-white"
                    >
                      {appTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                      Scope & Functional Complexity
                    </label>
                    <select
                      value={modulesCount}
                      onChange={(e) => setModulesCount(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-line text-xs font-semibold bg-white"
                    >
                      {moduleOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                      Third-Party Integrations
                    </label>
                    <select
                      value={integrationsCount}
                      onChange={(e) => setIntegrationsCount(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-line text-xs font-semibold bg-white"
                    >
                      {integrationOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                      AI & Advanced Analytics Needs
                    </label>
                    <select
                      value={aiCapability}
                      onChange={(e) => setAiCapability(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-line text-xs font-semibold bg-white"
                    >
                      {aiOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                      Target Surface Scope
                    </label>
                    <select
                      value={vaptScope}
                      onChange={(e) => setVaptScope(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-line text-xs font-semibold bg-white"
                    >
                      {vaptOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                      Target Scale / Endpoints
                    </label>
                    <select
                      value={assetCount}
                      onChange={(e) => setAssetCount(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-line text-xs font-semibold bg-white"
                    >
                      {assetOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                      Testing Methodology
                    </label>
                    <select
                      value={testType}
                      onChange={(e) => setTestType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-line text-xs font-semibold bg-white"
                    >
                      {testTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Output Summary Card */}
            <div className="lg:col-span-5 bg-beige-50 border border-beige-200 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
                  Indicative Effort & Sizing
                </span>
                <h3 className="text-2xl font-extrabold text-navy-900">
                  {estimatedWeeks}
                </h3>
                <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-extrabold bg-navy-900 text-gold-300">
                  T-Shirt Size: {tShirtSize}
                </span>
              </div>

              <div className="pt-4 border-t border-beige-200/80 space-y-2 text-xs">
                <span className="font-bold text-navy-900 block">Recommended Dedicated Squad:</span>
                <p className="text-muted leading-relaxed">{recommendedTeam}</p>
              </div>

              <div className="pt-4 border-t border-beige-200/80 space-y-2 text-xs">
                <span className="font-bold text-navy-900 block">Included Guarantees:</span>
                <p className="text-muted">
                  • Weekly sprint demos & milestone tracking<br />
                  • Compliant security documentation & clean architecture<br />
                  • Free verification retest (for VAPT engagements)
                </p>
              </div>

              <button
                onClick={() => setShowLeadModal(true)}
                className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs transition shadow flex items-center justify-center gap-2"
              >
                <FileCheck className="w-4 h-4 text-navy-900" />
                <span>Export Draft RFQ Package</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {showLeadModal && (
        <LeadModal
          toolSlug="project-estimator"
          toolName="Indicative RFQ & Effort Estimate"
          summaryData={{ projectType, estimatedWeeks, tShirtSize, recommendedTeam }}
          onClose={() => setShowLeadModal(false)}
          onSuccess={() => setShowLeadModal(false)}
        />
      )}
    </div>
  );
}
