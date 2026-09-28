'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSearch, Loader2, Upload } from 'lucide-react';
import type { ProjectEstimate } from '@/lib/project-estimator/types';

type DocumentRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  parseStatus: string;
  extractedFields: Array<{ key: string; value: string; confidence: number; evidence?: string }>;
  securityFlags: string[];
  error?: string | null;
  createdAt?: string;
};

export function EstimatorDocumentPanel({
  sessionId,
  resumeToken,
  onEstimateUpdate,
  onRiskFlags,
}: {
  sessionId: string;
  resumeToken: string;
  onEstimateUpdate: (estimate: Omit<ProjectEstimate, 'trace'>) => void;
  onRiskFlags: (flags: any[]) => void;
}) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await fetch(
      `/api/v1/project-estimator/documents?sessionId=${encodeURIComponent(sessionId)}`,
      {
        cache: 'no-store',
        headers: { 'X-RTI-Resume-Token': resumeToken },
      },
    );
    const data = await response.json().catch(() => null);
    if (response.ok) setDocuments(Array.isArray(data?.documents) ? data.documents : []);
  };

  useEffect(() => {
    void load();
  }, [sessionId, resumeToken]);

  const upload = async (file: File | null) => {
    if (!file || working) return;
    setWorking(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('sessionId', sessionId);
      form.append('resumeToken', resumeToken);
      form.append('file', file);
      const response = await fetch('/api/v1/project-estimator/documents', {
        method: 'POST',
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Dokumen tidak dapat diproses.');
      if (data.document?.estimate) onEstimateUpdate(data.document.estimate);
      if (Array.isArray(data.document?.riskFlags)) onRiskFlags(data.document.riskFlags);
      setMessage(
        data.document?.securityFlags?.length
          ? 'Dokumen disimpan, tetapi terdeteksi pola instruksi mencurigakan. Konten tidak digunakan untuk mengubah aturan AI.'
          : data.document?.extractedFields?.length
            ? `${data.document.extractedFields.length} parameter scope diekstrak dan menunggu validasi.`
            : data.document?.error || 'Dokumen tersimpan. Tidak ada parameter terstruktur yang dapat dipastikan secara otomatis.',
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload gagal.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="mt-5 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold text-navy-900">
            <FileSearch className="h-4 w-4 text-gold-600" />
            Document-Driven Scoping
          </div>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted">
            Upload RFP/TOR/KAK, asset list, Swagger/Postman, spreadsheet, atau wireframe. Parameter hasil ekstraksi dicatat bersama provenance dan confidence; dokumen tidak diperlakukan sebagai instruksi.
          </p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white">
          {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload Document
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.xlsx,.csv,.json,.png,.jpg,.jpeg"
            disabled={working}
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              void upload(file);
              event.currentTarget.value = '';
            }}
          />
        </label>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-[11px] leading-relaxed text-blue-900">
          {message}
        </div>
      )}

      {documents.length > 0 && (
        <div className="mt-4 space-y-2">
          {documents.map((document) => (
            <div key={document.id} className="rounded-xl border border-line bg-grey-50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-xs font-extrabold text-navy-900">{document.fileName}</div>
                  <div className="mt-1 text-[9px] text-muted">
                    {(document.fileSize / 1024 / 1024).toFixed(2)} MB · {document.parseStatus} · SHA-256 {document.sha256?.slice(0, 12)}…
                  </div>
                </div>
                {document.securityFlags.length > 0 ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[9px] font-extrabold text-rose-700">
                    <AlertTriangle className="h-3 w-3" /> Security flag
                  </span>
                ) : document.extractedFields.length > 0 ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> {document.extractedFields.length} fields extracted
                  </span>
                ) : null}
              </div>

              {document.extractedFields.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {document.extractedFields.slice(0, 8).map((field) => (
                    <span key={field.key} className="rounded-full border border-line bg-white px-2.5 py-1 text-[9px] font-bold text-navy-900">
                      {field.key} · {Math.round(Number(field.confidence || 0) * 100)}%
                    </span>
                  ))}
                </div>
              )}

              {document.error && (
                <div className="mt-2 text-[10px] leading-relaxed text-amber-800">{document.error}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[9px] leading-relaxed text-muted">
        PDF/image extraction memerlukan model AI yang dikonfigurasi. DOCX/XLSX diproses secara lokal. Upload produksi memerlukan malware scanner dan private storage (R2/secure filesystem).
      </p>
    </section>
  );
}
