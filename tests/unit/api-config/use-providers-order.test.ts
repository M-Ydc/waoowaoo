import { describe, expect, it } from 'vitest'
import { mergeProvidersForDisplay } from '@/app/[locale]/profile/components/api-config/hooks'
import { getProviderDisplayName, type Provider } from '@/app/[locale]/profile/components/api-config/types'

describe('useProviders provider order merge', () => {
  it('preserves saved providers order and appends missing presets at the end', () => {
    const presetProviders: Provider[] = [
      { id: 'ark', name: '火山引擎 Ark' },
      { id: 'google', name: 'Google AI Studio' },
      { id: 'bailian', name: '阿里云百炼' },
    ]
    const savedProviders: Provider[] = [
      { id: 'google', name: 'Google Legacy Name', apiKey: 'google-key', hidden: true },
      { id: 'openai-compatible:oa-2', name: 'OpenAI B', baseUrl: 'https://oa-b.test', apiKey: 'oa-key' },
      { id: 'ark', name: 'Ark Legacy Name', apiKey: 'ark-key' },
    ]

    const merged = mergeProvidersForDisplay(savedProviders, presetProviders)
    expect(merged.map((provider) => provider.id)).toEqual([
      'google',
      'openai-compatible:oa-2',
      'ark',
      'bailian',
    ])
    expect(merged[0]?.hidden).toBe(true)
  })

  it('uses preset localized names for preset providers while keeping apiKey/baseUrl from saved data', () => {
    const presetProviders: Provider[] = [
      { id: 'google', name: 'Google AI Studio', baseUrl: 'https://google.default' },
    ]
    const savedProviders: Provider[] = [
      { id: 'google', name: 'Google Old Name', baseUrl: 'https://google.custom', apiKey: 'google-key' },
    ]

    const merged = mergeProvidersForDisplay(savedProviders, presetProviders)
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      id: 'google',
      name: 'Google AI Studio',
      baseUrl: 'https://google.custom',
      apiKey: 'google-key',
      hasApiKey: true,
    })
  })

  it('uses preset official baseUrl for minimax even when saved payload contains a custom baseUrl', () => {
    const presetProviders: Provider[] = [
      { id: 'minimax', name: 'MiniMax Hailuo', baseUrl: 'https://api.minimaxi.com/v1' },
    ]
    const savedProviders: Provider[] = [
      { id: 'minimax', name: 'MiniMax Legacy', baseUrl: 'https://custom.minimax.proxy/v1', apiKey: 'mm-key' },
    ]

    const merged = mergeProvidersForDisplay(savedProviders, presetProviders)
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      id: 'minimax',
      name: 'MiniMax Hailuo',
      baseUrl: 'https://api.minimaxi.com/v1',
      apiKey: 'mm-key',
      hasApiKey: true,
    })
  })

  it('keeps custom provider instance name instead of replacing it with preset key label', () => {
    const presetProviders: Provider[] = [
      { id: 'openrouter', name: 'OpenRouter' },
      { id: 'google', name: 'Google AI Studio' },
    ]
    const savedProviders: Provider[] = [
      {
        id: 'openai-compatible:oa-2',
        name: 'Acme OpenAI Gateway',
        baseUrl: 'https://oa-b.test',
        apiKey: 'oa-key',
      },
      {
        id: 'gemini-compatible:gm-2',
        name: 'Acme Gemini Bridge',
        baseUrl: 'https://gm-b.test',
        apiKey: 'gm-key',
      },
    ]

    const merged = mergeProvidersForDisplay(savedProviders, presetProviders)
    expect(merged[0]).toMatchObject({
      id: 'openai-compatible:oa-2',
      name: 'Acme OpenAI Gateway',
      baseUrl: 'https://oa-b.test',
    })
    expect(merged[1]).toMatchObject({
      id: 'gemini-compatible:gm-2',
      name: 'Acme Gemini Bridge',
      baseUrl: 'https://gm-b.test',
    })
  })
})

describe('getProviderDisplayName', () => {
  it('keeps custom provider instance id unresolved so caller can use saved instance name', () => {
    expect(getProviderDisplayName('openai-compatible:oa-1', 'zh')).toBe('openai-compatible:oa-1')
    expect(getProviderDisplayName('gemini-compatible:gm-1', 'en')).toBe('gemini-compatible:gm-1')
  })
})
