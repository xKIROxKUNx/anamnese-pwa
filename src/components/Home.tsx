import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { templates } from '../data'
import { countTemplate } from '../lib/values'
import { HistoricoAnamneses } from './HistoricoAnamneses'
import { SidebarMenu } from './SidebarMenu'

export function Home() {
  const [menuAberto, setMenuAberto] = useState(false)
  const topbarBtnRef = useRef<HTMLButtonElement>(null)

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
                style={
                  {
                    '--card-accent': template.accent,
                    '--card-soft': template.accentSoft,
                  } as React.CSSProperties
                }
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
