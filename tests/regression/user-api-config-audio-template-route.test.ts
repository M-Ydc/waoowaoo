import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callRoute } from '../integration/api/helpers/call-route'
import { installAuthMocks, mockAuthenticated, resetAuthMockState } from '../helpers/auth'

type UserPreferenceSnapshot = {
  customProviders: string | null
  customModels: string | null
}

type SavedModel = Record<string, unknown>

const prismaMock = vi.hoisted(() => ({
  userPreference: {
    findUnique: vi.fn<(...args: unknown[]) => Promise<UserPreferenceSnapshot | null>>(),
    upsert: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  },
}))

const encryptApiKeyMock = vi.hoisted(() => vi.fn((value: string) => `enc:${value}`))
const decryptApiKeyMock = vi.hoisted(() => vi.fn((value: string) => value.replace(/^enc:/, '')))
const getBillingModeMock = vi.hoisted(() => vi.fn(async () => 'OFF'))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/crypto-utils', () => ({
  encryptApiKey: encryptApiKeyMock,
  decryptApiKey: decryptApiKeyMock,
}))

vi.mock('@/lib/billing/mode', () => ({
  getBillingMode: getBillingModeMock,
}))

function readSavedModelsFromUpsert(): SavedModel[] {
  const firstCall = prismaMock.userPreference.upsert.mock.calls[0]
  if (!firstCall) {
    throw new Error('expected prisma.userPreference.upsert to be called at least once')
  }

  const payload = firstCall[0] as { update?: { customModels?: unknown } }
  const rawModels = payload.update?.customModels
  if (typeof rawModels !== 'string') {
    throw new Error('expected update.customModels to be a JSON string')
  }

  const parsed = JSON.parse(rawModels) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error('expected update.customModels to parse as an array')
  }

  return parsed as SavedModel[]
}

describe('regression - user api-config audio template route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    resetAuthMockState()
    installAuthMocks()
    mockAuthenticated('user-regression-1')
    prismaMock.userPreference.findUnique.mockResolvedValue({
      customProviders: null,
      customModels: null,
    })
    prismaMock.userPreference.upsert.mockResolvedValue({ id: 'pref-1' })
    getBillingModeMock.mockResolvedValue('OFF')
  })

  it('PUT persists explicit compat media template for openai-compatible audio models', async () => {
    const mod = await import('@/app/api/user/api-config/route')
    const response = await callRoute(mod.PUT, 'PUT', {
      providers: [
        { id: 'openai-compatible:oa-1', name: 'OpenAI Compat', baseUrl: 'https://compat.test/v1', apiKey: 'oa-key' },
      ],
      models: [
        {
          modelId: 'gpt-4o-mini-tts',
          modelKey: 'openai-compatible:oa-1::gpt-4o-mini-tts',
          name: 'TTS Mini',
          type: 'audio',
          provider: 'openai-compatible:oa-1',
          compatMediaTemplate: {
            version: 1,
            mediaType: 'audio',
            mode: 'sync',
            create: {
              method: 'POST',
              path: '/audio/speech',
              contentType: 'application/json',
              bodyTemplate: {
                model: '{{model}}',
                input: '{{text}}',
                voice: '{{voice}}',
                format: '{{format}}',
              },
            },
            response: {
              outputBase64Path: '$.audio',
              mimeTypePath: '$.mime_type',
            },
          },
          compatMediaTemplateSource: 'ai',
        },
      ],
    })

    expect(response.status).toBe(200)
    const savedModels = readSavedModelsFromUpsert()
    const savedModel = savedModels.find((item) => item.modelKey === 'openai-compatible:oa-1::gpt-4o-mini-tts')

    expect(savedModel).toMatchObject({
      modelKey: 'openai-compatible:oa-1::gpt-4o-mini-tts',
      type: 'audio',
      compatMediaTemplateSource: 'ai',
      compatMediaTemplate: {
        mediaType: 'audio',
        mode: 'sync',
        create: {
          path: '/audio/speech',
        },
        response: {
          outputBase64Path: '$.audio',
          mimeTypePath: '$.mime_type',
        },
      },
    })
  })
})
