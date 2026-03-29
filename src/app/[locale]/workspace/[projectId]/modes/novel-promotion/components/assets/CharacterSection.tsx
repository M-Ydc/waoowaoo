'use client'
import { logInfo as _ulogInfo } from '@/lib/logging/core'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import type { TaskPresentationState } from '@/lib/task/presentation'
import { PRIMARY_APPEARANCE_INDEX } from '@/lib/constants'

import { Character, CharacterAppearance } from '@/types/project'
import { useProjectAssets } from '@/lib/query/hooks/useProjectAssets'
import { PromptContextSummary } from '../prompts/PromptContextSummary'
import { useWorkspaceStageRuntimeOptional } from '../../WorkspaceStageRuntimeContext'
import CharacterCard from './CharacterCard'
import CharacterProfileCard from './CharacterProfileCard'
import { parseProfileData } from '@/types/character-profile'
import { AppIcon } from '@/components/ui/icons'

interface CharacterSectionProps {
    projectId: string
    focusCharacterId?: string | null
    focusCharacterRequestId?: number
    activeTaskKeys: Set<string>
    onClearTaskKey: (key: string) => void
    onRegisterTransientTaskKey: (key: string) => void
    isAnalyzingAssets: boolean
    onAddCharacter: () => void
    onDeleteCharacter: (characterId: string) => void
    onDeleteAppearance: (characterId: string, appearanceId: string) => void
    onEditAppearance: (characterId: string, characterName: string, appearance: CharacterAppearance, introduction?: string | null) => void
    handleGenerateImage: (type: 'character' | 'location', id: string, appearanceId?: string, count?: number) => Promise<void>
    onSelectImage: (characterId: string, appearanceId: string, imageIndex: number | null) => void
    onConfirmSelection: (characterId: string, appearanceId: string) => void
    onRegenerateSingle: (characterId: string, appearanceId: string, imageIndex: number) => Promise<void>
    onRegenerateGroup: (characterId: string, appearanceId: string, count?: number) => Promise<void>
    onUndo: (characterId: string, appearanceId: string) => void
    onImageClick: (imageUrl: string) => void
    onImageEdit: (characterId: string, appearanceId: string, imageIndex: number, characterName: string) => void
    onVoiceChange: (characterId: string, customVoiceUrl: string) => void
    onVoiceDesign: (characterId: string, characterName: string) => void
    onVoiceSelectFromHub: (characterId: string) => void
    onCopyFromGlobal: (characterId: string) => void
    getAppearances: (character: Character) => CharacterAppearance[]
    filterIds?: Set<string> | null
    unconfirmedCharacters: Character[]
    isConfirmingCharacter: (characterId: string) => boolean
    deletingCharacterId: string | null
    batchConfirming: boolean
    batchConfirmingState: TaskPresentationState | null
    onBatchConfirm: () => void
    onEditProfile: (characterId: string, characterName: string) => void
    onConfirmProfile: (characterId: string) => void
    onUseExistingProfile: (characterId: string) => void
    onDeleteProfile: (characterId: string) => void
}

export default function CharacterSection({
    projectId,
    focusCharacterId = null,
    focusCharacterRequestId = 0,
    activeTaskKeys,
    onClearTaskKey,
    onRegisterTransientTaskKey,
    isAnalyzingAssets,
    onAddCharacter,
    onDeleteCharacter,
    onDeleteAppearance,
    onEditAppearance,
    handleGenerateImage,
    onSelectImage,
    onConfirmSelection,
    onRegenerateSingle,
    onRegenerateGroup,
    onUndo,
    onImageClick,
    onImageEdit,
    onVoiceChange,
    onVoiceDesign,
    onVoiceSelectFromHub,
    onCopyFromGlobal,
    getAppearances,
    filterIds = null,
    unconfirmedCharacters,
    isConfirmingCharacter,
    deletingCharacterId,
    batchConfirming,
    batchConfirmingState,
    onBatchConfirm,
    onEditProfile,
    onConfirmProfile,
    onUseExistingProfile,
    onDeleteProfile,
}: CharacterSectionProps) {
    const t = useTranslations('assets')
    const runtime = useWorkspaceStageRuntimeOptional()
    const promptVisibility = runtime?.promptVisibility

    const analyzingAssetsState = isAnalyzingAssets
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'generate',
            resource: 'image',
            hasOutput: false,
        })
        : null

    const { data: assets } = useProjectAssets(projectId)
    const allCharacters: Character[] = useMemo(() => assets?.characters ?? [], [assets?.characters])
    const unconfirmedIds = useMemo(
        () => new Set(unconfirmedCharacters.map((c) => c.id)),
        [unconfirmedCharacters],
    )
    const characters: Character[] = useMemo(
        () => {
            const base = filterIds ? allCharacters.filter((c) => filterIds.has(c.id)) : allCharacters
            return base.filter((c) => !unconfirmedIds.has(c.id))
        },
        [allCharacters, filterIds, unconfirmedIds],
    )
    const [highlightedCharacterId, setHighlightedCharacterId] = useState<string | null>(null)
    const scrollAnimationRef = useRef<number | null>(null)

    const totalAppearances = characters.reduce((sum, char) => sum + (char.appearances?.length || 0), 0)

    useEffect(() => {
        if (!focusCharacterId) return
        if (!characters.some(character => character.id === focusCharacterId)) return

        const element = document.getElementById(`project-character-${focusCharacterId}`)
        if (!element) return
        const scrollContainer = (element.closest('[data-asset-scroll-container="1"]') ||
            document.querySelector('[data-asset-scroll-container="1"]') ||
            element.closest('.custom-scrollbar')) as HTMLElement | null

        if (scrollAnimationRef.current !== null) {
            window.cancelAnimationFrame(scrollAnimationRef.current)
            scrollAnimationRef.current = null
        }

        if (scrollContainer) {
            const startTop = scrollContainer.scrollTop
            const elementTop = element.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top + scrollContainer.scrollTop
            const targetTop = Math.max(0, elementTop - (scrollContainer.clientHeight - element.clientHeight) / 2)
            const duration = 650
            const startTime = performance.now()
            const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)

            const animate = (now: number) => {
                const progress = Math.min((now - startTime) / duration, 1)
                const eased = easeOutCubic(progress)
                scrollContainer.scrollTop = startTop + (targetTop - startTop) * eased
                if (progress < 1) {
                    scrollAnimationRef.current = window.requestAnimationFrame(animate)
                } else {
                    scrollAnimationRef.current = null
                }
            }

            scrollAnimationRef.current = window.requestAnimationFrame(animate)
        } else {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }

        setHighlightedCharacterId(focusCharacterId)

        const timer = window.setTimeout(() => {
            setHighlightedCharacterId((current) => (current === focusCharacterId ? null : current))
        }, 2200)

        return () => {
            window.clearTimeout(timer)
            if (scrollAnimationRef.current !== null) {
                window.cancelAnimationFrame(scrollAnimationRef.current)
                scrollAnimationRef.current = null
            }
        }
    }, [characters, focusCharacterId, focusCharacterRequestId])

    return (
        <div className="glass-surface p-6 flex flex-col gap-6">
          {promptVisibility && (
            <PromptContextSummary
              data={{
                globalAssetText: promptVisibility.globalAssetText,
                projectPrompt: promptVisibility.projectPrompt,
                artStyleLabel: promptVisibility.artStyleLabel,
                artStylePrompt: promptVisibility.artStylePrompt,
                        imagePromptSupplement: promptVisibility.imagePromptSupplement,
                    }}
                    className="mb-2"
                />
            )}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--glass-bg-muted)] text-[var(--glass-text-secondary)]">
                        <AppIcon name="user" className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-bold text-[var(--glass-text-primary)]">{t("stage.characterAssets")}</h3>
                    {isAnalyzingAssets && (
                        <span className="px-2 py-1 text-xs bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)] rounded-lg flex items-center gap-1">
                            <TaskStatusInline state={analyzingAssetsState!} />
                        </span>
                    )}
                    <span className="text-sm text-[var(--glass-text-tertiary)] bg-[var(--glass-bg-muted)]/50 px-2 py-1 rounded-lg">
                        {t("stage.counts", { characterCount: characters.length, appearanceCount: totalAppearances })}
                    </span>
                </div>
                <button
                    onClick={onAddCharacter}
                    className="glass-btn-base glass-btn-primary flex items-center gap-2 px-4 py-2 font-medium"
                >
                    + {t("character.add")}
                </button>
            </div>

            {unconfirmedCharacters.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[var(--glass-tone-info-bg)]">
                                <AppIcon name="sparkles" className="h-3 w-3 text-[var(--glass-tone-info-fg)]" />
                            </span>
                            <span className="text-sm font-semibold text-[var(--glass-text-primary)]">{t('stage.pendingProfilesBanner')}</span>
                            <span className="text-xs text-[var(--glass-text-tertiary)]">{t('stage.pendingProfilesHint')}</span>
                        </div>
                        <button
                            onClick={onBatchConfirm}
                            disabled={batchConfirming}
                            className="glass-btn-base glass-btn-primary px-3 py-1.5 text-sm disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {batchConfirming ? (
                                <TaskStatusInline state={batchConfirmingState!} className="text-white [&>span]:text-white [&_svg]:text-white" />
                            ) : (
                                t('stage.confirmAll', { count: unconfirmedCharacters.length })
                            )}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {unconfirmedCharacters.map((character) => {
                            const profileData = parseProfileData(character.profileData!)
                            if (!profileData) return null
                            return (
                                <CharacterProfileCard
                                    key={character.id}
                                    characterId={character.id}
                                    name={character.name}
                                    profileData={profileData}
                                    onEdit={() => onEditProfile(character.id, character.name)}
                                    onConfirm={() => onConfirmProfile(character.id)}
                                    onUseExisting={() => onUseExistingProfile(character.id)}
                                    onDelete={() => onDeleteProfile(character.id)}
                                    isConfirming={isConfirmingCharacter(character.id)}
                                    isDeleting={deletingCharacterId === character.id}
                                />
                            )
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {characters.map(character => {
                    const appearances = getAppearances(character)
                    const sortedAppearances = [...appearances].sort((a, b) => a.appearanceIndex - b.appearanceIndex)
                    const primaryAppearance = sortedAppearances.find(a => a.appearanceIndex === PRIMARY_APPEARANCE_INDEX) || sortedAppearances[0]

                    const primaryImageUrl = primaryAppearance?.selectedIndex !== null && primaryAppearance?.selectedIndex !== undefined
                        ? (primaryAppearance?.imageUrls?.[primaryAppearance.selectedIndex!] || primaryAppearance?.imageUrl)
                        : (primaryAppearance?.imageUrl || (primaryAppearance?.imageUrls && primaryAppearance.imageUrls.length > 0 ? primaryAppearance.imageUrls[0] : null))
                    const primarySelected = !!primaryImageUrl

                    return (
                        <div
                            key={character.id}
                            id={`project-character-${character.id}`}
                            className={`glass-surface rounded-xl p-4 scroll-mt-24 transition-all duration-700 ${highlightedCharacterId === character.id ? 'ring-2 ring-[var(--glass-focus-ring)] bg-[var(--glass-tone-info-bg)]/40' : ''}`}
                        >
                            <div className="flex items-center justify-between pb-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-base font-semibold text-[var(--glass-text-primary)]">{character.name}</h3>
                                    <span className="text-xs text-[var(--glass-text-tertiary)]">
                                        {t("character.assetCount", { count: sortedAppearances.length })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onCopyFromGlobal(character.id)}
                                        className="text-xs text-[var(--glass-tone-info-fg)] hover:text-[var(--glass-tone-info-fg)] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--glass-tone-info-bg)] transition-colors"
                                    >
                                        <AppIcon name="copy" className="w-4 h-4" />
                                        {t("character.copyFromGlobal")}
                                    </button>
                                    <button
                                        onClick={() => onDeleteCharacter(character.id)}
                                        className="text-xs text-[var(--glass-tone-danger-fg)] hover:text-[var(--glass-tone-danger-fg)] flex items-center gap-1"
                                    >
                                        <AppIcon name="trash" className="w-4 h-4" />
                                        {t("character.delete")}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {sortedAppearances.map(appearance => {
                                    const isPrimary = appearance.appearanceIndex === (primaryAppearance?.appearanceIndex ?? PRIMARY_APPEARANCE_INDEX)
                                    return (
                                        <CharacterCard
                                            key={`${character.id}-${appearance.appearanceIndex}`}
                                            character={character}
                                            appearance={appearance}
                                            onEdit={() => onEditAppearance(character.id, character.name, appearance, character.introduction)}
                                            onDelete={() => onDeleteCharacter(character.id)}
                                            onDeleteAppearance={() => appearance.id && onDeleteAppearance(character.id, appearance.id)}
                                            onRegenerate={(count) => {
                                                const imageUrls = appearance.imageUrls || []
                                                const validImageCount = imageUrls.filter(url => !!url).length

                                                if (validImageCount === 1) {
                                                    const selectedIndex = appearance.selectedIndex ?? 0
                                                    const taskKey = `character-${character.id}-${appearance.appearanceIndex}-${selectedIndex}`
                                                    onRegisterTransientTaskKey(taskKey)
                                                    void onRegenerateSingle(character.id, appearance.id, selectedIndex).catch(() => {
                                                        onClearTaskKey(taskKey)
                                                    })
                                                }
                                                else {
                                                    const taskKey = `character-${character.id}-${appearance.appearanceIndex}-group`
                                                    onRegisterTransientTaskKey(taskKey)
                                                    void onRegenerateGroup(character.id, appearance.id, count).catch(() => {
                                                        onClearTaskKey(taskKey)
                                                    })
                                                }
                                            }}
                                            onGenerate={(count) => {
                                                const taskKey = `character-${character.id}-${appearance.appearanceIndex}-group`
                                                onRegisterTransientTaskKey(taskKey)
                                                void handleGenerateImage('character', character.id, appearance.id, count).catch(() => {
                                                    onClearTaskKey(taskKey)
                                                })
                                            }}
                                            onUndo={() => onUndo(character.id, appearance.id)}
                                            onImageClick={onImageClick}
                                            showDeleteButton={true}
                                            appearanceCount={sortedAppearances.length}
                                            onSelectImage={onSelectImage}
                                            activeTaskKeys={activeTaskKeys}
                                            onClearTaskKey={onClearTaskKey}
                                            onImageEdit={(charId, _appearanceId, imageIndex) => onImageEdit(charId, appearance.id, imageIndex, character.name)}
                                            isPrimaryAppearance={isPrimary}
                                            primaryAppearanceSelected={primarySelected}
                                            projectId={projectId}
                                            onConfirmSelection={onConfirmSelection}
                                            onVoiceChange={(characterId: string, customVoiceUrl?: string) => customVoiceUrl && onVoiceChange(characterId, customVoiceUrl)}
                                            onVoiceDesign={onVoiceDesign}
                                            onVoiceSelectFromHub={onVoiceSelectFromHub}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
