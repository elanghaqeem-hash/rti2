import { getRuntimeDatabase } from '@/lib/server/runtime-database';
import type { RfqContent } from '@/lib/project-estimator/types';

type NotificationContext = {
  rfqNumber: string;
  projectName: string;
  company: string;
  service: string;
  customerEmail: string;
};

async function setting(key: string) {
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<{ value?: string }>(
    'SELECT value FROM estimator_settings WHERE key=?',
    [key],
  );
  return String(row?.value || '').trim();
}

async function template(key: string) {
  const db = await getRuntimeDatabase();
  return db.queryOne<{ subject: string | null; body: string }>(
    `SELECT subject, body FROM estimator_notification_templates
     WHERE key=? AND channel='email' AND is_active=1`,
    [key],
  );
}

function merge(value: string, context: NotificationContext) {
  return value
    .replaceAll('{{rfq_number}}', context.rfqNumber)
    .replaceAll('{{project_name}}', context.projectName)
    .replaceAll('{{company}}', context.company)
    .replaceAll('{{service}}', context.service);
}

async function sendEmail(to: string, subject: string, body: string) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.RTI_NOTIFICATION_FROM_EMAIL || '').trim();
  if (!apiKey || !from || !to) return { sent: false as const, reason: 'not-configured' as const };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: body,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '');
    throw new Error(`Email provider returned HTTP ${response.status}: ${responseBody.slice(0, 180)}`);
  }

  return { sent: true as const };
}

function list(label: string, items: string[] | undefined) {
  if (!items?.length) return '';
  return `\n${label}\n${items.map((item) => `- ${item}`).join('\n')}\n`;
}

function rfqCopyBody(rfqNumber: string, content: RfqContent) {
  const info = content.projectInformation || ({} as RfqContent['projectInformation']);
  return [
    'RTI | Riset Teknologi Indonesia',
    `Request for Quotation ${rfqNumber}`,
    '',
    `Project: ${info.projectName || '-'}`,
    `Company: ${info.company || '-'}`,
    `Industry: ${info.industry || '-'}`,
    `Service: ${info.service || '-'}`,
    '',
    'Background',
    content.background || '-',
    list('Project Objectives', content.projectObjective),
    list('Scope of Work', content.scopeOfWork),
    list('Technical Requirements', content.technicalRequirements),
    list('Deliverables', content.deliverables),
    list('Assumptions', content.assumptions),
    list('Customer Responsibilities', content.customerResponsibilities),
    list('RTI Responsibilities', content.rtiResponsibilities),
    `Timeline Expectation: ${content.timelineExpectation || '-'}`,
    `Service Level Expectation: ${content.serviceLevelExpectation || '-'}`,
    `Compliance Requirement: ${content.complianceRequirement || '-'}`,
    `Security Requirement: ${content.securityRequirement || '-'}`,
    `Commercial Requirement: ${content.commercialRequirement || '-'}`,
    list('Information Requiring Clarification', content.missingInformation),
    '',
    'This RFQ is a scoping document and does not constitute a binding commercial quotation or certification commitment.',
  ].filter(Boolean).join('\n');
}

export async function sendCustomerRfqCopy(rfqId: string) {
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<{
    rfq_number: string;
    project_name: string;
    company: string;
    service_name: string;
    customer_email: string;
    content_json: string;
  }>(
    `SELECT r.rfq_number, es.project_name, o.name AS company, s.name AS service_name,
            c.email AS customer_email, rv.content_json
     FROM rfqs r
     JOIN estimator_sessions es ON es.id=r.session_id
     JOIN organizations o ON o.id=es.organization_id
     JOIN contacts c ON c.id=es.contact_id
     JOIN project_estimates pe ON pe.id=r.estimate_id
     JOIN services s ON s.id=pe.service_id
     JOIN rfq_versions rv ON rv.rfq_id=r.id AND rv.version=r.current_version
     WHERE r.id=?`,
    [rfqId],
  );
  if (!row) throw new Error('RFQ email context not found.');

  let content: RfqContent;
  try {
    content = JSON.parse(row.content_json) as RfqContent;
  } catch {
    throw new Error('RFQ content is invalid.');
  }

  const result = await sendEmail(
    row.customer_email,
    `RTI RFQ ${row.rfq_number} — ${row.project_name}`,
    rfqCopyBody(row.rfq_number, content),
  );
  return { ...result, rfqNumber: row.rfq_number };
}

export async function sendRfqNotifications(context: NotificationContext) {
  const results: Array<{ audience: string; sent: boolean; reason?: string }> = [];

  const customer = await template('rfq_customer_confirmation');
  if (customer) {
    try {
      const result = await sendEmail(
        context.customerEmail,
        merge(customer.subject || `RTI RFQ ${context.rfqNumber} received`, context),
        merge(customer.body, context),
      );
      results.push({ audience: 'customer', ...result });
    } catch (error) {
      console.warn('RFQ customer notification failed:', error instanceof Error ? error.message : String(error));
      results.push({ audience: 'customer', sent: false, reason: 'provider-error' });
    }
  }

  const internalEmail = await setting('internal_rfq_email');
  const internal = await template('rfq_internal_alert');
  if (internal && internalEmail) {
    try {
      const result = await sendEmail(
        internalEmail,
        merge(internal.subject || `New RTI RFQ ${context.rfqNumber}`, context),
        merge(internal.body, context),
      );
      results.push({ audience: 'internal', ...result });
    } catch (error) {
      console.warn('RFQ internal notification failed:', error instanceof Error ? error.message : String(error));
      results.push({ audience: 'internal', sent: false, reason: 'provider-error' });
    }
  }

  return results;
}
