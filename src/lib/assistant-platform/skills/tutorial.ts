import type { AssistantRuntimeContext, AssistantSkillDefinition } from '../types'
import { renderAssistantSystemPromptForUser } from '../system-prompts'

async function buildTutorialPrompt(ctx: AssistantRuntimeContext): Promise<string> {
  return await renderAssistantSystemPromptForUser({
    userId: ctx.userId,
    promptId: 'tutorial',
  })
}

export const tutorialSkill: AssistantSkillDefinition = {
  id: 'tutorial',
  systemPrompt: buildTutorialPrompt,
  temperature: 0.2,
  maxSteps: 4,
}
