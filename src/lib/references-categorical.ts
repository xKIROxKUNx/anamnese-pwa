import type { FieldValue } from '../types/anamnese'
import type { ReferenceEvaluation, ReferenceInfoDefinition, ReferenceStatus } from './references'

/**
 * Referências de campos categóricos (radio/select): cada opção do campo tem um
 * status (cor do chip) e, quando vale a pena, uma definição curta que explica
 * o que o examinador deve observar para escolhê-la.
 *
 * As opções aqui são exatamente as dos roteiros em src/data: o casamento é por
 * valor exato, sem substring, e scripts/test-references.mjs confere que nenhuma
 * opção de campo ficou sem referência.
 */

export interface CategoricalOption {
  /** Texto idêntico ao da opção no roteiro. */
  value: string
  /** Sem status, a opção é aceita mas não colore o campo (ex.: "Não realizado"). */
  status?: ReferenceStatus
  /** Frase curta exibida no popover. */
  definition?: string
}

export interface CategoricalDefinition {
  /** Com false, o campo só ganha a cor do chip: sem ícone nem popover. */
  popover: boolean
  rangesTitle?: string
  clinicalNote?: string
  options: CategoricalOption[]
  /** Sugestão de conduta por status da opção marcada. */
  hints?: Partial<Record<ReferenceStatus, string>>
  /** Prefixo da classificação mostrada no banner (ex.: "Cianose"). */
  classificationPrefix?: string
}

const ESTAGIOS: CategoricalDefinition = {
  popover: true,
  rangesTitle: 'Graduação em cruzes (Godet)',
  clinicalNote:
    'Pressione por cerca de 5 segundos sobre uma proeminência óssea (tíbia, maléolo, sacro) e observe a depressão (sinal do cacifo).',
  hints: {
    normal: 'Sem achados anormais.',
    alerta: 'Monitorar evolução e pesquisar estase venosa.',
    alterado: 'Investigar causas orgânicas (insuficiência cardíaca, hepatopatia, nefropatia, hipoalbuminemia).',
  },
  classificationPrefix: 'Edema',
  options: [
    { value: 'Ausente', status: 'normal', definition: 'Sem depressão à pressão digital.' },
    { value: '+/4', status: 'alerta', definition: 'Cacifo discreto (cerca de 2 mm), que desaparece em segundos.' },
    { value: '++/4', status: 'alterado', definition: 'Cacifo de cerca de 4 mm, que some em torno de 15 segundos.' },
    { value: '+++/4', status: 'alterado', definition: 'Cacifo de cerca de 6 mm, que dura cerca de 1 minuto; membro visivelmente aumentado.' },
    { value: '++++/4', status: 'alterado', definition: 'Cacifo de cerca de 8 mm, que dura de 2 a 5 minutos; edema tenso e deformante.' },
  ],
}

const NORMAL_ALTERADO: CategoricalDefinition = {
  popover: false,
  options: [
    { value: 'Sem alterações', status: 'normal' },
    { value: 'Alterado', status: 'alerta' },
    { value: 'Não realizado' },
    { value: 'Não examinada' },
  ],
}

export const CATEGORICAL_REFERENCES: Record<string, CategoricalDefinition> = {
  estado_geral: {
    popover: true,
    rangesTitle: 'Avaliação clínica global',
    clinicalNote: 'Impressão geral nos primeiros instantes do exame, antes do exame segmentar.',
    classificationPrefix: 'Estado geral',
    hints: {
      normal: 'Paciente em bom estado para continuidade do plano proposto.',
      alerta: 'Avaliação de hidratação, nutrição e sintomas agudos.',
      alterado: 'Prioridade de atendimento e vigilância intensiva dos sinais vitais.',
    },
    options: [
      { value: 'Bom', status: 'normal', definition: 'Lúcido, orientado e ativo; corado, hidratado e afebril; sem desconforto nem esforço respiratório.' },
      { value: 'Regular', status: 'alerta', definition: 'Sinais sutis de sofrimento (palidez, fadiga, desconforto leve, desidratação discreta); ainda colaborativo.' },
      { value: 'Grave', status: 'alterado', definition: 'Prostrado ou toxemiado, com instabilidade hemodinâmica, respiratória ou neurológica e risco iminente.' },
    ],
  },

  consciencia: {
    popover: true,
    rangesTitle: 'Avaliação neurológica',
    clinicalNote: 'Avalie orientação em pessoa, espaço e tempo. Quantifique alterações com a escala de Glasgow, logo abaixo.',
    hints: {
      normal: 'Funções cognitivas basais preservadas.',
      alerta: 'Verificar uso de sedativos e perfusão sistêmica.',
      alterado: 'Pesquisar delirium, hipoglicemia, infecções do SNC ou intoxicação medicamentosa.',
    },
    options: [
      { value: 'Lúcido e orientado', status: 'normal', definition: 'Alerta, responde com coerência e sabe quem é, onde está e que dia é.' },
      { value: 'Sonolento', status: 'alerta', definition: 'Dorme com facilidade, mas desperta ao chamado ou a estímulo leve e mantém a atenção.' },
      { value: 'Confuso', status: 'alterado', definition: 'Acordado, mas desorientado no tempo e/ou no espaço, com fala ou raciocínio incoerente.' },
      { value: 'Torporoso', status: 'alterado', definition: 'Só desperta com estímulo vigoroso ou doloroso e volta a dormir em seguida.' },
      { value: 'Comatoso', status: 'alterado', definition: 'Não desperta nem abre os olhos a estímulos; sem resposta verbal.' },
    ],
  },

  hidratacao: {
    popover: true,
    rangesTitle: 'Balanço hídrico clínico',
    clinicalNote: 'Avalie turgor da pele, umidade das mucosas, olhos encovados, diurese e, em lactentes, a fontanela.',
    hints: {
      normal: 'Manter hidratação basal satisfatória.',
      alerta: 'Plano A/B de reidratação oral e acompanhamento.',
      alterado: 'Plano B ou C de reidratação (endovenosa se sinais de choque ou vômitos incoercíveis).',
    },
    options: [
      { value: 'Hidratado', status: 'normal', definition: 'Mucosas úmidas, turgor normal, olhos normais e diurese preservada.' },
      { value: 'Desidratado +', status: 'alerta', definition: 'Leve: sede, mucosas levemente secas e turgor discretamente diminuído.' },
      { value: 'Desidratado ++', status: 'alterado', definition: 'Moderada: mucosas secas, olhos encovados, prega cutânea lenta, oligúria e taquicardia.' },
      { value: 'Desidratado +++', status: 'alterado', definition: 'Grave: letargia, extremidades frias, pulso fraco e hipotensão; risco de choque.' },
    ],
  },

  edema: ESTAGIOS,
  edema_mmii: ESTAGIOS,

  ictericia: {
    popover: true,
    rangesTitle: 'Graduação em cruzes',
    clinicalNote: 'Examine escleras e freio da língua com luz natural. A icterícia costuma ser visível a partir de 2 a 3 mg/dL de bilirrubina.',
    classificationPrefix: 'Icterícia',
    hints: {
      normal: 'Sem achados anormais.',
      alerta: 'Monitorar evolução e solicitar bilirrubinas se persistir.',
      alterado: 'Investigar causas hepatobiliares, hemolíticas e medicamentosas.',
    },
    options: [
      { value: 'Ausente', status: 'normal', definition: 'Escleras e mucosas de cor normal.' },
      { value: '+/4', status: 'alerta', definition: 'Leve: apenas escleras e/ou freio da língua amarelados.' },
      { value: '++/4', status: 'alterado', definition: 'Moderada: amarelo também na face e nas mucosas.' },
      { value: '+++/4', status: 'alterado', definition: 'Intensa: atinge o tronco e os membros.' },
      { value: '++++/4', status: 'alterado', definition: 'Muito intensa: generalizada, tom amarelo-esverdeado, inclusive palmas e plantas.' },
    ],
  },

  cianose: {
    popover: true,
    rangesTitle: 'Perfusão e oxigenação',
    clinicalNote: 'A cianose central indica hipoxemia importante: confirme com oximetria de pulso.',
    classificationPrefix: 'Cianose',
    hints: {
      normal: 'Mucosas coradas e oxigenação tecidual normal.',
      alerta: 'Aquecer extremidades e verificar perfusão vascular.',
      alterado: 'Oxigenoterapia imediata, gasometria arterial e identificação de shunt ou hipoxemia grave.',
    },
    options: [
      { value: 'Ausente', status: 'normal', definition: 'Cor de pele e mucosas normal.' },
      { value: 'Central', status: 'alterado', definition: 'Lábios, língua e mucosa oral azulados (e também as extremidades): hipoxemia arterial por doença pulmonar, shunt cardíaco ou hemoglobina anormal.' },
      { value: 'Periférica', status: 'alerta', definition: 'Só nas extremidades (dedos, leito ungueal, orelhas), com mucosa oral normal: perfusão lenta por frio, estase venosa ou baixo débito.' },
    ],
  },

  gravidade: {
    popover: true,
    rangesTitle: 'Risco imediato de piora',
    clinicalNote: 'Sintetiza a prioridade de atendimento e a necessidade de leito monitorizado.',
    hints: {
      normal: 'Conduta ambulatorial ou internação em enfermaria comum.',
      alerta: 'Monitorização multiparamétrica e reavaliação médica frequente.',
      alterado: 'Estabilização em sala vermelha/emergência e acionamento de equipe de apoio.',
    },
    options: [
      { value: 'Estável', status: 'normal', definition: 'Sinais vitais dentro do esperado, sem disfunção orgânica aguda e sem risco imediato de piora.' },
      { value: 'Potencialmente grave', status: 'alerta', definition: 'Compensado agora, mas com risco de deterioração: precisa de monitorização e reavaliação frequentes.' },
      { value: 'Grave', status: 'alterado', definition: 'Disfunção orgânica ou sinais de gravidade presentes, exigindo tratamento imediato e suporte.' },
      { value: 'Instável', status: 'alterado', definition: 'Instabilidade hemodinâmica, respiratória ou neurológica: risco iminente de colapso; sala de emergência.' },
    ],
  },

  classificacao_risco: {
    popover: true,
    rangesTitle: 'Protocolo de Manchester: tempo-alvo para o atendimento médico',
    clinicalNote: 'A cor define a prioridade de atendimento, não o diagnóstico.',
    hints: {
      normal: 'Atendimento pouco urgente ou eletivo.',
      alerta: 'Atendimento clínico urgente (até 60 minutos).',
      alterado: 'Prioridade de atendimento imediato (até 10 minutos).',
    },
    options: [
      { value: 'Azul — não urgente', status: 'normal', definition: 'Até 240 minutos, ou atendimento eletivo na rede básica.' },
      { value: 'Verde — pouco urgente', status: 'normal', definition: 'Até 120 minutos.' },
      { value: 'Amarelo — urgente', status: 'alerta', definition: 'Até 60 minutos.' },
      { value: 'Laranja — muito urgente', status: 'alterado', definition: 'Até 10 minutos.' },
      { value: 'Vermelho — emergência', status: 'alterado', definition: 'Atendimento imediato.' },
    ],
  },

  fragilidade: {
    popover: true,
    rangesTitle: 'Fenótipo de fragilidade (Fried)',
    clinicalNote: 'Critérios de Fried: perda de peso involuntária, exaustão, fraqueza (preensão palmar), lentidão da marcha e baixa atividade física.',
    classificationPrefix: 'Idoso',
    hints: {
      normal: 'Manter acompanhamento preventivo anual.',
      alerta: 'Fortalecimento muscular e estímulo à atividade física resistida.',
      alterado: 'Plano geriátrico amplo com foco em funcionalidade, nutrição e prevenção de quedas.',
    },
    options: [
      { value: 'Robusto', status: 'normal', definition: 'Nenhum critério de Fried presente.' },
      { value: 'Pré-frágil', status: 'alerta', definition: '1 ou 2 critérios presentes; fase potencialmente reversível.' },
      { value: 'Frágil', status: 'alterado', definition: '3 ou mais critérios; alta vulnerabilidade a quedas, internação e perda funcional.' },
    ],
  },

  risco_queda: {
    popover: true,
    rangesTitle: 'Estratificação de risco de queda',
    clinicalNote: 'Considere o histórico de quedas, o Timed Up and Go, o equilíbrio e os medicamentos em uso.',
    classificationPrefix: 'Risco de queda',
    hints: {
      normal: 'Baixa vulnerabilidade a quedas.',
      alerta: 'Revisar calçados, iluminação residencial e medicamentos que causam tontura.',
      alterado: 'Indicar dispositivo de marcha, barras no banheiro e retirada de tapetes soltos no domicílio.',
    },
    options: [
      { value: 'Baixo', status: 'normal', definition: 'Sem queda no último ano; marcha e equilíbrio normais (Timed Up and Go abaixo de 12 s).' },
      { value: 'Moderado', status: 'alerta', definition: 'Uma queda sem lesão ou alteração discreta de marcha ou equilíbrio, com fatores de risco presentes.' },
      { value: 'Alto', status: 'alterado', definition: 'Duas ou mais quedas no último ano, queda com lesão, Timed Up and Go de 12 s ou mais, ou marcha e equilíbrio claramente alterados.' },
    ],
  },

  vitalidade_fetal: {
    popover: true,
    rangesTitle: 'Bem-estar fetal',
    clinicalNote: 'Avaliada pelo conjunto de ausculta dos BCF, movimentação fetal e perfil biofísico.',
    classificationPrefix: 'Vitalidade fetal',
    hints: {
      normal: 'Manter pré-natal com ausculta seriada dos BCF.',
      alerta: 'Solicitar cardiotocografia basal e ultrassonografia obstétrica com doppler.',
      alterado: 'Encaminhamento urgente para internação obstétrica e conduta de emergência.',
    },
    options: [
      { value: 'Preservada', status: 'normal', definition: 'BCF entre 110 e 160 bpm, movimentos fetais presentes e líquido amniótico adequado.' },
      { value: 'Duvidosa', status: 'alerta', definition: 'Alteração isolada ou discreta (BCF no limite, movimentação diminuída): pedir cardiotocografia e perfil biofísico.' },
      { value: 'Comprometida', status: 'alterado', definition: 'BCF anormal persistente, ausência de movimentos ou perfil biofísico alterado: conduta urgente.' },
      { value: 'Não avaliada' },
    ],
  },

  risco_gestacional: {
    popover: true,
    rangesTitle: 'Linha de cuidado pré-natal (Ministério da Saúde)',
    clinicalNote: 'Os fatores de risco marcados logo abaixo sustentam a classificação.',
    hints: {
      normal: 'Pré-natal de risco habitual na Unidade Básica de Saúde.',
      alerta: 'Encaminhar para acompanhamento conjunto em ambulatório de pré-natal de alto risco (PNAR).',
    },
    options: [
      { value: 'Risco habitual', status: 'normal', definition: 'Sem fatores de risco relevantes: pré-natal na Atenção Primária.' },
      { value: 'Alto risco', status: 'alerta', definition: 'Algum fator de risco presente: acompanhamento conjunto no pré-natal de alto risco.' },
    ],
  },

  // Só a cor do chip: o popover repetiria as próprias opções do campo.
  levantar_cadeira: {
    popover: false,
    hints: {
      normal: 'Força de membros inferiores preservada.',
      alerta: 'Indício de sarcopenia incipiente; estimular fortalecimento de quadríceps.',
      alterado: 'Fraqueza proximal grave de MMII; prescrever fisioterapia motora e exercícios de sentar e levantar.',
    },
    options: [
      { value: 'Consegue', status: 'normal' },
      { value: 'Consegue com dificuldade', status: 'alerta' },
      { value: 'Não consegue', status: 'alterado' },
    ],
  },

  equilibrio: {
    popover: false,
    hints: {
      normal: 'Equilíbrio estático preservado.',
      alterado: 'Instabilidade postural com alto risco de quedas; indicar treino de equilíbrio proprioceptivo.',
    },
    options: [
      { value: 'Estável nas três posições', status: 'normal' },
      { value: 'Instável', status: 'alterado' },
      { value: 'Não realizado' },
    ],
  },

  lesoes_pressao: {
    popover: false,
    options: [
      { value: 'Ausente', status: 'normal' },
      { value: 'Presente', status: 'alterado' },
    ],
  },
}

/** Campos *_status do exame segmentar (Sem alterações / Alterado). */
export function getCategoricalDefinition(fieldId: string): CategoricalDefinition | null {
  if (fieldId.endsWith('_status')) return NORMAL_ALTERADO
  return CATEGORICAL_REFERENCES[fieldId] ?? null
}

/** Ids com definição categórica (para testes e para conferência com os roteiros). */
export function categoricalFieldIds(): string[] {
  return Object.keys(CATEGORICAL_REFERENCES)
}

const STATUS_LABEL: Record<ReferenceStatus, 'Normal' | 'Alerta' | 'Alterado'> = {
  normal: 'Normal',
  alerta: 'Alerta',
  alterado: 'Alterado',
}

/** Tabela do popover: uma linha por opção que tem status. */
export function getCategoricalInfo(fieldId: string): ReferenceInfoDefinition | null {
  const definition = getCategoricalDefinition(fieldId)
  if (!definition || !definition.popover) return null
  return {
    layout: 'definicoes',
    rangesTitle: definition.rangesTitle ?? '',
    ranges: definition.options
      .filter((option) => option.status)
      .map((option) => ({
        label: option.value,
        range: option.value,
        status: option.status as ReferenceStatus,
        description: option.definition,
      })),
    clinicalNote: definition.clinicalNote,
  }
}

/**
 * Avalia a opção marcada. Devolve null para valor vazio, desconhecido ou sem
 * status — o campo fica sem cor. `statusOnly` indica que não há popover.
 */
export function evaluateCategorical(
  fieldId: string,
  value: FieldValue | undefined,
): ReferenceEvaluation | null {
  const definition = getCategoricalDefinition(fieldId)
  if (!definition || typeof value !== 'string' || !value.trim()) return null

  const chosen = value.trim()
  const option = definition.options.find((candidate) => candidate.value === chosen)
  if (!option?.status) return null

  const info = getCategoricalInfo(fieldId)
  const prefix = definition.classificationPrefix
  return {
    layout: info?.layout,
    status: option.status,
    statusLabel: STATUS_LABEL[option.status],
    classification: prefix ? `${prefix}: ${chosen}` : chosen,
    currentValueFormatted: chosen,
    rangesTitle: info?.rangesTitle ?? '',
    ranges: (info?.ranges ?? []).map((range) => ({ ...range, isCurrent: range.label === chosen })),
    clinicalNote: info?.clinicalNote,
    futureRecommendationHint: definition.hints?.[option.status],
    statusOnly: !definition.popover,
  }
}
