export function detectPromptInjection(text) {
  const value = String(text || '');
  const patterns = [
    /ignore (all|any|the) previous instructions/i,
    /system prompt/i,
    /developer message/i,
    /you are (chatgpt|claude|an ai)/i,
    /override (the )?(instructions|rules)/i,
    /reveal (the )?(prompt|secret|api key)/i,
    /do not follow (the )?(system|developer)/i,
    /jailbreak/i,
  ];
  return patterns.some((pattern) => pattern.test(value));
}

export function containsUntrustedEstimateNumbers(text) {
  return /(?:Rp\.?\s*\d|IDR\s*\d|\b\d+(?:[.,]\d+)?\s*(?:MD|man[- ]?days?|minggu|weeks?)\b)/i.test(String(text || ''));
}

export function redactSensitiveForAi(text) {
  return String(text || '')
    .replace(/\b\d{16}\b/g, '[REDACTED_NUMBER]')
    .replace(/\b\d{10,15}\b/g, '[REDACTED_ID_OR_ACCOUNT]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
}
