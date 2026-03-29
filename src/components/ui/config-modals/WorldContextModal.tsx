'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

interface WorldContextModalProps {
  isOpen: boolean
  onClose: () => void
  text: string
  onChange: (value: string) => void
  projectPrompt?: string
  imagePrompt?: string
  videoPrompt?: string
  stylePrompt?: string
  onProjectPromptChange?: (value: string) => void
  onImagePromptChange?: (value: string) => void
  onVideoPromptChange?: (value: string) => void
  onStylePromptChange?: (value: string) => void
}

export function WorldContextModal({
  isOpen,
  onClose,
  text,
  onChange,
  projectPrompt = '',
  imagePrompt = '',
  videoPrompt = '',
  stylePrompt = '',
  onProjectPromptChange,
  onImagePromptChange,
  onVideoPromptChange,
  onStylePromptChange,
}: WorldContextModalProps) {
  const t = useTranslations('worldContextModal')
  const tc = useTranslations('common')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleTextChange = (value: string, field: 'text' | 'project' | 'image' | 'video' | 'style' = 'text') => {
    if (field === 'text') onChange(value)
    else if (field === 'project') onProjectPromptChange?.(value)
    else if (field === 'image') onImagePromptChange?.(value)
    else if (field === 'video') onVideoPromptChange?.(value)
    else if (field === 'style') onStylePromptChange?.(value)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center glass-overlay animate-fadeIn"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="glass-surface-modal p-7 w-full max-w-3xl transform transition-all scale-100 h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[var(--glass-text-primary)]">{t('title')}</h2>
              <p className="text-[var(--glass-text-tertiary)] text-sm">{t('description')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`glass-chip text-xs transition-all duration-300 ${
                saveStatus === 'saved' ? 'glass-chip-success' : 'glass-chip-neutral'
              }`}
            >
              {saveStatus === 'saved' ? (
                <>
                  <AppIcon name="check" className="w-3.5 h-3.5" />
                  {tc('saved')}
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 bg-[var(--glass-tone-success-fg)] rounded-full"></span>
                  {tc('autoSave')}
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="glass-btn-base glass-btn-soft rounded-full p-2 text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)]"
            >
              <AppIcon name="close" className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <AppIcon name="settingsHexAlt" className="w-4 h-4 text-[var(--glass-text-secondary)]" />
              <span className="text-sm font-semibold text-[var(--glass-text-secondary)]">{t('title')}</span>
            </div>
            <div className="glass-surface-soft p-4 min-h-[200px] flex flex-col">
              <textarea
                value={text}
                onChange={(event) => handleTextChange(event.target.value, 'text')}
                placeholder={t('placeholder')}
                className="glass-textarea-base flex-1 text-base resize-none leading-relaxed placeholder:text-[var(--glass-text-tertiary)]/70 custom-scrollbar p-2"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <AppIcon name="menu" className="w-4 h-4 text-[var(--glass-text-secondary)]" />
              <span className="text-sm font-semibold text-[var(--glass-text-secondary)]">{t('promptSettingsTitle')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">{t('projectPromptTitle')}</label>
                <textarea
                  value={projectPrompt}
                  onChange={(e) => handleTextChange(e.target.value, 'project')}
                  placeholder={t('projectPromptPlaceholder')}
                  className="glass-textarea-base h-24 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">{t('imagePromptTitle')}</label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => handleTextChange(e.target.value, 'image')}
                  placeholder={t('imagePromptPlaceholder')}
                  className="glass-textarea-base h-24 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">{t('videoPromptTitle')}</label>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => handleTextChange(e.target.value, 'video')}
                  placeholder={t('videoPromptPlaceholder')}
                  className="glass-textarea-base h-24 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--glass-text-secondary)]">{t('stylePromptTitle')}</label>
              <textarea
                value={stylePrompt}
                onChange={(e) => handleTextChange(e.target.value, 'style')}
                placeholder={t('stylePromptPlaceholder')}
                className="glass-textarea-base h-24 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-0 flex justify-start items-center flex-shrink-0">
          <span className="text-xs text-[var(--glass-text-tertiary)]">{t('hint')}</span>
        </div>
      </div>
    </div>
  )
}
