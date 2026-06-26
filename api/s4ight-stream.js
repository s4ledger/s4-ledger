/**
 * S4ight — fast streaming chat (LLM-only, no RAG).
 *
 * Runs on Vercel's Edge runtime; streams OpenAI tokens to the browser via
 * Server-Sent Events. Used by the UI when "Fast (streaming)" mode is on.
 *
 * Important: This endpoint does NOT do RAG, citations, tool calls, or
 * audit logging. For grounded, cited, tool-using responses, the UI uses
 * the Python /api/s4ight/chat endpoint instead.
 *
 * Auth: if S4IGHT_ACCESS_TOKENS is configured for the Python function,
 * we match the same env var here too. Format: same as the Python side.
 */

export const config = { runtime: "edge" };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE || "0.2");
const ACCESS_TOKENS_RAW = (process.env.S4IGHT_ACCESS_TOKENS || "").trim();

const SYSTEM_PROMPT = `You are S4ight, the specialized AI assistant for S4 Systems, LLC.
Your domain: US Navy Program Management Offices PMS 300, PMS 325, and PMS 385.
You serve Integrated Logistics Support (ILS), Acquisition Management, and
Programmatic / Risk / Schedule / EVMS / IMS workstreams.

This is the fast streaming endpoint — you do NOT have retrieval-augmented
context here. State that limitation if the user asks for cited facts and
recommend they switch to grounded mode.

Otherwise: be concrete and actionable. Prefer checklists, numbered steps,
tables, and gate-aligned outputs over prose. Use DoD / Navy vocabulary
precisely. Never invent regulations, MIL-STDs, or program facts.`;

function parseTokens(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const out = {};
      for (const [tok, meta] of Object.entries(data)) {
        if (!tok) continue;
        if (meta && typeof meta === "object") {
          out[tok] = {
            label: meta.label || "S4ight user",
            programs: meta.programs ?? "*",
          };
        } else {
          out[tok] = { label: "S4ight user", programs: "*" };
        }
      }
      return out;
    }
  } catch { /* fall through */ }
  // CSV fallback
  const out = {};
  for (const t of raw.split(",")) {
    const k = t.trim();
    if (k) out[k] = { label: "S4ight user", programs: "*" };
  }
  return out;
}
const TOKENS = parseTokens(ACCESS_TOKENS_RAW);

function extractToken(req) {
  const auth = req.headers.get("authorization") || "";
  const lower = auth.toLowerCase();
  if (lower.startsWith("bearer ")) return auth.slice(7).trim() || null;
  if (lower.startsWith("token ")) return auth.slice(6).trim() || null;
  const custom = req.headers.get("x-s4ight-token");
  if (custom) return custom.trim() || null;
  const url = new URL(req.url);
  const q = url.searchParams.get("token");
  return q ? q.trim() : null;
}

function authorize(req, program) {
  if (!TOKENS) return { ok: true };
  const tok = extractToken(req);
  if (!tok) return { ok: false, status: 401, reason: "missing_token" };
  const principal = TOKENS[tok];
  if (!principal) return { ok: false, status: 401, reason: "invalid_token" };
  if (program && principal.programs !== "*") {
    const allowed = Array.isArray(principal.programs) ? principal.programs : [];
    if (!allowed.includes(program)) {
      return { ok: false, status: 403, reason: `program_not_allowed: ${program}` };
    }
  }
  return { ok: true, principal };
}

function sse(event, data) {
  // Server-Sent Events line format
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  return `event: ${event}\ndata: ${payload}\n\n`;
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const message = (body.message || "").trim();
  const program = (body.program || "PMS 325").trim();
  if (!message) {
    return new Response(JSON.stringify({ error: "message_required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const auth = authorize(req, program);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: "unauthorized", reason: auth.reason }), {
      status: auth.status || 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({
      error: "openai_not_configured",
      detail: "OPENAI_API_KEY is not set in the Edge function runtime.",
    }), { status: 503, headers: { "Content-Type": "application/json" } });
  }

  // Build the streaming OpenAI request.
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: `Program in scope: ${program}.` },
    { role: "user", content: message },
  ];

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: OPENAI_TEMPERATURE,
      stream: true,
      messages,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    return new Response(JSON.stringify({
      error: "openai_failed",
      status: upstream.status,
      detail: errText.slice(0, 800),
    }), { status: 502, headers: { "Content-Type": "application/json" } });
  }

  // Re-encode OpenAI SSE chunks into our own minimal SSE shape: just
  // emit { token } events with the delta text + a final { done } event.
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(sse("ready", { model: OPENAI_MODEL, program })));

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // OpenAI streams "data: ...\n\n" SSE-style.
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload);
              const delta = j?.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(encoder.encode(sse("token", { t: delta })));
              }
            } catch { /* ignore malformed chunks */ }
          }
        }
      } catch (e) {
        controller.enqueue(encoder.encode(sse("error", { detail: String(e) })));
      } finally {
        controller.enqueue(encoder.encode(sse("done", { ok: true })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
