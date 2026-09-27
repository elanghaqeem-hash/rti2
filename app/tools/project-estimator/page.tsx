'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';
import { useParameterGroups } from '@/components/parameters/useParameterOptions';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calculator,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Printer,
  Save,
  Send,
  ShieldCheck,
  Plus,
  Trash2,
  MessageCircle,
  Calendar,
} from 'lucide-react';
import type {
  EstimatorBootstrap,
  EstimatorQuestion,
  ProjectEstimate,
  RfqContent,
  RfqRecord,
  SessionInput,
  SessionProfile,
} from '@/lib/project-estimator/types';

type RfqAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  scanStatus: string;
  createdAt: string;
};

const defaultProfile = {
  companyName: '',
  industry: '',
  companySize: '',
  employeeCount: undefined,
  officeCount: undefined,
  location: '',
  country: 'Indonesia',
  website: '',
  contactName: '',
  contactTitle: '',
  department: '',
  email: '',
  phone: '',
  whatsapp: '',
  preferredChannel: 'email',
};

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function conditionalMatch(question: EstimatorQuestion, answers: Record<string, unknown>) {
  return question.conditions.every((condition) => {
    const actual = answers[condition.sourceKey];
    const compare = condition.compareValue ?? '';
    if (condition.operator === 'truthy') return Boolean(actual);
    if (condition.operator === 'falsy') return !actual;
    if (condition.operator === 'not_equals') return String(actual) !== compare;
    if (condition.operator === 'includes') {
      return Array.isArray(actual)
        ? actual.map(String).includes(compare)
        : String(actual ?? '').includes(compare);
    }
    if (['gt','gte','lt','lte'].includes(condition.operator)) {
      const left = Number(actual);
      const right = Number(compare);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
      if (condition.operator === 'gt') return left > right;
      if (condition.operator === 'gte') return left >= right;
      if (condition.operator === 'lt') return left < right;
      return left <= right;
    }
    return String(actual) === compare;
  });
}

function questionVisible(
  question: EstimatorQuestion,
  mode: 'quick' | 'detailed',
  serviceId: string,
  answers: Record<string, unknown>,
) {
  if (question.serviceId && question.serviceId !== serviceId) return false;
  if (mode === 'quick' ? !question.quickMode : !question.detailedMode) return false;
  return conditionalMatch(question, answers);
}

export default function ProjectEstimatorPage() {
  const parameterGroups = useParameterGroups([
    'assessment.industries',
    'assessment.company_sizes',
    'project.business_objectives',
    'contact.preferred_channels',
  ]);
  const industries = parameterGroups['assessment.industries'] || [];
  const companySizes = parameterGroups['assessment.company_sizes'] || [];
  const objectives = parameterGroups['project.business_objectives'] || [];
  const preferredChannels = parameterGroups['contact.preferred_channels'] || [];

  const [bootstrap, setBootstrap] = useState<EstimatorBootstrap | null>(null);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'quick' | 'detailed'>('quick');
  const [profile, setProfile] = useState<SessionProfile>(defaultProfile);
  const [projectName, setProjectName] = useState('');
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [targetTimeline, setTargetTimeline] = useState('');
  const [budgetExpectation, setBudgetExpectation] = useState('');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [sessionId, setSessionId] = useState('');
  const [resumeToken, setResumeToken] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [estimate, setEstimate] = useState<(Omit<ProjectEstimate, 'trace'>) | null>(null);
  const [rfq, setRfq] = useState<RfqRecord | null>(null);
  const [attachments, setAttachments] = useState<RfqAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const [useAi, setUseAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/v1/project-estimator/bootstrap', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Estimator configuration unavailable.');
        setBootstrap(data);
        if (data.services?.[0]?.id) setServiceId((current) => current || data.services[0].id);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Estimator configuration unavailable.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const token = new URLSearchParams(hash).get('resume')?.trim() || '';
    if (!token) return;

    let cancelled = false;
    setWorking(true);
    fetch('/api/v1/project-estimator/session', {
      cache: 'no-store',
      headers: { 'X-RTI-Resume-Token': token },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || 'Saved draft could not be restored.');
        if (cancelled) return;
        setResumeToken(token);
        setSessionId(data.sessionId);
        setMode(data.input.mode);
        setProjectName(data.input.projectName || '');
        setSelectedObjectives(Array.isArray(data.input.businessObjectives) ? data.input.businessObjectives : []);
        setServiceId(data.input.serviceId || '');
        setTargetTimeline(data.input.targetTimeline || '');
        setBudgetExpectation(data.input.budgetExpectation || '');
        setProfile({ ...defaultProfile, ...(data.input.profile || {}) });
        setAnswers(data.input.answers || {});
        if (data.estimate) setEstimate(data.estimate);
        if (data.rfq) {
          setRfq(data.rfq);
          setStep(6);
          fetch(`/api/v1/project-estimator/rfq/${data.rfq.id}/attachments`, {
            cache: 'no-store',
            headers: { 'X-RTI-Resume-Token': token },
          })
            .then(async (attachmentResponse) => {
              const attachmentData = await attachmentResponse.json().catch(() => null);
              if (!cancelled && attachmentResponse.ok) {
                setAttachments(Array.isArray(attachmentData?.attachments) ? attachmentData.attachments : []);
              }
            })
            .catch(() => undefined);
        } else if (data.estimate) {
          setStep(5);
        } else {
          setStep(4);
        }
        setSavedAt(new Date().toISOString());
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
        setMessage('Saved project draft restored securely.');
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Saved draft could not be restored.');
      })
      .finally(() => {
        if (!cancelled) setWorking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedService = bootstrap?.services.find((service) => service.id === serviceId);
  const questions = useMemo(
    () => (bootstrap?.questions || []).filter((question) => questionVisible(question, mode, serviceId, answers)),
    [bootstrap, mode, serviceId, answers],
  );

  const groupedServices = useMemo(() => {
    const categories = bootstrap?.categories || [];
    return categories.map((category) => ({
      ...category,
      services: (bootstrap?.services || []).filter((service) => service.categoryId === category.id),
    })).filter((category) => category.services.length > 0);
  }, [bootstrap]);

  const progress = Math.round(((step + 1) / 7) * 100);
  const publicDisclaimer =
    bootstrap?.publicSettings?.public_disclaimer ||
    'This estimate is indicative and is not a binding commercial offer. Final scope, pricing and terms require RTI review.';
  const whatsappTemplate =
    bootstrap?.publicSettings?.whatsapp_message_template ||
    'Hello RTI, I have completed Project Estimator. My RFQ reference is {{rfq_number}}. I would like to discuss the project.';
  const whatsappBase = bootstrap?.publicSettings?.whatsapp_url || '';
  const whatsappHref =
    rfq && whatsappBase
      ? `${whatsappBase}${whatsappBase.includes('?') ? '&' : '?'}text=${encodeURIComponent(
          whatsappTemplate.replaceAll('{{rfq_number}}', rfq.rfqNumber),
        )}`
      : '';

  const toggleObjective = (value: string) => {
    setSelectedObjectives((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const setAnswer = (key: string, value: unknown) => {
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  const updateRfqList = (
    key: 'projectObjective' | 'scopeOfWork' | 'technicalRequirements' | 'deliverables' | 'assumptions',
    items: string[],
  ) => {
    setRfq((current) =>
      current ? { ...current, content: { ...current.content, [key]: items } } : current,
    );
  };

  const input: SessionInput = {
    mode,
    projectName: projectName.trim(),
    businessObjectives: selectedObjectives,
    serviceId,
    targetTimeline: targetTimeline.trim(),
    budgetExpectation: budgetExpectation.trim(),
    profile: {
      ...profile,
      employeeCount: profile.employeeCount ? Number(profile.employeeCount) : undefined,
      officeCount: profile.officeCount ? Number(profile.officeCount) : undefined,
    },
    answers,
  };

  const validateBeforeEstimate = () => {
    if (!projectName.trim() || !profile.companyName.trim() || !profile.industry ||
        !profile.contactName.trim() || !profile.email.trim() || !serviceId) {
      setMessage('Complete project, company, service, and business contact information before calculation.');
      return false;
    }
    const missing = questions.filter((q) => q.required).filter((q) => {
      const value = answers[q.key];
      return value === undefined || value === null || value === '' || value === false;
    });
    if (missing.length) {
      setMessage(`Complete required scope information: ${missing.slice(0, 3).map((q) => q.label).join(', ')}${missing.length > 3 ? '…' : ''}`);
      return false;
    }
    return true;
  };

  const canPersistDraft =
    Boolean(projectName.trim()) &&
    Boolean(profile.companyName.trim()) &&
    Boolean(profile.industry) &&
    Boolean(profile.contactName.trim()) &&
    /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(profile.email.trim()) &&
    Boolean(serviceId);

  const saveDraft = async () => {
    if (!canPersistDraft) {
      setMessage('Complete project name, company, industry, contact name, email, and service before saving the draft.');
      return null;
    }
    setWorking(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/project-estimator/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          sessionId: sessionId || undefined,
          resumeToken: resumeToken || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Project draft could not be saved.');
      setSessionId(data.sessionId);
      setResumeToken(data.resumeToken);
      setSavedAt(new Date().toISOString());
      setMessage('Saved to RTI database. Use the secure resume link to continue later.');
      return data as { sessionId: string; resumeToken: string };
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Project draft could not be saved.');
      return null;
    } finally {
      setWorking(false);
    }
  };

  const copyResumeLink = async () => {
    if (!resumeToken || typeof window === 'undefined') return;
    const link = `${window.location.origin}/tools/project-estimator#resume=${encodeURIComponent(resumeToken)}`;
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Secure resume link copied. Anyone with this link can access this draft, so share it carefully.');
    } catch {
      setMessage(link);
    }
  };

  const calculate = async () => {
    if (!validateBeforeEstimate()) return;
    setWorking(true);
    setMessage('');
    try {
      const sessionResponse = await fetch('/api/v1/project-estimator/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          sessionId: sessionId || undefined,
          resumeToken: resumeToken || undefined,
        }),
      });
      const sessionData = await sessionResponse.json();
      if (!sessionResponse.ok) throw new Error(sessionData?.error || 'Could not save project.');
      setSessionId(sessionData.sessionId);
      setResumeToken(sessionData.resumeToken);
      setSavedAt(new Date().toISOString());

      const estimateResponse = await fetch('/api/v1/project-estimator/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionData.sessionId, resumeToken: sessionData.resumeToken }),
      });
      const estimateData = await estimateResponse.json();
      if (!estimateResponse.ok) throw new Error(estimateData?.error || 'Could not calculate estimate.');
      setEstimate(estimateData.estimate);
      setRfq(null);
      setStep(5);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Calculation failed.');
    } finally {
      setWorking(false);
    }
  };

  const generateRfq = async () => {
    if (!estimate || !sessionId) return;
    setWorking(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/project-estimator/rfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, estimateId: estimate.id, useAi, resumeToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'RFQ could not be generated.');
      setRfq(data.rfq);
      setAttachments([]);
      setStep(6);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'RFQ generation failed.');
    } finally {
      setWorking(false);
    }
  };

  const uploadAttachment = async (file: File | null) => {
    if (!file || !rfq || !resumeToken) return;
    setUploadingAttachment(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('resumeToken', resumeToken);
      const response = await fetch(`/api/v1/project-estimator/rfq/${rfq.id}/attachments`, {
        method: 'POST',
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Supporting document could not be uploaded.');
      setAttachments(Array.isArray(data?.attachments) ? data.attachments : []);
      setMessage('Supporting document uploaded and security-checked.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Supporting document upload failed.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const saveRfq = async () => {
    if (!rfq) return;
    setWorking(true);
    try {
      const response = await fetch(`/api/v1/project-estimator/rfq/${rfq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: rfq.content, resumeToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'RFQ could not be saved.');
      setRfq(data.rfq);
      setMessage(`RFQ saved as version ${data.rfq.version}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'RFQ save failed.');
    } finally {
      setWorking(false);
    }
  };

  const submitRfq = async () => {
    if (!rfq || !consent) {
      setMessage('Privacy consent is required before RFQ submission.');
      return;
    }
    if (turnstileRequired && !turnstileToken) {
      setMessage('Complete the security verification before RFQ submission.');
      return;
    }
    setWorking(true);
    try {
      const response = await fetch(`/api/v1/project-estimator/rfq/${rfq.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent, turnstileToken, resumeToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'RFQ could not be submitted.');
      setRfq(data.rfq);
      setMessage(`RFQ ${data.rfq.rfqNumber} submitted to RTI for review.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'RFQ submission failed.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <main className="min-h-[70vh] bg-grey-50 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-gold-600" /></main>;
  }

  if (!bootstrap) {
    return (
      <main className="min-h-[70vh] bg-grey-50 py-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-8 w-8 text-amber-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-navy-900">Project Estimator configuration is not ready</h1>
          <p className="mt-2 text-sm text-muted">{message || 'RTI Admin must apply the latest database migration.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-grey-50">
      <section className="border-b border-navy-700 bg-navy-900 py-10 text-white sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-gold-300">
              <Calculator className="h-3.5 w-3.5" /> RTI Digital Advisory Platform
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Project Estimator & RFQ Builder</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Turn a business need into structured scope, complexity, delivery effort, indicative investment and a reviewable RFQ.
            </p>
          </div>
          <div className="mt-7">
            <div className="mb-2 flex justify-between text-[11px] font-bold text-slate-300">
              <span>Step {step + 1} of 7</span><span>{progress}% complete</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-navy-700"><div className="h-full bg-gold-500 transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {message && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">{message}</div>}

        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
          {step === 0 && (
            <div>
              <h2 className="text-xl font-extrabold text-navy-900">Choose assessment mode</h2>
              <p className="mt-1 text-sm text-muted">Quick Estimate focuses on core sizing. Detailed RFQ adds more discovery information.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[
                  ['quick','Quick Estimate','3–5 minute indicative scope, complexity, duration and investment.'],
                  ['detailed','Detailed RFQ Builder','Deeper discovery designed for a more complete request for quotation.'],
                ].map(([value,title,desc]) => (
                  <button key={value} onClick={() => setMode(value as 'quick' | 'detailed')} className={`rounded-2xl border p-5 text-left transition ${mode === value ? 'border-gold-500 bg-gold-500/5 ring-2 ring-gold-500/20' : 'border-line hover:border-navy-500'}`}>
                    <div className="flex items-center gap-2 text-sm font-extrabold text-navy-900">{mode === value && <CheckCircle2 className="h-4 w-4 text-gold-600" />}{title}</div>
                    <p className="mt-2 text-xs leading-relaxed text-muted">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-extrabold text-navy-900">Company & business contact</h2>
              <p className="mt-1 text-sm text-muted">Information is used for the project record and RFQ. Required fields are marked *.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Company / institution *" value={profile.companyName} onChange={(v) => setProfile({ ...profile, companyName: v })} />
                <label className="text-xs font-bold text-navy-900">Industry *
                  <select value={profile.industry} onChange={(e) => setProfile({ ...profile, industry: e.target.value })} className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-medium">
                    <option value="">Select industry</option>{industries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <Field label="Contact name *" value={profile.contactName} onChange={(v) => setProfile({ ...profile, contactName: v })} />
                <Field label="Business email *" type="email" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} />
                <label className="text-xs font-bold text-navy-900">Company size
                  <select value={profile.companySize || ''} onChange={(e) => setProfile({ ...profile, companySize: e.target.value })} className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-medium">
                    <option value="">Select scale</option>
                    {companySizes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <Field label="Number of employees" type="number" value={profile.employeeCount} onChange={(v) => setProfile({ ...profile, employeeCount: v ? Number(v) : undefined })} />
                <Field label="Number of offices / locations" type="number" value={profile.officeCount} onChange={(v) => setProfile({ ...profile, officeCount: v ? Number(v) : undefined })} />
                <Field label="Location / city" value={profile.location} onChange={(v) => setProfile({ ...profile, location: v })} />
                <Field label="Country" value={profile.country} onChange={(v) => setProfile({ ...profile, country: v })} />
                <Field label="Title / role" value={profile.contactTitle} onChange={(v) => setProfile({ ...profile, contactTitle: v })} />
                <Field label="Department" value={profile.department} onChange={(v) => setProfile({ ...profile, department: v })} />
                <Field label="Phone" value={profile.phone} onChange={(v) => setProfile({ ...profile, phone: v })} />
                <Field label="WhatsApp" value={profile.whatsapp} onChange={(v) => setProfile({ ...profile, whatsapp: v })} />
                <Field label="Website" value={profile.website} onChange={(v) => setProfile({ ...profile, website: v })} />
                <label className="text-xs font-bold text-navy-900">Preferred communication
                  <select value={profile.preferredChannel || 'email'} onChange={(e) => setProfile({ ...profile, preferredChannel: e.target.value })} className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-medium">
                    {preferredChannels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-extrabold text-navy-900">Business requirement</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Project name *" value={projectName} onChange={setProjectName} placeholder="e.g. ISO 27001 implementation program" />
                <Field label="Target timeline" value={targetTimeline} onChange={setTargetTimeline} placeholder="e.g. Q1 2027 / 12 weeks" />
                <Field label="Budget expectation (optional)" value={budgetExpectation} onChange={setBudgetExpectation} placeholder="e.g. Rp150–250 juta" />
              </div>
              <div className="mt-6 text-xs font-bold text-navy-900">Business objectives</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {objectives.map((objective) => (
                  <button key={objective.value} onClick={() => toggleObjective(objective.value)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${selectedObjectives.includes(objective.value) ? 'border-navy-900 bg-navy-900 text-white' : 'border-line text-navy-900 hover:border-gold-500'}`}>{objective.label}</button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-extrabold text-navy-900">Select RTI service</h2>
              <p className="mt-1 text-sm text-muted">The catalog is loaded from the RTI database and can be managed by Admin.</p>
              <div className="mt-6 space-y-6">
                {groupedServices.map((category) => (
                  <div key={category.id}>
                    <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted">{category.name}</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {category.services.map((service) => (
                        <button key={service.id} onClick={() => { setServiceId(service.id); setAnswers({}); }} className={`rounded-xl border p-4 text-left ${serviceId === service.id ? 'border-gold-500 bg-gold-500/5 ring-2 ring-gold-500/20' : 'border-line hover:border-navy-500'}`}>
                          <div className="text-sm font-extrabold text-navy-900">{service.name}</div>
                          <p className="mt-1 text-xs leading-relaxed text-muted">{service.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="flex items-start gap-3">
                <Building2 className="mt-1 h-5 w-5 text-gold-600" />
                <div>
                  <h2 className="text-xl font-extrabold text-navy-900">Project scope & complexity</h2>
                  <p className="mt-1 text-sm text-muted">Questions adapt to {selectedService?.name || 'the selected service'} and the selected assessment mode.</p>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                {questions.map((question) => (
                  <Question key={question.id} question={question} value={answers[question.key]} onChange={(value) => setAnswer(question.key, value)} />
                ))}
              </div>
              <div className="mt-7 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-relaxed text-blue-900">
                {publicDisclaimer}
              </div>
            </div>
          )}

          {step === 5 && estimate && (
            <div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><h2 className="text-xl font-extrabold text-navy-900">Your Project Estimate</h2></div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Complexity" value={estimate.complexityLevel} sub={`${estimate.complexityIndex}% index`} />
                <Metric label="Project Size" value={estimate.projectSize} sub={`${estimate.effortDays} estimated effort-days`} />
                <Metric label="Duration" value={`${estimate.durationMinWeeks}–${estimate.durationMaxWeeks} weeks`} sub="Indicative delivery window" />
                <Metric label="RFQ Readiness" value={`${estimate.readinessScore}%`} sub={estimate.readinessScore >= 80 ? 'Ready for proposal review' : 'Requires clarification'} />
              </div>
              {resumeToken && (
                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-emerald-900">Draft saved securely</div>
                    <div className="mt-1 text-[11px] text-emerald-800">
                      {savedAt ? `Last persistence: ${new Date(savedAt).toLocaleString('id-ID')}` : 'Stored in RTI database'}
                    </div>
                  </div>
                  <button onClick={copyResumeLink} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-extrabold text-emerald-900">
                    <Save className="h-4 w-4" /> Copy Secure Resume Link
                  </button>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-gold-500/30 bg-beige-50 p-6">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Indicative Investment</div>
                <div className="mt-1 text-2xl font-extrabold text-navy-900">
                  {estimate.priceConfigured ? `${money(estimate.priceMin)} – ${money(estimate.priceMax)}` : 'Commercial Review Required'}
                </div>
                <p className="mt-2 text-xs text-muted">
                  {estimate.priceConfigured
                    ? publicDisclaimer
                    : 'Official RTI pricing baseline has not yet been calibrated for this service. No fabricated price is shown.'}
                </p>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-line p-5">
                  <h3 className="text-sm font-extrabold text-navy-900">Indicative team</h3>
                  <div className="mt-3 space-y-2">{estimate.team.map((item) => <div key={item.role} className="flex justify-between gap-4 text-xs"><span>{item.role} × {item.quantity}</span><strong>{item.estimatedDays} days</strong></div>)}</div>
                </div>
                <div className="rounded-2xl border border-line p-5">
                  <h3 className="text-sm font-extrabold text-navy-900">Main estimate factors</h3>
                  <div className="mt-3 space-y-2 text-xs text-muted">{estimate.factors.length ? estimate.factors.map((factor) => <div key={factor}>• {factor}</div>) : <div>No high-complexity factor was selected.</div>}</div>
                </div>
              </div>
              <label className="mt-5 flex items-start gap-2 rounded-xl border border-line p-4 text-xs text-navy-900">
                <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="mt-0.5" />
                <span><strong>AI-assisted RFQ note</strong><br /><span className="text-muted">Optional. AI may improve narrative clarity but cannot change approved pricing parameters or invent customer requirements.</span></span>
              </label>
              <button onClick={generateRfq} disabled={working} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-xs font-extrabold text-navy-900 hover:bg-gold-300 disabled:opacity-50">
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} Generate RFQ
              </button>
            </div>
          )}

          {step === 6 && rfq && (
            <div id="rfq-print">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-gold-700">Request for Quotation</div>
                  <h2 className="mt-1 text-xl font-extrabold text-navy-900">{rfq.rfqNumber}</h2>
                  <p className="mt-1 text-xs text-muted">Version {rfq.version} · Status: {rfq.status}</p>
                </div>
                <div className="flex gap-2 print:hidden">
                  <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900"><Printer className="h-4 w-4" /> Print / Save PDF</button>
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <RfqSection title="Project Information">
                  <div className="space-y-1 text-xs">
                    <div><strong>Project:</strong> {rfq.content.projectInformation.projectName}</div>
                    <div><strong>Company:</strong> {rfq.content.projectInformation.company}</div>
                    <div><strong>Industry:</strong> {rfq.content.projectInformation.industry}</div>
                    <div><strong>Service:</strong> {rfq.content.projectInformation.service}</div>
                  </div>
                </RfqSection>
                <RfqSection title="Background">
                  <textarea value={rfq.content.background} onChange={(e) => setRfq({ ...rfq, content: { ...rfq.content, background: e.target.value } })} className="min-h-32 w-full rounded-xl border border-line p-3 text-xs leading-relaxed print:border-0 print:p-0" />
                </RfqSection>
              </div>

              <div className="mt-5 space-y-5">
                <EditableListSection title="Project Objectives" items={rfq.content.projectObjective} editable={rfq.status === 'draft'} onChange={(items) => updateRfqList('projectObjective', items)} />
                <EditableListSection title="Scope of Work" items={rfq.content.scopeOfWork} editable={rfq.status === 'draft'} onChange={(items) => updateRfqList('scopeOfWork', items)} />
                <EditableListSection title="Technical Requirements" items={rfq.content.technicalRequirements} editable={rfq.status === 'draft'} onChange={(items) => updateRfqList('technicalRequirements', items)} />
                <EditableListSection title="Deliverables" items={rfq.content.deliverables} editable={rfq.status === 'draft'} onChange={(items) => updateRfqList('deliverables', items)} />
                <EditableListSection title="Assumptions" items={rfq.content.assumptions} editable={rfq.status === 'draft'} onChange={(items) => updateRfqList('assumptions', items)} />
                {rfq.content.missingInformation.length > 0 && <ListSection title="Information Requiring Clarification" items={rfq.content.missingInformation} />}
                {rfq.content.aiAssistedDraft && (
                  <RfqSection title="AI-assisted draft — review before submission"><p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">{rfq.content.aiAssistedDraft}</p></RfqSection>
                )}
              </div>

              <div className="mt-5 rounded-xl border border-line p-4 text-xs">
                <strong>Timeline:</strong> {rfq.content.timelineExpectation}<br />
                <strong>Commercial:</strong> {rfq.content.commercialRequirement}
              </div>

              <RfqSection title="Supporting Documents">
                <div className="space-y-3">
                  {attachments.length > 0 ? (
                    <div className="space-y-2">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex flex-col gap-1 rounded-xl bg-grey-50 px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="truncate font-bold text-navy-900">{attachment.fileName}</div>
                            <div className="text-[10px] text-muted">
                              {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB · {attachment.scanStatus}
                            </div>
                          </div>
                          <div className="font-mono text-[9px] text-muted">{attachment.sha256.slice(0, 12)}…</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">No supporting documents uploaded.</p>
                  )}
                  {rfq.status === 'draft' && (
                    <label className="block rounded-xl border border-dashed border-line p-4 text-xs text-navy-900 print:hidden">
                      <span className="font-extrabold">Upload supporting document</span>
                      <span className="mt-1 block text-[11px] text-muted">
                        PDF, DOCX, XLSX, PNG or JPEG. Production upload is accepted only when RTI secure storage and malware scanning are configured.
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                        disabled={uploadingAttachment}
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          void uploadAttachment(file);
                          event.currentTarget.value = '';
                        }}
                        className="mt-3 block w-full text-xs"
                      />
                    </label>
                  )}
                </div>
              </RfqSection>

              {rfq.status === 'draft' && (
                <div className="mt-6 border-t border-line pt-5 print:hidden">
                  <label className="flex items-start gap-2 text-xs text-navy-900">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                    <span>I confirm that the information is authorized for submission to RTI and consent to processing for project qualification, proposal preparation and follow-up.</span>
                  </label>
                  <div className="mt-4 max-w-sm">
                    <TurnstileWidget onTokenChange={setTurnstileToken} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={saveRfq} disabled={working} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-xs font-bold text-navy-900"><Save className="h-4 w-4" /> Save RFQ Version</button>
                    <button onClick={submitRfq} disabled={working || !consent || (turnstileRequired && !turnstileToken)} className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-xs font-extrabold text-navy-900 disabled:opacity-40"><Send className="h-4 w-4" /> Submit to RTI</button>
                  </div>
                </div>
              )}

              {rfq.status !== 'draft' && (
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">RFQ submitted. RTI can now qualify the opportunity and proceed to presales/commercial review.</div>
                  <div className="flex flex-wrap gap-2 print:hidden">
                    {whatsappHref && (
                      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white">
                        <MessageCircle className="h-4 w-4" /> Discuss with RTI
                      </a>
                    )}
                    <Link href="/consultation" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 py-3 text-xs font-extrabold text-navy-900">
                      <Calendar className="h-4 w-4" /> Schedule Consultation
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {step < 5 && (
            <div className="mt-8 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {step >= 2 && (
                  <button onClick={saveDraft} disabled={working || !canPersistDraft} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 py-3 text-xs font-bold text-navy-900 disabled:opacity-30">
                    <Save className="h-4 w-4" /> Save Draft
                  </button>
                )}
                {resumeToken && (
                  <button onClick={copyResumeLink} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900">
                    Copy Resume Link
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 py-3 text-xs font-bold text-navy-900 disabled:opacity-30"><ArrowLeft className="h-4 w-4" /> Back</button>
              {step < 4 ? (
                <button onClick={() => { setMessage(''); setStep((s) => s + 1); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-xs font-extrabold text-white">Continue <ArrowRight className="h-4 w-4" /></button>
              ) : (
                <button onClick={calculate} disabled={working} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-xs font-extrabold text-navy-900 disabled:opacity-50">{working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />} Calculate Project Estimate</button>
              )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted">
          <span>Database-driven · Explainable estimation · AI-assisted, not AI-dependent</span>
          <Link href="/privacy" className="font-bold text-navy-900 hover:text-blue-600">Privacy Notice</Link>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string | number | undefined; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="text-xs font-bold text-navy-900">{label}
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-medium outline-none focus:border-gold-500" />
    </label>
  );
}

function Question({ question, value, onChange }: { question: EstimatorQuestion; value: unknown; onChange: (value: unknown) => void }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <label className="text-sm font-extrabold text-navy-900">{question.label}{question.required ? ' *' : ''}</label>
      {question.helpText && <p className="mt-1 text-xs text-muted">{question.helpText}</p>}
      {question.options.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => (
            <button type="button" key={option.id} onClick={() => onChange(option.value)} className={`rounded-xl border px-3 py-3 text-left text-xs font-semibold transition ${String(value) === option.value ? 'border-gold-500 bg-gold-500/5 text-navy-900 ring-2 ring-gold-500/20' : 'border-line text-muted hover:border-navy-500'}`}>{option.label}</button>
          ))}
        </div>
      ) : question.fieldType === 'checkbox' ? (
        <label className="mt-3 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /> Yes</label>
      ) : (
        <input type={question.fieldType === 'number' || question.fieldType === 'currency' || question.fieldType === 'slider' ? 'number' : question.fieldType === 'date' ? 'date' : 'text'} value={typeof value === 'string' || typeof value === 'number' ? value : ''} onChange={(e) => onChange(question.fieldType === 'number' || question.fieldType === 'currency' || question.fieldType === 'slider' ? Number(e.target.value) : e.target.value)} className="mt-3 w-full rounded-xl border border-line px-3 py-3 text-sm" />
      )}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="rounded-xl border border-line bg-white p-4"><div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">{label}</div><div className="mt-1 text-lg font-extrabold text-navy-900">{value}</div><div className="mt-1 text-[11px] text-muted">{sub}</div></div>;
}

function RfqSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-line p-5"><h3 className="mb-3 text-sm font-extrabold text-navy-900">{title}</h3>{children}</section>;
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return <RfqSection title={title}><ul className="space-y-2 text-xs leading-relaxed text-muted">{items.map((item, index) => <li key={index} className="flex gap-2"><span className="font-bold text-gold-600">•</span><span>{item}</span></li>)}</ul></RfqSection>;
}

function EditableListSection({
  title,
  items,
  editable,
  onChange,
}: {
  title: string;
  items: string[];
  editable: boolean;
  onChange: (items: string[]) => void;
}) {
  return (
    <RfqSection title={title}>
      <div className="space-y-2">
        {items.map((item, index) =>
          editable ? (
            <div key={index} className="flex items-start gap-2">
              <textarea
                value={item}
                onChange={(event) => {
                  const next = [...items];
                  next[index] = event.target.value;
                  onChange(next);
                }}
                className="min-h-16 flex-1 rounded-xl border border-line p-3 text-xs leading-relaxed"
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="rounded-lg border border-rose-200 p-2 text-rose-700"
                aria-label={`Remove ${title} item`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div key={index} className="flex gap-2 text-xs leading-relaxed text-muted">
              <span className="font-bold text-gold-600">•</span><span>{item}</span>
            </div>
          ),
        )}
        {editable && (
          <button
            type="button"
            onClick={() => onChange([...items, ''])}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-bold text-navy-900"
          >
            <Plus className="h-4 w-4" /> Add item
          </button>
        )}
      </div>
    </RfqSection>
  );
}
