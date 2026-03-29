'use client'
import { logInfo as _ulogInfo } from '@/lib/logging/core'
import { useTranslations } from 'next-intl'

import { Location, Prop } from '@/types/project'
import { PromptContextSummary } from '../prompts/PromptContextSummary'
import { useWorkspaceStageRuntimeOptional } from '../../WorkspaceStageRuntimeContext'
import { useProjectAssets } from '@/lib/query/hooks/useProjectAssets'
import LocationCard from './LocationCard'
import { AppIcon } from '@/components/ui/icons'
import { resolveLocationBackedGenerateType } from './location-backed-asset'

interface LocationSectionProps {
    projectId: string
    assetType?: 'location' | 'prop'
    activeTaskKeys: Set<string>
    onClearTaskKey: (key: string) => void
    onRegisterTransientTaskKey: (key: string) => void
    onAddLocation: () => void
    onDeleteLocation: (locationId: string) => void
    onEditLocation: (location: Location | Prop) => void
    handleGenerateImage: (type: 'character' | 'location' | 'prop', id: string, appearanceId?: string, count?: number) => Promise<void>
    onSelectImage: (locationId: string, imageIndex: number | null) => void
    onConfirmSelection: (locationId: string) => void
    onRegenerateSingle: (locationId: string, imageIndex: number) => Promise<void>
    onRegenerateGroup: (locationId: string, count?: number) => Promise<void>
    onUndo: (locationId: string) => void
    onImageClick: (imageUrl: string) => void
    onImageEdit: (locationId: string, imageIndex: number, locationName: string) => void
    onCopyFromGlobal: (locationId: string) => void
    filterIds?: Set<string> | null
}

export default function LocationSection({
    projectId,
    assetType = 'location',
    activeTaskKeys,
    onClearTaskKey,
    onRegisterTransientTaskKey,
    onAddLocation,
    onDeleteLocation,
    onEditLocation,
    handleGenerateImage,
    onSelectImage,
    onConfirmSelection,
    onRegenerateSingle,
    onRegenerateGroup,
    onUndo,
    onImageClick,
    onImageEdit,
    onCopyFromGlobal,
    filterIds = null,
}: LocationSectionProps) {
    const t = useTranslations('assets')
    const runtime = useWorkspaceStageRuntimeOptional()
    const promptVisibility = runtime?.promptVisibility

    const { data: assets } = useProjectAssets(projectId)
    const allLocations: Array<Location | Prop> = assetType === 'prop'
        ? assets?.props ?? []
        : assets?.locations ?? []
    const locations = filterIds ? allLocations.filter((l) => filterIds.has(l.id)) : allLocations
    const assetKey = assetType === 'prop' ? 'prop' : 'location'
    const generateType = resolveLocationBackedGenerateType(assetType)

    return (
        <div className="glass-surface p-6 flex flex-col gap-6">
            {promptVisibility && assetType === 'location' && (
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
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]">
                        <AppIcon name="imageLandscape" className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-bold text-[var(--glass-text-primary)]">
                        {assetType === 'prop' ? t('stage.propAssets') : t("stage.locationAssets")}
                    </h3>
                    <span className="text-sm text-[var(--glass-text-tertiary)] bg-[var(--glass-bg-muted)]/50 px-2 py-1 rounded-lg">
                        {assetType === 'prop'
                            ? t('stage.propCounts', { count: locations.length })
                            : t("stage.locationCounts", { count: locations.length })}
                    </span>
                </div>
                <button
                    onClick={onAddLocation}
                    className="glass-btn-base glass-btn-primary flex items-center gap-2 px-4 py-2 font-medium"
                >
                    + {t(`${assetKey}.add`)}
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 gap-6">
                {locations.map(location => (
                    <LocationCard
                        key={location.id}
                        location={location}
                        assetType={assetType}
                        onEdit={() => onEditLocation(location)}
                        onDelete={() => onDeleteLocation(location.id)}
                        onRegenerate={(count) => {
                            const validImages = location.images?.filter(img => img.imageUrl) || []

                            if (validImages.length === 1) {
                                const imageIndex = validImages[0].imageIndex
                                const taskKey = `location-${location.id}-${imageIndex}`
                                onRegisterTransientTaskKey(taskKey)
                                void onRegenerateSingle(location.id, imageIndex).catch(() => {
                                    onClearTaskKey(taskKey)
                                })
                            }
                            else {
                                const taskKey = `location-${location.id}-group`
                                onRegisterTransientTaskKey(taskKey)
                                void onRegenerateGroup(location.id, count).catch(() => {
                                    onClearTaskKey(taskKey)
                                })
                            }
                        }}
                        onGenerate={(count) => {
                            const taskKey = `location-${location.id}-group`
                            onRegisterTransientTaskKey(taskKey)
                            void handleGenerateImage(generateType, location.id, undefined, count).catch(() => {
                                onClearTaskKey(taskKey)
                            })
                        }}
                        onUndo={() => onUndo(location.id)}
                        onImageClick={onImageClick}
                        onSelectImage={onSelectImage}
                        onImageEdit={(locId, imgIdx) => onImageEdit(locId, imgIdx, location.name)}
                        onCopyFromGlobal={() => onCopyFromGlobal(location.id)}
                        activeTaskKeys={activeTaskKeys}
                        onClearTaskKey={onClearTaskKey}
                        projectId={projectId}
                        onConfirmSelection={assetType === 'location' ? onConfirmSelection : undefined}
                    />
                ))}
            </div>
        </div>
    )
}
