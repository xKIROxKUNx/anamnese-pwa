import type { FieldValue, Values } from '../types/anamnese'

export type ReferenceStatus = 'normal' | 'alerta' | 'alterado'

export interface ReferenceRangeItem {
  label: string
  range: string
  status: ReferenceStatus
  isCurrent?: boolean
  description?: string
}

export interface ReferenceEvaluation {
  fieldId: string
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
  fieldId: string
  title: string
  unit?: string
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
  switch (fieldId) {
    case 'imc': {
      if (templateId === 'idoso') {
        return {
          fieldId,
          title: 'Índice de Massa Corporal (IMC) — Idoso',
          unit: 'kg/m²',
          rangesTitle: 'Classificação segundo Lipschitz / OPAS / Ministério da Saúde',
          ranges: [
            { label: 'Baixo peso', range: '< 22.0 kg/m²', status: 'alerta', description: 'Risco de sarcopenia e desnutrição' },
            { label: 'Eutrófico (Adequado)', range: '22.0 – 27.0 kg/m²', status: 'normal', description: 'Faixa com menor morbimortalidade' },
            { label: 'Sobrepeso', range: '> 27.0 kg/m²', status: 'alerta', description: 'Risco cardiovascular e osteoarticular' },
          ],
          clinicalNote: 'Para pessoas idosas (≥ 60 anos), a faixa eutrófica é de 22 a 27 kg/m² para preservar reserva metabólica contra fragilidade.',
          defaultRecommendationHint: 'Recomendações nutricionais voltadas à manutenção de massa muscular e densidade mineral óssea.',
        }
      }
      if (templateId === 'crianca') {
        return {
          fieldId,
          title: 'Índice de Massa Corporal (IMC) — Pediatria (OMS / SBP)',
          unit: 'kg/m²',
          rangesTitle: 'Curvas de Crescimento Pediátrico da OMS (Escore Z / Percentil)',
          ranges: [
            { label: 'Magreza acentuada', range: '< Escore Z -3', status: 'alterado', description: 'Desnutrição grave / déficit ponderal acentuado' },
            { label: 'Magreza', range: 'Escore Z -3 a -2', status: 'alerta', description: 'Abaixo do peso esperado para idade e sexo' },
            { label: 'Eutrófico (Adequado)', range: 'Escore Z -2 a +1', status: 'normal', description: 'Peso e desenvolvimento corporal adequados' },
            { label: 'Risco de sobrepeso', range: 'Escore Z +1 a +2', status: 'alerta', description: 'Atenção para orientação nutricional e hábitos ativos' },
            { label: 'Obesidade infantil', range: '> Escore Z +2', status: 'alterado', description: 'Risco aumentado de comorbidades metabólicas' },
          ],
          clinicalNote: 'Em crianças e adolescentes (0–19 anos), o IMC deve ser interpretado pelas curvas de percentil e escore Z da OMS conforme idade e sexo.',
          defaultRecommendationHint: 'Avaliar curva de ganho ponderal, aleitamento/alimentação complementar e rotina de atividades ativas.',
        }
      }
      if (templateId === 'gestante') {
        return {
          fieldId,
          title: 'Índice de Massa Corporal (IMC) — Gestante (Atalah / MS)',
          unit: 'kg/m²',
          rangesTitle: 'Classificação Nutricional da Gestante segundo Atalah / Ministério da Saúde',
          ranges: [
            { label: 'Baixo peso', range: '< 18.5 – 20.0 kg/m²', status: 'alerta', description: 'Risco de baixo peso ao nascer e prematuridade' },
            { label: 'Adequado (Eutrófico)', range: '18.5 – 25.0 kg/m² (início)', status: 'normal', description: 'Faixa com menor índice de intercorrências gestacionais' },
            { label: 'Sobrepeso', range: '25.0 – 30.0 kg/m²', status: 'alerta', description: 'Atenção para risco de macrossomia e pré-eclâmpsia' },
            { label: 'Obesidade', range: '≥ 30.0 kg/m²', status: 'alterado', description: 'Alto risco de diabetes gestacional e hipertensão' },
          ],
          clinicalNote: 'A avaliação nutricional na gestação deve considerar a idade gestacional na curva de Atalah do Ministério da Saúde.',
          defaultRecommendationHint: 'Orientar ganho ponderal adequado conforme o estado nutricional inicial.',
        }
      }
      return {
        fieldId,
        title: 'Índice de Massa Corporal (IMC) — Adulto',
        unit: 'kg/m²',
        rangesTitle: 'Classificação segundo a Organização Mundial da Saúde (OMS)',
        ranges: [
          { label: 'Baixo peso', range: '< 18.5 kg/m²', status: 'alerta', description: 'Abaixo do peso ideal' },
          { label: 'Eutrófico (Peso normal)', range: '18.5 – 24.9 kg/m²', status: 'normal', description: 'Faixa recomendada' },
          { label: 'Sobrepeso', range: '25.0 – 29.9 kg/m²', status: 'alerta', description: 'Pré-obesidade' },
          { label: 'Obesidade Grau I', range: '30.0 – 34.9 kg/m²', status: 'alterado', description: 'Risco aumentado de comorbidades' },
          { label: 'Obesidade Grau II', range: '35.0 – 39.9 kg/m²', status: 'alterado', description: 'Obesidade severa' },
          { label: 'Obesidade Grau III', range: '≥ 40.0 kg/m²', status: 'alterado', description: 'Obesidade mórbida / alto risco' },
        ],
        clinicalNote: 'O IMC é calculado como peso (kg) dividido pelo quadrado da altura (m²).',
        defaultRecommendationHint: 'Orientação dietética, prática regular de atividade física e estratificação de risco cardiometabólico.',
      }
    }

    case 'pa_sistolica': {
      if (templateId === 'gestante') {
        return {
          fieldId,
          title: 'Pressão Arterial Sistólica — Gestante',
          unit: 'mmHg',
          rangesTitle: 'Valores de referência no Pré-Natal (FEBRASGO / Ministério da Saúde)',
          ranges: [
            { label: 'Hipotensão', range: '< 90 mmHg', status: 'alerta', description: 'Atenção a sintomas de tontura e lipotimia' },
            { label: 'Pressão Normal', range: '90 – 119 mmHg', status: 'normal', description: 'Níveis pressóricos habituais na gestação' },
            { label: 'Alerta / Pré-hipertensão', range: '120 – 139 mmHg', status: 'alerta', description: 'Requer vigilância rigorosa' },
            { label: 'Hipertensão Gestacional', range: '140 – 159 mmHg', status: 'alterado', description: 'Investigação obrigatória de pré-eclâmpsia' },
            { label: 'Hipertensão Grave', range: '≥ 160 mmHg', status: 'alterado', description: 'Emergência obstétrica — risco iminente' },
          ],
          clinicalNote: 'Níveis de PAS ≥ 140 mmHg após a 20ª semana exigem pesquisa de proteinúria e sinais premonitórios de eclâmpsia.',
          defaultRecommendationHint: 'Solicitar proteinúria/relação proteína-creatinina, hemograma, plaquetas, enzimas hepáticas e repouso.',
        }
      }
      if (templateId === 'crianca') {
        return {
          fieldId,
          title: 'Pressão Arterial Sistólica — Pediatria (SBC / PALS)',
          unit: 'mmHg',
          rangesTitle: 'Percentis de PA na Infância (SBP / SBC / PALS)',
          ranges: [
            { label: 'Hipotensão pediátrica', range: '< 70 – 80 mmHg', status: 'alterado', description: 'Sinal de choque descompensado em pediatria' },
            { label: 'Pressão Sistólica Normal', range: '80 – 110 mmHg', status: 'normal', description: 'Faixa esperada na infância' },
            { label: 'Limítrofe / Pré-hipertensão', range: '111 – 120 mmHg', status: 'alerta', description: 'Percentil 90 a 95 para idade e sexo' },
            { label: 'Hipertensão na Infância', range: '> 120 mmHg', status: 'alterado', description: 'Percentil > 95 — investigar causas secundárias' },
          ],
          clinicalNote: 'Utilizar manguito com largura cobrindo 40% da circunferência do braço e comprimento cobrindo 80 a 100%.',
          defaultRecommendationHint: 'Aferir após 5 minutos de repouso com a criança calma e sentada.',
        }
      }
      return {
        fieldId,
        title: 'Pressão Arterial Sistólica (PAS)',
        unit: 'mmHg',
        rangesTitle: 'Diretrizes Brasileiras de Hipertensão Arterial (DBH / SBC)',
        ranges: [
          { label: 'Hipotensão', range: '< 90 mmHg', status: 'alerta', description: 'Investigar sintomas e causas secundárias' },
          { label: 'Ótima / Normal', range: '90 – 129 mmHg', status: 'normal', description: 'Pressão sistólica dentro da meta' },
          { label: 'Pré-hipertensão', range: '130 – 139 mmHg', status: 'alerta', description: 'Risco aumentado de evolução para HAS' },
          { label: 'Hipertensão Estágio 1 e 2', range: '140 – 179 mmHg', status: 'alterado', description: 'Diagnóstico e tratamento farmacológico' },
          { label: 'Crise Hipertensiva / Estágio 3', range: '≥ 180 mmHg', status: 'alterado', description: 'Emergência/urgência hipertensiva' },
        ],
        clinicalNote: 'Aferir após 5 minutos de repouso, com manguito adequado ao braço e bexiga vazia.',
        defaultRecommendationHint: 'Modificações de estilo de vida (dieta DASH, redução de sódio) e avaliação de lesões em órgãos-alvo.',
      }
    }

    case 'pa_diastolica': {
      if (templateId === 'gestante') {
        return {
          fieldId,
          title: 'Pressão Arterial Diastólica — Gestante',
          unit: 'mmHg',
          rangesTitle: 'Valores de referência no Pré-Natal (FEBRASGO)',
          ranges: [
            { label: 'Hipotensão', range: '< 60 mmHg', status: 'alerta', description: 'Pode ocorrer fisiologicamente no 2º trimestre' },
            { label: 'Pressão Normal', range: '60 – 79 mmHg', status: 'normal', description: 'Dentro da normalidade' },
            { label: 'Atenção', range: '80 – 89 mmHg', status: 'alerta', description: 'Elevação limítrofe da PAD' },
            { label: 'Hipertensão Gestacional', range: '90 – 109 mmHg', status: 'alterado', description: 'Critério diagnóstico para síndrome hipertensiva' },
            { label: 'Hipertensão Grave', range: '≥ 110 mmHg', status: 'alterado', description: 'Emergência obstétrica imediata' },
          ],
          clinicalNote: 'PAD ≥ 90 mmHg em duas medidas com intervalo de 4h define hipertensão na gestação.',
          defaultRecommendationHint: 'Encaminhamento para pré-natal de alto risco e vigilância materno-fetal contínua.',
        }
      }
      if (templateId === 'crianca') {
        return {
          fieldId,
          title: 'Pressão Arterial Diastólica — Pediatria (SBC / PALS)',
          unit: 'mmHg',
          rangesTitle: 'Percentis de PAD na Infância (SBP / SBC / PALS)',
          ranges: [
            { label: 'Hipotensão', range: '< 50 mmHg', status: 'alterado', description: 'Pressão diastólica baixa' },
            { label: 'Normal', range: '50 – 75 mmHg', status: 'normal', description: 'Faixa esperada' },
            { label: 'Elevada', range: '> 75 mmHg', status: 'alterado', description: 'PAD acima do percentil 95' },
          ],
          clinicalNote: 'Correlacionar com idade, sexo e percentil de estatura da criança.',
          defaultRecommendationHint: 'Confirmar em três ocasiões distintas se assintomática.',
        }
      }
      return {
        fieldId,
        title: 'Pressão Arterial Diastólica (PAD)',
        unit: 'mmHg',
        rangesTitle: 'Diretrizes Brasileiras de Hipertensão Arterial (DBH / SBC)',
        ranges: [
          { label: 'Hipotensão', range: '< 60 mmHg', status: 'alerta', description: 'Pressão diastólica baixa' },
          { label: 'Ótima / Normal', range: '60 – 84 mmHg', status: 'normal', description: 'Pressão diastólica adequada' },
          { label: 'Pré-hipertensão', range: '85 – 89 mmHg', status: 'alerta', description: 'Faixa limítrofe' },
          { label: 'Hipertensão Estágio 1 e 2', range: '90 – 109 mmHg', status: 'alterado', description: 'Nível hipertensivo' },
          { label: 'Crise Hipertensiva', range: '≥ 110 mmHg', status: 'alterado', description: 'Atenção para risco de lesão aguda' },
        ],
        clinicalNote: 'A PAD reflete a resistência vascular periférica nos momentos de relaxamento ventricular.',
        defaultRecommendationHint: 'Reavaliação ambulatorial e controle de fatores de risco associados.',
      }
    }

    case 'pam': {
      return {
        fieldId,
        title: 'Pressão Arterial Média (PAM)',
        unit: 'mmHg',
        rangesTitle: 'Perfusão Tecidual Sistêmica',
        ranges: [
          { label: 'Hipoperfusão tecidual', range: '< 70 mmHg', status: 'alterado', description: 'Perfusão de órgãos nobres comprometida' },
          { label: 'Perfusão adequada', range: '70 – 105 mmHg', status: 'normal', description: 'Faixa ideal de autorregulação vascular' },
          { label: 'Elevada', range: '106 – 125 mmHg', status: 'alerta', description: 'Sobrecarga hemodinâmica' },
          { label: 'Crítica / Muito alta', range: '> 125 mmHg', status: 'alterado', description: 'Risco de encefalopatia e lesão endotelial' },
        ],
        clinicalNote: 'Calculada pela fórmula: (PAS + 2 × PAD) ÷ 3.',
        defaultRecommendationHint: 'Manter PAM ≥ 65–70 mmHg para adequada perfusão cerebral, renal e coronariana.',
      }
    }

    case 'fc': {
      if (templateId === 'crianca') {
        return {
          fieldId,
          title: 'Frequência Cardíaca — Pediátrica',
          unit: 'bpm',
          rangesTitle: 'Valores normais por faixa etária (PALS / SBP)',
          ranges: [
            { label: 'Lactente (< 1 ano)', range: '100 – 160 bpm', status: 'normal', description: 'Faixa normal para lactentes' },
            { label: 'Pré-escolar (1–5 anos)', range: '80 – 140 bpm', status: 'normal', description: 'Faixa normal pré-escolar' },
            { label: 'Escolar (6–12 anos)', range: '70 – 120 bpm', status: 'normal', description: 'Faixa normal escolar' },
            { label: 'Adolescente (> 12 anos)', range: '60 – 100 bpm', status: 'normal', description: 'Padrão adulto' },
          ],
          clinicalNote: 'Avaliar com a criança calma. Febre, choro e agitação elevam a frequência cardíaca temporariamente.',
          defaultRecommendationHint: 'Correlacionar com temperatura axilar (aumento fisiológico de ~10 bpm por °C de febre).',
        }
      }
      return {
        fieldId,
        title: 'Frequência Cardíaca (FC)',
        unit: 'bpm',
        rangesTitle: 'Ritmo e Frequência Cardíaca no Adulto',
        ranges: [
          { label: 'Bradicardia importante', range: '< 50 bpm', status: 'alterado', description: 'Investigar bloqueios atrioventriculares e drogas' },
          { label: 'Bradicardia leve', range: '50 – 59 bpm', status: 'alerta', description: 'Comum em atletas ou uso de betabloqueadores' },
          { label: 'Normocárdico (Normal)', range: '60 – 100 bpm', status: 'normal', description: 'Frequência cardíaca esperada em repouso' },
          { label: 'Taquicardia leve', range: '101 – 120 bpm', status: 'alerta', description: 'Pesquisar dor, ansiedade, infecção ou desidratação' },
          { label: 'Taquicardia importante', range: '> 120 bpm', status: 'alterado', description: 'Investigar arritmias, sepse e tromboembolismo' },
        ],
        clinicalNote: 'Palpar pulso radial ou auscultar o precórdio por 60 segundos se o ritmo for irregular.',
        defaultRecommendationHint: 'Realizar ECG em caso de taqui ou bradiarritmias sintomáticas.',
      }
    }

    case 'fr': {
      if (templateId === 'crianca') {
        return {
          fieldId,
          title: 'Frequência Respiratória — Pediátrica',
          unit: 'irpm',
          rangesTitle: 'Valores máximos de FR na infância (OMS / SBP)',
          ranges: [
            { label: '< 2 meses', range: '≤ 60 irpm', status: 'normal', description: 'Limite superior de normalidade' },
            { label: '2 a 11 meses', range: '≤ 50 irpm', status: 'normal', description: 'Limite superior de normalidade' },
            { label: '1 a 5 anos', range: '≤ 40 irpm', status: 'normal', description: 'Limite superior de normalidade' },
            { label: '> 5 anos', range: '15 – 25 irpm', status: 'normal', description: 'Padrão escolar/adolescente' },
          ],
          clinicalNote: 'Contar as incursões respiratórias durante 1 minuto inteiro com a criança tranquila, preferencialmente dormindo.',
          defaultRecommendationHint: 'Taquipneia na criança é o sinal mais sensível para pneumonia e bronquiolite.',
        }
      }
      return {
        fieldId,
        title: 'Frequência Respiratória (FR)',
        unit: 'irpm',
        rangesTitle: 'Padrão Ventilatório no Adulto',
        ranges: [
          { label: 'Bradipneia grave', range: '< 10 irpm', status: 'alterado', description: 'Depressão respiratória / risco de hipoventilação' },
          { label: 'Bradipneia leve', range: '10 – 11 irpm', status: 'alerta', description: 'Observar sedação ou efeitos medicamentosos' },
          { label: 'Eupneico (Normal)', range: '12 – 20 irpm', status: 'normal', description: 'Respiração normal e confortável' },
          { label: 'Taquipneia leve', range: '21 – 24 irpm', status: 'alerta', description: 'Atenção para esforço compensatório' },
          { label: 'Taquipneia importante', range: '≥ 25 irpm', status: 'alterado', description: 'Insuficiência respiratória / sinal de sepse (qSOFA)' },
        ],
        clinicalNote: 'FR ≥ 22 irpm é um critério de triagem para gravidade em infecções pelo escore qSOFA.',
        defaultRecommendationHint: 'Avaliar oximetria de pulso, uso de musculatura acessória e ausculta pulmonar detalhada.',
      }
    }

    case 'temperatura': {
      return {
        fieldId,
        title: 'Temperatura Axilar',
        unit: '°C',
        rangesTitle: 'Termometria Clínica',
        ranges: [
          { label: 'Hipotermia moderada a grave', range: '< 35.0 °C', status: 'alterado', description: 'Aquecimento ativo e investigação urgente' },
          { label: 'Hipotermia leve', range: '35.0 – 35.4 °C', status: 'alerta', description: 'Exposição ao frio, desnutrição ou choque' },
          { label: 'Afebril (Normotermia)', range: '35.5 – 37.2 °C', status: 'normal', description: 'Temperatura corporal normal' },
          { label: 'Estado subfebril / Febrícula', range: '37.3 – 37.7 °C', status: 'alerta', description: 'Elevação inicial ou transfebril' },
          { label: 'Febre', range: '37.8 – 38.9 °C', status: 'alterado', description: 'Resposta inflamatória/infecciosa ativa' },
          { label: 'Febre alta / Hiperpirexia', range: '≥ 39.0 °C', status: 'alterado', description: 'Controle térmico imediato necessário' },
        ],
        clinicalNote: 'Secar a axila antes de posicionar o termômetro. Aguardar o sinal sonoro ou pelo menos 3 minutos.',
        defaultRecommendationHint: 'Em caso de febre, investigar foco infeccioso e considerar antipirético se desconforto.',
      }
    }

    case 'spo2': {
      return {
        fieldId,
        title: 'Saturação de Oxigênio (SpO₂)',
        unit: '%',
        rangesTitle: 'Oximetria de Pulso em Ar Ambiente',
        ranges: [
          { label: 'Normal / Adequada', range: '≥ 95%', status: 'normal', description: 'Oxigenação tecidual preservada' },
          { label: 'Hipoxemia leve', range: '93 – 94%', status: 'alerta', description: 'Atenção em pneumopatas e gestantes' },
          { label: 'Hipoxemia moderada', range: '90 – 92%', status: 'alterado', description: 'Necessidade provável de oxigenoterapia' },
          { label: 'Hipoxemia grave', range: '< 90%', status: 'alterado', description: 'Insuficiência respiratória aguda — urgência' },
        ],
        clinicalNote: 'Verificar perfusão periférica, temperatura da extremidade e esmalte de unhas que possam falsear a leitura.',
        defaultRecommendationHint: 'Oxigenoterapia titulada para alvo de 94–98% (ou 88–92% em pacientes com DPOC/hipercapnia).',
      }
    }

    case 'glicemia_capilar': {
      const isGestante = templateId === 'gestante'
      return {
        fieldId,
        title: isGestante ? 'Glicemia Capilar — Gestante' : 'Glicemia Capilar',
        unit: 'mg/dL',
        rangesTitle: isGestante
          ? 'Metas Glicêmicas na Gestação (SBD)'
          : 'Valores de Referência (Sociedade Brasileira de Diabetes)',
        ranges: isGestante
          ? [
              { label: 'Hipoglicemia', range: '< 70 mg/dL', status: 'alterado', description: 'Risco materno-fetal' },
              { label: 'Normal (Jejum)', range: '70 – 91 mg/dL', status: 'normal', description: 'Meta ótima no pré-natal' },
              { label: 'Alerta DMG (Jejum)', range: '92 – 125 mg/dL', status: 'alterado', description: 'Critério diagnóstico para Diabetes Gestacional' },
              { label: 'Hiperglicemia franca', range: '≥ 126 mg/dL', status: 'alterado', description: 'Critério de DM pré-gestacional' },
            ]
          : [
              { label: 'Hipoglicemia', range: '< 70 mg/dL', status: 'alterado', description: 'Requer correção imediata com glicose' },
              { label: 'Normal (Jejum)', range: '70 – 99 mg/dL', status: 'normal', description: 'Glicemia de jejum saudável' },
              { label: 'Tolerância diminuída / Pós-prandial', range: '100 – 139 mg/dL', status: 'alerta', description: 'Normal pós-refeição ou pré-diabetes se jejum' },
              { label: 'Elevada', range: '140 – 199 mg/dL', status: 'alerta', description: 'Glicemia alterada' },
              { label: 'Hiperglicemia acentuada', range: '≥ 200 mg/dL', status: 'alterado', description: 'Sugestivo de diabetes descompensado' },
            ],
        clinicalNote: 'Indagar sobre o tempo decorrido desde a última ingestão calórica (jejum vs pós-prandial).',
        defaultRecommendationHint: 'Corrigir hipoglicemia com regra dos 15g de carboidrato rápido; solicitar HbA1c se hiperglicemia.',
      }
    }

    case 'dor_atual':
    case 'dor_cronica':
    case 'sintoma_intensidade': {
      return {
        fieldId,
        title: 'Escala Visual Analógica / Numérica de Dor (0–10)',
        unit: '/10',
        rangesTitle: 'Graduação da Intensidade Dolorosa',
        ranges: [
          { label: 'Sem dor', range: '0', status: 'normal', description: 'Confortável e sem queixa álgica' },
          { label: 'Dor leve', range: '1 – 3', status: 'normal', description: 'Pouco interferente na rotina' },
          { label: 'Dor moderada', range: '4 – 6', status: 'alerta', description: 'Interfere nas atividades diárias' },
          { label: 'Dor intensa / Grave', range: '7 – 10', status: 'alterado', description: 'Incapacitante — requer analgesia eficaz' },
        ],
        clinicalNote: 'Classificação subjetiva conforme a percepção do paciente, servindo como guia para a escada analgésica.',
        defaultRecommendationHint: 'Adequar prescrição analgésica conforme a escada da OMS (não opioides, opioides fracos ou fortes).',
      }
    }

    case 'circunferencia_abdominal': {
      const sexo = typeof values['sexo'] === 'string' ? values['sexo'].toLowerCase() : ''
      const isMasc = sexo.includes('masc')
      const isFem = sexo.includes('fem') || templateId === 'gestante'
      return {
        fieldId,
        title: 'Circunferência Abdominal',
        unit: 'cm',
        rangesTitle: 'Risco Metabólico e Cardiovascular (IDF / OMS)',
        ranges: isMasc
          ? [
              { label: 'Risco habitual (Homens)', range: '< 94 cm', status: 'normal', description: 'Risco cardiovascular habitual' },
              { label: 'Risco aumentado', range: '94 – 102 cm', status: 'alerta', description: 'Risco cardiovascular elevado' },
              { label: 'Risco muito aumentado', range: '> 102 cm', status: 'alterado', description: 'Alto risco cardiometabólico' },
            ]
          : isFem
          ? [
              { label: 'Risco habitual (Mulheres)', range: '< 80 cm', status: 'normal', description: 'Risco cardiovascular habitual' },
              { label: 'Risco aumentado', range: '80 – 88 cm', status: 'alerta', description: 'Risco cardiovascular elevado' },
              { label: 'Risco muito aumentado', range: '> 88 cm', status: 'alterado', description: 'Alto risco cardiometabólico' },
            ]
          : [
              { label: 'Normal / Risco baixo', range: '< 80 cm (F) / < 94 cm (M)', status: 'normal', description: 'Faixa saudável' },
              { label: 'Risco aumentado', range: '80–88 cm (F) / 94–102 cm (M)', status: 'alerta', description: 'Atenção para síndrome metabólica' },
              { label: 'Risco muito aumentado', range: '> 88 cm (F) / > 102 cm (M)', status: 'alterado', description: 'Forte correlação com aterosclerose' },
            ],
        clinicalNote: 'Medir no ponto médio entre a crista ilíaca e a última costela, ao final de uma expiração normal.',
        defaultRecommendationHint: 'Estímulo a mudanças no estilo de vida com redução de gordura visceral.',
      }
    }

    case 'circunferencia_panturrilha': {
      return {
        fieldId,
        title: 'Circunferência da Panturrilha — Idoso',
        unit: 'cm',
        rangesTitle: 'Avaliação de Massa Muscular (EWGSOP / OPAS)',
        ranges: [
          { label: 'Massa muscular reduzida', range: '≤ 31 cm', status: 'alterado', description: 'Forte marcador de sarcopenia e desnutrição' },
          { label: 'Massa muscular preservada', range: '> 31 cm', status: 'normal', description: 'Dentro da normalidade no idoso' },
        ],
        clinicalNote: 'Medida na maior circunferência da perna não edemaciada, com o joelho fletido a 90°.',
        defaultRecommendationHint: 'Pesquisar força de preensão manual e considerar suplementação proteica associada a exercícios resistidos.',
      }
    }

    case 'bcf': {
      return {
        fieldId,
        title: 'Batimentos Cardiofetais (BCF)',
        unit: 'bpm',
        rangesTitle: 'Vitalidade Fetal Basal (FEBRASGO)',
        ranges: [
          { label: 'Bradicardia fetal', range: '< 110 bpm', status: 'alterado', description: 'Sinal de alarme para sofrimento fetal' },
          { label: 'FCF basal normal', range: '110 – 160 bpm', status: 'normal', description: 'Frequência basal fisiológica' },
          { label: 'Taquicardia fetal', range: '> 160 bpm', status: 'alterado', description: 'Investigar febre materna, infecção ou hipóxia' },
        ],
        clinicalNote: 'Auscultar com sonar Doppler durante 1 minuto completo no foco de melhor audibilidade (dorso fetal).',
        defaultRecommendationHint: 'Em alterações agudas, posicionar a gestante em decúbito lateral esquerdo, ofertar hidratação e reavaliar.',
      }
    }

    case 'tec': {
      return {
        fieldId,
        title: 'Tempo de Enchimento Capilar (TEC)',
        unit: 's',
        rangesTitle: 'Perfusão Periférica e Microcirculação',
        ranges: [
          { label: 'Perfusão preservada', range: '≤ 2 segundos', status: 'normal', description: 'Microcirculação adequada' },
          { label: 'Perfusão lentificada', range: '> 2 segundos', status: 'alterado', description: 'Sinal de choque, hipovolemia ou vasoconstrição' },
        ],
        clinicalNote: 'Pressionar a polpa digital ou leito ungueal por 5 segundos até clarear e cronometrar o retorno da cor rósea.',
        defaultRecommendationHint: 'Correlacionar com pressão arterial média, pulso e diurese para descartar estados de choque.',
      }
    }

    case 'glasgow': {
      return {
        fieldId,
        title: 'Escala de Coma de Glasgow',
        unit: '/15',
        rangesTitle: 'Nível de Consciência e Gravidade do TCE',
        ranges: [
          { label: 'Normal / Preservado', range: '15', status: 'normal', description: 'Consciência íntegra e orientada' },
          { label: 'Rebaixamento leve / TCE leve', range: '13 – 14', status: 'alerta', description: 'Observação neurológica rigorosa' },
          { label: 'Rebaixamento moderado / TCE moderado', range: '9 – 12', status: 'alterado', description: 'Tomografia de crânio e vigilância' },
          { label: 'Grave / Coma / TCE grave', range: '3 – 8', status: 'alterado', description: 'Indicação de via aérea definitiva (intubação)' },
        ],
        clinicalNote: 'Avalia abertura ocular (1-4), resposta verbal (1-5) e resposta motora (1-6).',
        defaultRecommendationHint: 'Glasgow ≤ 8 requer proteção imediata de via aérea com intubação orotraqueal.',
      }
    }

    case 'carga_tabagica': {
      return {
        fieldId,
        title: 'Carga Tabágica Acumulada',
        unit: 'maços/ano',
        rangesTitle: 'Estratificação de Risco Tabágico (SBPT / INCA)',
        ranges: [
          { label: 'Não tabagista', range: '0 maços/ano', status: 'normal', description: 'Sem exposição tabágica ativa' },
          { label: 'Carga leve a moderada', range: '> 0 e < 20 maços/ano', status: 'alerta', description: 'Risco proporcional ao consumo' },
          { label: 'Carga elevada (Alto Risco)', range: '≥ 20 maços/ano', status: 'alterado', description: 'Critério de rastreio para Câncer de Pulmão e DPOC' },
        ],
        clinicalNote: 'Calculado por: (cigarros consumidos por dia ÷ 20) × anos de tabagismo.',
        defaultRecommendationHint: 'Indicação de rastreamento com Tomografia de Tórax de baixa dose e espirometria para ≥ 20 maços/ano.',
      }
    }

    case 'timed_up_go': {
      return {
        fieldId,
        title: 'Timed Up and Go (TUG) — Idoso',
        unit: 's',
        rangesTitle: 'Avaliação de Mobilidade e Risco de Quedas (Podsiadlo)',
        ranges: [
          { label: 'Independente / Normal', range: '< 10 segundos', status: 'normal', description: 'Excelente mobilidade' },
          { label: 'Boa mobilidade', range: '10 – 11.9 segundos', status: 'normal', description: 'Baixo risco de quedas' },
          { label: 'Risco aumentado de quedas', range: '12 – 19.9 segundos', status: 'alerta', description: 'Mobilidade comprometida' },
          { label: 'Alto risco de quedas', range: '≥ 20 segundos', status: 'alterado', description: 'Déficit importante de equilíbrio e marcha' },
        ],
        clinicalNote: 'Tempo necessário para levantar da cadeira, caminhar 3 metros, virar, retornar e sentar-se.',
        defaultRecommendationHint: 'Encaminhamento para fisioterapia de equilíbrio e revisão de psicotrópicos em uso.',
      }
    }

    case 'velocidade_marcha': {
      return {
        fieldId,
        title: 'Velocidade da Marcha (4 metros) — Idoso',
        unit: 'm/s',
        rangesTitle: 'Marcador de Fragilidade Física (Fried / EWGSOP)',
        ranges: [
          { label: 'Lentidão da marcha', range: '< 0.8 m/s', status: 'alterado', description: 'Critério para fragilidade e sarcopenia' },
          { label: 'Velocidade preservada', range: '≥ 0.8 m/s', status: 'normal', description: 'Mobilidade adequada' },
        ],
        clinicalNote: 'Percurso de 4 metros em passo habitual. Velocidade < 0.8 m/s é preditor independente de mortalidade e dependência.',
        defaultRecommendationHint: 'Avaliação multiprofissional de reabilitação e estímulo ao treino resistido.',
      }
    }

    case 'ivcf20': {
      return {
        fieldId,
        title: 'Índice de Vulnerabilidade Clínico-Funcional (IVCF-20)',
        unit: '/40',
        rangesTitle: 'Estratificação de Fragilidade do Idoso',
        ranges: [
          { label: 'Idoso Robusto', range: '0 – 6 pontos', status: 'normal', description: 'Capacidade funcional plena' },
          { label: 'Em risco de fragilidade (Pré-frágil)', range: '7 – 14 pontos', status: 'alerta', description: 'Vulnerabilidade moderada' },
          { label: 'Idoso Frágil', range: '15 – 40 pontos', status: 'alterado', description: 'Alta vulnerabilidade e declínio funcional' },
        ],
        clinicalNote: 'Instrumento validado no Brasil para triagem multidimensional rápida da pessoa idosa.',
        defaultRecommendationHint: 'Idosos frágeis necessitam de Plano de Cuidado Individualizado e gerência de caso.',
      }
    }

    case 'gds15': {
      return {
        fieldId,
        title: 'Escala de Depressão Geriátrica (GDS-15)',
        unit: '/15',
        rangesTitle: 'Rastreio de Transtorno Depressivo no Idoso',
        ranges: [
          { label: 'Sem sintomas depressivos', range: '0 – 5 pontos', status: 'normal', description: 'Escore dentro do esperado' },
          { label: 'Sintomas depressivos leves/moderados', range: '6 – 10 pontos', status: 'alerta', description: 'Sugestivo de quadro depressivo' },
          { label: 'Sintomas depressivos graves', range: '11 – 15 pontos', status: 'alterado', description: 'Forte indicativo de depressão maior' },
        ],
        clinicalNote: 'Escore ≥ 6 exige avaliação clínica detalhada de humor, anedonia e ideação suicida.',
        defaultRecommendationHint: 'Avaliar psicoterapia, suporte psicossocial e tratamento farmacológico com ISRS se confirmado.',
      }
    }

    case 'meem': {
      return {
        fieldId,
        title: 'Mini Exame do Estado Mental (MEEM)',
        unit: '/30',
        rangesTitle: 'Rastreio Cognitivo no Idoso (Brucki et al.)',
        ranges: [
          { label: 'Declínio cognitivo importante', range: '< 18 pontos', status: 'alterado', description: 'Comprometimento significativo' },
          { label: 'Declínio cognitivo leve a moderado', range: '18 – 23 pontos', status: 'alerta', description: 'Atenção especial ao grau de escolaridade' },
          { label: 'Cognição preservada', range: '≥ 24 pontos', status: 'normal', description: 'Escore esperado para idosos escolarizados' },
        ],
        clinicalNote: 'Os pontos de corte sofrem influência da escolaridade (analfabetos: corte em 20; escolarizados: 24 a 28).',
        defaultRecommendationHint: 'Investigar causas reversíveis (hipotireoidismo, deficiência de B12, depressão) e solicitar neuroimagem.',
      }
    }

    case 'moca': {
      return {
        fieldId,
        title: 'Montreal Cognitive Assessment (MoCA)',
        unit: '/30',
        rangesTitle: 'Rastreio de Comprometimento Cognitivo Leve',
        ranges: [
          { label: 'Comprometimento importante', range: '< 18 pontos', status: 'alterado', description: 'Comprometimento cognitivo acentuado' },
          { label: 'Comprometimento cognitivo leve (CCL)', range: '18 – 25 pontos', status: 'alerta', description: 'Sugestivo de déficit inicial' },
          { label: 'Preservado / Normal', range: '≥ 26 pontos', status: 'normal', description: 'Desempenho cognitivo normal' },
        ],
        clinicalNote: 'Adicionar 1 ponto ao escore total para indivíduos com ≤ 12 anos de escolaridade formal.',
        defaultRecommendationHint: 'Acompanhamento neuropsicológico periódico e estímulo cognitivo.',
      }
    }

    case 'katz_escore': {
      return {
        fieldId,
        title: 'Índice de Katz (Atividades Básicas da Vida Diária)',
        unit: '/6',
        rangesTitle: 'Grau de Independência Funcional Básica',
        ranges: [
          { label: 'Dependência importante', range: '0 – 3 pontos', status: 'alterado', description: 'Necessita de auxílio contínuo de cuidador' },
          { label: 'Dependência moderada / parcial', range: '4 – 5 pontos', status: 'alerta', description: 'Dependência em poucas funções' },
          { label: 'Totalmente Independente', range: '6 pontos', status: 'normal', description: 'Autonomia preservada para autocuidado' },
        ],
        clinicalNote: 'Avalia: banho, vestir-se, higiene pessoal, transferência, continência e alimentação.',
        defaultRecommendationHint: 'Planejar suporte ao cuidador e adaptações ergonômicas no domicílio.',
      }
    }

    case 'lawton_escore': {
      return {
        fieldId,
        title: 'Escala de Lawton e Brody (Atividades Instrumentais)',
        unit: '/27',
        rangesTitle: 'Autonomia para Vida em Comunidade',
        ranges: [
          { label: 'Dependência importante', range: '< 19 pontos', status: 'alterado', description: 'Comprometimento expressivo da vida comunitária' },
          { label: 'Dependência parcial', range: '19 – 26 pontos', status: 'alerta', description: 'Dificuldade em tarefas complexas' },
          { label: 'Totalmente Independente', range: '27 pontos', status: 'normal', description: 'Autonomia plena para vida comunitária' },
        ],
        clinicalNote: 'Avalia finanças, medicações, telefone, compras, transporte, tarefas domésticas.',
        defaultRecommendationHint: 'Atenção para risco de erros na administração de medicamentos e gestão financeira.',
      }
    }

    case 'man_escore': {
      return {
        fieldId,
        title: 'Mini Avaliação Nutricional (MAN — Triagem)',
        unit: '/14',
        rangesTitle: 'Triagem Nutricional Geriátrica',
        ranges: [
          { label: 'Desnutrido', range: '0 – 7 pontos', status: 'alterado', description: 'Quadro de desnutrição instalado' },
          { label: 'Risco de desnutrição', range: '8 – 11 pontos', status: 'alerta', description: 'Alerta para perda de massa corporal' },
          { label: 'Estado nutricional normal', range: '12 – 14 pontos', status: 'normal', description: 'Nutrição preservada' },
        ],
        clinicalNote: 'A triagem identifica idosos que se beneficiam de intervenção dietética precoce.',
        defaultRecommendationHint: 'Avaliação odontológica para mastigação e plano hipercalórico/hiperproteico.',
      }
    }

    case 'numero_medicamentos': {
      return {
        fieldId,
        title: 'Número Total de Medicamentos de Uso Contínuo',
        unit: 'fármacos',
        rangesTitle: 'Avaliação de Polifarmácia no Idoso',
        ranges: [
          { label: 'Sem polifarmácia', range: '0 – 4 fármacos', status: 'normal', description: 'Número controlado de prescrições' },
          { label: 'Polifarmácia', range: '5 – 9 fármacos', status: 'alerta', description: 'Aumento expressivo do risco de interações e quedas' },
          { label: 'Hiperpolifarmácia', range: '≥ 10 fármacos', status: 'alterado', description: 'Alto risco de iatrogenia e reações adversas' },
        ],
        clinicalNote: 'Revisar criteriosamente a necessidade de cada fármaco aplicando critérios de Beers / STOPP-START.',
        defaultRecommendationHint: 'Planejar desprescrição orientada e simplificação posológica.',
      }
    }

    case 'numero_quedas': {
      return {
        fieldId,
        title: 'Quedas nos Últimos 12 Meses — Idoso',
        unit: 'quedas',
        rangesTitle: 'Histórico de Quedas e Risco Recorrente',
        ranges: [
          { label: 'Nenhuma queda', range: '0 quedas', status: 'normal', description: 'Sem evento registrado no último ano' },
          { label: 'Queda isolada', range: '1 queda', status: 'alerta', description: 'Alerta para investigação de causas ambientais ou clínicas' },
          { label: 'Quedas recorrentes', range: '≥ 2 quedas', status: 'alterado', description: 'Alto risco de novas quedas e fraturas graves' },
        ],
        clinicalNote: 'Quedas recorrentes justificam investigação de síncope, hipotensão ortostática, labirintopatia e visão.',
        defaultRecommendationHint: 'Adaptação do domicílio (retirada de tapetes, barras de apoio) e avaliação de densidade mineral óssea.',
      }
    }

    case 'peso_nascimento': {
      return {
        fieldId,
        title: 'Peso ao Nascer — Pediatria',
        unit: 'g',
        rangesTitle: 'Classificação Ponderal ao Nascimento (Ministério da Saúde)',
        ranges: [
          { label: 'Muito baixo peso', range: '< 1500 g', status: 'alterado', description: 'Risco aumentado de complicações neonatais' },
          { label: 'Baixo peso ao nascer', range: '1500 – 2499 g', status: 'alerta', description: 'Requer vigilância intensiva do ganho ponderal' },
          { label: 'Peso adequado ao nascer', range: '2500 – 4000 g', status: 'normal', description: 'Faixa fisiológica esperada' },
          { label: 'Macrossomia fetal', range: '> 4000 g', status: 'alerta', description: 'Risco de hipoglicemia neonatal e tocotraumatismo' },
        ],
        clinicalNote: 'O peso ao nascer é o preditor isolado mais importante da sobrevivência infantil.',
        defaultRecommendationHint: 'Acompanhar curva de recuperação de peso na 1ª semana de vida.',
      }
    }

    case 'ig_nascimento': {
      return {
        fieldId,
        title: 'Idade Gestacional ao Nascer',
        unit: 'semanas',
        rangesTitle: 'Classificação por Maturidade Fetal (OMS)',
        ranges: [
          { label: 'Prematuro / Pré-termo', range: '< 37 semanas', status: 'alerta', description: 'Imaturidade orgânica com necessidade de curva corrigida' },
          { label: 'A termo', range: '37 – 41 semanas', status: 'normal', description: 'Idade gestacional a termo' },
          { label: 'Pós-termo', range: '≥ 42 semanas', status: 'alerta', description: 'Risco de insuficiência placentária' },
        ],
        clinicalNote: 'Na puericultura, utilizar a idade corrigida para prematuros até os 2 anos de idade.',
        defaultRecommendationHint: 'Curvas de crescimento específicas (Fenton ou Intergrowth-21st) para pré-termos.',
      }
    }

    case 'tempo_tela': {
      return {
        fieldId,
        title: 'Tempo de Tela Diário — Pediátrico',
        unit: 'horas',
        rangesTitle: 'Diretrizes de Saúde Digital (SBP / OMS)',
        ranges: [
          { label: 'Recomendado / Seguro', range: '0 – 1 h/dia', status: 'normal', description: 'Faixa segura para o desenvolvimento' },
          { label: 'Limite tolerável', range: '2 h/dia', status: 'alerta', description: 'Limite aceitável para crianças maiores de 2 anos' },
          { label: 'Tempo excessivo', range: '> 2 h/dia', status: 'alerta', description: 'Associação com distúrbios de sono, atraso de fala e sedentarismo' },
        ],
        clinicalNote: 'A Sociedade Brasileira de Pediatria recomenda zero tela antes dos 2 anos de idade.',
        defaultRecommendationHint: 'Estimular brincadeiras ativas e estabelecer regras claras familiares para uso de mídias.',
      }
    }

    case 'pa_ortostatica_sistolica':
    case 'pa_ortostatica_diastolica': {
      return {
        fieldId,
        title: 'Pesquisa de Hipotensão Ortostática',
        unit: 'mmHg',
        rangesTitle: 'Consenso Internacional de Hipotensão Ortostática',
        ranges: [
          { label: 'Sem hipotensão ortostática', range: 'Queda de PAS < 20 e PAD < 10 mmHg', status: 'normal', description: 'Resposta barorreflexa adequada' },
          { label: 'Hipotensão Ortostática', range: 'Queda de PAS ≥ 20 ou PAD ≥ 10 mmHg', status: 'alterado', description: 'Forte causa de tontura, síncope e quedas no idoso' },
        ],
        clinicalNote: 'Medir a pressão após 5 minutos deitado/sentado e aos 3 minutos após ficar em pé.',
        defaultRecommendationHint: 'Orientar levantar-se lentamente, uso de meias elásticas e revisão de anti-hipertensivos.',
      }
    }

    // Campos qualitativos clínicos
    case 'estado_geral': {
      return {
        fieldId,
        title: 'Estado Geral',
        rangesTitle: 'Avaliação Clínica Global',
        ranges: [
          { label: 'Bom', range: 'Bom', status: 'normal', description: 'Paciente corado, hidratado e confortável' },
          { label: 'Regular', range: 'Regular', status: 'alerta', description: 'Sinais sutis de sofrimento ou descompensação' },
          { label: 'Grave', range: 'Grave', status: 'alterado', description: 'Instabilidade evidente ou risco iminente' },
        ],
        clinicalNote: 'Impressão semiológica global sintetizada nos primeiros instantes do exame.',
      }
    }

    case 'consciencia': {
      return {
        fieldId,
        title: 'Nível de Consciência',
        rangesTitle: 'Avaliação Neurológica',
        ranges: [
          { label: 'Lúcido e orientado', range: 'Lúcido e orientado', status: 'normal', description: 'Orientado no tempo e no espaço' },
          { label: 'Sonolento', range: 'Sonolento', status: 'alerta', description: 'Desperta com facilidade' },
          { label: 'Confuso', range: 'Confuso', status: 'alterado', description: 'Desorientação temporoespacial' },
          { label: 'Torporoso / Comatoso', range: 'Torporoso / Comatoso', status: 'alterado', description: 'Rebaixamento acentuado' },
        ],
        clinicalNote: 'Avaliar orientação em tempo, espaço e em relação a si mesmo.',
      }
    }

    case 'hidratacao': {
      return {
        fieldId,
        title: 'Grau de Hidratação',
        rangesTitle: 'Balanço Hídrico Clínico',
        ranges: [
          { label: 'Hidratado', range: 'Hidratado', status: 'normal', description: 'Turgor e umidade preservados' },
          { label: 'Desidratado +', range: 'Desidratado +', status: 'alerta', description: 'Desidratação leve' },
          { label: 'Desidratado ++ a +++', range: 'Desidratado ++ / +++', status: 'alterado', description: 'Desidratação moderada a grave' },
        ],
        clinicalNote: 'Avaliar turgor da pele, umidade das mucosas, olhos encovados e fontanela (em lactentes).',
      }
    }

    case 'ictericia':
    case 'edema':
    case 'edema_mmii': {
      return {
        fieldId,
        title: fieldId === 'ictericia' ? 'Icterícia' : 'Edema',
        rangesTitle: 'Graduação Semiológica em Cruzes (+ a ++++)',
        ranges: [
          { label: 'Ausente', range: 'Ausente', status: 'normal', description: 'Sem alteração visual ou de sinal de Godet' },
          { label: '+/4', range: '+/4', status: 'alerta', description: 'Alteração leve' },
          { label: '++/4 a ++++/4', range: '++/4 a ++++/4', status: 'alterado', description: 'Comprometimento moderado a acentuado' },
        ],
        clinicalNote: 'Na icterícia avaliar escleras e freio lingual. No edema testar sinal do cacifo/Godet.',
      }
    }

    case 'cianose': {
      return {
        fieldId,
        title: 'Cianose',
        rangesTitle: 'Perfusão e Oxigenação Periférica/Central',
        ranges: [
          { label: 'Ausente', range: 'Ausente', status: 'normal', description: 'Coloração cutaneomucosa normal' },
          { label: 'Periférica', range: 'Periférica', status: 'alerta', description: 'Geralmente relacionada a frio ou estase venosa' },
          { label: 'Central', range: 'Central', status: 'alterado', description: 'Dessaturação arterial grave de O₂' },
        ],
        clinicalNote: 'Cianose central afeta lábios e língua, indicando hipoxemia importante.',
      }
    }

    case 'gravidade': {
      return {
        fieldId,
        title: 'Estabilidade e Gravidade Clínica',
        rangesTitle: 'Risco Imediato de Degradação',
        ranges: [
          { label: 'Estável', range: 'Estável', status: 'normal', description: 'Sem ameaça imediata à vida' },
          { label: 'Potencialmente grave', range: 'Potencialmente grave', status: 'alerta', description: 'Necessidade de monitorização contínua' },
          { label: 'Grave / Instável', range: 'Grave / Instável', status: 'alterado', description: 'Risco iminente de colapso orgânico' },
        ],
        clinicalNote: 'Sintetiza a prioridade de atendimento e necessidade de leito monitorizado.',
      }
    }

    case 'classificacao_risco': {
      return {
        fieldId,
        title: 'Classificação de Risco (Protocolo Manchester)',
        rangesTitle: 'Tempo Alvo para Atendimento Médico',
        ranges: [
          { label: 'Azul — não urgente', range: 'Azul', status: 'normal', description: 'Atendimento ambulatorial eletivo' },
          { label: 'Verde — pouco urgente', range: 'Verde', status: 'normal', description: 'Pouco urgente (até 2 horas)' },
          { label: 'Amarelo — urgente', range: 'Amarelo', status: 'alerta', description: 'Urgente (até 60 minutos)' },
          { label: 'Laranja — muito urgente', range: 'Laranja', status: 'alterado', description: 'Muito urgente (até 10 minutos)' },
          { label: 'Vermelho — emergência', range: 'Vermelho', status: 'alterado', description: 'Emergência absoluta (imediato)' },
        ],
        clinicalNote: 'Protocolo de acolhimento e classificação de risco para priorização baseada em critérios clínicos.',
      }
    }

    case 'vitalidade_fetal': {
      return {
        fieldId,
        title: 'Vitalidade Fetal',
        rangesTitle: 'Avaliação Obstétrica do Bem-Estar Fetal',
        ranges: [
          { label: 'Preservada', range: 'Preservada', status: 'normal', description: 'BCF, movimentos fetais e USG normais' },
          { label: 'Duvidosa', range: 'Duvidosa', status: 'alerta', description: 'Necessidade de exames biofísicos complementares' },
          { label: 'Comprometida', range: 'Comprometida', status: 'alterado', description: 'Sofrimento fetal — conduta resolutiva urgente' },
        ],
        clinicalNote: 'Avaliada pelo conjunto de ausculta, movimentação fetal e perfil biofísico.',
      }
    }

    case 'risco_gestacional': {
      return {
        fieldId,
        title: 'Estratificação de Risco Gestacional',
        rangesTitle: 'Linha de Cuidado Pré-Natal (Ministério da Saúde)',
        ranges: [
          { label: 'Risco habitual', range: 'Risco habitual', status: 'normal', description: 'Acompanhamento na Atenção Primária' },
          { label: 'Alto risco', range: 'Alto risco', status: 'alerta', description: 'Acompanhamento conjunto com ambulatório especializado' },
        ],
        clinicalNote: 'Identifica gestantes com maior probabilidade de desfecho desfavorável materno ou perinatal.',
      }
    }

    case 'fragilidade': {
      return {
        fieldId,
        title: 'Síndrome de Fragilidade do Idoso',
        rangesTitle: 'Fenótipo de Fragilidade (Fried et al.)',
        ranges: [
          { label: 'Robusto', range: 'Robusto', status: 'normal', description: 'Sem critérios de fragilidade presentes' },
          { label: 'Pré-frágil', range: 'Pré-frágil', status: 'alerta', description: '1 a 2 critérios presentes — reversível' },
          { label: 'Frágil', range: 'Frágil', status: 'alterado', description: '≥ 3 critérios presentes — alta vulnerabilidade' },
        ],
        clinicalNote: 'Critérios: perda ponderal involuntária, exaustão, fraqueza muscular, lentidão de marcha e sedentarismo.',
      }
    }

    case 'risco_queda': {
      return {
        fieldId,
        title: 'Estratificação de Risco de Queda — Idoso',
        rangesTitle: 'Prevenção de Traumas Geriátricos',
        ranges: [
          { label: 'Baixo risco', range: 'Baixo', status: 'normal', description: 'Boa estabilidade postural' },
          { label: 'Moderado', range: 'Moderado', status: 'alerta', description: 'Fatores de risco identificados' },
          { label: 'Alto risco', range: 'Alto', status: 'alterado', description: 'Histórico de quedas ou marcha prejudicada' },
        ],
        clinicalNote: 'Orienta intervenções preventivas ambientais e de reabilitação motora.',
      }
    }

    case 'pc_nascimento': {
      return {
        fieldId,
        title: 'Perímetro Cefálico ao Nascer — Pediatria (OMS)',
        unit: 'cm',
        rangesTitle: 'Classificação Craniana Neonatal (OMS / SBP)',
        ranges: [
          { label: 'Microcefalia', range: '< 33.0 cm', status: 'alterado', description: 'Investigar infecções congênitas (sífilis, toxoplasmose, CMV, zika) e fatores genéticos' },
          { label: 'Perímetro cefálico adequado', range: '33.0 – 37.0 cm', status: 'normal', description: 'Crescimento craniano intrauterino adequado' },
          { label: 'Macrocefalia', range: '> 37.0 cm', status: 'alerta', description: 'Investigar hidrocefalia, fatores familiares ou tocotraumatismo' },
        ],
        clinicalNote: 'Medir com fita métrica inextensível passando pela glabela e pela protuberância occipital externa.',
        defaultRecommendationHint: 'Rastrear infecções congênitas se microcefalia; avaliar ultrassom transfontanelar se macrocefalia.',
      }
    }

    case 'comprimento_nascimento': {
      return {
        fieldId,
        title: 'Comprimento ao Nascer — Pediatria (OMS)',
        unit: 'cm',
        rangesTitle: 'Classificação Estatural Neonatal (OMS / SBP)',
        ranges: [
          { label: 'Pequeno para IG (PIG)', range: '< 47.0 cm', status: 'alerta', description: 'Comprimento abaixo do percentil 10 para idade gestacional' },
          { label: 'Comprimento adequado (AIG)', range: '47.0 – 53.0 cm', status: 'normal', description: 'Comprimento a termo normal (média 50 cm)' },
          { label: 'Grande para IG (GIG)', range: '> 53.0 cm', status: 'alerta', description: 'Comprimento acima do percentil 90' },
        ],
        clinicalNote: 'Avaliar com régua antropométrica infantil (antropômetro horizontal) em decúbito dorsal.',
        defaultRecommendationHint: 'Acompanhar a velocidade de crescimento linear nas consultas de puericultura.',
      }
    }

    case 'apgar': {
      return {
        fieldId,
        title: 'Índice de Apgar (1º e 5º minuto)',
        unit: '/10',
        rangesTitle: 'Adaptação e Vitalidade Neonatal Imediata',
        ranges: [
          { label: 'Depressão grave', range: '0 – 3 pontos', status: 'alterado', description: 'Necessidade imediata de reanimação neonatal em sala de parto' },
          { label: 'Depressão moderada', range: '4 – 6 pontos', status: 'alerta', description: 'Dificuldade de transição cardiorrespiratória neonatal' },
          { label: 'Depressão leve', range: '7 pontos', status: 'alerta', description: 'Alerta transitório — monitorar resposta' },
          { label: 'Boa adaptação (Vigoroso)', range: '8 – 10 pontos', status: 'normal', description: 'Excelente adaptação fisiológica extrauterina' },
        ],
        clinicalNote: 'Avalia frequência cardíaca, respiração, tônus muscular, irritabilidade reflexa e cor da pele.',
        defaultRecommendationHint: 'Apgar ≥ 8 no 5º minuto: incentivar contato pele a pele e aleitamento na primeira hora (Golden Hour).',
      }
    }

    case 'altura_uterina': {
      return {
        fieldId,
        title: 'Altura Uterina (AU) — Gestante (Ministério da Saúde)',
        unit: 'cm',
        rangesTitle: 'Curva de Crescimento Uterino (Ministério da Saúde / CLAP)',
        ranges: [
          { label: 'Abaixo do esperado para IG', range: '< Percentil 10 / < 15 cm', status: 'alerta', description: 'Suspeita de restrição de crescimento fetal (RCIU) ou oligoidrâmnio' },
          { label: 'Adequada para a IG', range: 'Percentil 10 – 90 / 15 – 38 cm', status: 'normal', description: 'Crescimento uterino normal (± 2 cm da IG após a 20ª semana)' },
          { label: 'Acima do esperado para IG', range: '> Percentil 90 / > 38 cm', status: 'alerta', description: 'Suspeita de macrossomia fetal, polidrâmnio ou gestação múltipla' },
        ],
        clinicalNote: 'Medir da borda superior da sínfise púbica ao fundo uterino com fita métrica flexível.',
        defaultRecommendationHint: 'AU discrepante (> 2 cm da IG) indica realização de ultrassonografia com dopplerfluxometria.',
      }
    }

    case 'dilatacao': {
      return {
        fieldId,
        title: 'Dilatação Cervical no Trabalho de Parto (OMS)',
        unit: 'cm',
        rangesTitle: 'Fases da Dilatação no Trabalho de Parto',
        ranges: [
          { label: 'Fase latente / Colo fechado', range: '0 – 3 cm', status: 'normal', description: 'Fase latente — início da preparação cervical' },
          { label: 'Fase ativa de dilatação', range: '4 – 9 cm', status: 'normal', description: 'Fase ativa do trabalho de parto — progressão de dilatação' },
          { label: 'Dilatação total (Expulsivo)', range: '10 cm', status: 'normal', description: 'Dilatação cervical completa — início do período expulsivo' },
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
        fieldId,
        title: 'Força de Preensão Palmar — Dinamometria (EWGSOP2)',
        unit: 'kg',
        rangesTitle: 'Critério Diagnóstico de Sarcopenia (EWGSOP2)',
        ranges: isMasc
          ? [
              { label: 'Força reduzida (Provável Sarcopenia)', range: '< 27.0 kg', status: 'alterado', description: 'Dinapenia importante no homem idoso' },
              { label: 'Força preservada (Normal)', range: '≥ 27.0 kg', status: 'normal', description: 'Força muscular adequada' },
            ]
          : isFem
          ? [
              { label: 'Força reduzida (Provável Sarcopenia)', range: '< 16.0 kg', status: 'alterado', description: 'Dinapenia importante na mulher idosa' },
              { label: 'Força preservada (Normal)', range: '≥ 16.0 kg', status: 'normal', description: 'Força muscular adequada' },
            ]
          : [
              { label: 'Força reduzida (Sarcopenia)', range: '< 16 kg (F) / < 27 kg (M)', status: 'alterado', description: 'Força muscular abaixo do ponto de corte' },
              { label: 'Força muscular preservada', range: '≥ 16 kg (F) / ≥ 27 kg (M)', status: 'normal', description: 'Força isométrica adequada' },
            ],
        clinicalNote: 'Medir com dinamômetro na mão dominante, com cotovelo a 90°. Registrar a maior de 3 tentativas.',
        defaultRecommendationHint: 'Indicação de treino físico resistido com exercícios de sobrecarga progressiva e suplementação proteica.',
      }
    }

    case 'fluencia_verbal': {
      return {
        fieldId,
        title: 'Teste de Fluência Verbal Semântica — Animais (Brucki et al.)',
        unit: 'animais/min',
        rangesTitle: 'Rastreio de Função Executiva e Memória Semântica',
        ranges: [
          { label: 'Comprometida (Déficit importante)', range: '< 9 animais', status: 'alterado', description: 'Abaixo do corte esperado inclusive para não escolarizados' },
          { label: 'Limítrofe / Normal para baixa escolaridade', range: '9 – 12 animais', status: 'alerta', description: 'Esperado para analfabetos; alerta se escolaridade ≥ 4 anos' },
          { label: 'Normal / Preservada', range: '≥ 13 animais', status: 'normal', description: 'Desempenho esperado para idosos escolarizados' },
        ],
        clinicalNote: 'Ditar o maior número possível de animais em 1 minuto. Sofre forte influência da escolaridade.',
        defaultRecommendationHint: 'Em desempenhos < 9, realizar avaliação neuropsicológica e descartar causas secundárias de declínio cognitivo.',
      }
    }

    case 'levantar_cadeira': {
      return {
        fieldId,
        title: 'Teste de Levantar da Cadeira sem Apoio',
        rangesTitle: 'Avaliação da Potência Muscular de Membros Inferiores',
        ranges: [
          { label: 'Consegue', range: 'Consegue', status: 'normal', description: 'Potência e força de MMII preservadas' },
          { label: 'Consegue com dificuldade', range: 'Consegue com dificuldade', status: 'alerta', description: 'Déficit incipiente de força muscular de quadríceps' },
          { label: 'Não consegue', range: 'Não consegue', status: 'alterado', description: 'Dinapenia grave de MMII — elevado risco de quedas' },
        ],
        clinicalNote: 'Levantar-se 5 vezes consecutivas da cadeira com braços cruzados sobre o peito.',
        defaultRecommendationHint: 'Prescrever exercícios de fortalecimento de membros inferiores e equilíbrio.',
      }
    }

    case 'equilibrio': {
      return {
        fieldId,
        title: 'Teste de Equilíbrio em Três Posições (SPPB)',
        rangesTitle: 'Avaliação de Estabilidade Postural Estática',
        ranges: [
          { label: 'Estável nas três posições', range: 'Estável nas três posições', status: 'normal', description: 'Equilíbrio estático satisfatório (pés juntos, semitandem e tandem)' },
          { label: 'Instável', range: 'Instável', status: 'alterado', description: 'Déficit de equilíbrio — alto risco de quedas e fraturas' },
        ],
        clinicalNote: 'Manter cada postura por 10 segundos: pés juntos, semitandem e tandem.',
        defaultRecommendationHint: 'Indicar fisioterapia de equilíbrio vestibular/proprioceptivo e adequação do ambiente domiciliar.',
      }
    }

    case 'lesoes_pressao': {
      return {
        fieldId,
        title: 'Classificação de Lesões por Pressão (NPUAP)',
        rangesTitle: 'Estadiamento de Integridade Cutânea',
        ranges: [
          { label: 'Não apresenta', range: 'Não apresenta', status: 'normal', description: 'Pele íntegra sem lesões por pressão' },
          { label: 'Estágio 1', range: 'Estágio 1', status: 'alerta', description: 'Eritema não branqueável em pele íntegra' },
          { label: 'Estágios 2, 3, 4 ou Inclassificável', range: 'Estágios 2 a 4 / Inclassificável', status: 'alterado', description: 'Perda tecidual parcial ou total — risco infeccioso' },
        ],
        clinicalNote: 'Inspecionar proeminências ósseas (região sacral, trocanteres, ísquios e calcâneos).',
        defaultRecommendationHint: 'Mudança de decúbito a cada 2 horas, colchão pneumático piramidal e curativos com hidrogel ou placa.',
      }
    }
  }

  // Verifica se é um campo de status de exame físico com NORMAL_ALTERADO
  if (fieldId.endsWith('_status')) {
    return {
      fieldId,
      title: 'Status do Exame Físico',
      rangesTitle: 'Achados do Exame Segmentar',
      ranges: [
        { label: 'Sem alterações', range: 'Sem alterações', status: 'normal', description: 'Exame físico dentro dos padrões de normalidade' },
        { label: 'Alterado', range: 'Alterado', status: 'alerta', description: 'Achados anormais descritos no campo detalhado' },
      ],
      clinicalNote: 'Identifica anomalias que requerem descrição pormenorizada.',
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
  const info = getFieldReferenceInfo(fieldId, values, templateId)
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
        fieldId,
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
        fieldId,
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
        fieldId,
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
      fieldId,
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
        fieldId,
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
        fieldId,
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
      fieldId,
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
        fieldId,
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
        fieldId,
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
      fieldId,
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
      fieldId,
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
      let status: ReferenceStatus = 'normal'
      let classification = 'Frequência normal para a faixa etária'
      let activeRangeIdx = 0
      let recHint = 'Avaliar na curva pediátrica e correlacionar com o estado de agitação da criança.'

      if (n < 60) {
        status = 'alterado'
        classification = 'Bradicardia importante na infância'
        recHint = 'Sinal de alarme para hipóxia grave ou hipotermia na criança.'
      } else if (n > 180) {
        status = 'alterado'
        classification = 'Taquicardia severa'
        recHint = 'Descartar arritmia (TPSV), choque ou sepse.'
      }

      return {
        fieldId,
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
      fieldId,
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
      let status: ReferenceStatus = 'normal'
      let classification = 'Frequência respiratória normal'
      let recHint = 'Manter observação de sinais de esforço ventilatório (tiragem, batimento de asa).'

      if (n > 60) {
        status = 'alterado'
        classification = 'Taquipneia acentuada na infância'
        recHint = 'Avaliação imediata para desconforto respiratório grave (bronquiolite/pneumonia).'
      } else if (n > 40) {
        status = 'alerta'
        classification = 'Taquipneia limítrofe/moderada'
        recHint = 'Confirmar idade da criança e recontar com a criança calma.'
      }

      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification,
        currentValueFormatted: formatted,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: false })),
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
    const isGestante = templateId === 'gestante'

    let status: ReferenceStatus
    let classification: string
    let activeRangeIdx: number
    let recHint: string

    if (isGestante) {
      if (n < 70) {
        status = 'alterado'
        classification = 'Hipoglicemia na gestação'
        activeRangeIdx = 0
        recHint = 'Correção imediata com carboidratos simples e investigação de dose de insulina se em uso.'
      } else if (n < 92) {
        status = 'normal'
        classification = 'Glicemia normal no pré-natal'
        activeRangeIdx = 1
        recHint = 'Meta de jejum recomendada pela SBD para bom desfecho perinatal.'
      } else if (n < 126) {
        status = 'alterado'
        classification = 'Alerta para Diabetes Gestacional'
        activeRangeIdx = 2
        recHint = 'Encaminhar para avaliação de TOTG ou confirmar DMG; plano alimentar para gestante.'
      } else {
        status = 'alterado'
        classification = 'Hiperglicemia franca / DM prévio'
        activeRangeIdx = 3
        recHint = 'Alto risco de macrossomia e malformações; acompanhamento em centro especializado de obstetrícia.'
      }
    } else {
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
    }

    return {
      fieldId,
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
      fieldId,
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
    const isFem = sexo.includes('fem') || templateId === 'gestante'

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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      classification = 'Macrossomia ao nascer'
      activeRangeIdx = 3
      recHint = 'Vigiar glicemia neonatal e investigar diabetes gestacional prévio.'
    }

    return {
      fieldId,
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
    } else if (n <= 41) {
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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
      fieldId,
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

    if (n <= 3) {
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
      fieldId,
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
      fieldId,
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
      fieldId,
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

  // 18. Avaliação de campos qualitativos (strings selecionadas em radio/select)
  if (typeof value === 'string' && value.trim()) {
    const strVal = value.trim()

    // Status de exame físico
    if (fieldId.endsWith('_status')) {
      const isNormal = strVal.toLowerCase().includes('sem altera') || strVal.toLowerCase().includes('normal')
      const status: ReferenceStatus = isNormal ? 'normal' : 'alerta'
      return {
        fieldId,
        status,
        statusLabel: status === 'normal' ? 'Normal' : 'Alerta',
        classification: strVal,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({
          ...r,
          isCurrent: isNormal ? r.status === 'normal' : r.status !== 'normal',
        })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint: isNormal
          ? 'Nenhuma conduta específica necessária.'
          : 'Registrar achados detalhados no campo descritivo da seção.',
      }
    }

    // Estado geral
    if (fieldId === 'estado_geral') {
      const status: ReferenceStatus =
        strVal === 'Bom' ? 'normal' : strVal === 'Regular' ? 'alerta' : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: `Estado Geral ${strVal}`,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase() === strVal.toLowerCase() })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alterado'
            ? 'Prioridade de atendimento e vigilância intensiva dos sinais vitais.'
            : status === 'alerta'
            ? 'Avaliação de hidratação, nutrição e sintomas agudos.'
            : 'Paciente em bom estado para continuidade do plano proposto.',
      }
    }

    // Consciência
    if (fieldId === 'consciencia') {
      const isOrientado = strVal === 'Lúcido e orientado'
      const isSonolento = strVal === 'Sonolento'
      const status: ReferenceStatus = isOrientado ? 'normal' : isSonolento ? 'alerta' : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: strVal,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase() === strVal.toLowerCase() })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alterado'
            ? 'Pesquisar delirium, hipoglicemia, infecções do SNC ou intoxicação medicamentosa.'
            : status === 'alerta'
            ? 'Verificar uso de sedativos e perfusão sistêmica.'
            : 'Funções cognitivas basais preservadas.',
      }
    }

    // Hidratação
    if (fieldId === 'hidratacao') {
      const isHidratado = strVal === 'Hidratado'
      const isLeve = strVal === 'Desidratado +'
      const status: ReferenceStatus = isHidratado ? 'normal' : isLeve ? 'alerta' : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: strVal,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase().includes(strVal.toLowerCase()) })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alterado'
            ? 'Plano B ou C de reidratação (endovenosa se sinais de choque ou vômitos incoercíveis).'
            : status === 'alerta'
            ? 'Plano A/B de reidratação oral e acompanhamento.'
            : 'Manter hidratação basal satisfatória.',
      }
    }

    // Icterícia / Edema / Edema MMII
    if (fieldId === 'ictericia' || fieldId === 'edema' || fieldId === 'edema_mmii') {
      const isAusente = strVal === 'Ausente'
      const isLeve = strVal === '+/4'
      const status: ReferenceStatus = isAusente ? 'normal' : isLeve ? 'alerta' : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: `${info.title}: ${strVal}`,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase().includes(strVal.toLowerCase()) })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alterado'
            ? 'Investigar causas orgânicas (hepatopatia, insuficiência cardíaca, nefropatia, DHC).'
            : status === 'alerta'
            ? 'Monitorar evolução e pesquisar estase venosa.'
            : 'Sem achados anormais.',
      }
    }

    // Cianose
    if (fieldId === 'cianose') {
      const isAusente = strVal === 'Ausente'
      const isPerif = strVal === 'Periférica'
      const status: ReferenceStatus = isAusente ? 'normal' : isPerif ? 'alerta' : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: `Cianose ${strVal}`,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase() === strVal.toLowerCase() })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alterado'
            ? 'Oxigenoterapia imediata, gasometria arterial e identificação de shunt ou hipoxemia grave.'
            : status === 'alerta'
            ? 'Aquecer extremidades e verificar perfusão vascular.'
            : 'Mucosas coradas e oxigenação tecidual normal.',
      }
    }

    // Gravidade
    if (fieldId === 'gravidade') {
      const isEstavel = strVal === 'Estável'
      const isPotencial = strVal === 'Potencialmente grave'
      const status: ReferenceStatus = isEstavel ? 'normal' : isPotencial ? 'alerta' : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: strVal,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase() === strVal.toLowerCase() })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alterado'
            ? 'Estabilização em sala vermelha/emergência e acionamento de equipe de apoio.'
            : status === 'alerta'
            ? 'Monitorização multiparamétrica e reavaliação médica frequente.'
            : 'Conduta ambulatorial ou internação em enfermaria comum.',
      }
    }

    // Classificação de risco
    if (fieldId === 'classificacao_risco') {
      const status: ReferenceStatus =
        strVal.includes('Azul') || strVal.includes('Verde')
          ? 'normal'
          : strVal.includes('Amarelo')
          ? 'alerta'
          : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: strVal,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: strVal.includes(r.range) })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alterado'
            ? 'Prioridade de atendimento imediato (< 10 minutos).'
            : status === 'alerta'
            ? 'Atendimento clínico urgente (< 60 minutos).'
            : 'Atendimento pouco urgente ou eletivo.',
      }
    }

    // Fragilidade
    if (fieldId === 'fragilidade') {
      const status: ReferenceStatus =
        strVal === 'Robusto' ? 'normal' : strVal === 'Pré-frágil' ? 'alerta' : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: `Idoso ${strVal}`,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase() === strVal.toLowerCase() })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alterado'
            ? 'Plano geriátrico amplo com foco em funcionalidade, nutrição e prevenção de quedas.'
            : status === 'alerta'
            ? 'Fortalecimento muscular e estímulo à atividade física resistida.'
            : 'Manter acompanhamento preventivo anual.',
      }
    }

    // Risco de queda
    if (fieldId === 'risco_queda') {
      const status: ReferenceStatus =
        strVal === 'Baixo' ? 'normal' : strVal === 'Moderado' ? 'alerta' : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: `Risco de Queda ${strVal}`,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase().includes(strVal.toLowerCase()) })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alterado'
            ? 'Indicar dispositivo de marcha, barras no banheiro e retirada de tapetes soltos no domicílio.'
            : status === 'alerta'
            ? 'Revisar calçados e iluminação residencial.'
            : 'Baixa vulnerabilidade a quedas.',
      }
    }

    // Vitalidade fetal
    if (fieldId === 'vitalidade_fetal') {
      const status: ReferenceStatus =
        strVal === 'Preservada' ? 'normal' : strVal === 'Duvidosa' ? 'alerta' : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: `Vitalidade Fetal ${strVal}`,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase() === strVal.toLowerCase() })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alterado'
            ? 'Encaminhamento urgente para internação obstétrica e conduta de emergência.'
            : status === 'alerta'
            ? 'Solicitar cardiotocografia basal e ultrassonografia obstétrica com doppler.'
            : 'Manter pré-natal com ausculta seriada dos BCF.',
      }
    }

    // Risco gestacional
    if (fieldId === 'risco_gestacional') {
      const status: ReferenceStatus = strVal === 'Risco habitual' ? 'normal' : 'alerta'
      return {
        fieldId,
        status,
        statusLabel: status === 'normal' ? 'Normal' : 'Alerta',
        classification: strVal,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase() === strVal.toLowerCase() })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alerta'
            ? 'Encaminhar para acompanhamento conjunto em ambulatório de Pré-Natal de Alto Risco (PNAR).'
            : 'Pré-natal de risco habitual na Unidade Básica de Saúde.',
      }
    }

    // Levantar da cadeira
    if (fieldId === 'levantar_cadeira') {
      const isConsegue = strVal === 'Consegue'
      const isDificil = strVal === 'Consegue com dificuldade'
      const status: ReferenceStatus = isConsegue ? 'normal' : isDificil ? 'alerta' : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: `Levantar da Cadeira: ${strVal}`,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase() === strVal.toLowerCase() })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alterado'
            ? 'Fraqueza proximal grave de MMII; prescrever fisioterapia motora e exercícios de sentar e levantar.'
            : status === 'alerta'
            ? 'Indício de sarcopenia incipiente; estimular fortalecimento de quadríceps.'
            : 'Força de membros inferiores preservada.',
      }
    }

    // Equilíbrio
    if (fieldId === 'equilibrio') {
      const isEstavel = strVal.toLowerCase().includes('estável')
      const status: ReferenceStatus = isEstavel ? 'normal' : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: `Equilíbrio: ${strVal}`,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase().includes(strVal.toLowerCase()) })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint: isEstavel
          ? 'Equilíbrio estático preservado.'
          : 'Instabilidade postural com alto risco de quedas; indicar treino de equilíbrio proprioceptivo.',
      }
    }

    // Lesões por pressão
    if (fieldId === 'lesoes_pressao') {
      const isSem = strVal.toLowerCase().includes('não apresenta')
      const isEstagio1 = strVal.toLowerCase().includes('estágio 1')
      const status: ReferenceStatus = isSem ? 'normal' : isEstagio1 ? 'alerta' : 'alterado'
      return {
        fieldId,
        status,
        statusLabel: getStatusLabel(status),
        classification: `Lesão por Pressão: ${strVal}`,
        currentValueFormatted: strVal,
        rangesTitle: info.rangesTitle,
        ranges: info.ranges.map((r) => ({ ...r, isCurrent: r.label.toLowerCase().includes(strVal.toLowerCase()) })),
        clinicalNote: info.clinicalNote,
        futureRecommendationHint:
          status === 'alterado'
            ? 'Mudança de decúbito de 2/2h, colchão pneumático piramidal e curativo especializado.'
            : status === 'alerta'
            ? 'Alívio de pressão sobre proeminências ósseas e hidratação cutânea com AGE.'
            : 'Pele íntegra; manter cuidados de prevenção em acamados.',
      }
    }
  }

  return null
}
