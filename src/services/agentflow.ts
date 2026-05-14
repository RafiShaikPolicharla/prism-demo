export interface AgentflowAskMeta {
  sessionId?: string;
  requestId?: string;
}

export interface AgentflowAskResult extends AgentflowAskMeta {
  text: string;
}

interface AskAgentflowOptions {
  target?: 'ask-prism' | 'today';
  signal?: AbortSignal;
  onText: (text: string) => void;
  onMeta?: (meta: AgentflowAskMeta) => void;
}

function extractText(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  const messages = Array.isArray(record.messages) ? record.messages : null;

  if (messages) {
    return messages
      .map((message) => {
        if (!message || typeof message !== 'object') return '';
        const content = (message as Record<string, unknown>).content;
        return typeof content === 'string' ? content.trim() : '';
      })
      .filter(Boolean);
  }

  return Object.values(record).flatMap(extractText);
}

function parseSseEvent(raw: string): unknown | null {
  const payload = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n');

  if (!payload || payload === '[DONE]') return null;

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function readMeta(
  parsed: Record<string, unknown>,
  onMeta?: (meta: AgentflowAskMeta) => void,
): AgentflowAskMeta {
  const meta: AgentflowAskMeta = {};
  if (typeof parsed.session_id === 'string') meta.sessionId = parsed.session_id;
  if (typeof parsed.request_id === 'string') meta.requestId = parsed.request_id;
  if (meta.sessionId || meta.requestId) onMeta?.(meta);
  return meta;
}

function readEvent(
  raw: string,
  onMeta?: (meta: AgentflowAskMeta) => void,
): { text: string; isLastNode: boolean; meta: AgentflowAskMeta } | null {
  const parsed = parseSseEvent(raw);
  if (!parsed || typeof parsed !== 'object') return null;

  const event = parsed as Record<string, unknown>;

  if (typeof event.error === 'string') {
    throw new Error(event.error);
  }

  const meta = readMeta(event, onMeta);
  const parts = extractText(event.response);
  if (parts.length === 0) {
    return {
      text: '',
      isLastNode: event.last_node === true,
      meta,
    };
  }

  return {
    text: parts[parts.length - 1],
    isLastNode: event.last_node === true,
    meta,
  };
}

export async function askAgentflow(
  query: string,
  options: AskAgentflowOptions,
): Promise<AgentflowAskResult> {
  const response = await fetch('/api/ask-prism', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, target: options.target ?? 'ask-prism' }),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    const detail = await response.text();
    throw new Error(detail || 'Agentflow request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let lastNodeText = '';
  const meta: AgentflowAskMeta = {};

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const events = buffer.split(/\n\n+/);
    buffer = events.pop() ?? '';

    for (const event of events) {
      const parsedEvent = readEvent(event, (next) => {
        Object.assign(meta, next);
        options.onMeta?.({ ...meta });
      });
      if (parsedEvent?.text) text = parsedEvent.text;
      if (parsedEvent?.isLastNode && parsedEvent.text) lastNodeText = parsedEvent.text;
    }

    if (done) break;
  }

  if (buffer.trim()) {
    const parsedEvent = readEvent(buffer, (next) => {
      Object.assign(meta, next);
      options.onMeta?.({ ...meta });
    });
    if (parsedEvent?.text) text = parsedEvent.text;
    if (parsedEvent?.isLastNode && parsedEvent.text) lastNodeText = parsedEvent.text;
  }

  text = lastNodeText || text;
  if (text) options.onText(text);
  return { text, ...meta };
}
