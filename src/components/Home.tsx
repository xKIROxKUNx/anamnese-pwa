import { Link } from 'react-router-dom'
import { templates } from '../data'
import { countTemplate } from '../lib/values'

export function Home() {
  return (
    <div className="shell">
      <header className="wrap home-hero">
        <span className="home-badge">Para estudantes de medicina e médicos iniciantes</span>
        <h1>
          A anamnese completa, <em>item por item</em>, na ordem SOAP.
        </h1>
        <p>
          Escolha o roteiro, percorra Subjetivo → Objetivo → Avaliação → Plano sem esquecer nenhum
          item e gere um PDF pronto para o prontuário.
        </p>
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

        <div className="home-notes">
          <div className="note">
            <strong>Nada sai do aparelho</strong>
            <span>
              Tudo o que você digita fica na tela do seu celular ou computador. Não há servidor,
              cadastro nem envio de dados.
            </span>
          </div>
          <div className="note">
            <strong>Funciona offline</strong>
            <span>
              Instale como aplicativo pelo menu do navegador e use no plantão mesmo sem internet.
            </span>
          </div>
          <div className="note">
            <strong>PDF pronto para imprimir</strong>
            <span>
              Ao final, o app monta um documento em A4 com os itens preenchidos, na ordem SOAP.
            </span>
          </div>
        </div>
      </main>

      <footer className="wrap site-footer">
        <p>
          Ferramenta de apoio ao estudo e à organização do raciocínio clínico. Não substitui o
          julgamento do profissional nem o prontuário oficial.
        </p>
      </footer>
    </div>
  )
}
