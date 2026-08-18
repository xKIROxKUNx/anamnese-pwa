import type { Field, FieldValue, Values } from '../types/anamnese'

interface Props {
  field: Field
  value: FieldValue | undefined
  na: boolean
  values: Values
  onChange: (id: string, value: FieldValue | undefined) => void
  onNaChange: (id: string, na: boolean) => void
}

const DEFAULT_UNITS = ['horas', 'dias', 'semanas', 'meses', 'anos']

function asText(value: FieldValue | undefined): string {
  return typeof value === 'string' ? value : ''
}

function asList(value: FieldValue | undefined): string[] {
  return Array.isArray(value) ? value : []
}

function asDuration(value: FieldValue | undefined, units: string[]) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  return { amount: '', unit: units[1] ?? units[0] ?? 'dias' }
}

export function FieldControl({ field, value, na, values, onChange, onNaChange }: Props) {
  const inputId = `f-${field.id}`
  const helpId = field.help ? `${inputId}-help` : undefined
  const set = (v: FieldValue | undefined) => onChange(field.id, v)

  return (
    <div className="field" data-span={field.span ?? 2} data-na={na}>
      <div className="field__label">
        <label htmlFor={field.type === 'chips' || field.type === 'radio' ? undefined : inputId}>
          {field.label}
        </label>
        {field.naToggle && (
          <label className="field__na">
            <input
              type="checkbox"
              checked={na}
              onChange={(e) => onNaChange(field.id, e.target.checked)}
            />
            não se aplica
          </label>
        )}
      </div>

      <div className="field__control">
        {renderControl()}
        {field.unit && field.type !== 'duration' && <span className="field__unit">{field.unit}</span>}
      </div>

      {field.help && (
        <span className="field__help" id={helpId}>
          {field.help}
        </span>
      )}
    </div>
  )

  function renderControl() {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={inputId}
            rows={field.rows ?? 3}
            disabled={na}
            aria-describedby={helpId}
            placeholder={field.placeholder}
            value={asText(value)}
            onChange={(e) => set(e.target.value)}
          />
        )

      case 'number':
        return (
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            disabled={na}
            aria-describedby={helpId}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step ?? 'any'}
            value={asText(value)}
            onChange={(e) => set(e.target.value)}
          />
        )

      case 'date':
      case 'time':
        return (
          <input
            id={inputId}
            type={field.type}
            disabled={na}
            aria-describedby={helpId}
            value={asText(value)}
            onChange={(e) => set(e.target.value)}
          />
        )

      case 'select':
        return (
          <select
            id={inputId}
            disabled={na}
            aria-describedby={helpId}
            value={asText(value)}
            onChange={(e) => set(e.target.value)}
          >
            <option value="">Selecione…</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'radio': {
        const current = asText(value)
        return (
          <div className="radio-row" role="radiogroup" aria-label={field.label}>
            {(field.options ?? []).map((option) => (
              <button
                key={option}
                type="button"
                className="chip"
                role="radio"
                aria-checked={current === option}
                aria-pressed={current === option}
                disabled={na}
                onClick={() => set(current === option ? '' : option)}
              >
                {option}
              </button>
            ))}
          </div>
        )
      }

      case 'chips': {
        const selected = asList(value)
        return (
          <div className="chips" role="group" aria-label={field.label}>
            {(field.options ?? []).map((option) => {
              const active = selected.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  className="chip"
                  aria-pressed={active}
                  disabled={na}
                  onClick={() =>
                    set(
                      active
                        ? selected.filter((item) => item !== option)
                        : [...selected, option],
                    )
                  }
                >
                  {option}
                </button>
              )
            })}
          </div>
        )
      }

      case 'duration': {
        const units = field.units ?? DEFAULT_UNITS
        const duration = asDuration(value, units)
        return (
          <div className="duration">
            <span className="duration__prefix">há</span>
            <input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={0}
              step="any"
              disabled={na}
              aria-label={`${field.label} — quantidade`}
              aria-describedby={helpId}
              placeholder="0"
              value={duration.amount}
              onChange={(e) => set({ ...duration, amount: e.target.value })}
            />
            <select
              disabled={na}
              aria-label={`${field.label} — unidade`}
              value={duration.unit}
              onChange={(e) => set({ ...duration, unit: e.target.value })}
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        )
      }

      case 'scale': {
        const current = asText(value)
        return (
          <div className="scale">
            <input
              id={inputId}
              type="range"
              min={field.min ?? 0}
              max={field.max ?? 10}
              step={field.step ?? 1}
              disabled={na}
              aria-describedby={helpId}
              value={current === '' ? String(field.min ?? 0) : current}
              onChange={(e) => set(e.target.value)}
            />
            <span className="scale__value">{current === '' ? '—' : current}</span>
          </div>
        )
      }

      case 'computed': {
        const computed = field.compute ? field.compute(values) : ''
        return (
          <output className="computed" id={inputId} data-has-value={computed !== ''}>
            {computed || 'preencha os campos acima'}
          </output>
        )
      }

      default:
        return (
          <input
            id={inputId}
            type="text"
            disabled={na}
            aria-describedby={helpId}
            placeholder={field.placeholder}
            value={asText(value)}
            onChange={(e) => set(e.target.value)}
          />
        )
    }
  }
}
