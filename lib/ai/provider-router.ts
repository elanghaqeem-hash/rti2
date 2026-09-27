import {
  AI_PROVIDER_IDS,
  getAdminSettings,
  type AiProviderId,
  type AiProviderSettings,
} from '@/lib/admin/settings-store';

export type { AiProviderId };

export type AiChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AiFailoverResult = {
  text: string;
  provider: AiProviderId;
  attempted: AiProviderId[];
};

function buildSystemPrompt(systemPrompt: string, contextText: string): string {
  return (
    systemPrompt +
    '\n\nKONTEKS WEBSITE RISETIN\n<context>\n' +
    contextText +
    '\n</context>'
  );
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timer);
  }
}

async function assertJsonResponse(
  response: Response,
  provider: AiProviderId,
): Promise<any> {
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      provider +
        ' returned HTTP ' +
        response.status +
        (body ? ': ' + body.slice(0, 180) : ''),
    );
  }
  return response.json();
}

async function callAnthropic(
  messages: AiChatMessage[],
  systemPrompt: string,
  contextText: string,
  config: AiProviderSettings,
  timeoutMs: number,
): Promise<string | null> {
  if (!config.apiKey) return null;

  const response = await fetchWithTimeout(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 800,
        temperature: 0.3,
        system: buildSystemPrompt(systemPrompt, contextText),
        messages,
      }),
    },
    timeoutMs,
  );

  const data = await assertJsonResponse(response, 'anthropic');
  const text = Array.isArray(data?.content)
    ? data.content
        .filter(
          (part: any) =>
            part?.type === 'text' && typeof part?.text === 'string',
        )
        .map((part: any) => part.text)
        .join('\n')
        .trim()
    : '';

  return text || null;
}

async function callOpenAiCompatible(params: {
  provider: 'openai' | 'groq' | 'openrouter';
  endpoint: string;
  config: AiProviderSettings;
  messages: AiChatMessage[];
  systemPrompt: string;
  contextText: string;
  timeoutMs: number;
  headers?: Record<string, string>;
}): Promise<string | null> {
  if (!params.config.apiKey) return null;

  const response = await fetchWithTimeout(
    params.endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + params.config.apiKey,
        ...(params.headers || {}),
      },
      body: JSON.stringify({
        model: params.config.model,
        temperature: 0.3,
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(
              params.systemPrompt,
              params.contextText,
            ),
          },
          ...params.messages,
        ],
      }),
    },
    params.timeoutMs,
  );

  const data = await assertJsonResponse(response, params.provider);
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
}

async function callGemini(
  messages: AiChatMessage[],
  systemPrompt: string,
  contextText: string,
  config: AiProviderSettings,
  timeoutMs: number,
): Promise<string | null> {
  if (!config.apiKey) return null;

  const endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(config.model) +
    ':generateContent?key=' +
    encodeURIComponent(config.apiKey);

  const contents = messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(systemPrompt, contextText) }],
        },
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
        },
      }),
    },
    timeoutMs,
  );

  const data = await assertJsonResponse(response, 'gemini');
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .filter((part: any) => typeof part?.text === 'string')
        .map((part: any) => part.text)
        .join('\n')
        .trim()
    : '';

  return text || null;
}

async function callProvider(
  provider: AiProviderId,
  messages: AiChatMessage[],
  systemPrompt: string,
  contextText: string,
  config: AiProviderSettings,
  timeoutMs: number,
): Promise<string | null> {
  switch (provider) {
    case 'anthropic':
      return callAnthropic(
        messages,
        systemPrompt,
        contextText,
        config,
        timeoutMs,
      );

    case 'openai':
      return callOpenAiCompatible({
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        config,
        messages,
        systemPrompt,
        contextText,
        timeoutMs,
      });

    case 'gemini':
      return callGemini(
        messages,
        systemPrompt,
        contextText,
        config,
        timeoutMs,
      );

    case 'groq':
      return callOpenAiCompatible({
        provider: 'groq',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        config,
        messages,
        systemPrompt,
        contextText,
        timeoutMs,
      });

    case 'openrouter':
      return callOpenAiCompatible({
        provider: 'openrouter',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        config,
        messages,
        systemPrompt,
        contextText,
        timeoutMs,
        headers: {
          'HTTP-Referer':
            process.env.NEXT_PUBLIC_SITE_URL || 'https://risetin.co.id',
          'X-Title': 'Risetin Assistant',
        },
      });
  }
}

export async function testAiProviderConnection(
  provider: AiProviderId,
): Promise<{ ok: boolean; provider: AiProviderId; detail: string }> {
  if (!AI_PROVIDER_IDS.includes(provider)) {
    return { ok: false, provider, detail: 'Provider tidak dikenali.' };
  }

  const settings = await getAdminSettings();
  const config = settings.ai.providers[provider];

  if (!config.enabled) {
    return { ok: false, provider, detail: 'Provider dinonaktifkan.' };
  }

  if (!config.apiKey) {
    return { ok: false, provider, detail: 'API key belum dikonfigurasi.' };
  }

  try {
    const text = await callProvider(
      provider,
      [{ role: 'user', content: 'Balas hanya dengan kata OK.' }],
      'Anda adalah endpoint health-check Risetin.',
      'Tidak ada data bisnis pada pengujian koneksi ini.',
      config,
      settings.ai.timeoutMs,
    );

    return {
      ok: Boolean(text),
      provider,
      detail: text
        ? 'Koneksi berhasil dan provider merespons.'
        : 'Provider tidak mengembalikan respons teks.',
    };
  } catch (error) {
    return {
      ok: false,
      provider,
      detail:
        error instanceof Error
          ? error.message.slice(0, 240)
          : 'Koneksi provider gagal.',
    };
  }
}

export async function generateAiWithFailover(params: {
  messages: AiChatMessage[];
  systemPrompt: string;
  contextText: string;
}): Promise<AiFailoverResult | null> {
  const settings = await getAdminSettings();
  const attempted: AiProviderId[] = [];

  for (const provider of settings.ai.providerOrder) {
    const config = settings.ai.providers[provider];

    if (!config.enabled || !config.apiKey) continue;

    attempted.push(provider);

    try {
      const text = await callProvider(
        provider,
        params.messages,
        params.systemPrompt,
        params.contextText,
        config,
        settings.ai.timeoutMs,
      );

      if (text) {
        return {
          text,
          provider,
          attempted,
        };
      }
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : String(error);
      console.warn(
        'Risetin AI provider ' + provider + ' failed: ' + reason,
      );
    }
  }

  return null;
}
