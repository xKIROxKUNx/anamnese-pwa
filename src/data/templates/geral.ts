import type { AnamneseTemplate } from '../../types/anamnese'
import {
  antecedentesFamiliares,
  antecedentesPessoais,
  avaliacaoSections,
  ectoscopia,
  exameSegmentar,
  examesComplementares,
  habitos,
  hda,
  identificacao,
  isda,
  medicamentos,
  planoSections,
  queixaPrincipal,
  sinaisVitais,
} from '../common'
import { area, date, num, radio, select, text, SIM_NAO_IGNORADO } from '../fields'

export const geral: AnamneseTemplate = {
  id: 'geral',
  title: 'Anamnese geral',
  subtitle: 'Adulto — consulta completa',
  description:
    'O roteiro clássico do adulto: da identificação ao plano, com interrogatório por aparelhos e exame físico completo.',
  icon: '🩺',
  accent: '#2563eb',
  accentSoft: '#dbeafe',
  blocks: [
    {
      key: 'S',
      title: 'Subjetivo',
      subtitle: 'O que o paciente conta: queixa, história, antecedentes e contexto de vida.',
      sections: [
        identificacao(),
        queixaPrincipal(),
        hda(),
        isda(),
        antecedentesPessoais(),
        medicamentos(),
        antecedentesFamiliares(),
        habitos(),
        {
          id: 'gineco_obstetrica',
          title: 'História ginecológica e obstétrica',
          hint: 'Para pessoas com útero — pule se não se aplica.',
          fields: [
            num('menarca', 'Menarca', 'anos', { naToggle: true }),
            text('ciclo', 'Ciclo menstrual', {
              naToggle: true,
              placeholder: 'Duração, intervalo, fluxo, dismenorreia',
            }),
            date('dum_geral', 'Data da última menstruação', { naToggle: true }),
            text('gesta_para_aborto', 'G / P / A', { naToggle: true, placeholder: 'Ex.: G2 P1 A1' }),
            text('contracepcao', 'Método contraceptivo', { naToggle: true }),
            radio('menopausa', 'Menopausa', [...SIM_NAO_IGNORADO]),
            text('preventivo', 'Último preventivo (Papanicolau)', { naToggle: true }),
            text('mamografia', 'Última mamografia', { naToggle: true }),
          ],
        },
      ],
    },
    {
      key: 'O',
      title: 'Objetivo',
      subtitle: 'O que você mede e examina: sinais vitais, exame físico e exames complementares.',
      sections: [sinaisVitais(), ectoscopia(), exameSegmentar(), examesComplementares()],
    },
    {
      key: 'A',
      title: 'Avaliação',
      subtitle: 'A síntese: lista de problemas, hipóteses e o raciocínio que as sustenta.',
      sections: avaliacaoSections(),
    },
    {
      key: 'P',
      title: 'Plano',
      subtitle: 'O que será feito: exames, tratamento, orientações e seguimento.',
      sections: planoSections([
        {
          id: 'prevencao',
          title: 'Prevenção e rastreamento',
          hint: 'A consulta também é oportunidade de prevenção.',
          fields: [
            area('rastreios', 'Rastreios indicados para a idade e o sexo', {
              rows: 2,
              placeholder: 'Citologia, mamografia, colonoscopia, PSA, perfil lipídico…',
            }),
            select('vacinas_indicadas', 'Vacinas a atualizar', [
              'Nenhuma',
              'Influenza',
              'COVID-19',
              'dT / dTpa',
              'Hepatite B',
              'Pneumocócica',
              'Febre amarela',
              'Outras',
            ]),
            area('aconselhamento', 'Aconselhamento', {
              rows: 2,
              placeholder: 'Cessação do tabagismo, álcool, alimentação, atividade física, sexo seguro…',
            }),
          ],
        },
      ]),
    },
  ],
}
