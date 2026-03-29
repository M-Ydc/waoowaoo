import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROMPT_IDS } from '@/lib/prompt-i18n/prompt-ids'

const prismaMock = {
  userPreference: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  novelPromotionProject: {
    findUnique: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

describe('prompt runtime overrides', () => {
  beforeEach(() => {
    prismaMock.userPreference.findUnique.mockReset()
    prismaMock.userPreference.upsert.mockReset()
    prismaMock.novelPromotionProject.findUnique.mockReset()
  })

  it('uses user override template and appends project image prompt supplements', async () => {
    prismaMock.userPreference.findUnique.mockResolvedValue({
      systemPromptOverrides: JSON.stringify({
        promptTemplates: {
          [PROMPT_IDS.NP_IMAGE_PROMPT_MODIFY]: 'Override: {prompt_input} / {user_input} / {video_prompt_input}',
        },
      }),
    })
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
      globalAssetText: 'World bible',
      projectPrompt: 'Keep the tone mysterious.',
      artStylePrompt: 'Dark painterly style.',
      imagePromptSupplement: 'Maintain costume continuity.',
      videoPromptSupplement: 'Use slow camera motion.',
    })

    const { buildPromptWithOverrides } = await import('@/lib/prompt-i18n/runtime-overrides')
    const result = await buildPromptWithOverrides({
      userId: 'u1',
      projectId: 'p1',
      stage: 'image',
      promptId: PROMPT_IDS.NP_IMAGE_PROMPT_MODIFY,
      locale: 'zh',
      variables: {
        prompt_input: 'base',
        user_input: 'modify',
        video_prompt_input: 'camera move',
      },
    })

    expect(result).toContain('Override: base / modify / camera move')
    expect(result).toContain('项目提示词补充')
    expect(result).toContain('项目图像提示词补充')
    expect(result).toContain('项目风格补充')
  })

  it('returns assistant override when present', async () => {
    prismaMock.userPreference.findUnique.mockResolvedValue({
      systemPromptOverrides: JSON.stringify({
        assistantTemplates: {
          tutorial: 'Custom tutorial prompt',
        },
      }),
    })

    const { renderAssistantSystemPromptWithOverrides } = await import('@/lib/prompt-i18n/runtime-overrides')
    const result = await renderAssistantSystemPromptWithOverrides({
      userId: 'u1',
      promptId: 'tutorial',
      basePrompt: 'Base prompt',
    })

    expect(result).toBe('Custom tutorial prompt')
  })

  it('appends project prompt for storyboard stage even without user override', async () => {
    prismaMock.userPreference.findUnique.mockResolvedValue({
      systemPromptOverrides: null,
    })
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
      globalAssetText: 'World bible',
      projectPrompt: 'Emphasize quiet tension.',
      artStylePrompt: 'Neo-noir contrast.',
      imagePromptSupplement: 'Keep facial continuity.',
      videoPromptSupplement: 'Use restrained motion.',
    })

    const { appendProjectPromptContextForProject } = await import('@/lib/prompt-i18n/runtime-overrides')
    const result = await appendProjectPromptContextForProject({
      projectId: 'p1',
      basePrompt: 'Base storyboard prompt',
      stage: 'storyboard',
    })

    expect(result).toContain('Base storyboard prompt')
    expect(result).toContain('Emphasize quiet tension.')
    expect(result).toContain('Neo-noir contrast.')
    expect(result).toContain('Keep facial continuity.')
  })
})
