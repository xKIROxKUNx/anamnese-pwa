import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { templates } from '../data'
import { countTemplate } from '../lib/values'
import { HistoricoAnamneses } from './HistoricoAnamneses'
import { SidebarMenu } from './SidebarMenu'
import { UpdateDialog } from './UpdateDialog'
import {
  applyUpdate,
  browserApplyDeps,
  browserCheckDeps,
  checkForUpdate,
  dismissUpdate,
  type VersionInfo,
} from '../lib/updater'

/** Mínimo entre verificações ao voltar para o app já aberto (a abertura sempre verifica). */
const INTERVALO_RETORNO_MS = 30_000

export function Home() {
  const [menuAberto, setMenuAberto] = useState(false)
  const topbarBtnRef = useRef<HTMLButtonElement>(null)

  // Atualizador: verifica sempre que a tela inicial aparece — ao abrir o app e ao
  // sair de uma consulta (a Home monta de novo) — e quando o app volta do segundo
  // plano ainda na tela inicial. Sem rede, nada acontece.
  const [novaVersao, setNovaVersao] = useState<VersionInfo | null>(null)
  const [atualizando, setAtualizando] = useState(false)
  const [erroAtualizacao, setErroAtualizacao] = useState(false)

  useEffect(() => {
    let ativo = true
    let ultimaVerificacao = 0
    const verificar = () => {
      ultimaVerificacao = Date.now()
      checkForUpdate(browserCheckDeps()).then((versao) => {
        if (ativo && versao) setNovaVersao((atual) => atual ?? versao)
      })
    }
    const aoVoltarAoApp = () => {
      if (document.visibilityState === 'visible' && Date.now() - ultimaVerificacao > INTERVALO_RETORNO_MS) {
        verificar()
      }
    }
    verificar()
    document.addEventListener('visibilitychange', aoVoltarAoApp)
    return () => {
      ativo = false
      document.removeEventListener('visibilitychange', aoVoltarAoApp)
    }
  }, [])

  const agoraNao = useCallback(() => {
    if (novaVersao) dismissUpdate(novaVersao.build)
    setNovaVersao(null)
  }, [novaVersao])

  const atualizar = async () => {
    if (!novaVersao) return
    setAtualizando(true)
    setErroAtualizacao(false)
    try {
      await applyUpdate(novaVersao, browserApplyDeps())
    } catch {
      setErroAtualizacao(true)
      setAtualizando(false)
    }
  }

  return (
    <div className="shell">
      {/* Botão de opções superior (3 barras horizontais) */}
      <nav className="home-topbar wrap" aria-label="Navegação superior">
        <button
          ref={topbarBtnRef}
          type="button"
          className="icon-button home-topbar__btn"
          aria-label={menuAberto ? 'Fechar menu de opções' : 'Abrir menu de opções'}
          title="Opções"
          aria-expanded={menuAberto}
          aria-controls="menu-lateral"
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </nav>

      {/* Menu lateral oculto com animação de expandir e minimizar */}
      <SidebarMenu
        aberto={menuAberto}
        onClose={() => setMenuAberto(false)}
        triggerRef={topbarBtnRef}
      />

      {novaVersao && (
        <UpdateDialog
          versao={novaVersao}
          atualizando={atualizando}
          erro={erroAtualizacao}
          onAtualizar={atualizar}
          onAgoraNao={agoraNao}
        />
      )}

      <header className="wrap home-hero">
        <span className="home-badge">App criado e distribuido por Pedro Lucas</span>
        <h1>
          Anamnese <em className="gradient-soap">SOAP</em>
        </h1>
        <p>Para iniciar escolha seu roteiro de anamnese</p>
      </header>

      <main className="wrap">
        <p className="section-eyebrow">Escolha o roteiro</p>
        <div className="card-grid">
          {templates.map((template) => {
            const { total } = countTemplate(template, {}, {})
            const sections = template.blocks.reduce((sum, block) => sum + block.sections.length, 0)
            return (
              <Link
                key={template.id}
                to={`/anamnese/${template.id}`}
                className="route-card"
                style={{ '--card-accent': template.accent } as React.CSSProperties}
              >
                <span className="route-card__icon" aria-hidden="true">
                  {template.icon}
                </span>
                <h2>{template.title}</h2>
                <p className="route-card__subtitle">{template.subtitle}</p>
                <p>{template.description}</p>
                <span className="route-card__meta">
                  <span>
                    {sections} seções · {total} itens
                  </span>
                  <span className="route-card__go">Abrir →</span>
                </span>
              </Link>
            )
          })}
        </div>

        <HistoricoAnamneses />
      </main>
    </div>
  )
}
