import { Buffer } from 'node:buffer'
import type { GenerateResult } from '@/lib/generators/base'
import type { OpenAICompatAudioRequest } from '../types'
import {
  buildRenderedTemplateRequest,
  buildTemplateVariables,
  extractTemplateError,
  normalizeResponseJson,
  readJsonPath,
} from '@/lib/openai-compat-template-runtime'
import { parseModelKeyStrict } from '@/lib/model-config-contract'
import { resolveOpenAICompatClientConfig } from './common'

const OPENAI_COMPAT_PROVIDER_PREFIX = 'openai-compatible:'
const PROVIDER_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function encodeProviderToken(providerId: string): string {
  const value = providerId.trim()
  if (value.startsWith(OPENAI_COMPAT_PROVIDER_PREFIX)) {
    const uuid = value.slice(OPENAI_COMPAT_PROVIDER_PREFIX.length).trim()
    if (PROVIDER_UUID_PATTERN.test(uuid)) {
      return `u_${uuid.toLowerCase()}`
    }
  }
  return `b64_${Buffer.from(value, 'utf8').toString('base64url')}`
}

function encodeModelRef(modelRef: string): string {
  return Buffer.from(modelRef, 'utf8').toString('base64url')
}

function resolveModelRef(request: OpenAICompatAudioRequest): string {
  const modelId = typeof request.modelId === 'string' ? request.modelId.trim() : ''
  if (modelId) return modelId
  const parsed = typeof request.modelKey === 'string' ? parseModelKeyStrict(request.modelKey) : null
  if (parsed?.modelId) return parsed.modelId
  throw new Error('OPENAI_COMPAT_AUDIO_MODEL_REF_REQUIRED')
}

function readOutputUrl(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const nestedUrl = (value as { url?: unknown }).url
    if (typeof nestedUrl === 'string' && nestedUrl.trim()) return nestedUrl.trim()
  }
  return null
}

export async function generateAudioViaOpenAICompatTemplate(
  request: OpenAICompatAudioRequest,
): Promise<GenerateResult> {
  if (!request.template) {
    throw new Error('OPENAI_COMPAT_AUDIO_TEMPLATE_REQUIRED')
  }
  if (request.template.mediaType !== 'audio') {
    throw new Error('OPENAI_COMPAT_AUDIO_TEMPLATE_MEDIA_TYPE_INVALID')
  }

  const config = await resolveOpenAICompatClientConfig(request.userId, request.providerId)
  const variables = buildTemplateVariables({
    model: request.modelId || '',
    prompt: request.text,
    text: request.text,
    voice: request.voice,
    rate: request.rate,
    extra: request.options,
  })

  const createRequest = await buildRenderedTemplateRequest({
    baseUrl: config.baseUrl,
    endpoint: request.template.create,
    variables,
    defaultAuthHeader: `Bearer ${config.apiKey}`,
  })
  if (['POST', 'PUT', 'PATCH'].includes(createRequest.method) && !createRequest.body) {
    throw new Error('OPENAI_COMPAT_AUDIO_TEMPLATE_CREATE_BODY_REQUIRED')
  }
  const response = await fetch(createRequest.endpointUrl, {
    method: createRequest.method,
    headers: createRequest.headers,
    ...(createRequest.body ? { body: createRequest.body } : {}),
  })
  const rawText = await response.text().catch(() => '')
  const payload = normalizeResponseJson(rawText)
  if (!response.ok) {
    throw new Error(extractTemplateError(request.template, payload, response.status))
  }

  if (request.template.mode === 'sync') {
    const outputUrl = readOutputUrl(readJsonPath(payload, request.template.response.outputUrlPath))
    if (outputUrl) {
      return {
        success: true,
        audioUrl: outputUrl,
      }
    }

    const outputUrls = readJsonPath(payload, request.template.response.outputUrlsPath)
    if (Array.isArray(outputUrls)) {
      for (const item of outputUrls) {
        const candidate = readOutputUrl(item)
        if (candidate) {
          return {
            success: true,
            audioUrl: candidate,
          }
        }
      }
    }
    throw new Error('OPENAI_COMPAT_AUDIO_TEMPLATE_OUTPUT_NOT_FOUND')
  }

  const taskIdRaw = readJsonPath(payload, request.template.response.taskIdPath)
  const taskId = typeof taskIdRaw === 'string' ? taskIdRaw.trim() : ''
  if (!taskId) {
    throw new Error('OPENAI_COMPAT_AUDIO_TEMPLATE_TASK_ID_NOT_FOUND')
  }
  const providerToken = encodeProviderToken(config.providerId)
  const modelRefToken = encodeModelRef(resolveModelRef(request))
  return {
    success: true,
    async: true,
    requestId: taskId,
    externalId: `OCOMPAT:AUDIO:${providerToken}:${modelRefToken}:${taskId}`,
  }
}
