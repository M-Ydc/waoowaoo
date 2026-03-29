import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = {
  userPreference: {
    findUnique: vi.fn(),
  },
  novelPromotionProject: {
    findUnique: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

describe('worker prompt project context behavior', () => {
  beforeEach(() => {
    prismaMock.userPreference.findUnique.mockReset()
    prismaMock.novelPromotionProject.findUnique.mockReset()
  })

  it('appends project/video/style supplements for video stage prompts', async () => {
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
      globalAssetText: 'world bible',
      projectPrompt: 'keep dramatic tension',
      artStylePrompt: 'neo noir contrast',
      imagePromptSupplement: 'preserve costumes',
      videoPromptSupplement: 'use slow camera movement',
    })

    const { appendProjectPromptContextForProject } = await import('@/lib/prompt-i18n/runtime-overrides')
    const result = await appendProjectPromptContextForProject({
      projectId: 'project-1',
      basePrompt: 'base video prompt',
      stage: 'video',
    })

    expect(result).toContain('base video prompt')
    expect(result).toContain('keep dramatic tension')
    expect(result).toContain('neo noir contrast')
    expect(result).toContain('use slow camera movement')
    expect(result).not.toContain('world bible')
    expect(result).not.toContain('preserve costumes')
  })
})
