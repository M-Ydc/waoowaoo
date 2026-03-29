'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import GlassSurface from '@/components/ui/primitives/GlassSurface'

export interface PromptContextData {
  globalAssetText?: string | null
  projectPrompt?: string | null
  artStyleLabel?: string | null
  artStylePrompt?: string | null
  imagePromptSupplement?: string | null
  videoPromptSupplement?: string | null
}

interface PromptContextSummaryProps {
  data: PromptContextData
  className?: string
  showVideo?: boolean
}

export function PromptContextSummary({ data, className, showVideo = false }: PromptContextSummaryProps) {
  const t = useTranslations('worldContextModal')
  const hasData = !!(
    data.globalAssetText
    || data.projectPrompt
    || data.artStyleLabel
    || data.imagePromptSupplement
    || (showVideo && data.videoPromptSupplement)
  )

  if (!hasData) return null

  return (
    <GlassSurface variant="panel" className={className} density="compact">
      <div className="flex items-center gap-2 mb-3 border-b border-[var(--glass-stroke-base)] pb-2">
        <AppIcon name="settingsHexAlt" className="w-4 h-4 text-[var(--glass-text-secondary)]" />
        <span className="text-sm font-semibold text-[var(--glass-text-secondary)]">{t('promptSettingsTitle')}</span>
      </div>
      
      <div className="space-y-3">
        {data.globalAssetText && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--glass-text-tertiary)] opacity-70">
              {t('globalAssetTextTitle')}
            </div>
            <div className="text-xs text-[var(--glass-text-secondary)] line-clamp-3 bg-[var(--glass-bg-muted)]/30 p-2 rounded-md border border-[var(--glass-stroke-soft)]">
              {data.globalAssetText}
            </div>
          </div>
        )}

        {data.projectPrompt && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--glass-text-tertiary)] opacity-70">
              {t('projectPromptTitle')}
            </div>
            <div className="text-xs text-[var(--glass-text-secondary)] line-clamp-3 bg-[var(--glass-bg-muted)]/30 p-2 rounded-md border border-[var(--glass-stroke-soft)]">
              {data.projectPrompt}
            </div>
          </div>
        )}

        {(data.artStyleLabel || data.artStylePrompt) && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--glass-text-tertiary)] opacity-70">
              {t('stylePromptTitle')}
            </div>
            <div className="flex flex-col gap-1.5 bg-[var(--glass-bg-muted)]/30 p-2 rounded-md border border-[var(--glass-stroke-soft)]">
              {data.artStyleLabel && (
                <div className="flex items-center gap-1.5">
                  <span className="glass-chip glass-chip-info py-0 px-1.5 h-4 text-[10px] leading-none">
                    {data.artStyleLabel}
                  </span>
                </div>
              )}
              {data.artStylePrompt && (
                <div className="text-xs text-[var(--glass-text-secondary)] line-clamp-2 italic opacity-80">
                  {data.artStylePrompt}
                </div>
              )}
            </div>
          </div>
        )}

        {data.imagePromptSupplement && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--glass-text-tertiary)] opacity-70">
              {t('imagePromptTitle')}
            </div>
            <div className="text-xs text-[var(--glass-text-secondary)] line-clamp-2 bg-[var(--glass-bg-muted)]/30 p-2 rounded-md border border-[var(--glass-stroke-soft)]">
              {data.imagePromptSupplement}
            </div>
          </div>
        )}

        {showVideo && data.videoPromptSupplement && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--glass-text-tertiary)] opacity-70">
              {t('videoPromptTitle')}
            </div>
            <div className="text-xs text-[var(--glass-text-secondary)] line-clamp-2 bg-[var(--glass-bg-muted)]/30 p-2 rounded-md border border-[var(--glass-stroke-soft)]">
              {data.videoPromptSupplement}
            </div>
          </div>
        )}
      </div>
    </GlassSurface>
  )
}
