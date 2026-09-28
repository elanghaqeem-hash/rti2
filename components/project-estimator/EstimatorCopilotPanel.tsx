'use client';

import React, { useState } from 'react';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import type { ProjectEstimate } from '@/lib/project-estimator/types';

type NextQuestion = {
  key: string;
  label: string;
  helpText: string;
  options: Array<{ value: string; label: string }>;
  required: boolean;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function EstimatorCopilotPanel({
  sessionId,
  resumeToken,
  onEstimateUpdate,
}: {
  sessionId: string;
  resumeToken: string;
  onEstimateUpdate: (estimate: Omit<ProjectEstimate, 'trace'>) => void;
}) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [provider, setProvider] = useState('');
  const [questions, setQuestions] = useState<NextQuestion[]>([]);
  const [updatedFields, setUpdatedFields] = useState<Array<{ key: string; value: string; confidence: number }>>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Saya dapat membantu memperjelas scope berdasarkan parameter estimator. Jawab dengan kondisi aktual; bila belum diketahui, tuliskan bahwa informasi tersebut belum tersedia.',
    },
  ]);

  const send = async (text?: string) => {
    const message = String(text ?? input).trim();
    if (!message || working) return;
    setInput('');
    setWorking(true);
    setMessages((current) => [...current, { role: 'user', content: message }]);

    try {
      const response = await fetch('/api/v1/project-estimator/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, resumeToken, message }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Copilot tidak tersedia.');

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: String(data.reply || 'Scope diperbarui.') },
      ]);
      setQuestions(Array.isArray(data.nextQuestions) ? data.nextQuestions : []);
      setUpdatedFields(Array.isArray(data.updatedFields) ? data.updatedFields : []);
      setDegraded(Boolean(data.degraded));
      setProvider(String(data.provider || ''));
      if (data.estimate) onEstimateUpdate(data.estimate);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'Copilot tidak dapat memproses permintaan saat ini.',
        },
      ]);
      setDegraded(true);
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-white px-4 py-4 text-left sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
            <Bot className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-navy-900">AI Scoping Copilot</span>
            <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">
              Menangkap parameter scope, menandai provenance, dan meminta klarifikasi berdampak tinggi.
            </span>
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted" />}
      </button>

      {open && (
        <div className="border-t border-blue-100">
          <div className="max-h-[360px] space-y-3 overflow-y-auto bg-grey-50/70 p-4 sm:p-5">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-xs leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-tr-md bg-navy-900 text-white'
                      : 'rounded-tl-md border border-line bg-white text-navy-900 shadow-sm'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {working && (
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gold-600" />
                Menganalisis scope dan memvalidasi parameter...
              </div>
            )}
          </div>

          {updatedFields.length > 0 && (
            <div className="border-t border-line bg-emerald-50/60 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                <WandSparkles className="h-3.5 w-3.5" />
                Parameter extracted
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {updatedFields.map((field) => (
                  <span key={field.key} className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-900">
                    {field.key} · {Math.round(field.confidence * 100)}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {questions.length > 0 && (
            <div className="border-t border-line px-4 py-3 sm:px-5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Next-best questions</div>
              <div className="mt-2 space-y-2">
                {questions.slice(0, 3).map((question) => (
                  <div key={question.key} className="rounded-xl border border-line bg-grey-50 p-3">
                    <div className="text-[11px] font-extrabold text-navy-900">
                      {question.label}{question.required ? ' *' : ''}
                    </div>
                    {question.options.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {question.options.slice(0, 6).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => void send(`${question.label}: ${option.label}`)}
                            disabled={working}
                            className="rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-bold text-navy-900 transition hover:border-gold-500 disabled:opacity-50"
                          >
                            {option.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => void send(`${question.label}: belum tahu`)}
                          disabled={working}
                          className="rounded-full border border-dashed border-line bg-white px-2.5 py-1 text-[10px] font-bold text-muted disabled:opacity-50"
                        >
                          Belum tahu
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-line bg-white p-3 sm:p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder="Contoh: aplikasi menggunakan SSO, sekitar 60 endpoint, pengujian authenticated..."
                className="min-h-12 flex-1 resize-none rounded-xl border border-line px-3 py-2.5 text-xs text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={working || !input.trim()}
                className="inline-flex min-h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-navy-900 transition hover:bg-gold-300 disabled:opacity-40"
                aria-label="Kirim ke AI Scoping Copilot"
              >
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[9px] leading-relaxed text-muted">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-gold-600" />
                AI hanya mengekstrak dan menjelaskan scope. Estimasi tetap dihitung engine deterministik.
              </span>
              <span>
                {provider ? `Mode: ${provider}${degraded ? ' · graceful fallback' : ''}` : 'Audit trail aktif'}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
