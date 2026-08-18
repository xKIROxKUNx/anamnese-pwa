import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTemplate } from '../data'
import { countTemplate } from '../lib/values'
import {
  dataDoRegistro,
  deleteRecord,
  descreverAtualizacao,
  formatarData,
  listRecords,
  pacienteDoRegistro,
  type StoredRecord,
} from '../lib/storage'
import { ConfirmDialog } from './ConfirmDialog'

const LIMITE_PARA_BUSCA = 6

export function HistoricoAnamneses() {
  const [registros, setRegistros] = useState<StoredRecord[]>(() => listRecords())
  const [busca, setBusca] = useState('')
  const [excluindo, setExcluindo] = useState<StoredRecord | null>(null)

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return registros
    return registros.filter((registro) => {
      const paciente = pacienteDoRegistro(registro).toLowerCase()
      const data = formatarData(dataDoRegistro(registro))
      return paciente.includes(termo) || data.includes(termo)
    })
  }, [registros, busca])

  if (registros.length === 0) return null

  const confirmarExclusao = () => {
    if (!excluindo) return
    deleteRecord(excluindo.id)
    setRegistros((atuais) => atuais.filter((registro) => registro.id !== excluindo.id))
    setExcluindo(null)
  }

  return (
    <section className="historico">
      <p className="section-eyebrow">
        Anamneses salvas
        <span className="section-eyebrow__count">{registros.length}</span>
      </p>

      {registros.length > LIMITE_PARA_BUSCA && (
        <input
          type="search"
          className="historico__busca"
          placeholder="Buscar por nome do paciente ou data"
          aria-label="Buscar anamneses salvas"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
      )}

      {filtrados.length === 0 ? (
        <p className="historico__vazio">Nenhuma anamnese encontrada para “{busca}”.</p>
      ) : (
        <ul className="historico__lista">
          {filtrados.map((registro) => {
            const template = getTemplate(registro.templateId)
            const { answered, total } = template
              ? countTemplate(template, registro.values, registro.na)
              : { answered: 0, total: 0 }

            return (
              <li className="historico__item" key={registro.id}>
                <Link
                  className="historico__link"
                  to={`/anamnese/${registro.templateId}/${registro.id}`}
                  style={
                    { '--card-accent': template?.accent ?? 'var(--accent)' } as React.CSSProperties
                  }
                >
                  <span className="historico__icone" aria-hidden="true">
                    {template?.icon ?? '📄'}
                  </span>
                  <span className="historico__texto">
                    <strong>{pacienteDoRegistro(registro)}</strong>
                    <span className="historico__meta">
                      {formatarData(dataDoRegistro(registro))} · {template?.title ?? 'Anamnese'}
                    </span>
                    <span className="historico__rodape">
                      {answered} de {total} itens · salvo {descreverAtualizacao(registro.atualizadoEm)}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="historico__excluir"
                  aria-label={`Excluir a anamnese de ${pacienteDoRegistro(registro)}`}
                  onClick={() => setExcluindo(registro)}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 7h16M9 7V5h6v2m-1 0v12M10 7v12M6 7l1 13h10l1-13"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {excluindo && (
        <ConfirmDialog
          title={`Excluir a anamnese de ${pacienteDoRegistro(excluindo)}?`}
          message="Ela sai do histórico deste aparelho e o conteúdo preenchido é apagado. Isso não pode ser desfeito."
          confirmLabel="Excluir"
          onConfirm={confirmarExclusao}
          onCancel={() => setExcluindo(null)}
        />
      )}
    </section>
  )
}
