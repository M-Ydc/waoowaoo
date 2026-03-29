import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  novelPromotionVoiceLine: {
    findUnique: vi.fn(),
    update: vi.fn(async () => undefined),
  },
  novelPromotionProject: {
    findUnique: vi.fn(),
  },
  novelPromotionEpisode: {
    findUnique: vi.fn(),
  },
}))

const resolveModelSelectionOrSingleMock = vi.hoisted(() => vi.fn())
const getProviderKeyMock = vi.hoisted(() => vi.fn((providerId: string) => providerId))
const getAudioApiKeyMock = vi.hoisted(() => vi.fn())

const normalizeToBase64ForGenerationMock = vi.hoisted(() => vi.fn())
const extractStorageKeyMock = vi.hoisted(() => vi.fn())
const getSignedUrlMock = vi.hoisted(() => vi.fn((storageKey: string) => `signed://${storageKey}`))
const toFetchableUrlMock = vi.hoisted(() => vi.fn((url: string) => url))
const uploadObjectMock = vi.hoisted(() => vi.fn(async () => 'voice/storage/line-1.wav'))
const resolveStorageKeyFromMediaValueMock = vi.hoisted(() => vi.fn())
const synthesizeWithBailianTTSMock = vi.hoisted(() => vi.fn())
const falSubscribeMock = vi.hoisted(() => vi.fn())
const getProviderConfigMock = vi.hoisted(() => vi.fn())
const generateAudioMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/api-config', () => ({
  getAudioApiKey: getAudioApiKeyMock,
  getProviderConfig: getProviderConfigMock,
  getProviderKey: getProviderKeyMock,
  resolveModelSelectionOrSingle: resolveModelSelectionOrSingleMock,
}))

vi.mock('@/lib/media/outbound-image', () => ({
  normalizeToBase64ForGeneration: normalizeToBase64ForGenerationMock,
}))

vi.mock('@/lib/storage', () => ({
  extractStorageKey: extractStorageKeyMock,
  getSignedUrl: getSignedUrlMock,
  toFetchableUrl: toFetchableUrlMock,
  uploadObject: uploadObjectMock,
}))

vi.mock('@/lib/media/service', () => ({
  resolveStorageKeyFromMediaValue: resolveStorageKeyFromMediaValueMock,
}))

vi.mock('@/lib/providers/bailian', () => ({
  synthesizeWithBailianTTS: synthesizeWithBailianTTSMock,
}))

vi.mock('@/lib/generator-api', () => ({
  generateAudio: generateAudioMock,
}))

vi.mock('@fal-ai/client', () => ({
  fal: {
    config: vi.fn(),
    subscribe: falSubscribeMock,
  },
}))

import { generateVoiceLine } from '@/lib/voice/generate-voice-line'

describe('generate voice line with bailian provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const audioBytes = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])

    prismaMock.novelPromotionVoiceLine.findUnique.mockResolvedValue({
      id: 'line-1',
      episodeId: 'episode-1',
      speaker: 'Narrator',
      content: '你好，世界',
      emotionPrompt: null,
      emotionStrength: null,
    })
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
      characters: [],
    })
    prismaMock.novelPromotionEpisode.findUnique.mockResolvedValue({
      speakerVoices: JSON.stringify({
        Narrator: {
          audioUrl: 'voice/reference.wav',
          voiceId: 'voice_abc123',
        },
      }),
    })

    resolveModelSelectionOrSingleMock.mockResolvedValue({
      provider: 'bailian',
      modelId: 'qwen3-tts-vd-2026-01-26',
      modelKey: 'bailian::qwen3-tts-vd-2026-01-26',
      mediaType: 'audio',
    })

    getProviderConfigMock.mockResolvedValue({
      id: 'bailian',
      name: 'Alibaba Bailian',
      apiKey: 'bl-key',
    })
    synthesizeWithBailianTTSMock.mockResolvedValue({
      success: true,
      audioData: Buffer.from(audioBytes),
      audioDuration: 1,
    })
  })

  it('uses speaker voiceId to generate and persists uploaded audio', async () => {
    const result = await generateVoiceLine({
      projectId: 'project-1',
      episodeId: 'episode-1',
      lineId: 'line-1',
      userId: 'user-1',
      audioModel: 'bailian::qwen3-tts-vd-2026-01-26',
    })

    expect(getProviderConfigMock).toHaveBeenCalledWith('user-1', 'bailian')
    expect(synthesizeWithBailianTTSMock).toHaveBeenCalledWith({
      text: '你好，世界',
      voiceId: 'voice_abc123',
      modelId: 'qwen3-tts-vd-2026-01-26',
      languageType: 'Chinese',
    }, 'bl-key')
    expect(uploadObjectMock).toHaveBeenCalledTimes(1)
    expect(prismaMock.novelPromotionVoiceLine.update).toHaveBeenCalledWith({
      where: { id: 'line-1' },
      data: {
        audioUrl: 'voice/storage/line-1.wav',
        audioDuration: 1,
      },
    })
    expect(result).toEqual({
      lineId: 'line-1',
      audioUrl: 'signed://voice/storage/line-1.wav',
      storageKey: 'voice/storage/line-1.wav',
      audioDuration: 1,
    })
  })

  it('fails explicitly when bailian speaker binding only has uploaded audio', async () => {
    prismaMock.novelPromotionEpisode.findUnique.mockResolvedValueOnce({
      speakerVoices: JSON.stringify({
        Narrator: {
          audioUrl: 'voice/reference.wav',
        },
      }),
    })

    await expect(
      generateVoiceLine({
        projectId: 'project-1',
        episodeId: 'episode-1',
        lineId: 'line-1',
        userId: 'user-1',
        audioModel: 'bailian::qwen3-tts-vd-2026-01-26',
      }),
    ).rejects.toThrow('无音色ID，QwenTTS 必须使用 AI 设计音色')

    expect(synthesizeWithBailianTTSMock).not.toHaveBeenCalled()
    expect(uploadObjectMock).not.toHaveBeenCalled()
  })

  it('maps bailian invalid parameter to a qwen voice guidance error', async () => {
    synthesizeWithBailianTTSMock.mockResolvedValueOnce({
      success: false,
      error: 'BAILIAN_TTS_FAILED(400): InvalidParameter',
    })

    await expect(
      generateVoiceLine({
        projectId: 'project-1',
        episodeId: 'episode-1',
        lineId: 'line-1',
        userId: 'user-1',
        audioModel: 'bailian::qwen3-tts-vd-2026-01-26',
      }),
    ).rejects.toThrow('无效音色ID，QwenTTS 必须使用 AI 设计音色')

    expect(uploadObjectMock).not.toHaveBeenCalled()
  })
})

describe('generate voice line with openai-compatible provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.novelPromotionVoiceLine.findUnique.mockResolvedValue({
      id: 'line-1',
      episodeId: 'episode-1',
      speaker: 'Narrator',
      content: '你好，世界',
      emotionPrompt: null,
      emotionStrength: null,
    })
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
      characters: [],
    })
    prismaMock.novelPromotionEpisode.findUnique.mockResolvedValue({
      speakerVoices: JSON.stringify({
        Narrator: {
          provider: 'bailian',
          voiceType: 'tts',
          voiceId: 'alloy',
        },
      }),
    })
    resolveModelSelectionOrSingleMock.mockResolvedValue({
      provider: 'openai-compatible:oa-1',
      modelId: 'gpt-4o-mini-tts',
      modelKey: 'openai-compatible:oa-1::gpt-4o-mini-tts',
      mediaType: 'audio',
    })
    getProviderKeyMock.mockImplementation((providerId: string) => providerId.split(':')[0] || providerId)
    generateAudioMock.mockResolvedValue({
      success: true,
      audioUrl: 'data:audio/wav;base64,UklGRhYAAABXQVZFZm10IA==',
    })
  })

  it('uses shared audio generator for openai-compatible voice lines', async () => {
    const result = await generateVoiceLine({
      projectId: 'project-1',
      episodeId: 'episode-1',
      lineId: 'line-1',
      userId: 'user-1',
      audioModel: 'openai-compatible:oa-1::gpt-4o-mini-tts',
    })

    expect(generateAudioMock).toHaveBeenCalledWith(
      'user-1',
      'openai-compatible:oa-1::gpt-4o-mini-tts',
      '你好，世界',
      { voice: 'alloy', rate: 1 },
    )
    expect(uploadObjectMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      lineId: 'line-1',
      audioUrl: 'signed://voice/storage/line-1.wav',
      storageKey: 'voice/storage/line-1.wav',
      audioDuration: expect.any(Number),
    })
  })

  it('requires a bound voice for openai-compatible voice lines', async () => {
    prismaMock.novelPromotionEpisode.findUnique.mockResolvedValueOnce({
      speakerVoices: JSON.stringify({
        Narrator: {
          provider: 'bailian',
          voiceType: 'tts',
        },
      }),
    })

    await expect(
      generateVoiceLine({
        projectId: 'project-1',
        episodeId: 'episode-1',
        lineId: 'line-1',
        userId: 'user-1',
        audioModel: 'openai-compatible:oa-1::gpt-4o-mini-tts',
      }),
    ).rejects.toThrow('SPEAKER_VOICE_ENTRY_INVALID_BAILIAN_VOICE_ID: Narrator')

    expect(generateAudioMock).not.toHaveBeenCalled()
  })
})
