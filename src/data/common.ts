import type { Section } from '../types/anamnese'
import {
  area,
  chips,
  computed,
  date,
  duration,
  num,
  radio,
  scale,
  select,
  text,
  time,
  NORMAL_ALTERADO,
  SIM_NAO,
  SIM_NAO_IGNORADO,
} from './fields'
import { cargaTabagica, idadeExtenso, imc, pressaoMedia } from '../lib/calc'

/**
 * Seções compartilhadas pelos quatro roteiros. Cada template escolhe quais usa
 * e acrescenta as suas próprias — assim um item clínico é descrito uma vez só.
 */

export function identificacao(extraFields: Section['fields'] = []): Section {
  return {
    id: 'identificacao',
    title: 'Identificação',
    hint: 'Quem é o paciente e em que contexto ele está sendo atendido.',
    fields: [
      text('nome', 'Nome completo', { span: 3 }),
      date('nascimento', 'Data de nascimento'),
      computed('idade', 'Idade', (v) => idadeExtenso(v)),
      select('sexo', 'Sexo biológico', ['Feminino', 'Masculino', 'Intersexo']),
      text('genero', 'Identidade de gênero / nome social', { span: 2 }),
      select('cor', 'Cor/raça autodeclarada', [
        'Branca',
        'Preta',
        'Parda',
        'Amarela',
        'Indígena',
        'Não declarada',
      ]),
      select('estado_civil', 'Estado civil', [
        'Solteiro(a)',
        'Casado(a)/união estável',
        'Divorciado(a)',
        'Viúvo(a)',
      ]),
      text('naturalidade', 'Naturalidade'),
      text('procedencia', 'Procedência', { help: 'Onde mora hoje e há quanto tempo.' }),
      text('profissao', 'Profissão / ocupação'),
      select('escolaridade', 'Escolaridade', [
        'Não alfabetizado',
        'Fundamental incompleto',
        'Fundamental completo',
        'Médio incompleto',
        'Médio completo',
        'Superior incompleto',
        'Superior completo',
      ]),
      text('religiao', 'Religião / crenças relevantes'),
      text('contato', 'Telefone de contato'),
      ...extraFields,
      text('informante', 'Informante', {
        placeholder: 'O próprio paciente, acompanhante, prontuário…',
      }),
      select('confiabilidade', 'Confiabilidade das informações', [
        'Boa',
        'Regular',
        'Prejudicada',
      ]),
      date('data_atendimento', 'Data do atendimento'),
      time('hora_atendimento', 'Hora do atendimento'),
      select('local_atendimento', 'Local do atendimento', [
        'Unidade básica de saúde',
        'Ambulatório',
        'Pronto atendimento',
        'Enfermaria',
        'UTI',
        'Domicílio',
        'Teleconsulta',
      ]),
    ],
  }
}

export function queixaPrincipal(): Section {
  return {
    id: 'queixa',
    title: 'Queixa principal',
    hint: 'Nas palavras do paciente, com o tempo de evolução.',
    fields: [
      text('queixa_principal', 'Queixa principal', {
        span: 3,
        placeholder: 'Ex.: "dor no peito", "falta de ar"…',
        help: 'Registre a expressão usada pelo paciente, sem traduzir para o termo técnico.',
      }),
      duration('queixa_tempo', 'Há quanto tempo'),
    ],
  }
}

export function hda(): Section {
  return {
    id: 'hda',
    title: 'História da doença atual',
    hint: 'A narrativa cronológica do problema, do início até hoje.',
    fields: [
      area('hda_relato', 'Relato cronológico', {
        rows: 5,
        placeholder:
          'Como começou, o que veio antes, como evoluiu até o momento da consulta…',
      }),
      radio('hda_inicio', 'Modo de início', ['Súbito', 'Insidioso', 'Não sabe precisar']),
      radio('hda_evolucao', 'Evolução', ['Progressiva', 'Estável', 'Em melhora', 'Intermitente']),
      text('sintoma_localizacao', 'Localização do sintoma', { naToggle: true }),
      text('sintoma_irradiacao', 'Irradiação', { naToggle: true }),
      text('sintoma_carater', 'Caráter / qualidade', {
        naToggle: true,
        placeholder: 'Em aperto, queimação, pontada, cólica…',
      }),
      scale('sintoma_intensidade', 'Intensidade (0 a 10)', {
        naToggle: true,
        help: '0 = ausência do sintoma; 10 = a pior intensidade imaginável.',
      }),
      text('sintoma_frequencia', 'Frequência / periodicidade', { naToggle: true }),
      text('sintoma_duracao_crise', 'Duração de cada episódio', { naToggle: true }),
      text('sintoma_melhora', 'Fatores de melhora', { naToggle: true }),
      text('sintoma_piora', 'Fatores de piora', { naToggle: true }),
      area('sintomas_associados', 'Sintomas associados', { rows: 2 }),
      area('hda_tratamentos', 'Tratamentos já tentados e resposta', {
        rows: 2,
        placeholder: 'Medicações, doses, automedicação, atendimentos anteriores…',
      }),
      area('hda_repercussao', 'Repercussão na vida diária', { rows: 2 }),
    ],
  }
}

export function isda(): Section {
  return {
    id: 'isda',
    title: 'Interrogatório sintomatológico',
    hint: 'Revisão sistemática por aparelhos, além da queixa principal.',
    fields: [
      chips('isda_geral', 'Sintomas gerais', [
        'Febre',
        'Astenia',
        'Perda de peso',
        'Ganho de peso',
        'Sudorese noturna',
        'Anorexia',
        'Prurido',
      ]),
      chips('isda_pele', 'Pele e fâneros', [
        'Lesões cutâneas',
        'Prurido',
        'Alteração de coloração',
        'Queda de cabelo',
        'Alterações ungueais',
      ]),
      chips('isda_cabeca', 'Cabeça e pescoço', [
        'Cefaleia',
        'Tontura',
        'Gânglios palpáveis',
        'Dor cervical',
        'Nódulo cervical',
      ]),
      chips('isda_olhos_orl', 'Olhos, ouvidos, nariz e garganta', [
        'Alteração visual',
        'Dor ocular',
        'Hipoacusia',
        'Zumbido',
        'Otalgia',
        'Obstrução nasal',
        'Epistaxe',
        'Odinofagia',
        'Rouquidão',
      ]),
      chips('isda_respiratorio', 'Aparelho respiratório', [
        'Tosse',
        'Expectoração',
        'Hemoptise',
        'Dispneia',
        'Sibilância',
        'Dor torácica ventilatório-dependente',
      ]),
      chips('isda_cardiovascular', 'Aparelho cardiovascular', [
        'Dor precordial',
        'Palpitações',
        'Dispneia aos esforços',
        'Ortopneia',
        'Dispneia paroxística noturna',
        'Edema de membros',
        'Síncope',
        'Claudicação',
      ]),
      chips('isda_digestorio', 'Aparelho digestório', [
        'Pirose',
        'Náuseas',
        'Vômitos',
        'Disfagia',
        'Dor abdominal',
        'Diarreia',
        'Constipação',
        'Melena',
        'Hematoquezia',
        'Icterícia',
      ]),
      chips('isda_urinario', 'Aparelho urinário', [
        'Disúria',
        'Polaciúria',
        'Urgência',
        'Noctúria',
        'Hematúria',
        'Retenção urinária',
        'Incontinência',
        'Dor lombar',
      ]),
      chips('isda_genital', 'Aparelho genital e sexualidade', [
        'Corrimento',
        'Lesões genitais',
        'Dor pélvica',
        'Dispareunia',
        'Disfunção sexual',
        'Alteração menstrual',
      ]),
      chips('isda_endocrino', 'Endócrino e metabólico', [
        'Polidipsia',
        'Poliúria',
        'Polifagia',
        'Intolerância ao calor',
        'Intolerância ao frio',
        'Tremores',
      ]),
      chips('isda_hemato', 'Hemolinfopoiético', [
        'Equimoses fáceis',
        'Sangramentos',
        'Adenomegalias',
        'Palidez',
      ]),
      chips('isda_musculo', 'Musculoesquelético', [
        'Artralgia',
        'Artrite',
        'Rigidez matinal',
        'Mialgia',
        'Lombalgia',
        'Limitação de movimento',
      ]),
      chips('isda_neuro', 'Neurológico', [
        'Cefaleia',
        'Convulsões',
        'Déficit motor',
        'Parestesias',
        'Alteração da marcha',
        'Alteração da fala',
        'Perda de memória',
      ]),
      chips('isda_psiquico', 'Psíquico', [
        'Humor deprimido',
        'Ansiedade',
        'Insônia',
        'Ideação suicida',
        'Alterações de comportamento',
        'Uso problemático de substâncias',
      ]),
      area('isda_observacoes', 'Observações do interrogatório', { rows: 2 }),
    ],
  }
}

export function antecedentesPessoais(): Section {
  return {
    id: 'antecedentes_pessoais',
    title: 'Antecedentes pessoais patológicos',
    hint: 'Doenças, internações e procedimentos anteriores.',
    fields: [
      chips('comorbidades', 'Comorbidades conhecidas', [
        'Hipertensão',
        'Diabetes',
        'Dislipidemia',
        'Obesidade',
        'Asma',
        'DPOC',
        'Cardiopatia',
        'AVC prévio',
        'Doença renal crônica',
        'Hepatopatia',
        'Neoplasia',
        'HIV',
        'Tuberculose',
        'Doença tireoidiana',
        'Transtorno mental',
        'Epilepsia',
      ]),
      area('comorbidades_detalhe', 'Detalhamento das comorbidades', {
        rows: 2,
        placeholder: 'Tempo de diagnóstico, controle atual, complicações…',
      }),
      area('internacoes', 'Internações prévias', { rows: 2, naToggle: true }),
      area('cirurgias', 'Cirurgias prévias', { rows: 2, naToggle: true }),
      text('traumas', 'Traumas e fraturas', { naToggle: true }),
      radio('transfusoes', 'Transfusões sanguíneas', SIM_NAO_IGNORADO),
      text('alergias_medicamentosas', 'Alergias medicamentosas', {
        naToggle: true,
        placeholder: 'Fármaco e tipo de reação',
      }),
      text('alergias_outras', 'Outras alergias', {
        naToggle: true,
        placeholder: 'Alimentos, látex, picadas, ambientais…',
      }),
      text('doencas_infancia', 'Doenças da infância', { naToggle: true }),
      radio('vacinacao', 'Vacinação', ['Em dia', 'Incompleta', 'Não sabe informar']),
      text('vacinacao_detalhe', 'Vacinas em atraso / observações', { naToggle: true }),
    ],
  }
}

export function medicamentos(): Section {
  return {
    id: 'medicamentos',
    title: 'Medicamentos em uso',
    hint: 'Prescritos e por conta própria, com dose e adesão.',
    fields: [
      area('medicamentos_uso', 'Medicamentos de uso contínuo', {
        rows: 4,
        naToggle: true,
        placeholder: 'Um por linha: fármaco — dose — via — frequência — desde quando',
      }),
      area('medicamentos_recentes', 'Medicações usadas recentemente', { rows: 2, naToggle: true }),
      text('fitoterapicos', 'Fitoterápicos, chás e suplementos', { naToggle: true }),
      radio('adesao', 'Adesão ao tratamento', ['Boa', 'Parcial', 'Ruim', 'Não se aplica']),
      text('adesao_barreiras', 'Barreiras à adesão', {
        naToggle: true,
        placeholder: 'Custo, efeitos adversos, esquecimento, acesso…',
      }),
    ],
  }
}

export function antecedentesFamiliares(): Section {
  return {
    id: 'antecedentes_familiares',
    title: 'Antecedentes familiares',
    hint: 'Doenças em parentes de primeiro e segundo grau.',
    fields: [
      chips('familiares_doencas', 'Doenças na família', [
        'Hipertensão',
        'Diabetes',
        'Dislipidemia',
        'Doença coronariana precoce',
        'AVC',
        'Neoplasias',
        'Doença renal',
        'Doença autoimune',
        'Transtorno mental',
        'Tuberculose',
        'Doença genética',
      ]),
      text('familiar_pai', 'Pai — estado de saúde / causa do óbito'),
      text('familiar_mae', 'Mãe — estado de saúde / causa do óbito'),
      text('familiar_irmaos', 'Irmãos', { naToggle: true }),
      text('familiar_filhos', 'Filhos', { naToggle: true }),
      radio('consanguinidade', 'Consanguinidade entre os pais', SIM_NAO_IGNORADO),
      area('familiares_observacoes', 'Observações', { rows: 2 }),
    ],
  }
}

export function habitos(): Section {
  return {
    id: 'habitos',
    title: 'Hábitos e condições de vida',
    hint: 'História social — o contexto em que a doença acontece.',
    fields: [
      radio('tabagismo', 'Tabagismo', ['Nunca fumou', 'Ex-tabagista', 'Tabagista atual']),
      num('cigarros_dia', 'Cigarros por dia', 'cigarros', { naToggle: true }),
      num('anos_fumo', 'Tempo de tabagismo', 'anos', { naToggle: true }),
      computed('carga_tabagica', 'Carga tabágica', (v) => cargaTabagica(v), {
        help: 'Cigarros/dia ÷ 20 × anos de uso.',
      }),
      radio('etilismo', 'Etilismo', ['Não', 'Social', 'Uso frequente', 'Uso problemático']),
      text('etilismo_detalhe', 'Tipo, quantidade e frequência', { naToggle: true }),
      radio('drogas', 'Outras substâncias', SIM_NAO),
      text('drogas_detalhe', 'Quais e com que frequência', { naToggle: true }),
      radio('atividade_fisica', 'Atividade física', [
        'Sedentário',
        'Irregular',
        'Regular (≥150 min/semana)',
      ]),
      text('atividade_detalhe', 'Tipo e frequência', { naToggle: true }),
      area('alimentacao', 'Alimentação', {
        rows: 2,
        placeholder: 'Número de refeições, ultraprocessados, sal, água, restrições…',
      }),
      text('sono', 'Sono', { placeholder: 'Horas por noite, qualidade, roncos, sonolência diurna' }),
      radio('sexualidade_ativa', 'Vida sexual ativa', SIM_NAO),
      text('sexualidade_detalhe', 'Parcerias, práticas e uso de preservativo', { naToggle: true }),
      text('ist_previas', 'ISTs prévias', { naToggle: true }),
      select('moradia', 'Moradia', ['Casa própria', 'Alugada', 'Cedida', 'Situação de rua']),
      num('moradores', 'Pessoas na residência', 'pessoas'),
      chips('saneamento', 'Condições do domicílio', [
        'Água tratada',
        'Rede de esgoto',
        'Coleta de lixo',
        'Energia elétrica',
        'Animais domésticos',
      ]),
      text('exposicoes', 'Exposições ocupacionais e ambientais', {
        naToggle: true,
        placeholder: 'Poeira, químicos, ruído, agrotóxicos, fumaça de lenha…',
      }),
      text('viagens', 'Viagens recentes', { naToggle: true }),
      text('rede_apoio', 'Rede de apoio', { placeholder: 'Com quem conta no dia a dia' }),
    ],
  }
}

export function sinaisVitais(extraFields: Section['fields'] = []): Section {
  return {
    id: 'sinais_vitais',
    title: 'Sinais vitais e antropometria',
    hint: 'Medidas objetivas do momento do atendimento.',
    fields: [
      num('pa_sistolica', 'PA sistólica', 'mmHg'),
      num('pa_diastolica', 'PA diastólica', 'mmHg'),
      computed('pam', 'Pressão arterial média', (v) => pressaoMedia(v)),
      num('fc', 'Frequência cardíaca', 'bpm'),
      num('fr', 'Frequência respiratória', 'irpm'),
      num('temperatura', 'Temperatura axilar', '°C', { step: 0.1 }),
      num('spo2', 'Saturação de O₂', '%'),
      scale('dor_atual', 'Dor no momento (0 a 10)'),
      num('peso', 'Peso', 'kg', { step: 0.1 }),
      num('altura', 'Altura', 'cm'),
      computed('imc', 'IMC', (v) => imc(v)),
      num('circunferencia_abdominal', 'Circunferência abdominal', 'cm', { naToggle: true }),
      num('glicemia_capilar', 'Glicemia capilar', 'mg/dL', { naToggle: true }),
      ...extraFields,
    ],
  }
}

export function ectoscopia(): Section {
  return {
    id: 'ectoscopia',
    title: 'Estado geral e ectoscopia',
    hint: 'A impressão à primeira vista, antes do exame segmentar.',
    fields: [
      radio('estado_geral', 'Estado geral', ['Bom', 'Regular', 'Grave']),
      radio('consciencia', 'Nível de consciência', [
        'Lúcido e orientado',
        'Sonolento',
        'Confuso',
        'Torporoso',
        'Comatoso',
      ]),
      num('glasgow', 'Escala de coma de Glasgow', '/15', { naToggle: true }),
      radio('hidratacao', 'Hidratação', ['Hidratado', 'Desidratado +', 'Desidratado ++', 'Desidratado +++']),
      radio('mucosas', 'Coloração de mucosas', ['Coradas', 'Hipocoradas', 'Descoradas']),
      radio('ictericia', 'Icterícia', ['Ausente', '+/4', '++/4', '+++/4', '++++/4']),
      radio('cianose', 'Cianose', ['Ausente', 'Central', 'Periférica']),
      num('tec', 'Tempo de enchimento capilar', 's', { naToggle: true }),
      radio('edema', 'Edema', ['Ausente', '+/4', '++/4', '+++/4', '++++/4']),
      text('edema_local', 'Localização do edema', { naToggle: true }),
      text('facies', 'Fácies', { placeholder: 'Atípica, de dor, cushingoide, hipocrática…' }),
      text('atitude', 'Atitude e decúbito' ),
      text('marcha', 'Marcha', { naToggle: true }),
      text('biotipo', 'Biotipo e estado nutricional aparente'),
      area('ectoscopia_observacoes', 'Observações', { rows: 2 }),
    ],
  }
}

export function exameSegmentar(): Section {
  return {
    id: 'exame_segmentar',
    title: 'Exame físico segmentar',
    hint: 'Inspeção, palpação, percussão e ausculta, segmento a segmento.',
    fields: [
      radio('ef_cabeca_pescoco_status', 'Cabeça e pescoço', NORMAL_ALTERADO),
      area('ef_cabeca_pescoco', 'Descrição — cabeça e pescoço', {
        rows: 2,
        placeholder: 'Linfonodos, tireoide, turgência jugular, oroscopia, otoscopia…',
      }),
      radio('ef_respiratorio_status', 'Aparelho respiratório', NORMAL_ALTERADO),
      area('ef_respiratorio', 'Descrição — respiratório', {
        rows: 2,
        placeholder: 'Expansibilidade, frêmito, percussão, murmúrio vesicular, ruídos adventícios…',
      }),
      radio('ef_cardiovascular_status', 'Aparelho cardiovascular', NORMAL_ALTERADO),
      area('ef_cardiovascular', 'Descrição — cardiovascular', {
        rows: 2,
        placeholder: 'Ictus, bulhas, sopros, pulsos periféricos, perfusão…',
      }),
      radio('ef_abdome_status', 'Abdome', NORMAL_ALTERADO),
      area('ef_abdome', 'Descrição — abdome', {
        rows: 2,
        placeholder: 'Inspeção, RHA, palpação, visceromegalias, Blumberg, Murphy, Giordano…',
      }),
      radio('ef_extremidades_status', 'Extremidades e vascular', NORMAL_ALTERADO),
      area('ef_extremidades', 'Descrição — extremidades', { rows: 2 }),
      radio('ef_pele_status', 'Pele e fâneros', NORMAL_ALTERADO),
      area('ef_pele', 'Descrição — pele', { rows: 2 }),
      radio('ef_neurologico_status', 'Neurológico', NORMAL_ALTERADO),
      area('ef_neurologico', 'Descrição — neurológico', {
        rows: 2,
        placeholder: 'Pares cranianos, força, tônus, sensibilidade, reflexos, coordenação, sinais meníngeos…',
      }),
      radio('ef_osteoarticular_status', 'Osteoarticular', NORMAL_ALTERADO),
      area('ef_osteoarticular', 'Descrição — osteoarticular', { rows: 2 }),
      radio('ef_genital_status', 'Genital / retal', [...NORMAL_ALTERADO, 'Não realizado']),
      area('ef_genital', 'Descrição — genital / retal', { rows: 2, naToggle: true }),
    ],
  }
}

export function examesComplementares(): Section {
  return {
    id: 'exames',
    title: 'Exames complementares',
    hint: 'Resultados já disponíveis, com a data de cada um.',
    fields: [
      area('exames_laboratorio', 'Exames laboratoriais', {
        rows: 3,
        naToggle: true,
        placeholder: 'Hemograma, função renal, eletrólitos, glicemia, hepatograma… (com datas)',
      }),
      area('exames_imagem', 'Exames de imagem', { rows: 2, naToggle: true }),
      area('exames_ecg', 'ECG', { rows: 2, naToggle: true }),
      area('exames_outros', 'Outros exames e pareceres', { rows: 2, naToggle: true }),
    ],
  }
}

export function avaliacaoSections(extra: Section[] = []): Section[] {
  return [
    {
      id: 'problemas',
      title: 'Lista de problemas',
      hint: 'Tudo o que precisa de conduta, ativo ou em acompanhamento.',
      fields: [
        area('lista_problemas', 'Problemas ativos', {
          rows: 4,
          placeholder: 'Um por linha, em ordem de prioridade.',
        }),
        area('problemas_inativos', 'Problemas inativos / resolvidos', { rows: 2, naToggle: true }),
      ],
    },
    ...extra,
    {
      id: 'hipoteses',
      title: 'Hipóteses diagnósticas',
      hint: 'O raciocínio que liga os achados ao diagnóstico.',
      fields: [
        text('hipotese_principal', 'Hipótese diagnóstica principal', { span: 3 }),
        text('cid', 'CID-10'),
        area('diferenciais', 'Diagnósticos diferenciais', {
          rows: 3,
          placeholder: 'Um por linha, com o que reforça ou afasta cada um.',
        }),
        area('raciocinio', 'Raciocínio clínico / justificativa', {
          rows: 4,
          placeholder: 'Quais dados da anamnese e do exame sustentam a hipótese.',
        }),
        radio('gravidade', 'Gravidade / estabilidade', [
          'Estável',
          'Potencialmente grave',
          'Grave',
          'Instável',
        ]),
        select('classificacao_risco', 'Classificação de risco', [
          'Azul — não urgente',
          'Verde — pouco urgente',
          'Amarelo — urgente',
          'Laranja — muito urgente',
          'Vermelho — emergência',
        ]),
        text('estadiamento', 'Estadiamento / escores aplicados', {
          span: 3,
          naToggle: true,
          placeholder: 'CURB-65, Wells, GRACE, Child-Pugh, NYHA…',
        }),
      ],
    },
  ]
}

export function planoSections(extra: Section[] = []): Section[] {
  return [
    {
      id: 'plano_diagnostico',
      title: 'Plano diagnóstico',
      hint: 'O que ainda falta esclarecer e como.',
      fields: [
        area('exames_solicitados', 'Exames solicitados', {
          rows: 3,
          naToggle: true,
          placeholder: 'Um por linha, com a pergunta clínica que cada um responde.',
        }),
        text('prazo_exames', 'Prazo / urgência dos exames', { naToggle: true }),
      ],
    },
    {
      id: 'plano_terapeutico',
      title: 'Plano terapêutico',
      hint: 'Conduta medicamentosa e não medicamentosa.',
      fields: [
        area('prescricao', 'Prescrição', {
          rows: 5,
          naToggle: true,
          placeholder: 'Fármaco — dose — via — frequência — duração',
        }),
        area('medidas_nao_farmacologicas', 'Medidas não medicamentosas', {
          rows: 3,
          placeholder: 'Dieta, atividade física, fisioterapia, repouso, medidas locais…',
        }),
        area('suspensoes', 'Medicações suspensas ou ajustadas', { rows: 2, naToggle: true }),
      ],
    },
    ...extra,
    {
      id: 'orientacoes',
      title: 'Orientações e seguimento',
      hint: 'O que o paciente leva da consulta.',
      fields: [
        area('orientacoes', 'Orientações e educação em saúde', { rows: 3 }),
        area('sinais_alarme', 'Sinais de alarme para retornar antes', {
          rows: 2,
          placeholder: 'O que deve fazer o paciente procurar atendimento imediatamente.',
        }),
        area('encaminhamentos', 'Encaminhamentos e interconsultas', { rows: 2, naToggle: true }),
        text('retorno', 'Retorno / reavaliação', { placeholder: 'Em quanto tempo e com quem' }),
        radio('prognostico', 'Prognóstico', ['Bom', 'Reservado', 'Ruim', 'Indeterminado']),
        area('evolucao_notas', 'Notas de evolução', { rows: 3, naToggle: true }),
      ],
    },
    {
      id: 'responsavel',
      title: 'Responsável pelo atendimento',
      hint: 'Identificação de quem registrou a anamnese.',
      fields: [
        text('profissional_nome', 'Nome do profissional / estudante', { span: 2 }),
        text('profissional_registro', 'CRM / matrícula'),
        text('preceptor', 'Preceptor responsável', { naToggle: true }),
      ],
    },
  ]
}

export { date, num, radio, select, text, time, area, chips, computed, duration, scale, SIM_NAO, SIM_NAO_IGNORADO, NORMAL_ALTERADO }
