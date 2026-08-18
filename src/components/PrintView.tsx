import type { ClinicalDocument } from '../lib/document'

export function PrintView({ doc }: { doc: ClinicalDocument }) {
  return (
    <article className="print-doc" aria-hidden="true">
      <header className="print-doc__header">
        <h1>{doc.title}</h1>
        <dl className="print-doc__meta">
          <div>
            <dt>Paciente</dt>
            <dd>{doc.paciente}</dd>
          </div>
          <div>
            <dt>Atendimento</dt>
            <dd>{doc.atendimento}</dd>
          </div>
          {doc.profissional && (
            <div>
              <dt>Responsável</dt>
              <dd>{doc.profissional}</dd>
            </div>
          )}
        </dl>
      </header>

      {doc.isEmpty ? (
        <p className="print-doc__empty">
          Nenhum item preenchido. Volte ao formulário e registre a anamnese antes de gerar o PDF.
        </p>
      ) : (
        doc.blocks.map((block) => (
          <section className="print-block" key={block.key}>
            <h2>{block.title}</h2>
            {block.sections.map((section) => (
              <section className="print-section" key={section.title}>
                <h3>{section.title}</h3>
                {section.items.map((item) => (
                  <p
                    className={item.block ? 'print-item print-item--block' : 'print-item'}
                    key={item.label}
                  >
                    <span className="print-item__label">{item.label}:</span>{' '}
                    <span className="print-item__value">{item.value}</span>
                  </p>
                ))}
              </section>
            ))}
          </section>
        ))
      )}

      <footer className="print-doc__footer">
        <span>
          {doc.profissional
            ? doc.profissional
            : 'Assinatura e carimbo: ______________________________________'}
        </span>
        <span>
          Documento gerado no app Anamnese — ferramenta de apoio ao estudo, não substitui o
          julgamento clínico.
        </span>
      </footer>
    </article>
  )
}
