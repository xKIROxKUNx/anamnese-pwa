import type { FieldValue, Values } from '../types/anamnese'
import { idadeEmMeses } from './calc'
import { evaluateCategorical, getCategoricalDefinition, getCategoricalInfo } from './references-categorical'

export type ReferenceStatus = 'normal' | 'alerta' | 'alterado'

export interface ReferenceRangeItem {
  label: string
  range: string
  status: ReferenceStatus
  isCurrent?: boolean
  /** Definição curta da opção (só nos campos categóricos, layout 'definicoes'). */
  description?: string
}

/**
 * 'faixas': tabela de faixa numérica → classificação.
 * 'definicoes': uma linha por opção do campo, com o que observar para escolhê-la.
 */
export type ReferenceLayout = 'faixas' | 'definicoes'

export interface ReferenceEvaluation {
  layout?: ReferenceLayout
  /** Sem popover: o resultado só colore o campo (cor do chip ou da barra). */
  statusOnly?: boolean
  status: ReferenceStatus
  statusLabel: 'Normal' | 'Alerta' | 'Alterado'
  classification: string
  currentValueFormatted: string
  rangesTitle: string
  ranges: ReferenceRangeItem[]
  clinicalNote?: string
  futureRecommendationHint?: string
}

export interface ReferenceInfoDefinition {
  layout?: ReferenceLayout
  rangesTitle: string
  ranges: ReferenceRangeItem[]
  clinicalNote?: string
  defaultRecommendationHint?: string
}

function getStatusLabel(status: ReferenceStatus): 'Normal' | 'Alerta' | 'Alterado' {
  if (status === 'normal') return 'Normal'
  if (status === 'alerta') return 'Alerta'
  return 'Alterado'
}

/** Lê um valor de campo como número ou null */
function parseNum(rawVal: unknown): number | null {
  if (rawVal === undefined || rawVal === null) return null
  if (typeof rawVal === 'number') return Number.isFinite(rawVal) ? rawVal : null
  if (typeof rawVal === 'string') {
    const clean = rawVal.trim().replace(',', '.')
    if (!clean) return null
    const n = Number(clean)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function parseNumFromValues(values: Values, id: string): number | null {
  return parseNum(values[id])
}

/**
 * Retorna os dados estáticos de referência para um campo (mesmo se ainda não preenchido).
 */
export function getFieldReferenceInfo(
  fieldId: string,
  values: Values = {},
  templateId?: string,
): ReferenceInfoDefinition | null {
  if (getCategoricalDefinition(fieldId)) return getCategoricalInfo(fieldId)
  if (STATUS_ONLY_IDS.has(fieldId)) return null
  return buildNumericInfo(fieldId, values, templateId)
}

/** Campos numéricos que só ganham a cor de status, sem ícone nem popover. */
const STATUS_ONLY_IDS = new Set(['sintoma_intensidade'])

function buildNumericInfo(
  fieldId: string,
  values: Values,
  templateId?: string,
): ReferenceInfoDefinition | null {
  switch (fieldId) {
    case 'imc': {
      if (templateId === 'idoso') {
        return {
          rangesTitle: 'Classificação segundo Lipschitz / OPAS / Ministério da Saúde',
          ranges: [
            { label: 'Baixo peso', range: '< 22.0 kg/m²', status: 'alerta' },
            { label: 'Eutrófico (Adequado)', range: '22.0 – 27.0 kg/m²', status: 'normal' },
            { label: 'Sobrepeso', range: '> 27.0 kg/m²', status: 'alerta' },
          ],
          clinicalNote: 'Para pessoas idosas (≥ 60 anos), a faixa eutrófica é de 22 a 27 kg/m² para preservar reserva metabólica contra fragilidade.',
          defaultRecommendationHint: 'Recomendações nutricionais voltadas à manutenção de massa muscular e densidade mineral óssea.',
        }
      }
      if (templateId === 'crianca') {
        return {
          rangesTitle: 'Faixas aproximadas de IMC na infância (confirme no escore Z da OMS)',
          ranges: [
            { label: 'Magreza acentuada', range: '< 13.5 kg/m²', status: 'alterado' },
            { label: 'Magreza', range: '13.5 – 14.9 kg/m²', status: 'alerta' },
            { label: 'Eutrófico (Adequado)', range: '15.0 – 18.5 kg/m²', status: 'normal' },
            { label: 'Risco de sobrepeso', range: '18.6 – 21.0 kg/m²', status: 'alerta' },
            { label: 'Obesidade infantil', range: '> 21.0 kg/m²', status: 'alterado' },
          ],
          clinicalNote: 'Cortes fixos, só uma triagem: o IMC da criança deve ser interpretado pelas curvas de percentil e escore Z da OMS conforme idade e sexo (Z -3 / -2 / +1 / +2).',
          defaultRecommendationHint: 'Avaliar curva de ganho ponderal, aleitamento/alimentação complementar e rotina de atividades ativas.',
        }
      }
      if (templateId === 'gestante') {
        return {
          rangesTitle: 'Classificação Nutricional da Gestante segundo Atalah / Ministério da Saúde',
          ranges: [
            { label: 'Baixo peso', range: '< 18.5 – 20.0 kg/m²', status: 'alerta' },
            { label: 'Adequado (Eutrófico)', range: '18.5 – 25.0 kg/m² (início)', status: 'normal' },
            { label: 'Sobrepeso', range: '25.0 – 30.0 kg/m²', status: 'alerta' },
            { label: 'Obesidade', range: '≥ 30.0 kg/m²', status: 'alterado' },
          ],
          clinicalNote: 'A avaliação nutricional na gestação deve considerar a idade gestacional na curva de Atalah do Ministério da Saúde.',
          defaultRecommendationHint: 'Orientar ganho ponderal adequado conforme o estado nutricional inicial.',
        }
      }
      return {
        rangesTitle: 'Classificação segundo a Organização Mundial da Saúde (OMS)',
        ranges: [
          { label: 'Baixo peso', range: '< 18.5 kg/m²', status: 'alerta' },
          { label: 'Eutrófico (Peso normal)', range: '18.5 – 24.9 kg/m²', status: 'normal' },
          { label: 'Sobrepeso', range: '25.0 – 29.9 kg/m²', status: 'alerta' },
          { label: 'Obesidade Grau I', range: '30.0 – 34.9 kg/m²', status: 'alterado' },
          { label: 'Obesidade Grau II', range: '35.0 – 39.9 kg/m²', status: 'alterado' },
          { label: 'Obesidade Grau III', range: '≥ 40.0 kg/m²', status: 'alterado' },
        ],
        clinicalNote: 'O IMC é calculado como peso (kg) dividido pelo quadrado da altura (m²).',
        defaultRecommendationHint: 'Orientação dietética, prática regular de atividade física e estratificação de risco cardiometabólico.',
      }
    }

    case 'pa_sistolica': {
      if (templateId === 'gestante') {
        return {
          rangesTitle: 'Valores de referência no Pré-Natal (FEBRASGO / Ministério da Saúde)',
          ranges: [
            { label: 'Hipotensão', range: '< 90 mmHg', status: 'alerta' },
            { label: 'Pressão Normal', range: '90 – 119 mmHg', status: 'normal' },
            { label: 'Alerta / Pré-hipertensão', range: '120 – 139 mmHg', status: 'alerta' },
            { label: 'Hipertensão Gestacional', range: '140 – 159 mmHg', status: 'alterado' },
            { label: 'Hipertensão Grave', range: '≥ 160 mmHg', status: 'alterado' },
          ],
          clinicalNote: 'Níveis de PAS ≥ 140 mmHg após a 20ª semana exigem pesquisa de proteinúria e sinais premonitórios de eclâmpsia.',
          defaultRecommendationHint: 'Solicitar proteinúria/relação proteína-creatinina, hemograma, plaquetas, enzimas hepáticas e repouso.',
        }
      }
      if (templateId === 'crianca') {
        return {
          rangesTitle: 'Percentis de PA na Infância (SBP / SBC / PALS)',
          ranges: [
            { label: 'Hipotensão pediátrica', range: '< 80 mmHg', status: 'alterado' },
            { label: 'Pressão Sistólica Normal', range: '80 – 110 mmHg', status: 'normal' },
            { label: 'Limítrofe / Pré-hipertensão', range: '111 – 120 mmHg', status: 'alerta' },
            { label: 'Hipertensão na Infância', range: '> 120 mmHg', status: 'alterado' },
          ],
          clinicalNote: 'Utilizar manguito com largura cobrindo 40% da circunferência do braço e comprimento cobrindo 80 a 100%.',
          defaultRecommendationHint: 'Aferir após 5 minutos de repouso com a criança calma e sentada.',
        }
      }
      return {
        rangesTitle: 'Diretrizes Brasileiras de Hipertensão Arterial (DBH / SBC)',
        ranges: [
          { label: 'Hipotensão', range: '< 90 mmHg', status: 'alerta' },
          { label: 'Ótima / Normal', range: '90 – 129 mmHg', status: 'normal' },
          { label: 'Pré-hipertensão', range: '130 – 139 mmHg', status: 'alerta' },
          { label: 'Hipertensão Estágio 1 e 2', range: '140 – 179 mmHg', status: 'alterado' },
          { label: 'Crise Hipertensiva / Estágio 3', range: '≥ 180 mmHg', status: 'alterado' },
        ],
        clinicalNote: 'Aferir após 5 minutos de repouso, com manguito adequado ao braço e bexiga vazia.',
        defaultRecommendationHint: 'Modificações de estilo de vida (dieta DASH, redução de sódio) e avaliação de lesões em órgãos-alvo.',
      }
    }

    case 'pa_diastolica': {
      if (templateId === 'gestante') {
        return {
          rangesTitle: 'Valores de referência no Pré-Natal (FEBRASGO)',
          ranges: [
            { label: 'Hipotensão', range: '< 60 mmHg', status: 'alerta' },
            { label: 'Pressão Normal', range: '60 – 79 mmHg', status: 'normal' },
            { label: 'Atenção', range: '80 – 89 mmHg', status: 'alerta' },
            { label: 'Hipertensão Gestacional', range: '90 – 109 mmHg', status: 'alterado' },
            { label: 'Hipertensão Grave', range: '≥ 110 mmHg', status: 'alterado' },
          ],
          clinicalNote: 'PAD ≥ 90 mmHg em duas medidas com intervalo de 4h define hipertensão na gestação.',
          defaultRecommendationHint: 'Encaminhamento para pré-natal de alto risco e vigilância materno-fetal contínua.',
        }
      }
      if (templateId === 'crianca') {
        return {
          rangesTitle: 'Percentis de PAD na Infância (SBP / SBC / PALS)',
          ranges: [
            { label: 'Hipotensão', range: '< 50 mmHg', status: 'alterado' },
            { label: 'Normal', range: '50 – 75 mmHg', status: 'normal' },
            { label: 'Elevada', range: '> 75 mmHg', status: 'alterado' },
          ],
          clinicalNote: 'Correlacionar com idade, sexo e percentil de estatura da criança.',
          defaultRecommendationHint: 'Confirmar em três ocasiões distintas se assintomática.',
        }
      }
      return {
        rangesTitle: 'Diretrizes Brasileiras de Hipertensão Arterial (DBH / SBC)',
        ranges: [
          { label: 'Hipotensão', range: '< 60 mmHg', status: 'alerta' },
          { label: 'Ótima / Normal', range: '60 – 84 mmHg', status: 'normal' },
          { label: 'Pré-hipertensão', range: '85 – 89 mmHg', status: 'alerta' },
          { label: 'Hipertensão Estágio 1 e 2', range: '90 – 109 mmHg', status: 'alterado' },
          { label: 'Crise Hipertensiva', range: '≥ 110 mmHg', status: 'alterado' },
        ],
        clinicalNote: 'A PAD reflete a resistência vascular periférica nos momentos de relaxamento ventricular.',
        defaultRecommendationHint: 'Reavaliação ambulatorial e controle de fatores de risco associados.',
      }
    }

    case 'pam': {
      return {
        rangesTitle: 'Perfusão Tecidual Sistêmica',
        ranges: [
          { label: 'Hipoperfusão tecidual', range: '< 70 mmHg', status: 'alterado' },
          { label: 'Perfusão adequada', range: '70 – 105 mmHg', status: 'normal' },
          { label: 'Elevada', range: '106 – 125 mmHg', status: 'alerta' },
          { label: 'Crítica / Muito alta', range: '> 125 mmHg', status: 'alterado' },
        ],
        clinicalNote: 'Calculada pela fórmula: (PAS + 2 × PAD) ÷ 3.',
        defaultRecommendationHint: 'Manter PAM ≥ 65–70 mmHg para adequada perfusão cerebral, renal e coronariana.',
      }
    }

    case 'fc': {
      if (templateId === 'crianca') {
        return {
          rangesTitle: 'Valores normais por faixa etária (PALS / SBP)',
          ranges: [
            { label: 'Lactente (< 1 ano)', range: '100 – 160 bpm', status: 'normal' },
            { label: 'Pré-escolar (1–5 anos)', range: '80 – 140 bpm', status: 'normal' },
            { label: 'Escolar (6–12 anos)', range: '70 – 120 bpm', status: 'normal' },
            { label: 'Adolescente (> 12 anos)', range: '60 – 100 bpm', status: 'normal' },
          ],
          clinicalNote: 'Avaliar com a criança calma. Febre, choro e agitação elevam a frequência cardíaca temporariamente.',
          defaultRecommendationHint: 'Correlacionar com temperatura axilar (aumento fisiológico de ~10 bpm por °C de febre).',
        }
      }
      return {
        rangesTitle: 'Ritmo e Frequência Cardíaca no Adulto',
        ranges: [
          { label: 'Bradicardia importante', range: '< 50 bpm', status: 'alterado' },
          { label: 'Bradicardia leve', range: '50 – 59 bpm', status: 'alerta' },
          { label: 'Normocárdico (Normal)', range: '60 – 100 bpm', status: 'normal' },
          { label: 'Taquicardia leve', range: '101 – 120 bpm', status: 'alerta' },
          { label: 'Taquicardia importante', range: '> 120 bpm', status: 'alterado' },
        ],
        clinicalNote: 'Palpar pulso radial ou auscultar o precórdio por 60 segundos se o ritmo for irregular.',
        defaultRecommendationHint: 'Realizar ECG em caso de taqui ou bradiarritmias sintomáticas.',
      }
    }

    case 'fr': {
      if (templateId === 'crianca') {
        return {
          rangesTitle: 'Valores máximos de FR na infância (OMS / SBP)',
          ranges: [
            { label: '< 2 meses', range: '≤ 60 irpm', status: 'normal' },
            { label: '2 a 11 meses', range: '≤ 50 irpm', status: 'normal' },
            { label: '1 a 5 anos', range: '≤ 40 irpm', status: 'normal' },
            { label: '> 5 anos', range: '15 – 25 irpm', status: 'normal' },
          ],
          clinicalNote: 'Contar as incursões respiratórias durante 1 minuto inteiro com a criança tranquila, preferencialmente dormindo.',
          defaultRecommendationHint: 'Taquipneia na criança é o sinal mais sensível para pneumonia e bronquiolite.',
        }
      }
      return {
        rangesTitle: 'Padrão Ventilatório no Adulto',
        ranges: [
          { label: 'Bradipneia grave', range: '< 10 irpm', status: 'alterado' },
          { label: 'Bradipneia leve', range: '10 – 11 irpm', status: 'alerta' },
          { label: 'Eupneico (Normal)', range: '12 – 20 irpm', status: 'normal' },
          { label: 'Taquipneia leve', range: '21 – 24 irpm', status: 'alerta' },
          { label: 'Taquipneia importante', range: '≥ 25 irpm', status: 'alterado' },
        ],
        clinicalNote: 'FR ≥ 22 irpm é um critério de triagem para gravidade em infecções pelo escore qSOFA.',
        defaultRecommendationHint: 'Avaliar oximetria de pulso, uso de musculatura acessória e ausculta pulmonar detalhada.',
      }
    }

    case 'temperatura': {
      return {
        rangesTitle: 'Termometria Clínica',
        ranges: [
          { label: 'Hipotermia moderada a grave', range: '< 35.0 °C', status: 'alterado' },
          { label: 'Hipotermia leve', range: '35.0 – 35.4 °C', status: 'alerta' },
          { label: 'Afebril (Normotermia)', range: '35.5 – 37.2 °C', status: 'normal' },
          { label: 'Estado subfebril / Febrícula', range: '37.3 – 37.7 °C', status: 'alerta' },
          { label: 'Febre', range: '37.8 – 38.9 °C', status: 'alterado' },
          { label: 'Febre alta / Hiperpirexia', range: '≥ 39.0 °C', status: 'alterado' },
        ],
        clinicalNote: 'Secar a axila antes de posicionar o termômetro. Aguardar o sinal sonoro ou pelo menos 3 minutos.',
        defaultRecommendationHint: 'Em caso de febre, investigar foco infeccioso e considerar antipirético se desconforto.',
      }
    }

    case 'spo2': {
      return {
        rangesTitle: 'Oximetria de Pulso em Ar Ambiente',
        ranges: [
          { label: 'Normal / Adequada', range: '≥ 95%', status: 'normal' },
          { label: 'Hipoxemia leve', range: '93 – 94%', status: 'alerta' },
          { label: 'Hipoxemia moderada', range: '90 – 92%', status: 'alterado' },
          { label: 'Hipoxemia grave', range: '< 90%', status: 'alterado' },
        ],
        clinicalNote: 'Verificar perfusão periférica, temperatura da extremidade e esmalte de unhas que possam falsear a leitura.',
        defaultRecommendationHint: 'Oxigenoterapia titulada para alvo de 94–98% (ou 88–92% em pacientes com DPOC/hipercapnia).',
      }
    }

    case 'glicemia_capilar': {
      return {
        rangesTitle: 'Valores de Referência (Sociedade Brasileira de Diabetes)',
        ranges: [
          { label: 'Hipoglicemia', range: '< 70 mg/dL', status: 'alterado' },
          { label: 'Normal (Jejum)', range: '70 – 99 mg/dL', status: 'normal' },
          { label: 'Tolerância diminuída / Pós-prandial', range: '100 – 139 mg/dL', status: 'alerta' },
          { label: 'Elevada', range: '140 – 199 mg/dL', status: 'alerta' },
          { label: 'Hiperglicemia acentuada', range: '≥ 200 mg/dL', status: 'alterado' },
        ],
        clinicalNote: 'Indagar sobre o tempo decorrido desde a última ingestão calórica (jejum vs pós-prandial).',
        defaultRecommendationHint: 'Corrigir hipoglicemia com regra dos 15g de carboidrato rápido; solicitar HbA1c se hiperglicemia.',
      }
    }

    case 'dor_atual':
    case 'dor_cronica':
    case 'sintoma_intensidade': {
      return {
        rangesTitle: 'Graduação da Intensidade Dolorosa',
        ranges: [
          { label: 'Sem dor', range: '0', status: 'normal' },
          { label: 'Dor leve', range: '1 – 3', status: 'normal' },
          { label: 'Dor moderada', range: '4 – 6', status: 'alerta' },
          { label: 'Dor intensa / Grave', range: '7 – 10', status: 'alterado' },
        ],
        clinicalNote: 'Classificação subjetiva conforme a percepção do paciente, servindo como guia para a escada analgésica.',
        defaultRecommendationHint: 'Adequar prescrição analgésica conforme a escada da OMS (não opioides, opioides fracos ou fortes).',
      }
    }

    case 'circunferencia_abdominal': {
      const sexo = typeof values['sexo'] === 'string' ? values['sexo'].toLowerCase() : ''
      const isMasc = sexo.includes('masc')
      const isFem = sexo.includes('fem')
      return {
        rangesTitle: 'Risco Metabólico e Cardiovascular (IDF / OMS)',
        ranges: isMasc
          ? [
              { label: 'Risco habitual (Homens)', range: '< 94 cm', status: 'normal' },
              { label: 'Risco aumentado', range: '94 – 102 cm', status: 'alerta' },
              { label: 'Risco muito aumentado', range: '> 102 cm', status: 'alterado' },
            ]
          : isFem
          ? [
              { label: 'Risco habitual (Mulheres)', range: '< 80 cm', status: 'normal' },
              { label: 'Risco aumentado', range: '80 – 88 cm', status: 'alerta' },
              { label: 'Risco muito aumentado', range: '> 88 cm', status: 'alterado' },
            ]
          : [
              { label: 'Normal / Risco baixo', range: '< 80 cm (F) / < 94 cm (M)', status: 'normal' },
              { label: 'Risco aumentado', range: '80–88 cm (F) / 94–102 cm (M)', status: 'alerta' },
              { label: 'Risco muito aumentado', range: '> 88 cm (F) / > 102 cm (M)', status: 'alterado' },
            ],
        clinicalNote: 'Medir no ponto médio entre a crista ilíaca e a última costela, ao final de uma expiração normal.',
        defaultRecommendationHint: 'Estímulo a mudanças no estilo de vida com redução de gordura visceral.',
      }
    }

    case 'circunferencia_panturrilha': {
      return {
        rangesTitle: 'Avaliação de Massa Muscular (EWGSOP / OPAS)',
        ranges: [
          { label: 'Massa muscular reduzida', range: '≤ 31 cm', status: 'alterado' },
          { label: 'Massa muscular preservada', range: '> 31 cm', status: 'normal' },
        ],
        clinicalNote: 'Medida na maior circunferência da perna não edemaciada, com o joelho fletido a 90°.',
        defaultRecommendationHint: 'Pesquisar força de preensão manual e considerar suplementação proteica associada a exercícios resistidos.',
      }
    }

    case 'bcf': {
      return {
        rangesTitle: 'Vitalidade Fetal Basal (FEBRASGO)',
        ranges: [
          { label: 'Bradicardia fetal', range: '< 110 bpm', status: 'alterado' },
          { label: 'FCF basal normal', range: '110 – 160 bpm', status: 'normal' },
          { label: 'Taquicardia fetal', range: '> 160 bpm', status: 'alterado' },
        ],
        clinicalNote: 'Auscultar com sonar Doppler durante 1 minuto completo no foco de melhor audibilidade (dorso fetal).',
        defaultRecommendationHint: 'Em alterações agudas, posicionar a gestante em decúbito lateral esquerdo, ofertar hidratação e reavaliar.',
      }
    }

    case 'tec': {
      return {
        rangesTitle: 'Perfusão Periférica e Microcirculação',
        ranges: [
          { label: 'Perfusão preservada', range: '≤ 2 segundos', status: 'normal' },
          { label: 'Perfusão lentificada', range: '> 2 segundos', status: 'alterado' },
        ],
        clinicalNote: 'Pressionar a polpa digital ou leito ungueal por 5 segundos até clarear e cronometrar o retorno da cor rósea.',
        defaultRecommendationHint: 'Correlacionar com pressão arterial média, pulso e diurese para descartar estados de choque.',
      }
    }

    case 'glasgow': {
      return {
        rangesTitle: 'Nível de Consciência e Gravidade do TCE',
        ranges: [
          { label: 'Normal / Preservado', range: '15', status: 'normal' },
          { label: 'Rebaixamento leve / TCE leve', range: '13 – 14', status: 'alerta' },
          { label: 'Rebaixamento moderado / TCE moderado', range: '9 – 12', status: 'alterado' },
          { label: 'Grave / Coma / TCE grave', range: '3 – 8', status: 'alterado' },
        ],
        clinicalNote: 'Avalia abertura ocular (1-4), resposta verbal (1-5) e resposta motora (1-6).',
        defaultRecommendationHint: 'Glasgow ≤ 8 requer proteção imediata de via aérea com intubação orotraqueal.',
      }
    }

    case 'carga_tabagica': {
      return {
        rangesTitle: 'Estratificação de Risco Tabágico (SBPT / INCA)',
        ranges: [
          { label: 'Não tabagista', range: '0 maços/ano', status: 'normal' },
          { label: 'Carga leve a moderada', range: '> 0 e < 20 maços/ano', status: 'alerta' },
          { label: 'Carga elevada (Alto Risco)', range: '≥ 20 maços/ano', status: 'alterado' },
        ],
        clinicalNote: 'Calculado por: (cigarros consumidos por dia ÷ 20) × anos de tabagismo.',
        defaultRecommendationHint: 'Indicação de rastreamento com Tomografia de Tórax de baixa dose e espirometria para ≥ 20 maços/ano.',
      }
    }

    case 'timed_up_go': {
      return {
        rangesTitle: 'Avaliação de Mobilidade e Risco de Quedas (Podsiadlo)',
        ranges: [
          { label: 'Independente / Normal', range: '< 10 segundos', status: 'normal' },
          { label: 'Boa mobilidade', range: '10 – 11.9 segundos', status: 'normal' },
          { label: 'Risco aumentado de quedas', range: '12 – 19.9 segundos', status: 'alerta' },
          { label: 'Alto risco de quedas', range: '≥ 20 segundos', status: 'alterado' },
        ],
        clinicalNote: 'Tempo necessário para levantar da cadeira, caminhar 3 metros, virar, retornar e sentar-se.',
        defaultRecommendationHint: 'Encaminhamento para fisioterapia de equilíbrio e revisão de psicotrópicos em uso.',
      }
    }

    case 'velocidade_marcha': {
      return {
        rangesTitle: 'Marcador de Fragilidade Física (Fried / EWGSOP)',
        ranges: [
          { label: 'Lentidão da marcha', range: '< 0.8 m/s', status: 'alterado' },
          { label: 'Velocidade preservada', range: '≥ 0.8 m/s', status: 'normal' },
        ],
        clinicalNote: 'Percurso de 4 metros em passo habitual. Velocidade < 0.8 m/s é preditor independente de mortalidade e dependência.',
        defaultRecommendationHint: 'Avaliação multiprofissional de reabilitação e estímulo ao treino resistido.',
      }
    }

    case 'ivcf20': {
      return {
        rangesTitle: 'Estratificação de Fragilidade do Idoso',
        ranges: [
          { label: 'Idoso Robusto', range: '0 – 6 pontos', status: 'normal' },
          { label: 'Em risco de fragilidade (Pré-frágil)', range: '7 – 14 pontos', status: 'alerta' },
          { label: 'Idoso Frágil', range: '15 – 40 pontos', status: 'alterado' },
        ],
        clinicalNote: 'Instrumento validado no Brasil para triagem multidimensional rápida da pessoa idosa.',
        defaultRecommendationHint: 'Idosos frágeis necessitam de Plano de Cuidado Individualizado e gerência de caso.',
      }
    }

    case 'gds15': {
      return {
        rangesTitle: 'Rastreio de Transtorno Depressivo no Idoso',
        ranges: [
          { label: 'Sem sintomas depressivos', range: '0 – 5 pontos', status: 'normal' },
          { label: 'Sintomas depressivos leves/moderados', range: '6 – 10 pontos', status: 'alerta' },
          { label: 'Sintomas depressivos graves', range: '11 – 15 pontos', status: 'alterado' },
        ],
        clinicalNote: 'Escore ≥ 6 exige avaliação clínica detalhada de humor, anedonia e ideação suicida.',
        defaultRecommendationHint: 'Avaliar psicoterapia, suporte psicossocial e tratamento farmacológico com ISRS se confirmado.',
      }
    }

    case 'meem': {
      return {
        rangesTitle: 'Rastreio Cognitivo no Idoso (Brucki et al.)',
        ranges: [
          { label: 'Declínio cognitivo importante', range: '< 18 pontos', status: 'alterado' },
          { label: 'Declínio cognitivo leve a moderado', range: '18 – 23 pontos', status: 'alerta' },
          { label: 'Cognição preservada', range: '≥ 24 pontos', status: 'normal' },
        ],
        clinicalNote: 'Os pontos de corte sofrem influência da escolaridade (analfabetos: corte em 20; escolarizados: 24 a 28).',
        defaultRecommendationHint: 'Investigar causas reversíveis (hipotireoidismo, deficiência de B12, depressão) e solicitar neuroimagem.',
      }
    }

    case 'moca': {
      return {
        rangesTitle: 'Rastreio de Comprometimento Cognitivo Leve',
        ranges: [
          { label: 'Comprometimento importante', range: '< 18 pontos', status: 'alterado' },
          { label: 'Comprometimento cognitivo leve (CCL)', range: '18 – 25 pontos', status: 'alerta' },
          { label: 'Preservado / Normal', range: '≥ 26 pontos', status: 'normal' },
        ],
        clinicalNote: 'Adicionar 1 ponto ao escore total para indivíduos com ≤ 12 anos de escolaridade formal.',
        defaultRecommendationHint: 'Acompanhamento neuropsicológico periódico e estímulo cognitivo.',
      }
    }

    case 'katz_escore': {
      return {
        rangesTitle: 'Grau de Independência Funcional Básica',
        ranges: [
          { label: 'Dependência importante', range: '0 – 3 pontos', status: 'alterado' },
          { label: 'Dependência moderada / parcial', range: '4 – 5 pontos', status: 'alerta' },
          { label: 'Totalmente Independente', range: '6 pontos', status: 'normal' },
        ],
        clinicalNote: 'Avalia: banho, vestir-se, higiene pessoal, transferência, continência e alimentação.',
        defaultRecommendationHint: 'Planejar suporte ao cuidador e adaptações ergonômicas no domicílio.',
      }
    }

    case 'lawton_escore': {
      return {
        rangesTitle: 'Autonomia para Vida em Comunidade',
        ranges: [
          { label: 'Dependência importante', range: '< 19 pontos', status: 'alterado' },
          { label: 'Dependência parcial', range: '19 – 26 pontos', status: 'alerta' },
          { label: 'Totalmente Independente', range: '27 pontos', status: 'normal' },
        ],
        clinicalNote: 'Avalia finanças, medicações, telefone, compras, transporte, tarefas domésticas.',
        defaultRecommendationHint: 'Atenção para risco de erros na administração de medicamentos e gestão financeira.',
      }
    }

    case 'man_escore': {
      return {
        rangesTitle: 'Triagem Nutricional Geriátrica',
        ranges: [
          { label: 'Desnutrido', range: '0 – 7 pontos', status: 'alterado' },
          { label: 'Risco de desnutrição', range: '8 – 11 pontos', status: 'alerta' },
          { label: 'Estado nutricional normal', range: '12 – 14 pontos', status: 'normal' },
        ],
        clinicalNote: 'A triagem identifica idosos que se beneficiam de intervenção dietética precoce.',
        defaultRecommendationHint: 'Avaliação odontológica para mastigação e plano hipercalórico/hiperproteico.',
      }
    }

    case 'numero_medicamentos': {
      return {
        rangesTitle: 'Avaliação de Polifarmácia no Idoso',
        ranges: [
          { label: 'Sem polifarmácia', range: '0 – 4 fármacos', status: 'normal' },
          { label: 'Polifarmácia', range: '5 – 9 fármacos', status: 'alerta' },
          { label: 'Hiperpolifarmácia', range: '≥ 10 fármacos', status: 'alterado' },
        ],
        clinicalNote: 'Revisar criteriosamente a necessidade de cada fármaco aplicando critérios de Beers / STOPP-START.',
        defaultRecommendationHint: 'Planejar desprescrição orientada e simplificação posológica.',
      }
    }

    case 'numero_quedas': {
      return {
        rangesTitle: 'Histórico de Quedas e Risco Recorrente',
        ranges: [
          { label: 'Nenhuma queda', range: '0 quedas', status: 'normal' },
          { label: 'Queda isolada', range: '1 queda', status: 'alerta' },
          { label: 'Quedas recorrentes', range: '≥ 2 quedas', status: 'alterado' },
        ],
        clinicalNote: 'Quedas recorrentes justificam investigação de síncope, hipotensão ortostática, labirintopatia e visão.',
        defaultRecommendationHint: 'Adaptação do domicílio (retirada de tapetes, barras de apoio) e avaliação de densidade mineral óssea.',
      }
    }

    case 'peso_nascimento': {
      return {
        rangesTitle: 'Classificação Ponderal ao Nascimento (Ministério da Saúde)',
        ranges: [
          { label: 'Muito baixo peso', range: '< 1500 g', status: 'alterado' },
          { label: 'Baixo peso ao nascer', range: '1500 – 2499 g', status: 'alerta' },
          { label: 'Peso adequado ao nascer', range: '2500 – 4000 g', status: 'normal' },
          { label: 'Macrossomia fetal', range: '> 4000 g', status: 'alerta' },
        ],
        clinicalNote: 'O peso ao nascer é o preditor isolado mais importante da sobrevivência infantil.',
        defaultRecommendationHint: 'Acompanhar curva de recuperação de peso na 1ª semana de vida.',
      }
    }

    case 'ig_nascimento': {
      return {
        rangesTitle: 'Classificação por Maturidade Fetal (OMS)',
        ranges: [
          { label: 'Prematuro / Pré-termo', range: '< 37 semanas', status: 'alerta' },
          { label: 'A termo', range: '37 – 41 semanas', status: 'normal' },
          { label: 'Pós-termo', range: '≥ 42 semanas', status: 'alerta' },
        ],
        clinicalNote: 'Na puericultura, utilizar a idade corrigida para prematuros até os 2 anos de idade.',
        defaultRecommendationHint: 'Curvas de crescimento específicas (Fenton ou Intergrowth-21st) para pré-termos.',
      }
    }

    case 'tempo_tela': {
      return {
        rangesTitle: 'Diretrizes de Saúde Digital (SBP / OMS)',
        ranges: [
          { label: 'Recomendado / Seguro', range: '0 – 1 h/dia', status: 'normal' },
          { label: 'Limite tolerável', range: '2 h/dia', status: 'alerta' },
          { label: 'Tempo excessivo', range: '> 2 h/dia', status: 'alerta' },
        ],
        clinicalNote: 'A Sociedade Brasileira de Pediatria recomenda zero tela antes dos 2 anos de idade.',
        defaultRecommendationHint: 'Estimular brincadeiras ativas e estabelecer regras claras familiares para uso de mídias.',
      }
    }

    case 'pa_ortostatica_sistolica':
    case 'pa_ortostatica_diastolica': {
      return {
        rangesTitle: 'Consenso Internacional de Hipotensão Ortostática',
        ranges: [
          { label: 'Sem hipotensão ortostática', range: 'Queda de PAS < 20 e PAD < 10 mmHg', status: 'normal' },
          { label: 'Hipotensão Ortostática', range: 'Queda de PAS ≥ 20 ou PAD ≥ 10 mmHg', status: 'alterado' },
        ],
        clinicalNote: 'Medir a pressão após 5 minutos deitado/sentado e aos 3 minutos após ficar em pé.',
        defaultRecommendationHint: 'Orientar levantar-se lentamente, uso de meias elásticas e revisão de anti-hipertensivos.',
      }
    }

    // Campos qualitativos clínicos
    case 'pc_nascimento': {
      return {
        rangesTitle: 'Classificação Craniana Neonatal (OMS / SBP)',
        ranges: [
          { label: 'Microcefalia', range: '< 33.0 cm', status: 'alterado' },
          { label: 'Perímetro cefálico adequado', range: '33.0 – 37.0 cm', status: 'normal' },
          { label: 'Macrocefalia', range: '> 37.0 cm', status: 'alerta' },
        ],
        clinicalNote: 'Medir com fita métrica inextensível passando pela glabela e pela protuberância occipital externa.',
        defaultRecommendationHint: 'Rastrear infecções congênitas se microcefalia; avaliar ultrassom transfontanelar se macrocefalia.',
      }
    }

    case 'comprimento_nascimento': {
      return {
        rangesTitle: 'Classificação Estatural Neonatal (OMS / SBP)',
        ranges: [
          { label: 'Pequeno para IG (PIG)', range: '< 47.0 cm', status: 'alerta' },
          { label: 'Comprimento adequado (AIG)', range: '47.0 – 53.0 cm', status: 'normal' },
          { label: 'Grande para IG (GIG)', range: '> 53.0 cm', status: 'alerta' },
        ],
        clinicalNote: 'Avaliar com régua antropométrica infantil (antropômetro horizontal) em decúbito dorsal.',
        defaultRecommendationHint: 'Acompanhar a velocidade de crescimento linear nas consultas de puericultura.',
      }
    }

    case 'apgar': {
      return {
        rangesTitle: 'Adaptação e Vitalidade Neonatal Imediata',
        ranges: [
          { label: 'Depressão grave', range: '0 – 3 pontos', status: 'alterado' },
          { label: 'Depressão moderada', range: '4 – 6 pontos', status: 'alerta' },
          { label: 'Depressão leve', range: '7 pontos', status: 'alerta' },
          { label: 'Boa adaptação (Vigoroso)', range: '8 – 10 pontos', status: 'normal' },
        ],
        clinicalNote: 'Avalia frequência cardíaca, respiração, tônus muscular, irritabilidade reflexa e cor da pele.',
        defaultRecommendationHint: 'Apgar ≥ 8 no 5º minuto: incentivar contato pele a pele e aleitamento na primeira hora (Golden Hour).',
      }
    }

    case 'altura_uterina': {
      return {
        rangesTitle: 'Curva de Crescimento Uterino (Ministério da Saúde / CLAP)',
        ranges: [
          { label: 'Abaixo do esperado para IG', range: '< Percentil 10 / < 15 cm', status: 'alerta' },
          { label: 'Adequada para a IG', range: 'Percentil 10 – 90 / 15 – 38 cm', status: 'normal' },
          { label: 'Acima do esperado para IG', range: '> Percentil 90 / > 38 cm', status: 'alerta' },
        ],
        clinicalNote: 'Medir da borda superior da sínfise púbica ao fundo uterino com fita métrica flexível.',
        defaultRecommendationHint: 'AU discrepante (> 2 cm da IG) indica realização de ultrassonografia com dopplerfluxometria.',
      }
    }

    case 'dilatacao': {
      return {
        rangesTitle: 'Fases da Dilatação no Trabalho de Parto',
        ranges: [
          { label: 'Fase latente / Colo fechado', range: '0 – 3 cm', status: 'normal' },
          { label: 'Fase ativa de dilatação', range: '4 – 9 cm', status: 'normal' },
          { label: 'Dilatação total (Expulsivo)', range: '10 cm', status: 'normal' },
        ],
        clinicalNote: 'Avaliar associadamente o esvaecimento, a consistência do colo e a descida da apresentação fetal.',
        defaultRecommendationHint: 'Na fase ativa (≥ 4-5 cm), registrar a evolução horária no partograma e oferecer métodos de alívio da dor.',
      }
    }

    case 'forca_preensao': {
      const sexo = typeof values['sexo'] === 'string' ? values['sexo'].toLowerCase() : ''
      const isMasc = sexo.includes('masc')
      const isFem = sexo.includes('fem')
      return {
        rangesTitle: 'Critério Diagnóstico de Sarcopenia (EWGSOP2)',
        ranges: isMasc
          ? [
              { label: 'Força reduzida (Provável Sarcopenia)', range: '< 27.0 kg', status: 'alterado' },
              { label: 'Força preservada (Normal)', range: '≥ 27.0 kg', status: 'normal' },
            ]
          : isFem
          ? [
              { label: 'Força reduzida (Provável Sarcopenia)', range: '< 16.0 kg', status: 'alterado' },
              { label: 'Força preservada (Normal)', range: '≥ 16.0 kg', status: 'normal' },
            ]
          : [
              { label: 'Força reduzida (Sarcopenia)', range: '< 16 kg (F) / < 27 kg (M)', status: 'alterado' },
              { label: 'Força muscular preservada', range: '≥ 16 kg (F) / ≥ 27 kg (M)', status: 'normal' },
            ],
        clinicalNote: 'Medir com dinamômetro na mão dominante, com cotovelo a 90°. Registrar a maior de 3 tentativas.',
        defaultRecommendationHint: 'Indicação de treino físico resistido com exercícios de sobrecarga progressiva e suplementação proteica.',
      }
    }

    case 'fluencia_verbal': {
      return {
        rangesTitle: 'Rastreio de Função Executiva e Memória Semântica',
        ranges: [
          { label: 'Comprometida (Déficit importante)', range: '< 9 animais', status: 'alterado' },
          { label: 'Limítrofe / Normal para baixa escolaridade', range: '9 – 12 animais', status: 'alerta' },
          { label: 'Normal / Preservada', range: '≥ 13 animais', status: 'normal' },
        ],
        clinicalNote: 'Ditar o maior número possível de animais em 1 minuto. Sofre forte influência da escolaridade.',
        defaultRecommendationHint: 'Em desempenhos < 9, realizar avaliação neuropsicológica e descartar causas secundárias de declínio cognitivo.',
      }
    }
  }

  return null
}

/**
 * Avalia o valor atual de um campo e retorna a avaliação clínica completa.
 */
export function evaluateFieldReference(
  fieldId: string,
  value: FieldValue | undefined,
  values: Values,
  templateId?: string,
): ReferenceEvaluation | null {
  if (getCategoricalDefinition(fieldId)) return evaluateCategorical(fieldId, value)
  const evaluation = evaluateNumeric(fieldId, value, values, templateId)
  return evaluation && STATUS_ONLY_IDS.has(fieldId) ? { ...evaluation, statusOnly: true } : evaluation
}

function evaluateNumeric(
  fieldId: string,
  value: FieldValue | undefined,
  values: Values,
  templateId?: string,
): ReferenceEvaluation | null {
  const info = buildNumericInfo(fieldId, values, templateId)
  if (!info) return null

  // 1. IMC (campo calculado ou a partir de peso/altura)
  if (fieldId === 'imc') {
    const peso = parseNumFromValues(values, 'peso')
    const alturaCm = parseNumFromValues(values, 'altura')
    if (!peso || !alturaCm) return null
    const m = alturaCm > 3 ? alturaCm / 100 : alturaCm
    if (m <= 0) return null
    const valor = peso / (m * m)
    if (!Number.isFinite(valor) || valor <= 0 || valor > 200) return null

    const formatted = `${valor.toFixed(1)} kg/m²`

    if (templateId === 'idoso') {
      let status: ReferenceStatus
      let classification: string
      let activeRangeIdx: number
      let recHint: string

      if (valor < 22.0) {
        status = 'alerta'
        classification = 'Baixo peso no idoso'
        activeRangeIdx = 0
        recHint = 'Pesquisar causas de desnutrição e perda de peso; solicitar rastreio com MAN e planejar aporte hiperproteico.'
      } else if (valor <= 27.0) {
        status = 'normal'
        classification = 'Eutrófico (Peso adequado)'
        activeRangeIdx = 1
        recHint = 'Manter hábitos de vida saudáveis e acompanhamento nutricional preventivo anual.'
      } else {
        status = 'alerta'
        classification = 'Sobrepeso no idoso'
        activeRangeIdx = 2
        recHint = 'Avaliar impacto sobre mobilidade articular e comorbidades; priorizar preservação de massa muscular em dietas.'
      }

      return {
        status,
        statusLabel: getStatusLabel(status),
        classification,
        currentValueFormatted: formatted,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint: recHint,
      }
    }

    if (templateId === 'crianca') {
      let status: ReferenceStatus
      let classification: string
      let activeRangeIdx: number
      let recHint: string

      if (valor < 13.5) {
        status = 'alterado'
        classification = 'Magreza acentuada (Pediatria)'
        activeRangeIdx = 0
        recHint = 'Pesquisar desnutrição infantil, aporte calórico inadequado e síndrome de má absorção.'
      } else if (valor < 15.0) {
        status = 'alerta'
        classification = 'Magreza (Pediatria)'
        activeRangeIdx = 1
        recHint = 'Orientação nutricional e acompanhamento na curva de IMC/idade da Caderneta de Saúde da Criança.'
      } else if (valor <= 18.5) {
        status = 'normal'
        classification = 'Eutrófico (Adequado para pediatria)'
        activeRangeIdx = 2
        recHint = 'Manter alimentação balanceada, estímulo a brincadeiras ativas e monitoramento periódico do crescimento.'
      } else if (valor <= 21.0) {
        status = 'alerta'
        classification = 'Risco de sobrepeso (Pediatria)'
        activeRangeIdx = 3
        recHint = 'Revisar consumo de ultraprocessados, bebidas açucaradas e tempo de tela sedentário.'
      } else {
        status = 'alterado'
        classification = 'Obesidade infantil'
        activeRangeIdx = 4
        recHint = 'Abordagem multidisciplinar familiar com pediatra e nutricionista para mudança de hábitos de vida.'
      }

      return {
        status,
        statusLabel: getStatusLabel(status),
        classification,
        currentValueFormatted: formatted,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint: recHint,
      }
    }

    if (templateId === 'gestante') {
      let status: ReferenceStatus
      let classification: string
      let activeRangeIdx: number
      let recHint: string

      if (valor < 18.5) {
        status = 'alerta'
        classification = 'Baixo peso gestacional (Atalah)'
        activeRangeIdx = 0
        recHint = 'Meta de ganho ponderal gestacional total de 12.5 a 18 kg; aporte calórico orientado.'
      } else if (valor <= 25.0) {
        status = 'normal'
        classification = 'Eutrófica na gestação (Atalah)'
        activeRangeIdx = 1
        recHint = 'Meta de ganho ponderal gestacional total de 11.5 a 16 kg com dieta balanceada.'
      } else if (valor <= 30.0) {
        status = 'alerta'
        classification = 'Sobrepeso gestacional (Atalah)'
        activeRangeIdx = 2
        recHint = 'Meta de ganho ponderal gestacional total de 7 a 11.5 kg; monitorar PA e curva glicêmica.'
      } else {
        status = 'alterado'
        classification = 'Obesidade gestacional (Atalah)'
        activeRangeIdx = 3
        recHint = 'Meta de ganho de 5 a 9 kg; vigilância intensiva para pré-eclâmpsia, DMG e macrossomia fetal.'
      }

      return {
        status,
        statusLabel: getStatusLabel(status),
        classification,
        currentValueFormatted: formatted,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint: recHint,
      }
    }

    // Adulto padrão
    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (valor < 18.5) {
      status = 'alerta'
      classification = 'Baixo peso'
      activeRangeIdx = 0
      recHint = 'Investigar déficit nutricional, neoplasias ocultas, hipertireoidismo e hábitos alimentares.'
    } else if (valor < 25.0) {
      status = 'normal'
      classification = 'Eutrófico (Peso normal)'
      activeRangeIdx = 1
      recHint = 'Incentivar continuidade da rotina de atividade física (≥ 150 min/semana) e dieta equilibrada.'
    } else if (valor < 30.0) {
      status = 'alerta'
      classification = 'Sobrepeso'
      activeRangeIdx = 2
      recHint = 'Orientação nutricional para prevenção de ganho ponderal e rastreio precoce de dislipidemia/diabetes.'
    } else if (valor < 35.0) {
      status = 'alterado'
      classification = 'Obesidade Grau I'
      activeRangeIdx = 3
      recHint = 'Plano terapêutico estruturado: meta de perda de 5 a 10% do peso corporal, rastreio metabólico completo.'
    } else if (valor < 40.0) {
      status = 'alterado'
      classification = 'Obesidade Grau II (Severa)'
      activeRangeIdx = 4
      recHint = 'Avaliação de comorbidades graves (apneia do sono, esteatose, hipertensão) e abordagem multiprofissional.'
    } else {
      status = 'alterado'
      classification = 'Obesidade Grau III (Mórbida)'
      activeRangeIdx = 5
      recHint = 'Alto risco cardiometabólico; avaliar elegibilidade para tratamento farmacológico intensivo ou cirurgia bariátrica.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 2. Pressão Sistólica
  if (fieldId === 'pa_sistolica') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} mmHg`

    if (templateId === 'gestante') {
      let status: ReferenceStatus
      let classification: string
      let activeRangeIdx: number
      let recHint: string

      if (n < 90) {
        status = 'alerta'
        classification = 'Hipotensão'
        activeRangeIdx = 0
        recHint = 'Orientar fracionamento das refeições, hidratação adequada e mudanças posturais lentas.'
      } else if (n < 120) {
        status = 'normal'
        classification = 'Pressão Arterial Normal'
        activeRangeIdx = 1
        recHint = 'Manter acompanhamento pré-natal habitual com aferição em todas as consultas.'
      } else if (n < 140) {
        status = 'alerta'
        classification = 'Alerta / Pré-hipertensão'
        activeRangeIdx = 2
        recHint = 'Aumentar vigilância pressórica e orientar busca imediata de atendimento se cefaleia ou escotomas.'
      } else if (n < 160) {
        status = 'alterado'
        classification = 'Hipertensão na Gestação'
        activeRangeIdx = 3
        recHint = 'Solicitar proteinúria de 24h/relação P/C, enzimas hepáticas, creatinina e avaliar anti-hipertensivo (metildopa).'
      } else {
        status = 'alterado'
        classification = 'Hipertensão Grave (Emergência Obstétrica)'
        activeRangeIdx = 4
        recHint = 'Internação hospitalar imediata, controle pressórico urgente (hidralazina/labetalol) e prevenção de convulsões com sulfato de magnésio.'
      }

      return {
        status,
        statusLabel: getStatusLabel(status),
        classification,
        currentValueFormatted: formatted,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint: recHint,
      }
    }

    if (templateId === 'crianca') {
      let status: ReferenceStatus
      let classification: string
      let activeRangeIdx: number
      let recHint: string

      if (n < 80) {
        status = 'alterado'
        classification = 'Hipotensão na infância'
        activeRangeIdx = 0
        recHint = 'Sinal de choque hipovolêmico ou séptico pediátrico; avaliar expansão com cristaloides e perfusão.'
      } else if (n <= 110) {
        status = 'normal'
        classification = 'Pressão Sistólica Normal (Pediatria)'
        activeRangeIdx = 1
        recHint = 'Nível pressórico normal para a faixa pediátrica.'
      } else if (n <= 120) {
        status = 'alerta'
        classification = 'Pré-hipertensão pediátrica'
        activeRangeIdx = 2
        recHint = 'Reavaliar em consultas subsequentes com técnica adequada de aferição.'
      } else {
        status = 'alterado'
        classification = 'Hipertensão na Infância'
        activeRangeIdx = 3
        recHint = 'Investigar hipertensão secundária (renal/coarctação) e orientar redução de sódio.'
      }

      return {
        status,
        statusLabel: getStatusLabel(status),
        classification,
        currentValueFormatted: formatted,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint: recHint,
      }
    }

    // Adulto padrão
    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 90) {
      status = 'alerta'
      classification = 'Hipotensão sistólica'
      activeRangeIdx = 0
      recHint = 'Investigar desidratação, efeito adverso de medicamentos, hipovolemia ou infecção.'
    } else if (n < 130) {
      status = 'normal'
      classification = 'Pressão Sistólica Ótima / Normal'
      activeRangeIdx = 1
      recHint = 'Manter medidas de vida saudável (baixo consumo de sódio, atividade física).'
    } else if (n < 140) {
      status = 'alerta'
      classification = 'Pré-hipertensão'
      activeRangeIdx = 2
      recHint = 'Estimular intervenções não farmacológicas e reavaliar pressão arterial em 3 a 6 meses.'
    } else if (n < 180) {
      status = 'alterado'
      classification = n < 160 ? 'Hipertensão Estágio 1' : 'Hipertensão Estágio 2'
      activeRangeIdx = 3
      recHint = 'Confirmar com MAPA/MRPA se necessário; iniciar ou ajustar terapia farmacológica anti-hipertensiva.'
    } else {
      status = 'alterado'
      classification = 'Crise Hipertensiva / Estágio 3'
      activeRangeIdx = 4
      recHint = 'Avaliar presença de sintomas ou lesões em órgãos-alvo (encefalopatia, dor torácica, dispneia) para definir urgência vs emergência.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 3. Pressão Diastólica
  if (fieldId === 'pa_diastolica') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} mmHg`

    if (templateId === 'gestante') {
      let status: ReferenceStatus
      let classification: string
      let activeRangeIdx: number
      let recHint: string

      if (n < 60) {
        status = 'alerta'
        classification = 'Hipotensão diastólica'
        activeRangeIdx = 0
        recHint = 'Geralmente fisiológica devido à vasodilatação sistêmica na gestação; orientar hidratação.'
      } else if (n < 80) {
        status = 'normal'
        classification = 'PAD Normal'
        activeRangeIdx = 1
        recHint = 'Valores dentro da meta fisiológica de pré-natal.'
      } else if (n < 90) {
        status = 'alerta'
        classification = 'Atenção / Limítrofe'
        activeRangeIdx = 2
        recHint = 'Reavaliar no mesmo atendimento após repouso e monitorar sinais de pré-eclâmpsia.'
      } else if (n < 110) {
        status = 'alterado'
        classification = 'Hipertensão na Gestação'
        activeRangeIdx = 3
        recHint = 'Investigar proteinúria e encaminhar para acompanhamento em pré-natal de alto risco.'
      } else {
        status = 'alterado'
        classification = 'Hipertensão Diastólica Grave'
        activeRangeIdx = 4
        recHint = 'Conduta de emergência obstétrica hospitalar imediata com anti-hipertensivo venoso e sulfatação.'
      }

      return {
        status,
        statusLabel: getStatusLabel(status),
        classification,
        currentValueFormatted: formatted,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint: recHint,
      }
    }

    if (templateId === 'crianca') {
      let status: ReferenceStatus
      let classification: string
      let activeRangeIdx: number
      let recHint: string

      if (n < 50) {
        status = 'alterado'
        classification = 'Hipotensão diastólica pediátrica'
        activeRangeIdx = 0
        recHint = 'Atenção para vasodilatação excessiva ou choque distributivo.'
      } else if (n <= 75) {
        status = 'normal'
        classification = 'PAD Normal (Pediatria)'
        activeRangeIdx = 1
        recHint = 'Valores normais para idade e estatura.'
      } else {
        status = 'alterado'
        classification = 'PAD elevada em pediatria'
        activeRangeIdx = 2
        recHint = 'Investigação clínica pediátrica detalhada.'
      }

      return {
        status,
        statusLabel: getStatusLabel(status),
        classification,
        currentValueFormatted: formatted,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint: recHint,
      }
    }

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 60) {
      status = 'alerta'
      classification = 'Hipotensão diastólica'
      activeRangeIdx = 0
      recHint = 'Observar em idosos com aterosclerose (pressão de pulso ampla); cuidado com hipoperfusão coronária.'
    } else if (n < 85) {
      status = 'normal'
      classification = 'PAD Ótima / Normal'
      activeRangeIdx = 1
      recHint = 'Manter medidas de preservação de saúde cardiovascular.'
    } else if (n < 90) {
      status = 'alerta'
      classification = 'Pré-hipertensão'
      activeRangeIdx = 2
      recHint = 'Revisar hábitos de vida, consumo de bebidas alcoólicas e sódio.'
    } else if (n < 110) {
      status = 'alterado'
      classification = 'Hipertensão'
      activeRangeIdx = 3
      recHint = 'Conduta conforme as Diretrizes de Hipertensão Arterial com estratificação de risco.'
    } else {
      status = 'alterado'
      classification = 'Crise Hipertensiva Diastólica'
      activeRangeIdx = 4
      recHint = 'Investigação clínica minuciosa para descartar complicações agudas.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 4. PAM
  if (fieldId === 'pam') {
    const sist = parseNumFromValues(values, 'pa_sistolica')
    const diast = parseNumFromValues(values, 'pa_diastolica')
    if (!sist || !diast) return null
    const pamVal = (sist + 2 * diast) / 3
    if (!Number.isFinite(pamVal)) return null
    const rounded = Math.round(pamVal)
    const formatted = `${rounded} mmHg`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (rounded < 70) {
      status = 'alterado'
      classification = 'Hipoperfusão tecidual'
      activeRangeIdx = 0
      recHint = 'Restauração volêmica ou suporte vasoativo para manter PAM ≥ 65–70 mmHg.'
    } else if (rounded <= 105) {
      status = 'normal'
      classification = 'Perfusão adequada'
      activeRangeIdx = 1
      recHint = 'Autorregulação do fluxo sanguíneo em níveis ideais.'
    } else if (rounded <= 125) {
      status = 'alerta'
      classification = 'PAM elevada'
      activeRangeIdx = 2
      recHint = 'Otimizar controle da pressão arterial sistólica e diastólica.'
    } else {
      status = 'alterado'
      classification = 'PAM crítica / Muito alta'
      activeRangeIdx = 3
      recHint = 'Risco elevado de encefalopatia e lesão endotelial aguda; redução gradual e controlada.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 5. Frequência Cardíaca
  if (fieldId === 'fc') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} bpm`

    if (templateId === 'crianca') {
      // A faixa normal depende da idade (linha da tabela): sem a data de nascimento
      // não há como dizer qual linha vale, então nenhuma é destacada.
      const meses = idadeEmMeses(values)
      const bandIdx = meses === null ? -1 : meses < 12 ? 0 : meses < 72 ? 1 : meses < 156 ? 2 : 3
      const [min, max] = [[100, 160], [80, 140], [70, 120], [60, 100]][bandIdx] ?? [60, 180]

      let status: ReferenceStatus = 'normal'
      let classification =
        bandIdx >= 0 ? 'Frequência normal para a faixa etária' : 'Dentro dos limites amplos da infância'
      let recHint =
        bandIdx >= 0
          ? 'Avaliar na curva pediátrica e correlacionar com o estado de agitação da criança.'
          : 'Informe a data de nascimento para classificar a frequência pela idade.'

      if (n < 60) {
        status = 'alterado'
        classification = 'Bradicardia importante na infância'
        recHint = 'Sinal de alarme para hipóxia grave ou hipotermia na criança.'
      } else if (n > 180) {
        status = 'alterado'
        classification = 'Taquicardia severa'
        recHint = 'Descartar arritmia (TPSV), choque ou sepse.'
      } else if (n < min) {
        status = 'alerta'
        classification = 'Bradicardia para a idade'
        recHint = 'Repetir a contagem com a criança calma; correlacionar com perfusão e nível de consciência.'
      } else if (n > max) {
        status = 'alerta'
        classification = 'Taquicardia para a idade'
        recHint = 'Pesquisar febre, dor, choro, desidratação e uso de broncodilatadores antes de valorizar.'
      }

      return {
        status,
        statusLabel: getStatusLabel(status),
        classification,
        currentValueFormatted: formatted,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === bandIdx })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint: recHint,
      }
    }

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 50) {
      status = 'alterado'
      classification = 'Bradicardia acentuada'
      activeRangeIdx = 0
      recHint = 'Realizar ECG para avaliar ritmo e bloqueios de condução; verificar betabloqueadores.'
    } else if (n < 60) {
      status = 'alerta'
      classification = 'Bradicardia leve'
      activeRangeIdx = 1
      recHint = 'Avaliar se assintomático em atletas ou se há queixa de tontura e fadiga.'
    } else if (n <= 100) {
      status = 'normal'
      classification = 'Normocárdico'
      activeRangeIdx = 2
      recHint = 'Frequência sinusal adequada em repouso.'
    } else if (n <= 120) {
      status = 'alerta'
      classification = 'Taquicardia leve'
      activeRangeIdx = 3
      recHint = 'Pesquisar gatilhos fisiológicos: dor, estresse, febre, cafeína ou desidratação.'
    } else {
      status = 'alterado'
      classification = 'Taquicardia acentuada'
      activeRangeIdx = 4
      recHint = 'ECG de 12 derivações para definição etiológica (taquiarritmia supraventricular vs ventricular).'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 6. Frequência Respiratória
  if (fieldId === 'fr') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} irpm`

    if (templateId === 'crianca') {
      // Limites da tabela por idade; sem a data de nascimento nenhuma linha é destacada.
      const meses = idadeEmMeses(values)
      const bandIdx = meses === null ? -1 : meses < 2 ? 0 : meses < 12 ? 1 : meses < 72 ? 2 : 3
      const [min, max] = [[0, 60], [0, 50], [0, 40], [15, 25]][bandIdx] ?? [0, 60]

      let status: ReferenceStatus = 'normal'
      let classification =
        bandIdx >= 0 ? 'Frequência respiratória normal para a idade' : 'Dentro dos limites amplos da infância'
      let recHint =
        bandIdx >= 0
          ? 'Manter observação de sinais de esforço ventilatório (tiragem, batimento de asa).'
          : 'Informe a data de nascimento para classificar a frequência pela idade.'

      if (n > 60) {
        status = 'alterado'
        classification = 'Taquipneia acentuada na infância'
        recHint = 'Avaliação imediata para desconforto respiratório grave (bronquiolite/pneumonia).'
      } else if (n < 10) {
        status = 'alterado'
        classification = 'Bradipneia grave na infância'
        recHint = 'Risco de parada respiratória: avaliação imediata e suporte ventilatório.'
      } else if (n > max) {
        status = 'alerta'
        classification = 'Taquipneia para a idade'
        recHint = 'Confirmar idade da criança e recontar por 1 minuto com a criança calma.'
      } else if (n < min) {
        status = 'alerta'
        classification = 'Bradipneia para a idade'
        recHint = 'Vigiar nível de consciência e padrão respiratório.'
      }

      return {
        status,
        statusLabel: getStatusLabel(status),
        classification,
        currentValueFormatted: formatted,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === bandIdx })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint: recHint,
      }
    }

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 10) {
      status = 'alterado'
      classification = 'Bradipneia grave'
      activeRangeIdx = 0
      recHint = 'Risco iminente de parada respiratória; investigar opioides, sedativos e rebaixamento de consciência.'
    } else if (n < 12) {
      status = 'alerta'
      classification = 'Bradipneia leve'
      activeRangeIdx = 1
      recHint = 'Vigiar nível de consciência e padrão respiratório.'
    } else if (n <= 20) {
      status = 'normal'
      classification = 'Eupneico (Normal)'
      activeRangeIdx = 2
      recHint = 'Ventilação normal sem sinais de sofrimento.'
    } else if (n <= 24) {
      status = 'alerta'
      classification = 'Taquipneia leve'
      activeRangeIdx = 3
      recHint = 'Monitorar oximetria de pulso e investigar dor ou ansiedade.'
    } else {
      status = 'alterado'
      classification = 'Taquipneia importante'
      activeRangeIdx = 4
      recHint = 'Sinal de alerta de sepse ou descompensação respiratória; pesquisar esforço muscular e gasometria.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 7. Temperatura
  if (fieldId === 'temperatura') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n.toFixed(1)} °C`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 35.0) {
      status = 'alterado'
      classification = 'Hipotermia moderada a grave'
      activeRangeIdx = 0
      recHint = 'Aquecimento ativo e busca de etiologia (sepse com hipotermia, hipotireoidismo, choque).'
    } else if (n < 35.5) {
      status = 'alerta'
      classification = 'Hipotermia leve'
      activeRangeIdx = 1
      recHint = 'Medidas de aquecimento passivo e monitoramento periódico.'
    } else if (n <= 37.2) {
      status = 'normal'
      classification = 'Afebril (Normotermia)'
      activeRangeIdx = 2
      recHint = 'Temperatura corporal dentro da faixa fisiológica.'
    } else if (n <= 37.7) {
      status = 'alerta'
      classification = 'Estado subfebril / Febrícula'
      activeRangeIdx = 3
      recHint = 'Monitorar evolução térmica e hidratação; evitar antipiréticos rotineiros sem desconforto.'
    } else if (n < 39.0) {
      status = 'alterado'
      classification = 'Febre'
      activeRangeIdx = 4
      recHint = 'Investigação do foco infeccioso; prescrever antitérmico (dipirona ou paracetamol) para conforto.'
    } else {
      status = 'alterado'
      classification = 'Febre alta / Hiperpirexia'
      activeRangeIdx = 5
      recHint = 'Medidas físicas e farmacológicas imediatas; atenção redobrada em lactentes e cardiopatas.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 8. SpO2
  if (fieldId === 'spo2') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n}%`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n >= 95) {
      status = 'normal'
      classification = 'Saturação de O₂ Normal'
      activeRangeIdx = 0
      recHint = 'Oxigenação tecidual plena.'
    } else if (n >= 93) {
      status = 'alerta'
      classification = 'Hipoxemia leve'
      activeRangeIdx = 1
      recHint = 'Atenção para patologias de base; em gestantes, valores < 95% requerem esclarecimento urgente.'
    } else if (n >= 90) {
      status = 'alterado'
      classification = 'Hipoxemia moderada'
      activeRangeIdx = 2
      recHint = 'Indicação provável de suporte oxigenatório com cânula nasal ou máscara.'
    } else {
      status = 'alterado'
      classification = 'Hipoxemia grave'
      activeRangeIdx = 3
      recHint = 'Oxigenoterapia em alto fluxo e vigilância para necessidade de ventilação mecânica.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 9. Glicemia Capilar
  if (fieldId === 'glicemia_capilar') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} mg/dL`
    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 70) {
      status = 'alterado'
      classification = 'Hipoglicemia'
      activeRangeIdx = 0
      recHint = 'Regra dos 15g de glicose VO se acordado, ou glicose 50% EV se rebaixamento; reavaliar em 15 min.'
    } else if (n < 100) {
      status = 'normal'
      classification = 'Glicemia normal em jejum'
      activeRangeIdx = 1
      recHint = 'Manter hábitos de vida saudáveis.'
    } else if (n < 140) {
      status = 'alerta'
      classification = 'Tolerância diminuída / Pós-prandial'
      activeRangeIdx = 2
      recHint = 'Normal se após refeição; se em jejum, sugere pré-diabetes necessitando de dosagem laboratorial.'
    } else if (n < 200) {
      status = 'alerta'
      classification = 'Glicemia elevada'
      activeRangeIdx = 3
      recHint = 'Investigar adesão medicamentosa e orientar adequação alimentar.'
    } else {
      status = 'alterado'
      classification = 'Hiperglicemia acentuada'
      activeRangeIdx = 4
      recHint = 'Investigar cetoacidose ou estado hiperosmolar se sintomas de náusea, vômito, poliúria e desidratação.'
    }
  

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 10. Escala de dor
  if (fieldId === 'dor_atual' || fieldId === 'dor_cronica' || fieldId === 'sintoma_intensidade') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n}/10`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n === 0) {
      status = 'normal'
      classification = 'Ausência de dor'
      activeRangeIdx = 0
      recHint = 'Sem necessidade de intervenção analgésica.'
    } else if (n <= 3) {
      status = 'normal'
      classification = 'Dor leve'
      activeRangeIdx = 1
      recHint = 'Analgésicos simples (dipirona ou paracetamol) se houver incômodo.'
    } else if (n <= 6) {
      status = 'alerta'
      classification = 'Dor moderada'
      activeRangeIdx = 2
      recHint = 'Considerar associação de AINEs ou opioide fraco (tramadol/codeína) se não houver contraindicação.'
    } else {
      status = 'alterado'
      classification = 'Dor intensa / Grave'
      activeRangeIdx = 3
      recHint = 'Analgesia potente com opioide, reavaliação periódica e identificação da causa subjacente.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 11. Circunferência Abdominal
  if (fieldId === 'circunferencia_abdominal') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} cm`
    const sexo = typeof values['sexo'] === 'string' ? values['sexo'].toLowerCase() : ''
    const isMasc = sexo.includes('masc')
    const isFem = sexo.includes('fem')

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (isMasc) {
      if (n < 94) {
        status = 'normal'
        classification = 'Risco cardiovascular habitual'
        activeRangeIdx = 0
        recHint = 'Circunferência dentro da meta de proteção cardiometabólica.'
      } else if (n <= 102) {
        status = 'alerta'
        classification = 'Risco cardiovascular aumentado'
        activeRangeIdx = 1
        recHint = 'Estimular perda de gordura visceral com redução calórica e exercícios aeróbicos.'
      } else {
        status = 'alterado'
        classification = 'Risco cardiovascular muito aumentado'
        activeRangeIdx = 2
        recHint = 'Alto risco de síndrome metabólica; rastrear esteatose hepática, dislipidemia e diabetes.'
      }
    } else if (isFem) {
      if (n < 80) {
        status = 'normal'
        classification = 'Risco cardiovascular habitual'
        activeRangeIdx = 0
        recHint = 'Circunferência dentro da meta de proteção cardiometabólica.'
      } else if (n <= 88) {
        status = 'alerta'
        classification = 'Risco cardiovascular aumentado'
        activeRangeIdx = 1
        recHint = 'Orientações nutricionais para redução da adiposidade abdominal.'
      } else {
        status = 'alterado'
        classification = 'Risco cardiovascular muito aumentado'
        activeRangeIdx = 2
        recHint = 'Estratificação de risco coronariano e controle metabólico intensivo.'
      }
    } else {
      if (n < 88) {
        status = 'normal'
        classification = 'Faixa habitual'
        activeRangeIdx = 0
        recHint = 'Manter medidas de preservação metabólica.'
      } else if (n <= 102) {
        status = 'alerta'
        classification = 'Risco metabólico aumentado'
        activeRangeIdx = 1
        recHint = 'Revisar hábitos dietéticos e nível de sedentarismo.'
      } else {
        status = 'alterado'
        classification = 'Risco metabólico muito aumentado'
        activeRangeIdx = 2
        recHint = 'Investigação aprofundada de fatores de risco cardiovascular.'
      }
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 12. Circunferência da panturrilha
  if (fieldId === 'circunferencia_panturrilha') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} cm`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n <= 31) {
      status = 'alterado'
      classification = 'Massa muscular reduzida (Risco de Sarcopenia)'
      activeRangeIdx = 0
      recHint = 'Avaliação nutricional para suplementação proteica e programa de exercícios resistidos de força.'
    } else {
      status = 'normal'
      classification = 'Massa muscular preservada'
      activeRangeIdx = 1
      recHint = 'Manter estímulo à mobilidade e consumo proteico adequado.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 13. BCF
  if (fieldId === 'bcf') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} bpm`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 110) {
      status = 'alterado'
      classification = 'Bradicardia fetal'
      activeRangeIdx = 0
      recHint = 'Colocar a mãe em decúbito lateral esquerdo, oxigênio suplementar e encaminhar imediatamente à maternidade.'
    } else if (n <= 160) {
      status = 'normal'
      classification = 'FCF basal normal'
      activeRangeIdx = 1
      recHint = 'Ausculta satisfatória que sugere vitalidade fetal preservada.'
    } else {
      status = 'alterado'
      classification = 'Taquicardia fetal'
      activeRangeIdx = 2
      recHint = 'Verificar temperatura materna e foco infeccioso (corioamnionite); repetir ausculta e avaliar cardiotocografia.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 14. TEC
  if (fieldId === 'tec') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n} s`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n <= 2) {
      status = 'normal'
      classification = 'Perfusão periférica normal'
      activeRangeIdx = 0
      recHint = 'Enchimento capilar rápido compatível com boa perfusão distal.'
    } else {
      status = 'alterado'
      classification = 'Perfusão lentificada'
      activeRangeIdx = 1
      recHint = 'Investigar desidratação, hipotermia, choque circulatório e sinais de má perfusão central.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 15. Glasgow
  if (fieldId === 'glasgow') {
    const n = parseNum(value)
    if (n === null || n < 3 || n > 15) return null
    const formatted = `${n}/15`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n === 15) {
      status = 'normal'
      classification = 'Consciência preservada'
      activeRangeIdx = 0
      recHint = 'Sem déficits de abertura ocular, resposta verbal ou motora.'
    } else if (n >= 13) {
      status = 'alerta'
      classification = 'Rebaixamento leve / TCE leve'
      activeRangeIdx = 1
      recHint = 'Monitorização neurológica seriada a cada 1 a 2 horas.'
    } else if (n >= 9) {
      status = 'alterado'
      classification = 'Rebaixamento moderado / TCE moderado'
      activeRangeIdx = 2
      recHint = 'Indicação de TC de crânio urgente e monitorização em leito de alta vigilância.'
    } else {
      status = 'alterado'
      classification = 'Coma / TCE grave'
      activeRangeIdx = 3
      recHint = 'Indicação mandatória de intubação orotraqueal e proteção definitiva de via aérea.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 16. Carga Tabágica
  if (fieldId === 'carga_tabagica') {
    const cig = parseNumFromValues(values, 'cigarros_dia')
    const anos = parseNumFromValues(values, 'anos_fumo')
    if (cig === null || anos === null) return null
    const carga = (cig / 20) * anos
    if (!Number.isFinite(carga)) return null
    const formatted = `${carga.toFixed(1)} maços/ano`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (carga === 0) {
      status = 'normal'
      classification = 'Não tabagista'
      activeRangeIdx = 0
      recHint = 'Incentivar manutenção do não tabagismo.'
    } else if (carga < 20) {
      status = 'alerta'
      classification = 'Carga tabágica leve/moderada'
      activeRangeIdx = 1
      recHint = 'Aconselhamento breve para cessação do tabagismo e avaliação de dependência nicotínica.'
    } else {
      status = 'alterado'
      classification = 'Carga tabágica elevada (Alto Risco)'
      activeRangeIdx = 2
      recHint = 'Indicação de rastreio de câncer de pulmão com TC de baixa dose e espirometria para pesquisa de DPOC.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  // 17. Escores Geriátricos
  if (fieldId === 'timed_up_go') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} s`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 10) {
      status = 'normal'
      classification = 'Independência plena'
      activeRangeIdx = 0
      recHint = 'Excelente mobilidade; incentivar atividade física continuada.'
    } else if (n < 12) {
      status = 'normal'
      classification = 'Boa mobilidade'
      activeRangeIdx = 1
      recHint = 'Baixo risco de quedas; manter acompanhamento de rotina.'
    } else if (n < 20) {
      status = 'alerta'
      classification = 'Risco aumentado de quedas'
      activeRangeIdx = 2
      recHint = 'Prescrever treino de equilíbrio, fortalecimento muscular e rever calçados/psicofármacos.'
    } else {
      status = 'alterado'
      classification = 'Alto risco de quedas e dependência'
      activeRangeIdx = 3
      recHint = 'Encaminhamento urgente para fisioterapia motora e adequação dos fatores de risco no domicílio.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'velocidade_marcha') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} m/s`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 0.8) {
      status = 'alterado'
      classification = 'Lentidão da marcha (Critério de Fragilidade)'
      activeRangeIdx = 0
      recHint = 'Investigar sarcopenia e desnutrição; indicar fisioterapia motora precoce.'
    } else {
      status = 'normal'
      classification = 'Velocidade normal de marcha'
      activeRangeIdx = 1
      recHint = 'Manter estímulo à deambulação diária e exercícios aeróbicos.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'ivcf20') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n}/40`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n <= 6) {
      status = 'normal'
      classification = 'Idoso Robusto'
      activeRangeIdx = 0
      recHint = 'Atenção primária com foco em prevenção e rastreios usuais.'
    } else if (n <= 14) {
      status = 'alerta'
      classification = 'Idoso Pré-frágil'
      activeRangeIdx = 1
      recHint = 'Intervenções multidimensionais focadas nos domínios pontuados para evitar transição para fragilidade.'
    } else {
      status = 'alterado'
      classification = 'Idoso Frágil'
      activeRangeIdx = 2
      recHint = 'Plano de cuidado individualizado com equipe multidisciplinar e metas alinhadas à funcionalidade.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'gds15') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n}/15`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n <= 5) {
      status = 'normal'
      classification = 'Sem sintomas depressivos'
      activeRangeIdx = 0
      recHint = 'Manter engajamento em atividades prazerosas e vida social ativa.'
    } else if (n <= 10) {
      status = 'alerta'
      classification = 'Sintomas depressivos leves/moderados'
      activeRangeIdx = 1
      recHint = 'Avaliação psiquiátrica/psicológica detalhada e apoio emocional.'
    } else {
      status = 'alterado'
      classification = 'Sintomas depressivos graves'
      activeRangeIdx = 2
      recHint = 'Atenção imediata para risco de suicídio e início de tratamento estruturado.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'meem') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n}/30`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 18) {
      status = 'alterado'
      classification = 'Declínio cognitivo importante'
      activeRangeIdx = 0
      recHint = 'Investigação etiológica completa de demência (exames laboratoriais, neuroimagem).'
    } else if (n < 24) {
      status = 'alerta'
      classification = 'Declínio cognitivo leve a moderado'
      activeRangeIdx = 1
      recHint = 'Confirmar se escore é coerente com o nível de escolaridade formal; testar MoCA.'
    } else {
      status = 'normal'
      classification = 'Cognição preservada'
      activeRangeIdx = 2
      recHint = 'Desempenho compatível com a normalidade para idosos escolarizados.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'moca') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n}/30`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 18) {
      status = 'alterado'
      classification = 'Comprometimento cognitivo moderado a severo'
      activeRangeIdx = 0
      recHint = 'Investigação clínica de síndrome demencial e suporte familiar.'
    } else if (n < 26) {
      status = 'alerta'
      classification = 'Comprometimento Cognitivo Leve (CCL)'
      activeRangeIdx = 1
      recHint = 'Estimulação cognitiva estruturada e controle de fatores de risco cardiovasculares.'
    } else {
      status = 'normal'
      classification = 'Desempenho cognitivo normal'
      activeRangeIdx = 2
      recHint = 'Funções executivas e memória preservadas.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'katz_escore') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n}/6`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n <= 3) {
      status = 'alterado'
      classification = 'Dependência importante nas ABVD'
      activeRangeIdx = 0
      recHint = 'Suporte integral ao autocuidado e prevenção de sobrecarga do cuidador.'
    } else if (n <= 5) {
      status = 'alerta'
      classification = 'Dependência parcial'
      activeRangeIdx = 1
      recHint = 'Estimular que o paciente realize as tarefas possíveis de forma autônoma para evitar desuso.'
    } else {
      status = 'normal'
      classification = 'Totalmente Independente'
      activeRangeIdx = 2
      recHint = 'Autonomia preservada em todas as atividades básicas.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'lawton_escore') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n}/27`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 19) {
      status = 'alterado'
      classification = 'Dependência importante nas AIVD'
      activeRangeIdx = 0
      recHint = 'Auxílio necessário para gerência financeira, medicações e compras.'
    } else if (n < 27) {
      status = 'alerta'
      classification = 'Dependência parcial'
      activeRangeIdx = 1
      recHint = 'Supervisão de tarefas complexas como controle de prescrições farmacológicas.'
    } else {
      status = 'normal'
      classification = 'Totalmente Independente'
      activeRangeIdx = 2
      recHint = 'Autonomia plena para vida comunitária.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'man_escore') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n}/14`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n <= 7) {
      status = 'alterado'
      classification = 'Desnutrido'
      activeRangeIdx = 0
      recHint = 'Plano de intervenção nutricional prioritário com aporte calórico-proteico supervisionado.'
    } else if (n <= 11) {
      status = 'alerta'
      classification = 'Risco de desnutrição'
      activeRangeIdx = 1
      recHint = 'Ajuste de consistência alimentar e vigilância ponderal quinzenal.'
    } else {
      status = 'normal'
      classification = 'Estado nutricional normal'
      activeRangeIdx = 2
      recHint = 'Alimentação adequada e ingestão hídrica satisfatória.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'numero_medicamentos') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n} medicamento(s)`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 5) {
      status = 'normal'
      classification = 'Sem polifarmácia'
      activeRangeIdx = 0
      recHint = 'Prescrições controladas; revisar adesão e efeitos colaterais.'
    } else if (n < 10) {
      status = 'alerta'
      classification = 'Polifarmácia (≥ 5 fármacos)'
      activeRangeIdx = 1
      recHint = 'Avaliar medicamentos potencialmente inapropriados pelos critérios de Beers / STOPP.'
    } else {
      status = 'alterado'
      classification = 'Hiperpolifarmácia (≥ 10 fármacos)'
      activeRangeIdx = 2
      recHint = 'Revisão sistemática de desprescrição urgente para evitar cascata iatrogênica.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'numero_quedas') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n} queda(s)`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n === 0) {
      status = 'normal'
      classification = 'Sem quedas no último ano'
      activeRangeIdx = 0
      recHint = 'Orientações preventivas habituais.'
    } else if (n === 1) {
      status = 'alerta'
      classification = 'Queda isolada'
      activeRangeIdx = 1
      recHint = 'Investigar fatores extrínsecos (iluminação, tapetes) e intrínsecos (tontura, sapatos).'
    } else {
      status = 'alterado'
      classification = 'Quedas recorrentes'
      activeRangeIdx = 2
      recHint = 'Avaliação geriátrica e motora ampla com foco em prevenção de fraturas de fêmur.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'peso_nascimento') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} g`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 1500) {
      status = 'alterado'
      classification = 'Muito baixo peso ao nascer'
      activeRangeIdx = 0
      recHint = 'Acompanhamento pediátrico intensivo e vigilância do neurodesenvolvimento.'
    } else if (n < 2500) {
      status = 'alerta'
      classification = 'Baixo peso ao nascer'
      activeRangeIdx = 1
      recHint = 'Apoio ao aleitamento materno e monitoramento do ganho ponderal.'
    } else if (n <= 4000) {
      status = 'normal'
      classification = 'Peso adequado ao nascer'
      activeRangeIdx = 2
      recHint = 'Excelente peso de nascimento; incentivar aleitamento exclusivo.'
    } else {
      status = 'alerta'
      classification = 'Macrossomia fetal'
      activeRangeIdx = 3
      recHint = 'Vigiar glicemia neonatal e investigar diabetes gestacional prévio.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'ig_nascimento') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} semanas`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 37) {
      status = 'alerta'
      classification = 'Prematuro / Pré-termo'
      activeRangeIdx = 0
      recHint = 'Utilizar idade gestacional corrigida para marcos do desenvolvimento.'
    } else if (n < 42) {
      status = 'normal'
      classification = 'A termo'
      activeRangeIdx = 1
      recHint = 'Maturidade gestacional adequada.'
    } else {
      status = 'alerta'
      classification = 'Pós-termo'
      activeRangeIdx = 2
      recHint = 'Atenção para descamação cutânea e vigilância pós-natal.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'tempo_tela') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n} hora(s)/dia`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n <= 1) {
      status = 'normal'
      classification = 'Tempo de tela adequado'
      activeRangeIdx = 0
      recHint = 'Parabéns à família pelo controle do uso de dispositivos eletrônicos.'
    } else if (n <= 2) {
      status = 'alerta'
      classification = 'Limite tolerável'
      activeRangeIdx = 1
      recHint = 'Não exceder 2h diárias e evitar telas antes de dormir ou durante refeições.'
    } else {
      status = 'alerta'
      classification = 'Tempo excessivo de tela'
      activeRangeIdx = 2
      recHint = 'Risco aumentado de sedentarismo e transtornos de sono; estabelecer combinados de desconexão.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'pa_ortostatica_sistolica' || fieldId === 'pa_ortostatica_diastolica') {
    const sistSentado = parseNumFromValues(values, 'pa_sistolica')
    const diastSentado = parseNumFromValues(values, 'pa_diastolica')
    const sistEmPe = parseNumFromValues(values, 'pa_ortostatica_sistolica')
    const diastEmPe = parseNumFromValues(values, 'pa_ortostatica_diastolica')

    const valorAtual = fieldId === 'pa_ortostatica_sistolica' ? sistEmPe : diastEmPe
    if (valorAtual === null) return null
    const formatted = `${valorAtual} mmHg`

    let status: ReferenceStatus = 'normal'
    let classification = 'Sem hipotensão ortostática'
    let activeRangeIdx = 0
    let recHint = 'Variação pressórica fisiológica na ortostase.'

    if (sistSentado !== null && sistEmPe !== null) {
      const quedaPAS = sistSentado - sistEmPe
      if (quedaPAS >= 20) {
        status = 'alterado'
        classification = `Hipotensão Ortostática (queda de ${quedaPAS} mmHg na PAS)`
        activeRangeIdx = 1
        recHint = 'Investigar desidratação, anti-hipertensivos em dose excessiva, diuréticos e orientar cautela ao levantar.'
      }
    }

    if (diastSentado !== null && diastEmPe !== null && status !== 'alterado') {
      const quedaPAD = diastSentado - diastEmPe
      if (quedaPAD >= 10) {
        status = 'alterado'
        classification = `Hipotensão Ortostática (queda de ${quedaPAD} mmHg na PAD)`
        activeRangeIdx = 1
        recHint = 'Investigar disautonomia e orientar transições posturais graduais.'
      }
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'pc_nascimento') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n.toFixed(1)} cm`
    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 33.0) {
      status = 'alterado'
      classification = 'Microcefalia (PC < 33 cm)'
      activeRangeIdx = 0
      recHint = 'Investigar infecções congênitas (sífilis, toxoplasmose, CMV, rubéola, zika) e fatores genéticos.'
    } else if (n <= 37.0) {
      status = 'normal'
      classification = 'Perímetro cefálico adequado'
      activeRangeIdx = 1
      recHint = 'Acompanhar curva de crescimento craniano na Caderneta da Criança.'
    } else {
      status = 'alerta'
      classification = 'Macrocefalia (PC > 37 cm)'
      activeRangeIdx = 2
      recHint = 'Pesquisar histórico familiar, hidrocefalia e realizar ultrassonografia transfontanelar se indicado.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'comprimento_nascimento') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n.toFixed(1)} cm`
    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 47.0) {
      status = 'alerta'
      classification = 'Pequeno para Idade Gestacional (PIG)'
      activeRangeIdx = 0
      recHint = 'Vigilância rigorosa do crescimento estatural e da velocidade de crescimento (catch-up growth).'
    } else if (n <= 53.0) {
      status = 'normal'
      classification = 'Comprimento adequado ao nascer'
      activeRangeIdx = 1
      recHint = 'Manter aleitamento materno e acompanhamento na puericultura.'
    } else {
      status = 'alerta'
      classification = 'Grande para Idade Gestacional (GIG)'
      activeRangeIdx = 2
      recHint = 'Investigar diabetes gestacional materno e monitorar glicemia capilar neonatal.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'apgar') {
    if (value === undefined || value === null) return null
    const strVal = String(value).trim()
    if (!strVal) return null
    const matches = strVal.match(/\d+/g)
    if (!matches || matches.length === 0) return null
    const score5min = Number(matches[matches.length > 1 ? 1 : 0])
    const scoreAvaliado = Math.min(score5min, 10)

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (scoreAvaliado <= 3) {
      status = 'alterado'
      classification = `Depressão grave ao nascer (Apgar ${strVal})`
      activeRangeIdx = 0
      recHint = 'Reanimação neonatal avançada em sala de parto e cuidados intensivos pós-asfixia.'
    } else if (scoreAvaliado <= 6) {
      status = 'alerta'
      classification = `Depressão moderada ao nascer (Apgar ${strVal})`
      activeRangeIdx = 1
      recHint = 'Oxigenoterapia, aquecimento ativo e monitorização de padrão ventilatório.'
    } else if (scoreAvaliado === 7) {
      status = 'alerta'
      classification = `Depressão leve (Apgar ${strVal})`
      activeRangeIdx = 2
      recHint = 'Vigilância da transição neonatal imediata e repetição se necessário.'
    } else {
      status = 'normal'
      classification = `Boa vitalidade neonatal (Apgar ${strVal})`
      activeRangeIdx = 3
      recHint = 'Contato pele a pele com a mãe e estímulo ao aleitamento materno na primeira hora (Golden Hour).'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: strVal,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'altura_uterina') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} cm`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 15) {
      status = 'alerta'
      classification = 'Altura uterina reduzida para a IG'
      activeRangeIdx = 0
      recHint = 'Investigar restrição de crescimento intrauterino (RCIU) ou oligoidrâmnio através de USG obstétrica.'
    } else if (n > 38) {
      status = 'alerta'
      classification = 'Altura uterina aumentada para a IG'
      activeRangeIdx = 2
      recHint = 'Solicitar ultrassonografia para investigar polidrâmnio, macrossomia ou gestação gemelar.'
    } else {
      status = 'normal'
      classification = 'Altura uterina adequada (P10–P90)'
      activeRangeIdx = 1
      recHint = 'Crescimento uterino fisiológico satisfatório.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'dilatacao') {
    const n = parseNum(value)
    if (n === null || n < 0 || n > 10) return null
    const formatted = `${n} cm`

    let status: ReferenceStatus = 'normal'
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 4) {
      classification = 'Fase latente / Colo fechado'
      activeRangeIdx = 0
      recHint = 'Incentivar deambulação, banho morno e analgesia não farmacológica.'
    } else if (n < 10) {
      classification = 'Fase ativa do trabalho de parto'
      activeRangeIdx = 1
      recHint = 'Acompanhamento do partograma e ausculta da frequência cardíaca fetal.'
    } else {
      classification = 'Dilatação total (10 cm) — Período expulsivo'
      activeRangeIdx = 2
      recHint = 'Período expulsivo: apoiar parturiente nos puxos e paramentação para assistência ao parto.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'forca_preensao') {
    const n = parseNum(value)
    if (n === null || n <= 0) return null
    const formatted = `${n} kg`
    const sexo = typeof values['sexo'] === 'string' ? values['sexo'].toLowerCase() : ''
    const isMasc = sexo.includes('masc')
    const corte = isMasc ? 27 : 16
    const isReduzida = n < corte

    const status: ReferenceStatus = isReduzida ? 'alterado' : 'normal'
    const classification = isReduzida
      ? `Força reduzida — Provável Sarcopenia (< ${corte} kg)`
      : `Força de preensão preservada (≥ ${corte} kg)`
    const activeRangeIdx = isReduzida ? 0 : 1
    const recHint = isReduzida
      ? 'Indicação de exercícios de treinamento resistido progressivo e aporte nutricional proteico (1.2–1.5 g/kg/dia).'
      : 'Força muscular adequada para funcionalidade e independência.'

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  if (fieldId === 'fluencia_verbal') {
    const n = parseNum(value)
    if (n === null || n < 0) return null
    const formatted = `${n} animais/min`

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (n < 9) {
      status = 'alterado'
      classification = 'Fluência semântica comprometida (< 9)'
      activeRangeIdx = 0
      recHint = 'Desempenho abaixo do ponto de corte até para analfabetos; investigar causas reversíveis e demência.'
    } else if (n < 13) {
      status = 'alerta'
      classification = 'Fluência limítrofe (9 a 12 animais)'
      activeRangeIdx = 1
      recHint = 'Normal para idosos não escolarizados; em indivíduos escolarizados sugere déficit executivo inicial.'
    } else {
      status = 'normal'
      classification = 'Fluência semântica normal (≥ 13)'
      activeRangeIdx = 2
      recHint = 'Memória semântica e velocidade de processamento preservadas.'
    }

    return {
      status,
      statusLabel: getStatusLabel(status),
      classification,
      currentValueFormatted: formatted,
      rangesTitle: info.rangesTitle,
      ranges: info.ranges.map((r, i) => ({ ...r, isCurrent: i === activeRangeIdx })),
      clinicalNote: info.clinicalNote,
      futureRecommendationHint: recHint,
    }
  }

  return null
}
