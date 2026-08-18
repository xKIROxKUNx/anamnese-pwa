import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { FieldValue, NaFlags, SoapKey, Values } from '../types/anamnese'
import { getTemplate } from '../data'
import { countTemplate } from '../lib/values'
import { buildDocument } from '../lib/document'
import { useKeyboardAwareFields } from '../lib/keyboard'
import {
  createRecordId,
  deleteRecord,
  descreverAtualizacao,
  readRecord,
  writeRecord,
} from '../lib/storage'
import { SectionCard } from './SectionCard'
import { SoapNav } from './SoapNav'
import { ConfirmDialog } from './ConfirmDialog'
import { NotFound } from './NotFound'

const ATRASO_AUTOSAVE = 600

type SaveStatus = 'vazio' | 'salvando' | 'salvo' | 'erro'

export function AnamneseForm() {
  const { id = '', recordId } = useParams()
  const navigate = useNavigate()
  const template = getTemplate(id)

  // A anamnese aberta pelo histórico já chega com o conteúdo salvo.
  const [registro] = useState(() => (recordId ? readRecord(recordId) : null))
  const registroRef = useRef({
    id: registro?.id ?? recordId ?? createRecordId(),
    criadoEm: registro?.criadoEm ?? new Date().toISOString(),
  })

  const [values, setValues] = useState<Values>(() => registro?.values ?? {})
  const [na, setNa] = useState<NaFlags>(() => registro?.na ?? {})
  const [active, setActive] = useState<SoapKey>('S')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [status, setStatus] = useState<SaveStatus>(registro ? 'salvo' : 'vazio')
  const [salvoEm, setSalvoEm] = useState<string | null>(registro?.atualizadoEm ?? null)

  const jaSalvo = useRef(Boolean(registro))
  const primeiraRenderizacao = useRef(true)

  useKeyboardAwareFields()

  const progress = useMemo(
    () => (template ? countTemplate(template, values, na) : { total: 0, answered: 0, percent: 0 }),
    [template, values, na],
  )

  const doc = useMemo(
    () => (template ? buildDocument(template, values, na) : null),
    [template, values, na],
  )

  const preenchido = progress.answered > 0

  // Autosave: grava sozinho pouco depois de cada alteração.
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false
      return
    }
    if (!template) return
    // Enquanto nada foi preenchido não faz sentido criar um registro vazio.
    if (!jaSalvo.current && progress.answered === 0) return

    setStatus('salvando')
    const timer = window.setTimeout(() => {
      const agora = new Date().toISOString()
      const resultado = writeRecord({
        id: registroRef.current.id,
        templateId: template.id,
        values,
        na,
        criadoEm: registroRef.current.criadoEm,
        atualizadoEm: agora,
      })

      if (resultado === 'erro') {
        setStatus('erro')
        return
      }

      if (!jaSalvo.current) {
        jaSalvo.current = true
        // Guarda a anamnese no endereço sem recarregar a tela: recarregar a
        // página passa a reabrir este mesmo registro.
        window.history.replaceState(null, '', `#/anamnese/${template.id}/${registroRef.current.id}`)
      }
      setSalvoEm(agora)
      setStatus('salvo')
    }, ATRASO_AUTOSAVE)

    return () => window.clearTimeout(timer)
  }, [values, na, template, progress.answered])

  useEffect(() => {
    if (!template) return
    document.title = `${template.title} — Anamnese`
    return () => {
      document.title = 'Anamnese — roteiros clínicos em SOAP'
    }
  }, [template])

  const handleChange = useCallback((fieldId: string, value: FieldValue | undefined) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
  }, [])

  const handleNaChange = useCallback((fieldId: string, checked: boolean) => {
    setNa((prev) => ({ ...prev, [fieldId]: checked }))
  }, [])

  // O gerador de PDF só é carregado no primeiro clique — e fica no cache
  // offline como os demais arquivos do build.
  const baixarPdf = async () => {
    if (!doc) return
    const { downloadAnamnesePdf } = await import('../lib/pdf')
    downloadAnamnesePdf(doc)
  }

  const excluir = () => {
    deleteRecord(registroRef.current.id)
    setConfirmingDelete(false)
    navigate('/', { replace: true })
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
      <header className="form-header">
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

      <main className="wrap">
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

      <div className="action-bar">
        <div className="wrap action-bar__inner">
          <span className="action-bar__hint" data-status={status}>
            <SaveIndicator status={status} salvoEm={salvoEm} />
            <span className="action-bar__count">
              {progress.answered} de {progress.total} itens
            </span>
          </span>
          <button
            type="button"
            className="button button--ghost"
            disabled={!jaSalvo.current && !preenchido}
            onClick={() => setConfirmingDelete(true)}
          >
            Excluir
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={!preenchido}
            onClick={baixarPdf}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Baixar PDF
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Excluir esta anamnese?"
          message="Ela sai do histórico deste aparelho e o conteúdo preenchido é apagado. Isso não pode ser desfeito."
          confirmLabel="Excluir"
          onConfirm={excluir}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}

function SaveIndicator({ status, salvoEm }: { status: SaveStatus; salvoEm: string | null }) {
  if (status === 'erro') {
    return (
      <span className="save-state save-state--erro">
        Não foi possível salvar neste aparelho
      </span>
    )
  }
  if (status === 'salvando') return <span className="save-state">Salvando…</span>
  if (status === 'salvo' && salvoEm) {
    return <span className="save-state">Salvo {descreverAtualizacao(salvoEm)}</span>
  }
  return <span className="save-state">Salva sozinha enquanto você preenche</span>
}
