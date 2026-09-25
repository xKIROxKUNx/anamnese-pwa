import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="wrap home-hero">
      <h1>Roteiro não encontrado</h1>
      <p>O endereço acessado não corresponde a nenhuma das anamneses disponíveis.</p>
      <p style={{ marginTop: 24 }}>
        <Link className="button button--primary" to="/">
          Voltar ao início
        </Link>
      </p>
    </div>
  )
}
