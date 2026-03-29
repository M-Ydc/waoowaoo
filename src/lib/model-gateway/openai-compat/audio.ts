import { Buffer } from 'node:buffer'
import type { GenerateResult } from '@/lib/generators/base'
import type { OpenAICompatAudioRequest } from '../types'
import { resolveTemplateEndpointUrl } from '@/lib/openai-compat-template-runtime'
import { resolveOpenAICompatClientConfig } from './common'

const OPENAI_COMPAT_AUDIO_OPTION_KEYS = new Set([
  'provider',
  'modelId',
  'modelKey',
  'responseFormat',
  'format',
  'instructions',
])

function assertAllowedOptions(options: Record<string, unknown>) {
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue
    if (!OPENAI_COMPAT_AUDIO_OPTION_KEYS.has(key)) {
      throw new Error(`OPENAI_COMPAT_AUDIO_OPTION_UNSUPPORTED: ${key}`)
    }
  }
}

function readTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizeRate(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('OPENAI_COMPAT_AUDIO_RATE_INVALID')
  }
  return value
}

function normalizeModelId(modelId: string | undefined, options: Record<string, unknown>): string {
  const optionModelId = readTrimmedString(options.modelId)
  const selected = (modelId || optionModelId || '').trim()
  if (selected) return selected
  return 'gpt-4o-mini-tts'
}

function normalizeResponseFormat(options: Record<string, unknown>): string {
  return readTrimmedString(options.responseFormat) || readTrimmedString(options.format) || 'wav'
}

function resolveMimeType(format: string): string {
  switch (format) {
    case 'mp3':
      return 'audio/mpeg'
    case 'opus':
      return 'audio/ogg'
    case 'aac':
      return 'audio/aac'
    case 'flac':
      return 'audio/flac'
    case 'pcm':
      return 'audio/wav'
    case 'wav':
    default:
      return 'audio/wav'
  }
}

export async function generateAudioViaOpenAICompat(
  request: OpenAICompatAudioRequest,
): Promise<GenerateResult> {
  const {
    userId,
    providerId,
    modelId,
    text,
    voice,
    rate,
    options = {},
  } = request

  assertAllowedOptions(options)
  const trimmedText = text.trim()
  if (!trimmedText) {
    throw new Error('OPENAI_COMPAT_AUDIO_TEXT_REQUIRED')
  }

  const config = await resolveOpenAICompatClientConfig(userId, providerId)
  const selectedModelId = normalizeModelId(modelId, options)
  const selectedVoice = (voice || '').trim()
  if (!selectedVoice) {
    throw new Error('OPENAI_COMPAT_AUDIO_VOICE_REQUIRED')
  }

  const responseFormat = normalizeResponseFormat(options)
  const speed = normalizeRate(rate)
  const instructions = readTrimmedString(options.instructions)
  const response = await fetch(resolveTemplateEndpointUrl(config.baseUrl, '/audio/speech'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: selectedModelId,
      input: trimmedText,
      voice: selectedVoice,
      response_format: responseFormat,
      ...(speed ? { speed } : {}),
      ...(instructions ? { instructions } : {}),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText.trim() || `OPENAI_COMPAT_AUDIO_REQUEST_FAILED: ${response.status}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length === 0) {
    throw new Error('OPENAI_COMPAT_AUDIO_EMPTY_RESPONSE')
  }

  const mimeType = resolveMimeType(responseFormat)
  return {
    success: true,
    audioUrl: `data:${mimeType};base64,${bytes.toString('base64')}`,
  }
}
