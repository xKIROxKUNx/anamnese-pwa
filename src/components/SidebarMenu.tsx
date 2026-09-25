import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { templates } from '../data'
import { exportHistoryZip, importHistoryFile } from '../lib/backup'
import { listRecords } from '../lib/storage'
import {
  LOCAIS_ATENDIMENTO,
  getSettings,
  saveSettings,
  type AppSettings,
  type UserProfile,
} from '../lib/settings'

interface SidebarMenuProps {
  aberto: boolean
  onClose: () => void
  triggerRef?: React.RefObject<HTMLButtonElement | null>
}

export function SidebarMenu({ aberto, onClose, triggerRef }: SidebarMenuProps) {
  const [tela, setTela] = useState<'menu' | 'configuracoes'>('menu')
  const [exportando, setExportando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [totalRegistros, setTotalRegistros] = useState<number | null>(null)
  const [settings, setSettingsState] = useState<AppSettings>(() => getSettings())
  const [perfilExpandido, setPerfilExpandido] = useState(true)
  const [feedbackConfig, setFeedbackConfig] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<{
    tipo: 'sucesso' | 'erro' | 'info'
    texto: string
  } | null>(null)

  const drawerRef = useRef<HTMLElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const backBtnRef = useRef<HTMLButtonElement>(null)
  const configBtnRef = useRef<HTMLButtonElement>(null)
  const eraAbertoRef = useRef(false)
  const feedbackTimerRef = useRef<number | null>(null)
  const latestSettingsRef = useRef(settings)
  latestSettingsRef.current = settings
  const prevTelaRef = useRef(tela)

  // Limpeza do temporizador de feedback na desmontagem
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = null
      }
    }
  }, [])

  const flushSettings = () => {
    saveSettings(latestSettingsRef.current)
  }

  const handleClose = () => {
    flushSettings()
    onClose()
  }

  // Atualiza quantidade de anamneses e configurações ao abrir o menu e gerencia foco
  useEffect(() => {
    if (aberto) {
      eraAbertoRef.current = true
      const carregadas = getSettings()
      setSettingsState(carregadas)
      latestSettingsRef.current = carregadas
      listRecords()
        .then((recs) => setTotalRegistros(recs.length))
        .catch(() => setTotalRegistros(null))
      closeBtnRef.current?.focus()
    } else {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = null
      }
      setMensagem(null)
      setFeedbackConfig(null)
      setTela('menu')
      if (eraAbertoRef.current) {
        eraAbertoRef.current = false
        if (triggerRef?.current && document.contains(triggerRef.current)) {
          triggerRef.current.focus()
        }
      }
    }
  }, [aberto, triggerRef])

  // Gerencia foco ao alternar telas internas (somente na mudança ativa de tela)
  useEffect(() => {
    if (!aberto) {
      prevTelaRef.current = 'menu'
      return
    }
    if (prevTelaRef.current !== tela) {
      prevTelaRef.current = tela
      if (tela === 'configuracoes') {
        backBtnRef.current?.focus()
      } else {
        configBtnRef.current?.focus()
      }
    }
  }, [tela, aberto])

  // Trata tecla Escape, ciclo de foco (focus trap acessível) e trava rolagem da página quando aberto
  useEffect(() => {
    if (!aberto) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
        return
      }

      if (event.key === 'Tab') {
        const drawer = drawerRef.current
        if (!drawer) return

        const focusables = Array.from(
          drawer.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null || el.getClientRects().length > 0)

        if (focusables.length === 0) return

        const primeiro = focusables[0]
        const ultimo = focusables[focusables.length - 1]

        if (event.shiftKey) {
          if (document.activeElement === primeiro) {
            event.preventDefault()
            ultimo.focus()
          }
        } else {
          if (document.activeElement === ultimo) {
            event.preventDefault()
            primeiro.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [aberto, onClose])

  const showFeedback = (texto: string) => {
    setFeedbackConfig(texto)
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackConfig(null)
    }, 2800)
  }

  const handlePerfilChange = (campo: keyof UserProfile, valor: string) => {
    setSettingsState((prev) => {
      const next = {
        ...prev,
        perfil: {
          ...prev.perfil,
          [campo]: valor,
        },
      }
      latestSettingsRef.current = next
      return next
    })
  }

  const handlePerfilBlur = () => {
    saveSettings({ perfil: latestSettingsRef.current.perfil })
  }

  const handleLocalPadraoChange = (local: string) => {
    const updated = saveSettings({ localPadrao: local })
    setSettingsState(updated)
    latestSettingsRef.current = updated
    showFeedback('Local padrão salvo')
  }

  const handleHorarioAtualPadraoChange = (checked: boolean) => {
    const updated = saveSettings({ horarioAtualPadrao: checked })
    setSettingsState(updated)
    latestSettingsRef.current = updated
    showFeedback(checked ? 'Horário atual ativado como padrão' : 'Horário atual desativado')
  }

  const handleSalvarConfiguracoes = () => {
    const updated = saveSettings(latestSettingsRef.current)
    setSettingsState(updated)
    latestSettingsRef.current = updated
    showFeedback('Configurações salvas com sucesso!')
  }

  const handleExportar = async () => {
    setExportando(true)
    setMensagem(null)
    try {
      const res = await exportHistoryZip()
      setMensagem({
        tipo: 'sucesso',
        texto: `${res.count} anamnese${res.count === 1 ? '' : 's'} exportada${res.count === 1 ? '' : 's'} com sucesso em ZIP!`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao exportar o histórico.'
      setMensagem({
        tipo: 'erro',
        texto: msg,
      })
    } finally {
      setExportando(false)
    }
  }

  const handleImportarClick = () => {
    setMensagem(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportando(true)
    setMensagem(null)
    try {
      const res = await importHistoryFile(file)
      setMensagem({
        tipo: 'sucesso',
        texto: res.message,
      })
      const recs = await listRecords()
      setTotalRegistros(recs.length)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao importar o arquivo selecionado.'
      setMensagem({
        tipo: 'erro',
        texto: msg,
      })
    } finally {
      setImportando(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  return (
    <>
      {/* Backdrop com animação suave de fade e clique para fechar */}
      <div
        className={`sidebar-backdrop ${aberto ? 'sidebar-backdrop--aberto' : ''}`}
        aria-hidden={!aberto}
        onClick={handleClose}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Menu lateral com animação de expandir e minimizar lateralmente */}
      <aside
        id="menu-lateral"
        ref={drawerRef}
        className={`sidebar-drawer ${aberto ? 'sidebar-drawer--aberto' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={tela === 'configuracoes' ? 'Configurações' : 'Menu de opções'}
        aria-hidden={!aberto}
      >
        {tela === 'menu' ? (
          <>
            <header className="sidebar-drawer__header">
              <div className="sidebar-drawer__title-wrap">
                <h2 className="sidebar-drawer__title">Opções</h2>
                <span className="sidebar-drawer__badge">
                  {totalRegistros !== null ? `${totalRegistros} no histórico` : 'Menu principal'}
                </span>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                className="icon-button"
                aria-label="Fechar menu lateral"
                onClick={handleClose}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </header>

            <div className="sidebar-drawer__body">
              {/* Seção de Configurações */}
              <section className="sidebar-group">
                <h3 className="sidebar-group__title">Configurações</h3>
                <p className="sidebar-group__desc">
                  Perfil, local padrão e horário automático para novas consultas.
                </p>

                <div className="sidebar-group__actions">
                  <button
                    ref={configBtnRef}
                    type="button"
                    className="sidebar-btn"
                    onClick={() => setTela('configuracoes')}
                  >
                    <span className="sidebar-btn__icon" aria-hidden="true">
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </span>
                    <span className="sidebar-btn__text">
                      <strong>Configurações</strong>
                      <small>Perfil, local padrão e horário</small>
                    </span>
                    <span className="sidebar-btn__arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                </div>
              </section>

              {/* Seção de Backup do Histórico */}
              <section className="sidebar-group">
                <h3 className="sidebar-group__title">Histórico de Anamneses</h3>
                <p className="sidebar-group__desc">
                  Exporte seus registros em ZIP ou restaure a partir de um backup anterior.
                </p>

                <div className="sidebar-group__actions">
                  <button
                    type="button"
                    className="sidebar-btn"
                    onClick={handleExportar}
                    disabled={exportando || importando}
                  >
                    <span className="sidebar-btn__icon" aria-hidden="true">
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </span>
                    <span className="sidebar-btn__text">
                      <strong>Exportar histórico (ZIP)</strong>
                      <small>Gera ZIP com JSON e HTML de cada paciente</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-btn"
                    onClick={handleImportarClick}
                    disabled={exportando || importando}
                  >
                    <span className="sidebar-btn__icon" aria-hidden="true">
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </span>
                    <span className="sidebar-btn__text">
                      <strong>Importar histórico</strong>
                      <small>Extrai o ZIP, JSON ou HTML e organiza os atendimentos</small>
                    </span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed,.json,application/json,.html,text/html"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </div>

                {mensagem && (
                  <div
                    className={`sidebar-feedback sidebar-feedback--${mensagem.tipo}`}
                    role="status"
                    aria-live="polite"
                  >
                    {mensagem.texto}
                  </div>
                )}
              </section>

              {/* Seção de Atalho dos Roteiros */}
              <section className="sidebar-group">
                <h3 className="sidebar-group__title">Roteiros Clínicos</h3>
                <ul className="sidebar-routes">
                  {templates.map((template) => (
                    <li key={template.id}>
                      <Link
                        to={`/anamnese/${template.id}`}
                        className="sidebar-route-link"
                        onClick={handleClose}
                      >
                        <span className="sidebar-route-link__icon" aria-hidden="true">
                          {template.icon}
                        </span>
                        <span className="sidebar-route-link__info">
                          <strong>{template.title}</strong>
                          <small>{template.subtitle}</small>
                        </span>
                        <span className="sidebar-route-link__arrow" aria-hidden="true">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        ) : (
          <>
            <header className="sidebar-drawer__header">
              <div className="sidebar-drawer__title-wrap">
                <button
                  ref={backBtnRef}
                  type="button"
                  className="icon-button"
                  aria-label="Voltar para o menu principal"
                  title="Voltar"
                  onClick={() => {
                    flushSettings()
                    setTela('menu')
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
                <h2 className="sidebar-drawer__title">Configurações</h2>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                className="icon-button"
                aria-label="Fechar menu lateral"
                onClick={handleClose}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </header>

            <div className="sidebar-drawer__body">
              <section className="sidebar-group">
                <p className="sidebar-group__desc">
                  Defina dados e padrões para serem aplicados automaticamente ao iniciar uma nova consulta.
                </p>

                {/* Opção Perfil com dados do usuário a serem repetidos em todas as consultas */}
                <div
                  className={`sidebar-settings-card ${
                    perfilExpandido ? 'sidebar-settings-card--open' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="sidebar-settings-card__header"
                    onClick={() => setPerfilExpandido((prev) => !prev)}
                    aria-expanded={perfilExpandido}
                  >
                    <div className="sidebar-settings-card__title-wrap">
                      <span className="sidebar-settings-card__icon" aria-hidden="true">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <div>
                        <h4 className="sidebar-settings-card__title">Perfil</h4>
                        <p className="sidebar-settings-card__subtitle">
                          Dados do usuário a serem repetidos em todas as consultas
                        </p>
                      </div>
                    </div>
                    <span
                      className={`sidebar-settings-card__chevron ${
                        perfilExpandido ? 'sidebar-settings-card__chevron--open' : ''
                      }`}
                      aria-hidden="true"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>

                  {perfilExpandido && (
                    <div className="sidebar-settings-card__body">
                      <div className="sidebar-field">
                        <label htmlFor="config-perfil-nome">Nome do profissional / estudante</label>
                        <input
                          id="config-perfil-nome"
                          type="text"
                          placeholder="Ex.: Dr(a). João Silva"
                          value={settings.perfil.nome}
                          onChange={(e) => handlePerfilChange('nome', e.target.value)}
                          onBlur={handlePerfilBlur}
                        />
                      </div>

                      <div className="sidebar-field">
                        <label htmlFor="config-perfil-registro">CRM / matrícula</label>
                        <input
                          id="config-perfil-registro"
                          type="text"
                          placeholder="Ex.: CRM/SP 123456 ou RA 202601"
                          value={settings.perfil.registro}
                          onChange={(e) => handlePerfilChange('registro', e.target.value)}
                          onBlur={handlePerfilBlur}
                        />
                      </div>

                      <div className="sidebar-field">
                        <label htmlFor="config-perfil-preceptor">Preceptor responsável</label>
                        <input
                          id="config-perfil-preceptor"
                          type="text"
                          placeholder="Ex.: Prof(a). Dr(a). Maria Oliveira"
                          value={settings.perfil.preceptor}
                          onChange={(e) => handlePerfilChange('preceptor', e.target.value)}
                          onBlur={handlePerfilBlur}
                        />
                        <span className="sidebar-field__hint">
                          Preenchido automaticamente na seção Responsável de novas consultas.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Opção Local de atendimento padrão */}
                <div className="sidebar-field" style={{ marginTop: '6px' }}>
                  <label htmlFor="config-local-padrao">
                    <strong>Local de atendimento padrão</strong>
                  </label>
                  <select
                    id="config-local-padrao"
                    value={settings.localPadrao}
                    onChange={(e) => handleLocalPadraoChange(e.target.value)}
                  >
                    <option value="">Nenhum (selecionar na consulta)</option>
                    {LOCAIS_ATENDIMENTO.map((local) => (
                      <option key={local} value={local}>
                        {local}
                      </option>
                    ))}
                  </select>
                  <span className="sidebar-field__hint">
                    Local selecionado automaticamente ao criar uma nova consulta.
                  </span>
                </div>

                {/* Checkbox Horário atual como padrão para horário de consulta */}
                <div style={{ marginTop: '6px' }}>
                  <label className="sidebar-checkbox">
                    <input
                      type="checkbox"
                      id="config-horario-padrao"
                      checked={settings.horarioAtualPadrao}
                      onChange={(e) => handleHorarioAtualPadraoChange(e.target.checked)}
                    />
                    <div className="sidebar-checkbox__text">
                      <strong>Horário atual como padrão para horário de consulta</strong>
                      <small>
                        Marca automaticamente o horário atual como o horário da consulta ao criar uma nova.
                      </small>
                    </div>
                  </label>
                </div>

                {feedbackConfig && (
                  <div
                    className="sidebar-feedback sidebar-feedback--sucesso"
                    role="status"
                    aria-live="polite"
                  >
                    {feedbackConfig}
                  </div>
                )}

                <button
                  type="button"
                  className="button button--primary"
                  style={{ marginTop: '10px', width: '100%' }}
                  onClick={handleSalvarConfiguracoes}
                >
                  Salvar configurações
                </button>
              </section>
            </div>
          </>
        )}

        <footer className="sidebar-drawer__footer">
          <div className="sidebar-drawer__brand">
            Anamnese <span className="gradient-soap">SOAP</span>
          </div>
          <div className="sidebar-drawer__author">App criado e distribuido por Pedro Lucas</div>
        </footer>
      </aside>
    </>
  )
}
