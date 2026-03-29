import { getArtStylePrompt } from '@/lib/constants'

export type ProjectPromptVisibility = {
  globalAssetText: string
  projectPrompt: string
  artStyle: string
  artStyleLabel: string
  defaultArtStylePromptZh: string
  defaultArtStylePromptEn: string
  artStylePrompt: string
  imagePromptSupplement: string
  videoPromptSupplement: string
}

type ArtStyleLike = { value: string; label: string }

const ART_STYLE_OPTIONS: ArtStyleLike[] = [
  { value: 'american-comic', label: '漫画风' },
  { value: 'chinese-comic', label: '精致国漫' },
  { value: 'japanese-anime', label: '日系动漫风' },
  { value: 'realistic', label: '真人风格' },
]

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getArtStyleLabel(artStyle: string): string {
  return ART_STYLE_OPTIONS.find((item) => item.value === artStyle)?.label || artStyle
}

export function buildProjectPromptVisibility(input: {
  globalAssetText?: unknown
  projectPrompt?: unknown
  artStyle?: unknown
  artStylePrompt?: unknown
  imagePromptSupplement?: unknown
  videoPromptSupplement?: unknown
}): ProjectPromptVisibility {
  const artStyle = readText(input.artStyle)
  return {
    globalAssetText: readText(input.globalAssetText),
    projectPrompt: readText(input.projectPrompt),
    artStyle,
    artStyleLabel: getArtStyleLabel(artStyle),
    defaultArtStylePromptZh: getArtStylePrompt(artStyle, 'zh'),
    defaultArtStylePromptEn: getArtStylePrompt(artStyle, 'en'),
    artStylePrompt: readText(input.artStylePrompt),
    imagePromptSupplement: readText(input.imagePromptSupplement),
    videoPromptSupplement: readText(input.videoPromptSupplement),
  }
}
