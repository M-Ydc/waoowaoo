'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'
import { ApiConfigToolbar } from './api-config-tab/ApiConfigToolbar'
import { resolveTaskPresentationState } from '@/lib/task/presentation'

interface PromptDefinition {
  id: string
  label: string
  category?: string
}

interface PromptConfigResponse {
  promptDefinitions?: PromptDefinition[]
  assistantDefinitions?: PromptDefinition[]
  templates?: {
    promptTemplates?: Record<string, {
      builtin: string
      override: string
      effective: string
    }>
    assistantTemplates?: Record<string, {
      builtin: string
      override: string
      effective: string
    }>
  }
}

type TemplateItem = {
  builtin: string
  override: string
  effective: string
}

function sortByLabel(items: PromptDefinition[]): PromptDefinition[] {
  return [...items].sort((a, b) => a.label.localeCompare(b.label, 'en'))
}

export default function PromptConfigTab() {
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [promptDefinitions, setPromptDefinitions] = useState<PromptDefinition[]>([])
  const [assistantDefinitions, setAssistantDefinitions] = useState<PromptDefinition[]>([])
  const [promptTemplates, setPromptTemplates] = useState<Record<string, string>>({})
  const [assistantTemplates, setAssistantTemplates] = useState<Record<string, string>>({})
  const [promptTemplateView, setPromptTemplateView] = useState<Record<string, TemplateItem>>({})
  const [assistantTemplateView, setAssistantTemplateView] = useState<Record<string, TemplateItem>>({})
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiFetch('/api/user/prompt-config')
        if (!res.ok) throw new Error('fetch failed')
        const data = (await res.json()) as PromptConfigResponse
        setPromptDefinitions(sortByLabel(Array.isArray(data.promptDefinitions) ? data.promptDefinitions : []))
        setAssistantDefinitions(sortByLabel(Array.isArray(data.assistantDefinitions) ? data.assistantDefinitions : []))
        const promptView = data.templates?.promptTemplates || {}
        const assistantView = data.templates?.assistantTemplates || {}
        setPromptTemplateView(promptView)
        setAssistantTemplateView(assistantView)
        setPromptTemplates(
          Object.fromEntries(
            Object.entries(promptView).map(([id, item]) => [id, item.override || '']),
          ),
        )
        setAssistantTemplates(
          Object.fromEntries(
            Object.entries(assistantView).map(([id, item]) => [id, item.override || '']),
          ),
        )
      } finally {
        setLoading(false)
      }
    }
    void fetchConfig()
  }, [])

  const savingState =
    saveStatus === 'saving'
      ? resolveTaskPresentationState({
        phase: 'processing',
        intent: 'modify',
        resource: 'text',
        hasOutput: true,
      })
      : null

  const saveConfig = useCallback(async (next: {
    promptTemplates?: Record<string, string>
    assistantTemplates?: Record<string, string>
  }) => {
    setSaveStatus('saving')
    try {
      const res = await apiFetch('/api/user/prompt-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error('save failed')
      setSaveStatus('saved')
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const groupedPromptDefinitions = useMemo(() => {
    return promptDefinitions.reduce<Record<string, PromptDefinition[]>>((acc, item) => {
      const key = item.category || 'general'
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
  }, [promptDefinitions])

  const handlePromptTemplateChange = (id: string, value: string) => {
    const next = { ...promptTemplates, [id]: value }
    setPromptTemplates(next)
    setPromptTemplateView((prev) => {
      const current = prev[id]
      if (!current) return prev
      const trimmed = value.trim()
      return {
        ...prev,
        [id]: {
          ...current,
          override: value,
          effective: trimmed ? value : current.builtin,
        },
      }
    })
    void saveConfig({ promptTemplates: { [id]: value } })
  }

  const handleAssistantTemplateChange = (id: string, value: string) => {
    const next = { ...assistantTemplates, [id]: value }
    setAssistantTemplates(next)
    setAssistantTemplateView((prev) => {
      const current = prev[id]
      if (!current) return prev
      const trimmed = value.trim()
      return {
        ...prev,
        [id]: {
          ...current,
          override: value,
          effective: trimmed ? value : current.builtin,
        },
      }
    })
    void saveConfig({ assistantTemplates: { [id]: value } })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[var(--glass-text-tertiary)]">
        {tc('loading')}
      </div>
    )
  }

  const getAssistantEffectiveText = (id: string) => assistantTemplateView[id]?.effective || ''
  const getPromptEffectiveText = (id: string) => promptTemplateView[id]?.effective || ''

  return (
    <div className="flex h-full flex-col">
      <ApiConfigToolbar
        title={t('promptConfig')}
        saveStatus={saveStatus}
        savingState={savingState}
        savingLabel={t('promptConfigSaving')}
        savedLabel={t('promptConfigSaved')}
        saveFailedLabel={t('promptConfigSaveFailed')}
      />

      <div className="flex-1 overflow-y-auto bg-[var(--glass-bg-canvas)]">
        <div className="space-y-6 p-6 max-w-4xl mx-auto">
          <div className="glass-surface-elevated rounded-2xl border border-[var(--glass-stroke-base)] p-8 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)] shadow-sm">
                <AppIcon name="settingsHex" className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--glass-text-primary)]">{t('promptConfigSystemTitle')}</h3>
                <p className="text-sm text-[var(--glass-text-tertiary)]">{t('promptConfigSystemDescription')}</p>
              </div>
            </div>

            <div className="space-y-6">
              {assistantDefinitions.map((definition) => (
                <div key={definition.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-[var(--glass-text-secondary)] uppercase tracking-wide">{definition.label}</label>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[var(--glass-text-tertiary)] uppercase tracking-wide">
                      {t('promptConfigEffectiveTitle')}
                    </div>
                      <textarea
                        value={getAssistantEffectiveText(definition.id)}
                        readOnly
                        placeholder={t('promptConfigBuiltinFallbackPlaceholder')}
                        className="glass-textarea-base h-40 w-full text-sm p-4 leading-relaxed bg-[var(--glass-bg-muted)]/60 border-[var(--glass-stroke-soft)]"
                      />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[var(--glass-text-tertiary)] uppercase tracking-wide">
                      {t('promptConfigOverrideTitle')}
                    </div>
                  <textarea
                    value={assistantTemplates[definition.id] || ''}
                    onChange={(event) => handleAssistantTemplateChange(definition.id, event.target.value)}
                    placeholder={t('promptConfigAssistantPlaceholder')}
                    className="glass-textarea-base h-32 w-full text-base p-4 leading-relaxed shadow-sm"
                  />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-surface-elevated rounded-2xl border border-[var(--glass-stroke-base)] p-8 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)] shadow-sm">
                <AppIcon name="menu" className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--glass-text-primary)]">{t('promptConfigTemplateTitle')}</h3>
                <p className="text-sm text-[var(--glass-text-tertiary)]">{t('promptConfigTemplateDescription')}</p>
              </div>
            </div>

            <div className="space-y-10">
              {Object.entries(groupedPromptDefinitions).map(([category, items]) => (
                <div key={category} className="space-y-6">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--glass-bg-muted)] border border-[var(--glass-stroke-base)] text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--glass-text-tertiary)]">
                    {category}
                  </div>
                  <div className="space-y-8">
                    {items.map((definition) => (
                      <div key={definition.id} className="space-y-3 pl-4 border-l-2 border-[var(--glass-stroke-soft)]">
                        <label className="text-sm font-bold text-[var(--glass-text-secondary)] uppercase tracking-wide">{definition.label}</label>
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-[var(--glass-text-tertiary)] uppercase tracking-wide">
                            {t('promptConfigEffectiveTitle')}
                          </div>
                          <textarea
                            value={getPromptEffectiveText(definition.id)}
                            readOnly
                            placeholder={t('promptConfigBuiltinFallbackPlaceholder')}
                            className="glass-textarea-base h-40 w-full text-sm p-4 leading-relaxed bg-[var(--glass-bg-muted)]/60 border-[var(--glass-stroke-soft)]"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-[var(--glass-text-tertiary)] uppercase tracking-wide">
                            {t('promptConfigOverrideTitle')}
                          </div>
                        <textarea
                          value={promptTemplates[definition.id] || ''}
                          onChange={(event) => handlePromptTemplateChange(definition.id, event.target.value)}
                          placeholder={t('promptConfigTemplatePlaceholder')}
                          className="glass-textarea-base h-40 w-full text-base p-4 leading-relaxed shadow-sm"
                        />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
