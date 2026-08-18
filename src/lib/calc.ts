import type { Values } from '../types/anamnese'

/** Lê um campo como texto simples, ignorando valores compostos. */
export function str(values: Values, id: string): string {
  const v = values[id]
  if (typeof v === 'string') return v.trim()
  return ''
}

function num(values: Values, id: string): number | null {
  const raw = str(values, id).replace(',', '.')
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

function plural(n: number, singular: string, pluralWord: string): string {
  return `${n} ${n === 1 ? singular : pluralWord}`
}

/** Idade em anos, meses e dias a partir da data de nascimento. */
export function idadeExtenso(values: Values, campo = 'nascimento'): string {
  const nasc = parseDate(str(values, campo))
  if (!nasc) return ''
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  if (nasc > hoje) return 'data futura'

  let anos = hoje.getFullYear() - nasc.getFullYear()
  let meses = hoje.getMonth() - nasc.getMonth()
  let dias = hoje.getDate() - nasc.getDate()

  if (dias < 0) {
    meses -= 1
    dias += new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate()
  }
  if (meses < 0) {
    anos -= 1
    meses += 12
  }

  if (anos >= 12) return plural(anos, 'ano', 'anos')
  if (anos >= 2) return `${plural(anos, 'ano', 'anos')} e ${plural(meses, 'mês', 'meses')}`
  const totalMeses = anos * 12 + meses
  if (totalMeses >= 1) return `${plural(totalMeses, 'mês', 'meses')} e ${plural(dias, 'dia', 'dias')}`
  return plural(dias, 'dia', 'dias')
}

/** IMC com a faixa correspondente (adulto). */
export function imc(values: Values, campoPeso = 'peso', campoAltura = 'altura'): string {
  const peso = num(values, campoPeso)
  const alturaCm = num(values, campoAltura)
  if (!peso || !alturaCm) return ''
  const m = alturaCm > 3 ? alturaCm / 100 : alturaCm
  if (m <= 0) return ''
  const valor = peso / (m * m)
  if (!Number.isFinite(valor) || valor <= 0 || valor > 200) return ''
  return `${valor.toFixed(1)} kg/m² — ${faixaImc(valor)}`
}

function faixaImc(v: number): string {
  if (v < 18.5) return 'baixo peso'
  if (v < 25) return 'eutrófico'
  if (v < 30) return 'sobrepeso'
  if (v < 35) return 'obesidade grau I'
  if (v < 40) return 'obesidade grau II'
  return 'obesidade grau III'
}

/** IMC do idoso usa pontos de corte próprios (OPAS/Lipschitz). */
export function imcIdoso(values: Values): string {
  const peso = num(values, 'peso')
  const alturaCm = num(values, 'altura')
  if (!peso || !alturaCm) return ''
  const m = alturaCm > 3 ? alturaCm / 100 : alturaCm
  if (m <= 0) return ''
  const v = peso / (m * m)
  if (!Number.isFinite(v) || v <= 0 || v > 200) return ''
  const faixa = v < 22 ? 'baixo peso' : v <= 27 ? 'eutrófico' : 'sobrepeso'
  return `${v.toFixed(1)} kg/m² — ${faixa} (corte do idoso: 22–27)`
}

/** Carga tabágica em maços/ano. */
export function cargaTabagica(values: Values): string {
  const cigarros = num(values, 'cigarros_dia')
  const anos = num(values, 'anos_fumo')
  if (!cigarros || !anos) return ''
  const macos = (cigarros / 20) * anos
  if (!Number.isFinite(macos)) return ''
  return `${macos.toFixed(1)} maços/ano`
}

/** Data provável do parto pela regra de Naegele (DUM + 280 dias). */
export function dpp(values: Values, campo = 'dum'): string {
  const dum = parseDate(str(values, campo))
  if (!dum) return ''
  const data = new Date(dum.getTime())
  data.setDate(data.getDate() + 280)
  return data.toLocaleDateString('pt-BR')
}

/** Idade gestacional em semanas e dias a partir da DUM. */
export function igPorDum(values: Values, campo = 'dum'): string {
  const dum = parseDate(str(values, campo))
  if (!dum) return ''
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dias = Math.floor((hoje.getTime() - dum.getTime()) / 86_400_000)
  if (dias < 0) return 'data futura'
  const semanas = Math.floor(dias / 7)
  if (semanas > 45) return ''
  return `${plural(semanas, 'semana', 'semanas')} e ${plural(dias % 7, 'dia', 'dias')}`
}

/** Trimestre correspondente à IG informada. */
export function trimestre(values: Values): string {
  const dum = parseDate(str(values, 'dum'))
  if (!dum) return ''
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const semanas = Math.floor((hoje.getTime() - dum.getTime()) / 86_400_000 / 7)
  if (semanas < 0 || semanas > 45) return ''
  if (semanas < 14) return '1º trimestre'
  if (semanas < 28) return '2º trimestre'
  return '3º trimestre'
}

/** Pressão arterial média — útil no idoso e no paciente grave. */
export function pressaoMedia(values: Values): string {
  const sist = num(values, 'pa_sistolica')
  const diast = num(values, 'pa_diastolica')
  if (!sist || !diast) return ''
  const pam = (sist + 2 * diast) / 3
  if (!Number.isFinite(pam)) return ''
  return `${Math.round(pam)} mmHg`
}
