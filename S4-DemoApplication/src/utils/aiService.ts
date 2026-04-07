/**
 * AI Service — calls /api/ai-chat for real LLM responses.
 * Falls back to local pattern matching when the API returns fallback=true
 * (indicating no LLM provider is configured on the server).
 */

import { checkAIChatLimit } from './rateLimiter'

export interface AIChatMessage {
  role: 'user' | 'ai' | 'assistant'
  text: string
}

export interface AIChatRequest {
  message: string
  conversation?: AIChatMessage[]
  tool_context?: string
  analysis_data?: Record<string, unknown> | null
}

export interface AIChatResponse {
  response: string
  provider: string
  fallback: boolean
}

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? '' // Vite dev proxy or same-origin
  : ''

/**
 * Send a message to the real AI backend.
 * Returns { response, provider, fallback }.
 * If fallback=true, the server had no LLM — caller should use local logic.
 */
export async function chatWithAI(request: AIChatRequest): Promise<AIChatResponse> {
  if (checkAIChatLimit()) {
    return { response: 'Rate limited — please wait a moment before sending another request.', provider: 'none', fallback: true }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(`${API_BASE}/api/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: request.message,
        conversation: (request.conversation || []).map(m => ({
          role: m.role === 'ai' ? 'assistant' : m.role,
          content: m.text,
        })),
        tool_context: request.tool_context || 'drl_tracker',
        analysis_data: request.analysis_data || null,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      return { response: '', provider: 'none', fallback: true }
    }

    const data = await res.json()
    if (data.fallback || !data.response) {
      return { response: '', provider: 'none', fallback: true }
    }

    return {
      response: data.response,
      provider: data.provider || 'llm',
      fallback: false,
    }
  } catch {
    return { response: '', provider: 'none', fallback: true }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Generate an AI suggestion for cell editing via the real API.
 * Returns the suggestion text, or null if fallback/error.
 */
export async function generateAICellSuggestion(
  prompt: string,
  context: string,
): Promise<string | null> {
  const result = await chatWithAI({
    message: prompt,
    tool_context: 'cell_edit',
    analysis_data: { context },
  })
  if (result.fallback) return null
  return result.response
}
