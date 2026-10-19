import type { ComponentType } from 'react'
import House3D, { type House3DProps } from './House3D'
import Plan2D, { type Plan2DProps } from './Plan2D'

export type ProjectTemplate = {
  id: string
  name: string
  Plan: ComponentType<Plan2DProps>
  Model: ComponentType<House3DProps>
}

const templates: Record<string, ProjectTemplate> = {
  'casa-gemma-v1': {
    id: 'casa-gemma-v1',
    name: 'Casa Gemma',
    Plan: Plan2D,
    Model: House3D,
  },
}

export const DEFAULT_TEMPLATE_ID = 'casa-gemma-v1'

export function getProjectTemplate(templateId: string) {
  return templates[templateId] ?? templates[DEFAULT_TEMPLATE_ID]
}

export function listProjectTemplates() {
  return Object.values(templates)
}
