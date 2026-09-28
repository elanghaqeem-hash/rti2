import { getDatabase } from '@/lib/server/database';

type NotificationContext = {
  rfqNumber: string;
  projectName: string;
  company: string;
  service: string;
  customerEmail: string;
};

function setting(key: string) {
  const row = getDatabase()
    .prepare('SELECT value FROM estimator_settings WHERE key=?')
    .get(key) as { value?: string } | undefined;
  return String(row?.value || '').trim();
}

function template(key: string) {
  return getDatabase()
    .prepare(
      `SELECT subject, body FROM estimator_notification_templates
       WHERE key=? AND channel='email' AND is_active=1`,
    )
    .get(key) as { subject: string | null; body: string } | undefined;
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
  if (!apiKey || !from || !to) return { sent: false, reason: 'not-configured' as const };

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

export async function sendRfqNotifications(context: NotificationContext) {
  const results: Array<{ audience: string; sent: boolean; reason?: string }> = [];

  const customer = template('rfq_customer_confirmation');
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

  const internalEmail = setting('internal_rfq_email');
  const internal = template('rfq_internal_alert');
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
