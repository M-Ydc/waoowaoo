import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveModelSelectionMock = vi.hoisted(() => vi.fn())
const getProviderConfigMock = vi.hoisted(() => vi.fn())
const getProviderKeyMock = vi.hoisted(() => vi.fn((providerId: string) => providerId.split(':')[0] || providerId))
const resolveModelGatewayRouteMock = vi.hoisted(() => vi.fn(() => 'openai-compat'))
const generateAudioViaOpenAICompatMock = vi.hoisted(() => vi.fn(async () => ({ success: true, audioUrl: 'direct-audio' })))
const generateAudioViaOpenAICompatTemplateMock = vi.hoisted(() => vi.fn(async () => ({ success: true, audioUrl: 'templated-audio' })))

vi.mock('@/lib/api-config', () => ({
  resolveModelSelection: resolveModelSelectionMock,
  getProviderConfig: getProviderConfigMock,
  getProviderKey: getProviderKeyMock,
}))

vi.mock('@/lib/model-gateway', () => ({
  resolveModelGatewayRoute: resolveModelGatewayRouteMock,
  generateAudioViaOpenAICompat: generateAudioViaOpenAICompatMock,
  generateAudioViaOpenAICompatTemplate: generateAudioViaOpenAICompatTemplateMock,
  generateImageViaOpenAICompat: vi.fn(),
  generateImageViaOpenAICompatTemplate: vi.fn(),
  generateVideoViaOpenAICompat: vi.fn(),
  generateVideoViaOpenAICompatTemplate: vi.fn(),
}))

vi.mock('@/lib/generators/factory', () => ({
  createImageGenerator: vi.fn(() => ({ generate: vi.fn() })),
  createVideoGenerator: vi.fn(() => ({ generate: vi.fn() })),
  createAudioGenerator: vi.fn(() => ({ generate: vi.fn() })),
}))

vi.mock('@/lib/providers/bailian', () => ({
  generateBailianImage: vi.fn(),
  generateBailianVideo: vi.fn(),
  generateBailianAudio: vi.fn(),
}))

vi.mock('@/lib/providers/siliconflow', () => ({
  generateSiliconFlowImage: vi.fn(),
  generateSiliconFlowVideo: vi.fn(),
  generateSiliconFlowAudio: vi.fn(),
}))

import { generateAudio } from '@/lib/generator-api'

describe('regression - openai-compatible audio template routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveModelGatewayRouteMock.mockReturnValue('openai-compat')
    getProviderConfigMock.mockResolvedValue({
      id: 'openai-compatible:oa-1',
      name: 'OpenAI Compat',
      apiKey: 'oa-key',
      gatewayRoute: 'openai-compat',
    })
  })

  it('routes audio generation through compat template when template is configured', async () => {
    resolveModelSelectionMock.mockResolvedValueOnce({
      provider: 'openai-compatible:oa-1',
      modelId: 'gpt-4o-mini-tts',
      modelKey: 'openai-compatible:oa-1::gpt-4o-mini-tts',
      mediaType: 'audio',
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
    })

    await expect(
      generateAudio('user-1', 'openai-compatible:oa-1::gpt-4o-mini-tts', 'hello world', { voice: 'alloy' }),
    ).resolves.toEqual({ success: true, audioUrl: 'templated-audio' })

    expect(generateAudioViaOpenAICompatTemplateMock).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 'openai-compatible:oa-1',
      modelId: 'gpt-4o-mini-tts',
      modelKey: 'openai-compatible:oa-1::gpt-4o-mini-tts',
      text: 'hello world',
      voice: 'alloy',
      template: expect.objectContaining({ mediaType: 'audio' }),
    }))
    expect(generateAudioViaOpenAICompatMock).not.toHaveBeenCalled()
  })
})
