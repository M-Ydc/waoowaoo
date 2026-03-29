export { isCompatibleProvider, resolveModelGatewayRoute } from './router'
export type {
  ModelGatewayRoute,
  CompatibleProviderKey,
  OpenAICompatImageProfile,
  OpenAICompatVideoProfile,
  OpenAICompatAudioProfile,
  OpenAICompatClientConfig,
  OpenAICompatImageRequest,
  OpenAICompatVideoRequest,
  OpenAICompatAudioRequest,
  OpenAICompatChatRequest,
} from './types'
export {
  generateImageViaOpenAICompat,
  generateVideoViaOpenAICompat,
  generateAudioViaOpenAICompat,
  generateImageViaOpenAICompatTemplate,
  generateVideoViaOpenAICompatTemplate,
  generateAudioViaOpenAICompatTemplate,
  runOpenAICompatChatCompletion,
  runOpenAICompatChatCompletionStream,
  runOpenAICompatResponsesCompletion,
} from './openai-compat'
