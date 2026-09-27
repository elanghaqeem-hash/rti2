'use client';

import React, { useState, useRef, useEffect } from 'react';
import { HexMark } from '../brand/HexMark';
import { BRAND_CONFIG } from '@/lib/config/contact';
import {
  MessageSquare,
  X,
  Send,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const RisetinAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Halo! Saya Risetin Assistant dari PT Riset Teknologi Indonesia. Kami mendampingi organisasi dari perancangan arsitektur, rekayasa software, operasional 24/7, hingga keamanan siber dan kepatuhan regulasi. Ada yang dapat kami bantu diskusikan?',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) throw new Error('Chat API returned error');

      const data = await response.text();
      setMessages([
        ...nextMessages,
        {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content: data,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages([
        ...nextMessages,
        {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content:
            'Maaf, terjadi kendala saat menghubungkan ke asisten. Anda dapat menghubungi kami langsung via WhatsApp di +62 856-6872-2734.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getHandoffUrl = () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || 'Konsultasi kebutuhan teknologi';
    const text = encodeURIComponent(`Halo Tim Risetin, saya ingin berkonsultasi mengenai: "${lastUserMessage}"`);
    return `https://wa.me/6285668722734?text=${text}`;
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-4 py-3 rounded-full bg-navy-900 text-white shadow-2xl border border-navy-700 hover:scale-105 hover:bg-navy-700 transition-all group"
          aria-label="Talk to Risetin AI Assistant"
        >
          <div className="relative">
            <HexMark size={28} glow={true} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-navy-900 animate-pulse" />
          </div>
          <span className="font-extrabold text-xs tracking-wide pr-1">
            Talk to Risetin
          </span>
        </button>
      )}

      {/* Slide-Over Chat Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl border-l border-line flex flex-col justify-between animate-slide-left">
          {/* Header */}
          <div className="bg-navy-900 text-white p-4 flex items-center justify-between border-b border-navy-700">
            <div className="flex items-center gap-3">
              <HexMark size={32} glow={true} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm leading-none">Risetin Assistant</h3>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gold-500 text-navy-900">
                    AI
                  </span>
                </div>
                <span className="text-[10px] text-slate-300">
                  PT Riset Teknologi Indonesia
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setMessages([
                    {
                      id: 'welcome',
                      role: 'assistant',
                      content:
                        'Percakapan diatur ulang. Ada topik layanan atau asesmen yang ingin Anda diskusikan?',
                    },
                  ])
                }
                className="p-2 text-slate-400 hover:text-white rounded-lg"
                title="Reset Percakapan"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
                title="Tutup Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* AI Disclaimer Ribbon */}
          <div className="bg-beige-50 px-4 py-2 border-b border-beige-200 text-[10px] text-muted text-center leading-tight">
            Jawaban dibuat oleh AI dan dapat keliru. Untuk keputusan penting, konfirmasi dengan tim kami.
          </div>

          {/* Messages Flow */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-grey-50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="shrink-0 mt-1">
                    <HexMark size={20} />
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-navy-900 text-white rounded-tr-none'
                      : 'bg-white text-navy-900 border border-line shadow-sm rounded-tl-none'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted py-2">
                <span className="w-2 h-2 rounded-full bg-gold-500 animate-ping" />
                <span>Risetin Assistant sedang menyusun jawaban...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Conversation Starters (Quick Chips) */}
          <div className="p-3 bg-white border-t border-line">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">
              Pertanyaan Populer:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Apa saja 13 layanan Risetin?',
                'Berapa lama proses VAPT?',
                'Bagaimana kesiapan UU PDP?',
                'Jadwalkan konsultasi 30 menit',
              ].map((starter, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(starter)}
                  className="px-2.5 py-1 rounded-full bg-grey-50 border border-line hover:border-gold-500 text-[11px] text-navy-900 transition"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>

          {/* Handoff Buttons Strip */}
          <div className="px-3 py-2 bg-beige-50 border-t border-beige-200 flex items-center justify-between text-xs">
            <a
              href={getHandoffUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-900"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Lanjut ke WhatsApp</span>
            </a>

            <a
              href={BRAND_CONFIG.contact.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Booking 30 Menit</span>
            </a>
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-line flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Tuliskan pertanyaan Anda..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-line text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-xl bg-gold-500 text-navy-900 hover:bg-gold-300 transition disabled:opacity-40"
              aria-label="Kirim"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
