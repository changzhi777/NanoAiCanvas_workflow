import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCNCommon from '../locales/zh-CN/common.json'
import zhCNWorkflow from '../locales/zh-CN/workflow.json'
import enUSCommon from '../locales/en-US/common.json'
import enUSWorkflow from '../locales/en-US/workflow.json'

const resources = {
  'zh-CN': {
    translation: {
      ...zhCNCommon,
      ...zhCNWorkflow,
    },
  },
  'en-US': {
    translation: {
      ...enUSCommon,
      ...enUSWorkflow,
    },
  },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('locale') || 'zh-CN',
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
