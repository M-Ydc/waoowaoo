'use client'

import { useMemo } from 'react'
import type { NovelPromotionWorkspaceProps } from '../types'
import type { CapabilitySelections } from '@/lib/model-config-contract'
import { buildProjectPromptVisibility } from '@/lib/prompt-i18n/prompt-visibility'

function parseCapabilitySelections(raw: unknown): CapabilitySelections {
  if (!raw) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as CapabilitySelections
  }
  if (typeof raw !== 'string') return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as CapabilitySelections
  } catch {
    return {}
  }
}

export function useWorkspaceProjectSnapshot({
  project,
  episode,
  urlStage,
}: Pick<NovelPromotionWorkspaceProps, 'project' | 'episode' | 'urlStage'>) {
  return useMemo(() => {
    const projectData = project.novelPromotionData
    const capabilityOverrides = parseCapabilitySelections(projectData?.capabilityOverrides)
    const promptVisibility = buildProjectPromptVisibility({
      globalAssetText: projectData?.globalAssetText,
      projectPrompt: projectData?.projectPrompt,
      artStyle: projectData?.artStyle,
      artStylePrompt: projectData?.artStylePrompt,
      imagePromptSupplement: projectData?.imagePromptSupplement,
      videoPromptSupplement: projectData?.videoPromptSupplement,
    })
    return {
      projectData,
      projectCharacters: projectData?.characters || [],
      projectLocations: projectData?.locations || [],
      episodeStoryboards: episode?.storyboards || [],
      currentStage: urlStage === 'editor' ? 'videos' : (urlStage || 'config'),
      globalAssetText: projectData?.globalAssetText || '',
      projectPrompt: projectData?.projectPrompt || '',
      novelText: episode?.novelText || '',
      analysisModel: projectData?.analysisModel,
      characterModel: projectData?.characterModel,
      locationModel: projectData?.locationModel,
      storyboardModel: projectData?.storyboardModel,
      editModel: projectData?.editModel,
      videoModel: projectData?.videoModel,
      audioModel: projectData?.audioModel,
      videoRatio: projectData?.videoRatio,
      capabilityOverrides,
      ttsRate: projectData?.ttsRate,
      artStyle: projectData?.artStyle,
      imagePromptSupplement: projectData?.imagePromptSupplement || '',
      videoPromptSupplement: projectData?.videoPromptSupplement || '',
      artStylePrompt: projectData?.artStylePrompt || '',
      promptVisibility,
    }
  }, [episode?.novelText, episode?.storyboards, project.novelPromotionData, urlStage])
}
