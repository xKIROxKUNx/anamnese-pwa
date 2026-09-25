import { useId, useState } from 'react'
import type { NaFlags, Section, Values, FieldValue } from '../types/anamnese'
import { countSection } from '../lib/values'
import { FieldControl } from './FieldControl'

interface Props {
  section: Section
  values: Values
  na: NaFlags
  defaultOpen?: boolean
  onChange: (id: string, value: FieldValue | undefined) => void
  onNaChange: (id: string, na: boolean) => void
}

export function SectionCard({ section, values, na, defaultOpen = false, onChange, onNaChange }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()
  const { total, answered } = countSection(section.fields, values, na)

  return (
    <section className="section-card" data-open={open}>
      <button
        type="button"
        className="section-card__head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="section-card__titles">
          <h3>{section.title}</h3>
          {section.hint && <p>{section.hint}</p>}
        </div>
        <span className="section-card__count" data-filled={answered > 0}>
          {answered}/{total}
        </span>
        <svg className="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="section-card__body" id={bodyId}>
          <div className="field-grid">
            {section.fields.map((field) => (
              <FieldControl
                key={field.id}
                field={field}
                value={values[field.id]}
                na={Boolean(na[field.id])}
                values={values}
                onChange={onChange}
                onNaChange={onNaChange}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
