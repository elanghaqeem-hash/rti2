export type AiChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AiProviderId =
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'deepseek';

export type AiFailoverResult = {
  text: string;
  provider: AiProviderId;
  attempted: AiProviderId[];
};

export type AiProviderRuntimeConfig = {
  provider: AiProviderId;
  model?: string | null;
};

const DEFAULT_PROVIDER_ORDER: AiProviderId[] = [
  'anthropic',
  'openai',
  'gemini',
  'groq',
  'openrouter',
  'deepseek',
];

const PROVIDER_IDS = new Set<AiProviderId>(DEFAULT_PROVIDER_ORDER);

function getProviderOrder(runtime?: AiProviderRuntimeConfig[]): AiProviderId[] {
  if (runtime && runtime.length > 0) {
    return Array.from(
      new Set(
        runtime
          .map((item) => item.provider)
          .filter((provider): provider is AiProviderId => PROVIDER_IDS.has(provider)),
      ),
    );
  }

  const configured = (process.env.AI_PROVIDER_ORDER || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .filter((value): value is AiProviderId => PROVIDER_IDS.has(value as AiProviderId));

  const order = configured.length > 0 ? configured : DEFAULT_PROVIDER_ORDER;
  return Array.from(new Set(order));
}

function getTimeoutMs(): number {
  const configured = Number(process.env.AI_PROVIDER_TIMEOUT_MS || 8000);
  if (!Number.isFinite(configured)) return 8000;
  return Math.min(Math.max(configured, 3000), 20000);
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = getTimeoutMs(),
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

async function assertJsonResponse(response: Response, provider: AiProviderId): Promise<any> {
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `${provider} returned HTTP ${response.status}${body ? `: ${body.slice(0, 180)}` : ''}`,
    );
  }
  return response.json();
}

function buildSystemPrompt(systemPrompt: string, contextText: string): string {
  return `${systemPrompt}\n\nKONTEKS WEBSITE RISETIN\n<context>\n${contextText}\n</context>`;
}

async function callAnthropic(
  messages: AiChatMessage[],
  systemPrompt: string,
  contextText: string,
  modelOverride?: string,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = modelOverride || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      temperature: 0.3,
      system: buildSystemPrompt(systemPrompt, contextText),
      messages,
    }),
  });

  const data = await assertJsonResponse(response, 'anthropic');
  const text = Array.isArray(data?.content)
    ? data.content
        .filter((part: any) => part?.type === 'text' && typeof part?.text === 'string')
        .map((part: any) => part.text)
        .join('\n')
        .trim()
    : '';

  return text || null;
}

async function callOpenAiCompatible(params: {
  provider: 'openai' | 'groq' | 'openrouter' | 'deepseek';
  endpoint: string;
  apiKey?: string;
  model: string;
  messages: AiChatMessage[];
  systemPrompt: string;
  contextText: string;
  headers?: Record<string, string>;
}): Promise<string | null> {
  if (!params.apiKey) return null;

  const response = await fetchWithTimeout(params.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
      ...(params.headers || {}),
    },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(params.systemPrompt, params.contextText),
        },
        ...params.messages,
      ],
    }),
  });

  const data = await assertJsonResponse(response, params.provider);
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
}

async function callGemini(
  messages: AiChatMessage[],
  systemPrompt: string,
  contextText: string,
  modelOverride?: string,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = modelOverride || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));

  const response = await fetchWithTimeout(endpoint, {
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
  });

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
  modelOverride?: string,
): Promise<string | null> {
  switch (provider) {
    case 'anthropic':
      return callAnthropic(messages, systemPrompt, contextText, modelOverride);

    case 'openai':
      return callOpenAiCompatible({
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        apiKey: process.env.OPENAI_API_KEY,
        model: modelOverride || process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        messages,
        systemPrompt,
        contextText,
      });

    case 'gemini':
      return callGemini(messages, systemPrompt, contextText, modelOverride);

    case 'groq':
      return callOpenAiCompatible({
        provider: 'groq',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: process.env.GROQ_API_KEY,
        model: modelOverride || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages,
        systemPrompt,
        contextText,
      });

    case 'openrouter':
      return callOpenAiCompatible({
        provider: 'openrouter',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: process.env.OPENROUTER_API_KEY,
        model: modelOverride || process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini',
        messages,
        systemPrompt,
        contextText,
        headers: {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://risetin.co.id',
          'X-Title': 'Risetin Assistant',
        },
      });

    case 'deepseek':
      return callOpenAiCompatible({
        provider: 'deepseek',
        endpoint: 'https://api.deepseek.com/chat/completions',
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: modelOverride || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages,
        systemPrompt,
        contextText,
      });
  }
}

export async function generateAiWithFailover(params: {
  messages: AiChatMessage[];
  systemPrompt: string;
  contextText: string;
  providers?: AiProviderRuntimeConfig[];
}): Promise<AiFailoverResult | null> {
  const attempted: AiProviderId[] = [];

  const runtimeModels = new Map(
    (params.providers || []).map((item) => [item.provider, item.model || undefined]),
  );

  for (const provider of getProviderOrder(params.providers)) {
    const isConfigured =
      (provider === 'anthropic' && Boolean(process.env.ANTHROPIC_API_KEY)) ||
      (provider === 'openai' && Boolean(process.env.OPENAI_API_KEY)) ||
      (provider === 'gemini' && Boolean(process.env.GEMINI_API_KEY)) ||
      (provider === 'groq' && Boolean(process.env.GROQ_API_KEY)) ||
      (provider === 'openrouter' && Boolean(process.env.OPENROUTER_API_KEY)) ||
      (provider === 'deepseek' && Boolean(process.env.DEEPSEEK_API_KEY));

    if (!isConfigured) continue;

    attempted.push(provider);

    try {
      const text = await callProvider(
        provider,
        params.messages,
        params.systemPrompt,
        params.contextText,
        runtimeModels.get(provider),
      );

      if (text) {
        return {
          text,
          provider,
          attempted,
        };
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`Risetin AI provider ${provider} failed: ${reason}`);
    }
  }

  return null;
}
