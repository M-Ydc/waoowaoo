import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { resolveTaskLocale } from '@/lib/task/resolve-locale'
import {
  getUserPromptConfigView,
  saveUserPromptOverrideState,
} from '@/lib/prompt-i18n/runtime-overrides'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([key, raw]) => [key, typeof raw === 'string' ? raw : '']),
  )
}

export const GET = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult
  const locale = resolveTaskLocale(request, {}) || 'zh'

  const configView = await getUserPromptConfigView({
    userId: session.user.id,
    locale,
  })
  return NextResponse.json(configView)
})

export const PUT = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = await request.json().catch(() => ({}))
  if (!isRecord(body)) throw new ApiError('INVALID_PARAMS')

  const overrides = await saveUserPromptOverrideState({
    userId: session.user.id,
    promptTemplates: normalizeRecord(body.promptTemplates),
    assistantTemplates: normalizeRecord(body.assistantTemplates),
  })

  return NextResponse.json({ success: true, overrides })
})
