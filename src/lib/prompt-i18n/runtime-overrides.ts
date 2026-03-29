import { prisma } from '@/lib/prisma'
import type { AssistantPromptId } from '@/lib/assistant-platform/system-prompts'
import { PROMPT_CATALOG } from './catalog'
import { renderPromptTemplate } from './build-prompt'
import { getPromptTemplate } from './template-store'
import type { BuildPromptInput, PromptLocale } from './types'
import type { PromptId } from './prompt-ids'
import { renderAssistantSystemPrompt } from '@/lib/assistant-platform/system-prompts'

type PromptStage = 'general' | 'analysis' | 'storyboard' | 'image' | 'video'

type PromptOverridePayload = {
  promptTemplates?: Record<string, string>
  assistantTemplates?: Record<string, string>
}

type ProjectPromptConfig = {
  globalAssetText?: string | null
  projectPrompt?: string | null
  artStylePrompt?: string | null
  imagePromptSupplement?: string | null
  videoPromptSupplement?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseOverridePayload(raw: string | null | undefined): PromptOverridePayload {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) return {}

    const promptTemplates = isRecord(parsed.promptTemplates)
      ? Object.fromEntries(
        Object.entries(parsed.promptTemplates)
          .map(([key, value]) => [key, readTrimmedString(value)])
          .filter(([, value]) => value.length > 0),
      )
      : undefined
    const assistantTemplates = isRecord(parsed.assistantTemplates)
      ? Object.fromEntries(
        Object.entries(parsed.assistantTemplates)
          .map(([key, value]) => [key, readTrimmedString(value)])
          .filter(([, value]) => value.length > 0),
      )
      : undefined

    return {
      ...(promptTemplates && Object.keys(promptTemplates).length > 0 ? { promptTemplates } : {}),
      ...(assistantTemplates && Object.keys(assistantTemplates).length > 0 ? { assistantTemplates } : {}),
    }
  } catch {
    return {}
  }
}

function serializeOverridePayload(payload: PromptOverridePayload): string | null {
  const normalized: PromptOverridePayload = {}
  if (payload.promptTemplates && Object.keys(payload.promptTemplates).length > 0) {
    normalized.promptTemplates = payload.promptTemplates
  }
  if (payload.assistantTemplates && Object.keys(payload.assistantTemplates).length > 0) {
    normalized.assistantTemplates = payload.assistantTemplates
  }
  return Object.keys(normalized).length > 0 ? JSON.stringify(normalized) : null
}

function appendProjectPromptContext(basePrompt: string, config: ProjectPromptConfig, stage: PromptStage): string {
  const sections: string[] = []

  if (config.projectPrompt) {
    sections.push(`项目提示词补充：\n${config.projectPrompt}`)
  }
  if ((stage === 'analysis' || stage === 'general') && config.globalAssetText) {
    sections.push(`项目世界观补充：\n${config.globalAssetText}`)
  }
  if ((stage === 'image' || stage === 'storyboard' || stage === 'video') && config.artStylePrompt) {
    sections.push(`项目风格补充：\n${config.artStylePrompt}`)
  }
  if ((stage === 'image' || stage === 'storyboard') && config.imagePromptSupplement) {
    sections.push(`项目图像提示词补充：\n${config.imagePromptSupplement}`)
  }
  if (stage === 'video' && config.videoPromptSupplement) {
    sections.push(`项目视频提示词补充：\n${config.videoPromptSupplement}`)
  }

  if (sections.length === 0) return basePrompt
  return `${basePrompt.trim()}\n\n---\n补充约束：\n${sections.join('\n\n')}`.trim()
}

export async function appendProjectPromptContextForProject(input: {
  projectId?: string | null
  basePrompt: string
  stage?: PromptStage
}): Promise<string> {
  const projectId = typeof input.projectId === 'string' ? input.projectId.trim() : ''
  if (!projectId) return input.basePrompt
  const projectConfig = await getProjectPromptConfig(projectId)
  return appendProjectPromptContext(input.basePrompt, projectConfig, input.stage || 'general')
}

async function getUserOverridePayload(userId: string): Promise<PromptOverridePayload> {
  const preference = await prisma.userPreference.findUnique({
    where: { userId },
    select: { systemPromptOverrides: true },
  })
  return parseOverridePayload(preference?.systemPromptOverrides)
}

async function getProjectPromptConfig(projectId: string): Promise<ProjectPromptConfig> {
  const project = await prisma.novelPromotionProject.findUnique({
    where: { projectId },
    select: {
      globalAssetText: true,
      projectPrompt: true,
      artStylePrompt: true,
      imagePromptSupplement: true,
      videoPromptSupplement: true,
    },
  })

  return {
    globalAssetText: readTrimmedString(project?.globalAssetText),
    projectPrompt: readTrimmedString(project?.projectPrompt),
    artStylePrompt: readTrimmedString(project?.artStylePrompt),
    imagePromptSupplement: readTrimmedString(project?.imagePromptSupplement),
    videoPromptSupplement: readTrimmedString(project?.videoPromptSupplement),
  }
}

export function listEditablePromptDefinitions(): Array<{
  id: PromptId
  label: string
  category: 'analysis' | 'storyboard' | 'image' | 'video'
}> {
  const entries: Array<{ id: PromptId; label: string; category: 'analysis' | 'storyboard' | 'image' | 'video' }> = [
    { id: 'np_agent_character_profile', label: 'Character analysis prompt', category: 'analysis' },
    { id: 'np_select_location', label: 'Location analysis prompt', category: 'analysis' },
    { id: 'np_select_prop', label: 'Prop analysis prompt', category: 'analysis' },
    { id: 'np_agent_clip', label: 'Story to script clip prompt', category: 'analysis' },
    { id: 'np_screenplay_conversion', label: 'Screenplay conversion prompt', category: 'analysis' },
    { id: 'np_agent_storyboard_plan', label: 'Storyboard planning prompt', category: 'storyboard' },
    { id: 'np_agent_cinematographer', label: 'Storyboard cinematography prompt', category: 'storyboard' },
    { id: 'np_agent_acting_direction', label: 'Storyboard acting prompt', category: 'storyboard' },
    { id: 'np_agent_storyboard_detail', label: 'Storyboard detail prompt', category: 'storyboard' },
    { id: 'np_agent_shot_variant_analysis', label: 'Video shot variant analysis prompt', category: 'video' },
    { id: 'np_agent_shot_variant_generate', label: 'Video shot variant generation prompt', category: 'video' },
    { id: 'np_image_prompt_modify', label: 'Image prompt optimization prompt', category: 'image' },
    { id: 'np_single_panel_image', label: 'Single panel image prompt', category: 'image' },
  ]

  return entries.filter((entry) => entry.id in PROMPT_CATALOG)
}

export function listEditableAssistantPromptDefinitions(): Array<{ id: AssistantPromptId; label: string }> {
  return [
    { id: 'api-config-template', label: 'API config assistant system prompt' },
    { id: 'tutorial', label: 'Tutorial assistant system prompt' },
  ]
}

export async function getUserPromptOverrideState(userId: string) {
  const payload = await getUserOverridePayload(userId)
  return {
    promptTemplates: payload.promptTemplates || {},
    assistantTemplates: payload.assistantTemplates || {},
  }
}

export async function getUserPromptConfigView(input: {
  userId: string
  locale: PromptLocale
}) {
  const payload = await getUserOverridePayload(input.userId)
  const promptDefinitions = listEditablePromptDefinitions()
  const assistantDefinitions = listEditableAssistantPromptDefinitions()

  const promptTemplates = Object.fromEntries(
    promptDefinitions.map((definition) => {
      const builtin = getPromptTemplate(definition.id, input.locale)
      const override = payload.promptTemplates?.[definition.id] || ''
      return [definition.id, {
        builtin,
        override,
        effective: override || builtin,
      }]
    }),
  )

  const assistantTemplates = Object.fromEntries(
    assistantDefinitions.map((definition) => {
      const builtin = renderAssistantSystemPrompt(definition.id)
      const override = payload.assistantTemplates?.[definition.id] || ''
      return [definition.id, {
        builtin,
        override,
        effective: override || builtin,
      }]
    }),
  )

  return {
    promptDefinitions,
    assistantDefinitions,
    templates: {
      promptTemplates,
      assistantTemplates,
    },
  }
}

export async function saveUserPromptOverrideState(input: {
  userId: string
  promptTemplates?: Record<string, string>
  assistantTemplates?: Record<string, string>
}) {
  const current = await getUserOverridePayload(input.userId)
  const nextPromptTemplates = { ...(current.promptTemplates || {}) }
  const nextAssistantTemplates = { ...(current.assistantTemplates || {}) }

  for (const [key, value] of Object.entries(input.promptTemplates || {})) {
    const trimmed = readTrimmedString(value)
    if (trimmed) nextPromptTemplates[key] = trimmed
    else delete nextPromptTemplates[key]
  }
  for (const [key, value] of Object.entries(input.assistantTemplates || {})) {
    const trimmed = readTrimmedString(value)
    if (trimmed) nextAssistantTemplates[key] = trimmed
    else delete nextAssistantTemplates[key]
  }

  await prisma.userPreference.upsert({
    where: { userId: input.userId },
    update: {
      systemPromptOverrides: serializeOverridePayload({
        promptTemplates: nextPromptTemplates,
        assistantTemplates: nextAssistantTemplates,
      }),
    },
    create: {
      userId: input.userId,
      systemPromptOverrides: serializeOverridePayload({
        promptTemplates: nextPromptTemplates,
        assistantTemplates: nextAssistantTemplates,
      }),
    },
  })

  return {
    promptTemplates: nextPromptTemplates,
    assistantTemplates: nextAssistantTemplates,
  }
}

export async function getResolvedPromptTemplate(input: {
  userId?: string | null
  promptId: PromptId
  locale: PromptLocale
}): Promise<string> {
  const baseTemplate = getPromptTemplate(input.promptId, input.locale)
  const userId = typeof input.userId === 'string' ? input.userId.trim() : ''
  if (!userId) return baseTemplate
  const payload = await getUserOverridePayload(userId)
  return payload.promptTemplates?.[input.promptId] || baseTemplate
}

export async function buildPromptWithOverrides(input: BuildPromptInput & {
  userId?: string | null
  projectId?: string | null
  stage?: PromptStage
}): Promise<string> {
  const template = await getResolvedPromptTemplate({
    userId: input.userId,
    promptId: input.promptId,
    locale: input.locale,
  })
  const rendered = renderPromptTemplate({
    promptId: input.promptId,
    template,
    variables: input.variables,
  })

  return await appendProjectPromptContextForProject({
    projectId: input.projectId,
    basePrompt: rendered,
    stage: input.stage,
  })
}

export async function renderAssistantSystemPromptWithOverrides(input: {
  userId?: string | null
  promptId: AssistantPromptId
  basePrompt: string
}): Promise<string> {
  const userId = typeof input.userId === 'string' ? input.userId.trim() : ''
  if (!userId) return input.basePrompt
  const payload = await getUserOverridePayload(userId)
  return payload.assistantTemplates?.[input.promptId] || input.basePrompt
}
