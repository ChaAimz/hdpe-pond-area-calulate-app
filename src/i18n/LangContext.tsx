import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type Lang, type TranslationKey } from './translations'

interface LangCtx { lang: Lang; t: (k: TranslationKey) => string; toggle: () => void }

const LangContext = createContext<LangCtx>({
  lang: 'th',
  t: (k) => translations.th[k],
  toggle: () => {},
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() =>
    (localStorage.getItem('lang') as Lang) ?? 'th'
  )
  const t = (k: TranslationKey) => translations[lang][k]
  const toggle = () => {
    const next: Lang = lang === 'th' ? 'en' : 'th'
    localStorage.setItem('lang', next)
    setLang(next)
  }
  return <LangContext.Provider value={{ lang, t, toggle }}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
