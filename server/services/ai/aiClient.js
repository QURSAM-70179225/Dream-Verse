// Minimal client for any OpenAI-compatible chat-completions endpoint (Together, Groq, OpenRouter,
// a local Ollama server, ...). It takes its config as an argument and has no other imports, so it
// can be unit-tested with a fake `fetch`. The API key only ever lives on the server.

export class AiProviderError extends Error {
  /** kind: 'timeout' | 'network' | 'http' | 'empty' */
  constructor(message, { kind, status = 0, body = '' } = {}) {
    super(message);
    this.name = 'AiProviderError';
    this.kind = kind;
    this.status = status;
    this.body = body; // for server-side logs only; never sent to the browser
  }
}

// Some "reasoning" models wrap their thinking in <think> tags. Users should never see it.
export const stripThinking = (text) => text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

// Most providers return a string; some return a list of parts like [{ type: 'text', text: '...' }].
export function contentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.type === 'text' || part?.text ? part.text || '' : ''))
      .join('');
  }
  return '';
}

export function createAiClient(config, fetchImpl = globalThis.fetch) {
  const url = `${config.baseUrl}/chat/completions`;

  async function request(body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      return await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new AiProviderError('The AI provider timed out', { kind: 'timeout' });
      }
      throw new AiProviderError('Could not reach the AI provider', { kind: 'network' });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Sends chat messages and returns the assistant's text.
   * json: ask the provider for strict JSON output (when config.jsonMode is on).
   */
  async function complete({ messages, json = false, maxTokens, temperature = 0.7 }) {
    const body = {
      model: config.model,
      messages,
      temperature,
      max_tokens: maxTokens || config.maxTokens,
    };
    const wantJsonMode = json && config.jsonMode;
    let res = await request(wantJsonMode ? { ...body, response_format: { type: 'json_object' } } : body);

    // Some providers/models do not support response_format; retry once without it.
    if (wantJsonMode && (res.status === 400 || res.status === 422)) {
      res = await request(body);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AiProviderError(`AI provider answered HTTP ${res.status}`, {
        kind: 'http',
        status: res.status,
        body: String(text).slice(0, 300),
      });
    }

    const rawBody = await res.text().catch(() => '');
    let data = null;
    try {
      data = JSON.parse(rawBody);
    } catch {
      // Not JSON at all: usually AI_BASE_URL points at a web page instead of the API.
      const looksLikeHtml = /^\s*<(!doctype|html)/i.test(rawBody);
      throw new AiProviderError('The AI provider did not return JSON', {
        kind: 'badresponse',
        status: res.status,
        body: `${looksLikeHtml ? 'HTML page' : 'non-JSON text'} received from ${url} (first 120 chars: ${rawBody
          .slice(0, 120)
          .replace(/\s+/g, ' ')})`,
      });
    }
    const choice = data?.choices?.[0];
    const text = stripThinking(contentToText(choice?.message?.content));
    if (!text) {
      // Logged on the server only (never sent to the browser) to make empty answers diagnosable.
      const hint = {
        finish_reason: choice?.finish_reason ?? null,
        message_keys: choice?.message ? Object.keys(choice.message) : null,
        completion_tokens: data?.usage?.completion_tokens ?? null,
        max_tokens: body.max_tokens,
        model: data?.model ?? config.model,
        top_level_keys: data && typeof data === 'object' ? Object.keys(data) : null,
      };
      throw new AiProviderError('The AI provider returned an empty answer', {
        kind: 'empty',
        body: JSON.stringify(hint),
      });
    }
    return text;
  }

  return { complete };
}
