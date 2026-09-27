'use client';

import React from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';

export function IsoEvidenceAiAssistant(props: {
  assessmentId: string;
  accessToken: string;
  targetRef: string;
  enabled: boolean;
  onBeforeAnalyze: () => Promise<boolean>;
  onAccept: (text: string) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [text, setText] = React.useState('');
  const [provider, setProvider] = React.useState('');
  const [limitations, setLimitations] = React.useState('');
  const [error, setError] = React.useState('');

  async function analyze() {
    if (!props.enabled) return;
    setBusy(true);
    setError('');
    try {
      const ready = await props.onBeforeAnalyze();
      if (!ready) return;

      const response = await fetch(
        '/api/assessments/' + encodeURIComponent(props.assessmentId) + '/ai-analysis',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-assessment-token': props.accessToken,
          },
          body: JSON.stringify({ targetRef: props.targetRef }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'AI analysis is currently unavailable.');
      }
      setText(String(data.suggestion?.text || ''));
      setProvider(String(data.suggestion?.provider || ''));
      setLimitations(String(data.suggestion?.limitations || ''));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI analysis is currently unavailable.');
    } finally {
      setBusy(false);
    }
  }

  if (!props.enabled) {
    return (
      <div className="mt-4 rounded-xl border border-line bg-grey-50 p-4 text-[11px] leading-relaxed text-muted">
        AI evidence analysis is disabled because AI-processing consent was not granted. Manual assessment remains fully available.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-navy-900">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Analyze Evidence with RTI AI
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">
            Advisory only. AI cannot change the deterministic readiness score.
          </p>
        </div>
        <button
          onClick={analyze}
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-[11px] font-extrabold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Analyze
        </button>
      </div>

      {error && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">{error}</div>}

      {text && (
        <div className="mt-4 space-y-3">
          <label className="block text-[11px] font-bold text-navy-900">
            AI Suggested Assessment · edit before accepting if needed
            <textarea
              rows={9}
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="mt-1 w-full rounded-xl border border-blue-200 bg-white p-3 text-xs font-normal leading-relaxed"
            />
          </label>
          {provider && <div className="text-[10px] text-muted">Provider used: {provider}</div>}
          {limitations && <div className="text-[10px] leading-relaxed text-muted">{limitations}</div>}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                props.onAccept(text);
                setText('');
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-3 py-2 text-[11px] font-extrabold text-navy-900"
            >
              <Check className="h-3.5 w-3.5" />
              Accept / Use as Comment
            </button>
            <button
              onClick={() => setText('')}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-[11px] font-bold text-navy-900"
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
