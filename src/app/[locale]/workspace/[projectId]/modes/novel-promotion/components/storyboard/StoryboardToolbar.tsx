'use client'

import { useTranslations } from 'next-intl'
import type { TaskPresentationState } from '@/lib/task/presentation'
import StoryboardHeader from './StoryboardHeader'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { AppIcon } from '@/components/ui/icons'
import { GlassButton } from '@/components/ui/primitives'
import { PromptContextSummary } from '../prompts/PromptContextSummary'

interface StoryboardToolbarProps {
  totalSegments: number
  totalPanels: number
  isDownloadingImages: boolean
  runningCount: number
  pendingPanelCount: number
  isBatchSubmitting: boolean
  addingStoryboardGroup: boolean
  addingStoryboardGroupState: TaskPresentationState | null
  onDownloadAllImages: () => Promise<void>
  onGenerateAllPanels: () => Promise<void>
  onAddStoryboardGroupAtStart: () => void
  onBack: () => void
  promptVisibility?: {
    globalAssetText: string
    projectPrompt: string
    artStyleLabel: string
    artStylePrompt: string
    imagePromptSupplement: string
    videoPromptSupplement: string
  }
}

export default function StoryboardToolbar({
  totalSegments,
  totalPanels,
  isDownloadingImages,
  runningCount,
  pendingPanelCount,
  isBatchSubmitting,
  addingStoryboardGroup,
  addingStoryboardGroupState,
  onDownloadAllImages,
  onGenerateAllPanels,
  onAddStoryboardGroupAtStart,
  onBack,
  promptVisibility,
}: StoryboardToolbarProps) {
  const t = useTranslations('storyboard')
  return (
    <>
      <div className="px-6 mb-2">
        {promptVisibility && (
          <PromptContextSummary
            data={{
              globalAssetText: promptVisibility.globalAssetText,
              projectPrompt: promptVisibility.projectPrompt,
              artStyleLabel: promptVisibility.artStyleLabel,
              artStylePrompt: promptVisibility.artStylePrompt,
              imagePromptSupplement: promptVisibility.imagePromptSupplement,
            }}
            className="w-full"
          />
        )}
      </div>

      <StoryboardHeader
        totalSegments={totalSegments}
        totalPanels={totalPanels}
        isDownloadingImages={isDownloadingImages}
        runningCount={runningCount}
        pendingPanelCount={pendingPanelCount}
        isBatchSubmitting={isBatchSubmitting}
        onDownloadAllImages={onDownloadAllImages}
        onGenerateAllPanels={onGenerateAllPanels}
        onBack={onBack}
      />

      <div className="flex justify-center">
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={onAddStoryboardGroupAtStart}
          disabled={addingStoryboardGroup}
          className="opacity-60 hover:opacity-100"
        >
          {addingStoryboardGroup ? (
            <TaskStatusInline state={addingStoryboardGroupState} />
          ) : (
            <>
              <AppIcon name="plusAlt" className="w-4 h-4" />
              <span>{t('group.addAtStart')}</span>
            </>
          )}
        </GlassButton>
      </div>
    </>
  )
}
