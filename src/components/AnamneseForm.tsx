import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { FieldValue, NaFlags, SoapKey, Values } from '../types/anamnese'
import { getTemplate } from '../data'
import { countTemplate } from '../lib/values'
import { buildDocument, documentFileName } from '../lib/document'
import { SectionCard } from './SectionCard'
import { SoapNav } from './SoapNav'
import { PrintView } from './PrintView'
import { ConfirmDialog } from './ConfirmDialog'
import { NotFound } from './NotFound'

export function AnamneseForm() {
  const { id = '' } = useParams()
  const template = getTemplate(id)

  const [values, setValues] = useState<Values>({})
  const [na, setNa] = useState<NaFlags>({})
  const [active, setActive] = useState<SoapKey>('S')
  const [confirmingReset, setConfirmingReset] = useState(false)

  const progress = useMemo(
    () => (template ? countTemplate(template, values, na) : { total: 0, answered: 0, percent: 0 }),
    [template, values, na],
  )

  const doc = useMemo(
    () => (template ? buildDocument(template, values, na) : null),
    [template, values, na],
  )

  const dirty = progress.answered > 0

  // Sem rascunho salvo: avisa antes de descartar o que foi digitado.
  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // O navegador usa o título da página como nome sugerido do PDF.
  useEffect(() => {
    if (!template) return
    document.title = doc && dirty ? documentFileName(doc) : `${template.title} — Anamnese`
    return () => {
      document.title = 'Anamnese — roteiros clínicos em SOAP'
    }
  }, [template, doc, dirty])

  const handleChange = useCallback((fieldId: string, value: FieldValue | undefined) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
  }, [])

  const handleNaChange = useCallback((fieldId: string, checked: boolean) => {
    setNa((prev) => ({ ...prev, [fieldId]: checked }))
  }, [])

  const reset = () => {
    setValues({})
    setNa({})
    setActive('S')
    setConfirmingReset(false)
    window.scrollTo({ top: 0 })
  }

  if (!template) return <NotFound />

  const blockIndex = template.blocks.findIndex((block) => block.key === active)
  const block = template.blocks[blockIndex] ?? template.blocks[0]
  const previous = template.blocks[blockIndex - 1]
  const next = template.blocks[blockIndex + 1]

  const goTo = (key: SoapKey) => {
    setActive(key)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div
      className="form-shell"
      style={
        {
          '--accent': template.accent,
          '--accent-soft': template.accentSoft,
          '--accent-ink': template.accent,
        } as React.CSSProperties
      }
    >
      <header className="form-header no-print">
        <div className="wrap">
          <div className="form-header__top">
            <Link className="icon-button" to="/" aria-label="Voltar para a tela inicial">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M15 5l-7 7 7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <div className="form-header__title">
              <h1>
                {template.icon} {template.title}
              </h1>
              <span>{template.subtitle}</span>
            </div>
            <div className="progress" title={`${progress.answered} de ${progress.total} itens`}>
              <div
                className="progress__bar"
                role="progressbar"
                aria-valuenow={progress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso do preenchimento"
              >
                <div className="progress__fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <span className="progress__value">{progress.percent}%</span>
            </div>
          </div>

          <SoapNav blocks={template.blocks} active={block.key} onSelect={goTo} />
        </div>
      </header>

      <main className="wrap no-print">
        <div className="block-intro">
          <h2>
            {block.key} · {block.title}
          </h2>
          <p>{block.subtitle}</p>
        </div>

        <div className="sections">
          {block.sections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              values={values}
              na={na}
              defaultOpen={index === 0}
              onChange={handleChange}
              onNaChange={handleNaChange}
            />
          ))}
        </div>

        <nav className="block-pager">
          {previous ? (
            <button type="button" className="button" onClick={() => goTo(previous.key)}>
              ← {previous.title}
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button type="button" className="button" onClick={() => goTo(next.key)}>
              {next.title} →
            </button>
          )}
        </nav>
      </main>

      <div className="action-bar no-print">
        <div className="wrap action-bar__inner">
          <span className="action-bar__hint">
            {progress.answered} de {progress.total} itens registrados · os dados ficam só neste
            aparelho
          </span>
          <button type="button" className="button button--ghost" onClick={() => setConfirmingReset(true)}>
            Limpar
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={!dirty}
            onClick={() => window.print()}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Gerar PDF
          </button>
        </div>
      </div>

      {doc && <PrintView doc={doc} />}

      {confirmingReset && (
        <ConfirmDialog
          title="Limpar o formulário?"
          message="Todos os itens preenchidos serão apagados. Isso não pode ser desfeito."
          confirmLabel="Limpar tudo"
          onConfirm={reset}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </div>
  )
}
