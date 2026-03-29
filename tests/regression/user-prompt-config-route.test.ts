import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callRoute } from '../integration/api/helpers/call-route'
import { installAuthMocks, mockAuthenticated, resetAuthMockState } from '../helpers/auth'

vi.mock('@/lib/prompt-i18n/runtime-overrides', () => ({
  getUserPromptConfigView: vi.fn(async () => ({
    promptDefinitions: [{ id: 'np_image_prompt_modify', label: 'Image prompt', category: 'image' }],
    assistantDefinitions: [{ id: 'tutorial', label: 'Tutorial assistant system prompt' }],
    templates: {
      promptTemplates: {
        np_image_prompt_modify: {
          builtin: 'builtin image prompt',
          override: '',
          effective: 'builtin image prompt',
        },
      },
      assistantTemplates: {
        tutorial: {
          builtin: 'builtin tutorial prompt',
          override: 'custom tutorial prompt',
          effective: 'custom tutorial prompt',
        },
      },
    },
  })),
  saveUserPromptOverrideState: vi.fn(async () => ({ success: true })),
}))

describe('regression - user prompt config route', () => {
  beforeEach(() => {
    vi.resetModules()
    installAuthMocks()
    mockAuthenticated('user-regression-1')
  })

  it('GET returns effective templates including built-in prompt content', async () => {
    const mod = await import('@/app/api/user/prompt-config/route')
    const response = await callRoute(mod.GET, 'GET', undefined, {
      headers: { 'accept-language': 'zh-CN,zh;q=0.9' },
    })

    expect(response.status).toBe(200)
    const json = await response.json() as {
      templates?: {
        promptTemplates?: Record<string, { builtin: string; effective: string }>
        assistantTemplates?: Record<string, { builtin: string; effective: string }>
      }
    }

    expect(json.templates?.promptTemplates?.np_image_prompt_modify?.builtin).toBe('builtin image prompt')
    expect(json.templates?.promptTemplates?.np_image_prompt_modify?.effective).toBe('builtin image prompt')
    expect(json.templates?.assistantTemplates?.tutorial?.builtin).toBe('builtin tutorial prompt')
    expect(json.templates?.assistantTemplates?.tutorial?.effective).toBe('custom tutorial prompt')

    resetAuthMockState()
  })
})
