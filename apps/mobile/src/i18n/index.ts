import { getLocales } from 'expo-localization';

import { useSettings } from '@/state/store';

import { en, type Dictionary } from './en';
import { es } from './es';
import { pt } from './pt';

export type Language = 'en' | 'es' | 'pt';
export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'pt', label: 'Português' },
];

const DICTIONARIES: Record<Language, Dictionary> = { en, es, pt };
/** Formato de números y fechas de cada idioma. */
export const LOCALES: Record<Language, string> = { en: 'en-US', es: 'es-AR', pt: 'pt-BR' };

export function systemLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return code === 'es' || code === 'pt' ? code : 'en';
}

/** Reemplaza `{nombre}` por su valor. */
export function fill(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

/** El idioma elegido en Ajustes, o el del sistema. */
export function useLanguage(): Language {
  const choice = useSettings((s) => s.language);
  return choice === 'system' ? systemLanguage() : choice;
}

export function useI18n(): { t: Dictionary; lang: Language; locale: string } {
  const lang = useLanguage();
  return { t: DICTIONARIES[lang], lang, locale: LOCALES[lang] };
}
