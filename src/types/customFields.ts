// 自定义字段类型定义
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect'

export interface CustomField {
  id: string
  name: string
  type: CustomFieldType
  defaultValue?: any
  options?: string[] // for select/multiselect
  icon?: string
  required?: boolean
}

export interface CustomFieldValue {
  fieldId: string
  value: any
}

// 扩展NodeData
export interface NodeDataWithCustomFields {
  // ...existing fields
  customFields?: CustomFieldValue[]
}
