import { useTranslation } from 'react-i18next'

export function useI18n() {
  const { t, i18n } = useTranslation()

  return {
    t,
    locale: i18n.language,
    changeLanguage: i18n.changeLanguage,
  }
}
