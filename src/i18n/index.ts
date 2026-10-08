import en from './locales/en'
import es from './locales/es'

export const languages = ['en', 'es'] as const
export type Language = (typeof languages)[number]

export const translations = { en, es } satisfies Record<Language, typeof en>

export function resolveLanguage(locale: string | undefined): Language {
  const primaryLanguage = locale?.trim().toLowerCase().split(/[-_]/, 1)[0]
  return primaryLanguage === 'es' ? 'es' : 'en'
}
