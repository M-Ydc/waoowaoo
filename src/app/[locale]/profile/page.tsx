'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import ApiConfigTab from './components/ApiConfigTab'
import PromptConfigTab from './components/PromptConfigTab'
import { AppIcon } from '@/components/ui/icons'
import { useRouter } from '@/i18n/navigation'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('profile')
  const tc = useTranslations('common')

  const [activeSection, setActiveSection] = useState<'billing' | 'apiConfig' | 'promptConfig'>('apiConfig')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push({ pathname: '/auth/signin' }); return }
  }, [router, session, status])

  if (status === 'loading' || !session) {
    return (
      <div className="glass-page flex min-h-screen items-center justify-center">
        <div className="text-[var(--glass-text-secondary)]">{tc('loading')}</div>
      </div>
    )
  }

  const noBillingText = t('openSourceNoBilling')

  return (
    <div className="glass-page min-h-screen">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex gap-6 h-[calc(100vh-140px)]">

          <div className="w-64 flex-shrink-0">
            <div className="glass-surface-elevated h-full flex flex-col p-5">

              <div className="mb-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-[var(--glass-text-primary)]">{session.user?.name || t('user')}</h2>
                  <p className="text-xs text-[var(--glass-text-tertiary)]">{t('personalAccount')}</p>
                </div>

                <div className="glass-surface-soft rounded-2xl border border-[var(--glass-stroke-base)] p-4">
                  <div className="text-xs font-medium text-[var(--glass-text-secondary)]">{t('availableBalance')}</div>
                  <div className="mt-2 text-base font-semibold text-[var(--glass-text-primary)]">{noBillingText}</div>
                </div>
              </div>

              <nav className="flex-1 space-y-2">
                <button
                  onClick={() => setActiveSection('apiConfig')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${activeSection === 'apiConfig'
                    ? 'glass-btn-base glass-btn-tone-info'
                    : 'text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]'
                    }`}
                >
                  <AppIcon name="settingsHexAlt" className="w-5 h-5" />
                  <span className="font-medium">{t('apiConfig')}</span>
                </button>

                <button
                  onClick={() => setActiveSection('promptConfig')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${activeSection === 'promptConfig'
                    ? 'glass-btn-base glass-btn-tone-info'
                    : 'text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]'
                    }`}
                >
                  <AppIcon name="menu" className="w-5 h-5" />
                  <span className="font-medium">{t('promptConfig')}</span>
                </button>

                <button
                  onClick={() => setActiveSection('billing')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${activeSection === 'billing'
                    ? 'glass-btn-base glass-btn-tone-info'
                    : 'text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]'
                    }`}
                >
                  <AppIcon name="receipt" className="w-5 h-5" />
                  <span className="font-medium">{t('billingRecords')}</span>
                </button>
              </nav>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="glass-btn-base glass-btn-tone-danger mt-auto flex items-center gap-2 px-4 py-3 text-sm rounded-xl transition-all cursor-pointer"
              >
                <AppIcon name="logout" className="w-4 h-4" />
                {t('logout')}
              </button>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="glass-surface-elevated h-full flex flex-col">

              {activeSection === 'apiConfig' ? (
                <ApiConfigTab />
              ) : activeSection === 'promptConfig' ? (
                <PromptConfigTab />
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <AppIcon name="receipt" className="mb-4 h-12 w-12 text-[var(--glass-text-tertiary)]" />
                  <p className="text-base font-semibold text-[var(--glass-text-primary)]">{noBillingText}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main >
    </div >
  )
}
