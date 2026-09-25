import type { Field } from '../types/anamnese'

type Extra = Partial<Omit<Field, 'id' | 'label' | 'type'>>

/** Atalhos para descrever os roteiros clínicos sem repetir o formato do campo. */

export const text = (id: string, label: string, extra: Extra = {}): Field => ({
  id,
  label,
  type: 'text',
  span: 2,
  ...extra,
})

export const area = (id: string, label: string, extra: Extra = {}): Field => ({
  id,
  label,
  type: 'textarea',
  span: 3,
  rows: 3,
  ...extra,
})

export const num = (id: string, label: string, unit?: string, extra: Extra = {}): Field => ({
  id,
  label,
  type: 'number',
  span: 1,
  unit,
  ...extra,
})

export const date = (id: string, label: string, extra: Extra = {}): Field => ({
  id,
  label,
  type: 'date',
  span: 1,
  ...extra,
})

export const time = (id: string, label: string, extra: Extra = {}): Field => ({
  id,
  label,
  type: 'time',
  span: 1,
  ...extra,
})

export const select = (id: string, label: string, options: string[], extra: Extra = {}): Field => ({
  id,
  label,
  type: 'select',
  span: 1,
  options,
  ...extra,
})

export const radio = (id: string, label: string, options: string[], extra: Extra = {}): Field => ({
  id,
  label,
  type: 'radio',
  span: 2,
  options,
  ...extra,
})

export const chips = (id: string, label: string, options: string[], extra: Extra = {}): Field => ({
  id,
  label,
  type: 'chips',
  span: 3,
  options,
  ...extra,
})

export const duration = (id: string, label: string, extra: Extra = {}): Field => ({
  id,
  label,
  type: 'duration',
  span: 2,
  naToggle: true,
  ...extra,
})

export const scale = (id: string, label: string, extra: Extra = {}): Field => ({
  id,
  label,
  type: 'scale',
  span: 2,
  min: 0,
  max: 10,
  step: 1,
  ...extra,
})

export const computed = (
  id: string,
  label: string,
  compute: Field['compute'],
  extra: Extra = {},
): Field => ({
  id,
  label,
  type: 'computed',
  span: 1,
  compute,
  ...extra,
})

export const SIM_NAO = ['Sim', 'Não']
export const SIM_NAO_IGNORADO = ['Sim', 'Não', 'Não sabe informar']
export const NORMAL_ALTERADO = ['Sem alterações', 'Alterado']
