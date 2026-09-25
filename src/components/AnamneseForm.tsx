import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AnamneseTemplate, FieldValue, NaFlags, SoapKey, Values } from '../types/anamnese'
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
  type StoredRecord,
} from '../lib/storage'
import { SectionCard } from './SectionCard'
import { SoapNav } from './SoapNav'
import { ConfirmDialog } from './ConfirmDialog'
import { NotFound } from './NotFound'
import { getInitialValuesFromSettings } from '../lib/settings'

const ATRASO_AUTOSAVE = 600

type SaveStatus = 'vazio' | 'salvando' | 'salvo' | 'erro'

export function AnamneseForm() {
  const { id = '', recordId } = useParams()
  const template = getTemplate(id)

  const [carregando, setCarregando] = useState(Boolean(recordId))
  const [registroInicial, setRegistroInicial] = useState<StoredRecord | null>(null)

  useEffect(() => {
    if (!recordId) {
      setCarregando(false)
      setRegistroInicial(null)
      return
    }

    let ativo = true
    setCarregando(true)
    readRecord(recordId)
      .then((rec) => {
        if (ativo) {
          setRegistroInicial(rec)
          setCarregando(false)
        }
      })
      .catch((err) => {
        console.error('Erro ao ler anamnese do IndexedDB:', err)
        if (ativo) {
          setRegistroInicial(null)
          setCarregando(false)
        }
      })

    return () => {
      ativo = false
    }
  }, [recordId])

  if (!template) return <NotFound />

  if (carregando) {
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
            </div>
          </div>
        </header>
        <main className="wrap">
          <p style={{ padding: '2.5rem 0', color: 'var(--ink-muted)', textAlign: 'center' }}>
            Carregando anamnese…
          </p>
        </main>
      </div>
    )
  }

  return (
    <AnamneseFormEditor
      key={`${template.id}:${registroInicial?.id ?? recordId ?? 'novo'}`}
      template={template}
      registroInicial={registroInicial}
      recordIdParam={recordId}
    />
  )
}

interface AnamneseFormEditorProps {
  template: AnamneseTemplate
  registroInicial: StoredRecord | null
  recordIdParam?: string
}

function AnamneseFormEditor({
  template,
  registroInicial,
  recordIdParam,
}: AnamneseFormEditorProps) {
  const navigate = useNavigate()
  const registroRef = useRef({
    id: registroInicial?.id ?? recordIdParam ?? createRecordId(),
    criadoEm: registroInicial?.criadoEm ?? new Date().toISOString(),
  })

  const [values, setValues] = useState<Values>(() => {
    if (registroInicial) {
      return registroInicial.values
    }
    if (recordIdParam) {
      return {}
    }
    return getInitialValuesFromSettings()
  })
  const [na, setNa] = useState<NaFlags>(() => registroInicial?.na ?? {})
  const [active, setActive] = useState<SoapKey>('S')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [status, setStatus] = useState<SaveStatus>(registroInicial ? 'salvo' : 'vazio')
  const [salvoEm, setSalvoEm] = useState<string | null>(registroInicial?.atualizadoEm ?? null)

  const jaSalvo = useRef(Boolean(registroInicial))
  const primeiraRenderizacao = useRef(true)
  const montadoRef = useRef(true)
  const deletadoRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const saveSeqRef = useRef(0)

  const latestValuesRef = useRef(values)
  latestValuesRef.current = values
  const latestNaRef = useRef(na)
  latestNaRef.current = na

  useKeyboardAwareFields()

  const progress = useMemo(
    () => countTemplate(template, values, na),
    [template, values, na],
  )

  const doc = useMemo(
    () => buildDocument(template, values, na),
    [template, values, na],
  )

  const preenchido = progress.answered > 0

  // Salva imediatamente quaisquer alterações pendentes (flush)
  const flushSave = useCallback(async () => {
    if (deletadoRef.current) return
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!jaSalvo.current && progress.answered === 0) return

    const seq = ++saveSeqRef.current
    const agora = new Date().toISOString()
    const resultado = await writeRecord({
      id: registroRef.current.id,
      templateId: template.id,
      values: latestValuesRef.current,
      na: latestNaRef.current,
      criadoEm: registroRef.current.criadoEm,
      atualizadoEm: agora,
    })

    if (deletadoRef.current || !montadoRef.current) return

    if (resultado === 'erro') {
      setStatus('erro')
      return
    }

    if (saveSeqRef.current === seq) {
      if (!jaSalvo.current) {
        jaSalvo.current = true
        window.history.replaceState(null, '', `#/anamnese/${template.id}/${registroRef.current.id}`)
      }
      setSalvoEm(agora)
      setStatus('salvo')
    }
  }, [progress.answered, template.id])

  // Desmontagem e sincronização: garante flush de dados pendentes
  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
      if (timerRef.current && !deletadoRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
        writeRecord({
          id: registroRef.current.id,
          templateId: template.id,
          values: latestValuesRef.current,
          na: latestNaRef.current,
          criadoEm: registroRef.current.criadoEm,
          atualizadoEm: new Date().toISOString(),
        }).catch(() => {})
      }
    }
  }, [template.id])

  // Autosave: grava sozinho pouco depois de cada alteração.
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false
      return
    }
    // Enquanto nada foi preenchido não faz sentido criar um registro vazio.
    if (!jaSalvo.current && progress.answered === 0) return

    setStatus('salvando')
    const currentSeq = ++saveSeqRef.current

    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(async () => {
      timerRef.current = null
      if (deletadoRef.current) return

      const agora = new Date().toISOString()
      const resultado = await writeRecord({
        id: registroRef.current.id,
        templateId: template.id,
        values,
        na,
        criadoEm: registroRef.current.criadoEm,
        atualizadoEm: agora,
      })

      if (deletadoRef.current || !montadoRef.current) return

      if (resultado === 'erro') {
        setStatus('erro')
        return
      }

      // Previne que uma gravação lenta antiga sobrescreva o estado "salvando"
      // de uma nova alteração que acabou de ser digitada
      if (saveSeqRef.current === currentSeq) {
        if (!jaSalvo.current) {
          jaSalvo.current = true
          // Guarda a anamnese no endereço sem recarregar a tela: recarregar a
          // página passa a reabrir este mesmo registro.
          window.history.replaceState(null, '', `#/anamnese/${template.id}/${registroRef.current.id}`)
        }
        setSalvoEm(agora)
        setStatus('salvo')
      }
    }, ATRASO_AUTOSAVE)

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [values, na, template.id, progress.answered])

  useEffect(() => {
    if (!template) return
    document.title = `${template.title} — Anamnese`
    return () => {
      document.title = 'Anamnese SOAP'
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
    // Garante que o estado atual está gravado antes do download
    await flushSave()
    const { downloadAnamnesePdf } = await import('../lib/pdf')
    downloadAnamnesePdf(doc)
  }

  const excluir = async () => {
    deletadoRef.current = true
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await deleteRecord(registroRef.current.id)
    if (!montadoRef.current) return
    setConfirmingDelete(false)
    navigate('/', { replace: true })
  }

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
