import assert from 'node:assert/strict'

// Importar módulo de referências sob teste
const {
  evaluateFieldReference,
  getFieldReferenceInfo,
} = await import('../src/lib/references.ts')

async function runTests() {
  console.log('🧪 Iniciando testes de valores de referência clínica e motor de avaliação...')

  // 1. Testes de IMC Adulto
  console.log('1. Testando IMC Adulto nas diferentes faixas e limites...')
  {
    // Baixo peso: peso 45kg, altura 170cm -> IMC ~15.57
    const evalBaixo = evaluateFieldReference('imc', undefined, { peso: '45', altura: '170' }, 'geral')
    assert.ok(evalBaixo)
    assert.equal(evalBaixo.status, 'alerta')
    assert.equal(evalBaixo.classification, 'Baixo peso')
    assert.ok(evalBaixo.ranges[0].isCurrent)
    assert.ok(evalBaixo.futureRecommendationHint)

    // Eutrófico: peso 65kg, altura 170cm -> IMC ~22.49
    const evalNormal = evaluateFieldReference('imc', undefined, { peso: '65', altura: '170' }, 'geral')
    assert.ok(evalNormal)
    assert.equal(evalNormal.status, 'normal')
    assert.equal(evalNormal.classification, 'Eutrófico (Peso normal)')
    assert.ok(evalNormal.ranges[1].isCurrent)

    // Sobrepeso: peso 78kg, altura 170cm -> IMC ~26.99
    const evalSobrepeso = evaluateFieldReference('imc', undefined, { peso: '78', altura: '170' }, 'geral')
    assert.ok(evalSobrepeso)
    assert.equal(evalSobrepeso.status, 'alerta')
    assert.equal(evalSobrepeso.classification, 'Sobrepeso')
    assert.ok(evalSobrepeso.ranges[2].isCurrent)

    // Obesidade I: peso 92kg, altura 170cm -> IMC ~31.83
    const evalOb1 = evaluateFieldReference('imc', undefined, { peso: '92', altura: '170' }, 'geral')
    assert.ok(evalOb1)
    assert.equal(evalOb1.status, 'alterado')
    assert.equal(evalOb1.classification, 'Obesidade Grau I')
    assert.ok(evalOb1.ranges[3].isCurrent)

    // Obesidade II: peso 105kg, altura 170cm -> IMC ~36.33
    const evalOb2 = evaluateFieldReference('imc', undefined, { peso: '105', altura: '170' }, 'geral')
    assert.ok(evalOb2)
    assert.equal(evalOb2.status, 'alterado')
    assert.equal(evalOb2.classification, 'Obesidade Grau II (Severa)')
    assert.ok(evalOb2.ranges[4].isCurrent)

    // Obesidade III: peso 125kg, altura 170cm -> IMC ~43.25
    const evalOb3 = evaluateFieldReference('imc', undefined, { peso: '125', altura: '170' }, 'geral')
    assert.ok(evalOb3)
    assert.equal(evalOb3.status, 'alterado')
    assert.equal(evalOb3.classification, 'Obesidade Grau III (Mórbida)')
    assert.ok(evalOb3.ranges[5].isCurrent)
  }

  // 2. Testes de IMC Idoso (Lipschitz/OPAS: 22 a 27)
  console.log('2. Testando IMC do Idoso com pontos de corte diferenciados (Lipschitz)...')
  {
    // IMC 20.8: seria normal para adulto jovem, mas no idoso é BAIXO PESO (< 22.0)
    const evalIdosoBaixo = evaluateFieldReference('imc', undefined, { peso: '50', altura: '155' }, 'idoso')
    assert.ok(evalIdosoBaixo)
    assert.equal(evalIdosoBaixo.status, 'alerta')
    assert.equal(evalIdosoBaixo.classification, 'Baixo peso no idoso')
    assert.ok(evalIdosoBaixo.ranges[0].isCurrent)

    // IMC 24.5: eutrófico no idoso (22.0 – 27.0)
    const evalIdosoNormal = evaluateFieldReference('imc', undefined, { peso: '60', altura: '155' }, 'idoso')
    assert.ok(evalIdosoNormal)
    assert.equal(evalIdosoNormal.status, 'normal')
    assert.equal(evalIdosoNormal.classification, 'Eutrófico (Peso adequado)')
    assert.ok(evalIdosoNormal.ranges[1].isCurrent)

    // IMC 29.1: sobrepeso no idoso (> 27.0)
    const evalIdosoSobre = evaluateFieldReference('imc', undefined, { peso: '70', altura: '155' }, 'idoso')
    assert.ok(evalIdosoSobre)
    assert.equal(evalIdosoSobre.status, 'alerta')
    assert.equal(evalIdosoSobre.classification, 'Sobrepeso no idoso')
    assert.ok(evalIdosoSobre.ranges[2].isCurrent)

    // IMC Pediátrico (OMS / SBP escores Z):
    // Criança com IMC 12.0 (< 13.5) -> Magreza acentuada (alterado)
    const evalPedMagrezaAcentuada = evaluateFieldReference('imc', undefined, { peso: '18', altura: '125' }, 'crianca') // IMC ~11.52
    assert.ok(evalPedMagrezaAcentuada)
    assert.equal(evalPedMagrezaAcentuada.status, 'alterado')
    assert.equal(evalPedMagrezaAcentuada.classification, 'Magreza acentuada (Pediatria)')

    // Criança com IMC 14.0 (13.5 a 15.0) -> Magreza (alerta)
    const evalPedMagreza = evaluateFieldReference('imc', undefined, { peso: '22', altura: '125' }, 'crianca') // IMC ~14.08
    assert.ok(evalPedMagreza)
    assert.equal(evalPedMagreza.status, 'alerta')
    assert.equal(evalPedMagreza.classification, 'Magreza (Pediatria)')

    // Criança com IMC 16.0 (15.0 a 18.5) -> Eutrófico (normal)
    const evalPedNormal = evaluateFieldReference('imc', undefined, { peso: '25', altura: '125' }, 'crianca') // IMC ~16.0
    assert.ok(evalPedNormal)
    assert.equal(evalPedNormal.status, 'normal')
    assert.equal(evalPedNormal.classification, 'Eutrófico (Adequado para pediatria)')

    // Criança com IMC 19.5 (18.5 a 21.0) -> Risco de sobrepeso (alerta)
    const evalPedSobrepeso = evaluateFieldReference('imc', undefined, { peso: '31', altura: '126' }, 'crianca') // IMC ~19.53
    assert.ok(evalPedSobrepeso)
    assert.equal(evalPedSobrepeso.status, 'alerta')
    assert.equal(evalPedSobrepeso.classification, 'Risco de sobrepeso (Pediatria)')

    // Criança com IMC 24.0 (> 21.0) -> Obesidade infantil (alterado)
    const evalPedObeso = evaluateFieldReference('imc', undefined, { peso: '38', altura: '125' }, 'crianca') // IMC ~24.32
    assert.ok(evalPedObeso)
    assert.equal(evalPedObeso.status, 'alterado')
    assert.equal(evalPedObeso.classification, 'Obesidade infantil')

    // IMC Gestacional (Atalah / MS):
    // Gestante IMC 18.0 (< 18.5) -> Baixo peso gestacional (alerta)
    const evalGestBaixo = evaluateFieldReference('imc', undefined, { peso: '46', altura: '160' }, 'gestante') // IMC ~17.97
    assert.ok(evalGestBaixo)
    assert.equal(evalGestBaixo.status, 'alerta')
    assert.equal(evalGestBaixo.classification, 'Baixo peso gestacional (Atalah)')

    // Gestante IMC 22.0 (18.5 - 25.0) -> Eutrófica na gestação (normal)
    const evalGestNormal = evaluateFieldReference('imc', undefined, { peso: '57', altura: '160' }, 'gestante') // IMC ~22.27
    assert.ok(evalGestNormal)
    assert.equal(evalGestNormal.status, 'normal')
    assert.equal(evalGestNormal.classification, 'Eutrófica na gestação (Atalah)')

    // Gestante IMC 27.0 (25.0 - 30.0) -> Sobrepeso gestacional (alerta)
    const evalGestSobre = evaluateFieldReference('imc', undefined, { peso: '70', altura: '160' }, 'gestante') // IMC ~27.34
    assert.ok(evalGestSobre)
    assert.equal(evalGestSobre.status, 'alerta')
    assert.equal(evalGestSobre.classification, 'Sobrepeso gestacional (Atalah)')

    // Gestante IMC 33.0 (> 30.0) -> Obesidade gestacional (alterado)
    const evalGestObesa = evaluateFieldReference('imc', undefined, { peso: '85', altura: '160' }, 'gestante') // IMC ~33.20
    assert.ok(evalGestObesa)
    assert.equal(evalGestObesa.status, 'alterado')
    assert.equal(evalGestObesa.classification, 'Obesidade gestacional (Atalah)')
  }

  // 3. Testes de Pressão Arterial Sistólica e Diastólica no Adulto
  console.log('3. Testando Pressão Arterial no adulto (DBH/SBC)...')
  {
    // PAS Hipotensão (< 90)
    const pasHipo = evaluateFieldReference('pa_sistolica', '85', {}, 'geral')
    assert.ok(pasHipo)
    assert.equal(pasHipo.status, 'alerta')
    assert.equal(pasHipo.classification, 'Hipotensão sistólica')

    // PAS Ótima / Normal (90-129)
    const pasNormal = evaluateFieldReference('pa_sistolica', '120', {}, 'geral')
    assert.ok(pasNormal)
    assert.equal(pasNormal.status, 'normal')
    assert.equal(pasNormal.classification, 'Pressão Sistólica Ótima / Normal')

    // PAS Pré-hipertensão (130-139)
    const pasPre = evaluateFieldReference('pa_sistolica', '135', {}, 'geral')
    assert.ok(pasPre)
    assert.equal(pasPre.status, 'alerta')
    assert.equal(pasPre.classification, 'Pré-hipertensão')

    // PAS Hipertensão Estágio 1 (140-159)
    const pasHas1 = evaluateFieldReference('pa_sistolica', '145', {}, 'geral')
    assert.ok(pasHas1)
    assert.equal(pasHas1.status, 'alterado')
    assert.equal(pasHas1.classification, 'Hipertensão Estágio 1')

    // PAS Hipertensão Estágio 2 (160-179)
    const pasHas2 = evaluateFieldReference('pa_sistolica', '165', {}, 'geral')
    assert.ok(pasHas2)
    assert.equal(pasHas2.status, 'alterado')
    assert.equal(pasHas2.classification, 'Hipertensão Estágio 2')

    // PAS Crise (>= 180)
    const pasCrise = evaluateFieldReference('pa_sistolica', '190', {}, 'geral')
    assert.ok(pasCrise)
    assert.equal(pasCrise.status, 'alterado')
    assert.equal(pasCrise.classification, 'Crise Hipertensiva / Estágio 3')

    // PAD Hipotensão (< 60)
    const padHipo = evaluateFieldReference('pa_diastolica', '55', {}, 'geral')
    assert.ok(padHipo)
    assert.equal(padHipo.status, 'alerta')

    // PAD Normal (60-84)
    const padNormal = evaluateFieldReference('pa_diastolica', '80', {}, 'geral')
    assert.ok(padNormal)
    assert.equal(padNormal.status, 'normal')

    // PAD Pré-hipertensão (85-89)
    const padPre = evaluateFieldReference('pa_diastolica', '88', {}, 'geral')
    assert.ok(padPre)
    assert.equal(padPre.status, 'alerta')

    // PAD Hipertensão (90-109)
    const padHas = evaluateFieldReference('pa_diastolica', '95', {}, 'geral')
    assert.ok(padHas)
    assert.equal(padHas.status, 'alterado')

    // PAD Crise (>= 110)
    const padCrise = evaluateFieldReference('pa_diastolica', '115', {}, 'geral')
    assert.ok(padCrise)
    assert.equal(padCrise.status, 'alterado')
  }

  // 4. Testes de Pressão Arterial na Gestante
  console.log('4. Testando Pressão Arterial obstétrica (Gestante)...')
  {
    // PAS Normal gestante (< 120)
    const pasGestNormal = evaluateFieldReference('pa_sistolica', '110', {}, 'gestante')
    assert.ok(pasGestNormal)
    assert.equal(pasGestNormal.status, 'normal')

    // PAS Alerta gestante (120-139)
    const pasGestAlerta = evaluateFieldReference('pa_sistolica', '130', {}, 'gestante')
    assert.ok(pasGestAlerta)
    assert.equal(pasGestAlerta.status, 'alerta')

    // PAS Hipertensão na Gestação (140-159)
    const pasGestHas = evaluateFieldReference('pa_sistolica', '142', {}, 'gestante')
    assert.ok(pasGestHas)
    assert.equal(pasGestHas.status, 'alterado')
    assert.equal(pasGestHas.classification, 'Hipertensão na Gestação')

    // PAS Emergência obstétrica (>= 160)
    const pasGestGrave = evaluateFieldReference('pa_sistolica', '165', {}, 'gestante')
    assert.ok(pasGestGrave)
    assert.equal(pasGestGrave.status, 'alterado')
    assert.equal(pasGestGrave.classification, 'Hipertensão Grave (Emergência Obstétrica)')

    // PAD Hipertensão Gestacional (>= 90)
    const padGestHas = evaluateFieldReference('pa_diastolica', '92', {}, 'gestante')
    assert.ok(padGestHas)
    assert.equal(padGestHas.status, 'alterado')

    // Pressão Arterial Pediátrica (SBC / PALS):
    // PAS < 80 -> Hipotensão na infância (alterado)
    const pasPedHipo = evaluateFieldReference('pa_sistolica', '75', {}, 'crianca')
    assert.ok(pasPedHipo)
    assert.equal(pasPedHipo.status, 'alterado')
    assert.equal(pasPedHipo.classification, 'Hipotensão na infância')

    // PAS 80-110 -> Normal (normal)
    const pasPedNormal = evaluateFieldReference('pa_sistolica', '95', {}, 'crianca')
    assert.ok(pasPedNormal)
    assert.equal(pasPedNormal.status, 'normal')
    assert.equal(pasPedNormal.classification, 'Pressão Sistólica Normal (Pediatria)')

    // PAS 111-120 -> Pré-hipertensão (alerta)
    const pasPedPre = evaluateFieldReference('pa_sistolica', '115', {}, 'crianca')
    assert.ok(pasPedPre)
    assert.equal(pasPedPre.status, 'alerta')
    assert.equal(pasPedPre.classification, 'Pré-hipertensão pediátrica')

    // PAS > 120 -> Hipertensão na infância (alterado)
    const pasPedHas = evaluateFieldReference('pa_sistolica', '128', {}, 'crianca')
    assert.ok(pasPedHas)
    assert.equal(pasPedHas.status, 'alterado')
    assert.equal(pasPedHas.classification, 'Hipertensão na Infância')

    // PAD pediátrica
    const padPedHipo = evaluateFieldReference('pa_diastolica', '45', {}, 'crianca')
    assert.ok(padPedHipo)
    assert.equal(padPedHipo.status, 'alterado')

    const padPedNormal = evaluateFieldReference('pa_diastolica', '65', {}, 'crianca')
    assert.ok(padPedNormal)
    assert.equal(padPedNormal.status, 'normal')

    const padPedHas = evaluateFieldReference('pa_diastolica', '80', {}, 'crianca')
    assert.ok(padPedHas)
    assert.equal(padPedHas.status, 'alterado')
  }

  // 5. Testes de PAM (Pressão Arterial Média)
  console.log('5. Testando PAM...')
  {
    // Hipoperfusão: 80/50 -> PAM = (80 + 100) / 3 = 60 (< 70)
    const pamBaixa = evaluateFieldReference('pam', undefined, { pa_sistolica: '80', pa_diastolica: '50' })
    assert.ok(pamBaixa)
    assert.equal(pamBaixa.status, 'alterado')
    assert.equal(pamBaixa.classification, 'Hipoperfusão tecidual')

    // Normal: 120/80 -> PAM = (120 + 160) / 3 = 93.3 (70-105)
    const pamNormal = evaluateFieldReference('pam', undefined, { pa_sistolica: '120', pa_diastolica: '80' })
    assert.ok(pamNormal)
    assert.equal(pamNormal.status, 'normal')
    assert.equal(pamNormal.classification, 'Perfusão adequada')

    // Elevada: 150/95 -> PAM = (150 + 190) / 3 = 113.3 (106-125)
    const pamElevada = evaluateFieldReference('pam', undefined, { pa_sistolica: '150', pa_diastolica: '95' })
    assert.ok(pamElevada)
    assert.equal(pamElevada.status, 'alerta')
    assert.equal(pamElevada.classification, 'PAM elevada')
  }

  // 6. Testes de Frequência Cardíaca (FC)
  console.log('6. Testando Frequência Cardíaca (FC)...')
  {
    assert.equal(evaluateFieldReference('fc', '45', {}, 'geral')?.status, 'alterado')
    assert.equal(evaluateFieldReference('fc', '55', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('fc', '75', {}, 'geral')?.status, 'normal')
    assert.equal(evaluateFieldReference('fc', '110', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('fc', '135', {}, 'geral')?.status, 'alterado')
  }

  // 7. Testes de Frequência Respiratória (FR)
  console.log('7. Testando Frequência Respiratória (FR)...')
  {
    assert.equal(evaluateFieldReference('fr', '8', {}, 'geral')?.status, 'alterado')
    assert.equal(evaluateFieldReference('fr', '11', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('fr', '16', {}, 'geral')?.status, 'normal')
    assert.equal(evaluateFieldReference('fr', '22', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('fr', '22', {}, 'geral')?.classification, 'Taquipneia leve')
    assert.equal(evaluateFieldReference('fr', '28', {}, 'geral')?.status, 'alterado')
  }

  // 8. Testes de Temperatura Axilar
  console.log('8. Testando Temperatura Axilar...')
  {
    assert.equal(evaluateFieldReference('temperatura', '34.5', {}, 'geral')?.status, 'alterado')
    assert.equal(evaluateFieldReference('temperatura', '35.2', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('temperatura', '36.6', {}, 'geral')?.status, 'normal')
    assert.equal(evaluateFieldReference('temperatura', '37.5', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('temperatura', '38.2', {}, 'geral')?.status, 'alterado')
    assert.equal(evaluateFieldReference('temperatura', '39.4', {}, 'geral')?.status, 'alterado')
  }

  // 9. Testes de Saturação de O2 (SpO2)
  console.log('9. Testando SpO2...')
  {
    assert.equal(evaluateFieldReference('spo2', '98', {}, 'geral')?.status, 'normal')
    assert.equal(evaluateFieldReference('spo2', '94', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('spo2', '91', {}, 'geral')?.status, 'alterado')
    assert.equal(evaluateFieldReference('spo2', '86', {}, 'geral')?.status, 'alterado')
  }

  // 10. Testes de Glicemia Capilar (Geral e Gestante)
  console.log('10. Testando Glicemia Capilar...')
  {
    // Adulto
    assert.equal(evaluateFieldReference('glicemia_capilar', '62', {}, 'geral')?.status, 'alterado')
    assert.equal(evaluateFieldReference('glicemia_capilar', '88', {}, 'geral')?.status, 'normal')
    assert.equal(evaluateFieldReference('glicemia_capilar', '115', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('glicemia_capilar', '165', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('glicemia_capilar', '240', {}, 'geral')?.status, 'alterado')

    // Gestante (corte DMG jejum >= 92)
    assert.equal(evaluateFieldReference('glicemia_capilar', '85', {}, 'gestante')?.status, 'normal')
    assert.equal(evaluateFieldReference('glicemia_capilar', '95', {}, 'gestante')?.status, 'alterado')
  }

  // 11. Testes de Escala de Dor (0 a 10)
  console.log('11. Testando Escala de Dor...')
  {
    assert.equal(evaluateFieldReference('dor_atual', '0', {}, 'geral')?.status, 'normal')
    assert.equal(evaluateFieldReference('dor_atual', '2', {}, 'geral')?.status, 'normal')
    assert.equal(evaluateFieldReference('dor_atual', '5', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('dor_atual', '8', {}, 'geral')?.status, 'alterado')
  }

  // 12. Testes de Hipotensão Ortostática no Idoso
  console.log('12. Testando Hipotensão Ortostática no Idoso...')
  {
    // Queda sistólica de 25 mmHg (140 sentado para 115 em pé)
    const ortoAlterada = evaluateFieldReference(
      'pa_ortostatica_sistolica',
      '115',
      { pa_sistolica: '140', pa_diastolica: '80', pa_ortostatica_sistolica: '115', pa_ortostatica_diastolica: '78' },
      'idoso',
    )
    assert.ok(ortoAlterada)
    assert.equal(ortoAlterada.status, 'alterado')
    assert.ok(ortoAlterada.classification.includes('Hipotensão Ortostática'))

    // Variação normal (130 para 125)
    const ortoNormal = evaluateFieldReference(
      'pa_ortostatica_sistolica',
      '125',
      { pa_sistolica: '130', pa_diastolica: '80', pa_ortostatica_sistolica: '125', pa_ortostatica_diastolica: '78' },
      'idoso',
    )
    assert.ok(ortoNormal)
    assert.equal(ortoNormal.status, 'normal')
  }

  // 13. Testes de Escores e Testes Geriátricos
  console.log('13. Testando Escores Geriátricos (TUG, Marcha, IVCF-20, GDS-15, MEEM, Katz, Lawton)...')
  {
    // Timed Up and Go (TUG)
    assert.equal(evaluateFieldReference('timed_up_go', '9', {}, 'idoso')?.status, 'normal')
    assert.equal(evaluateFieldReference('timed_up_go', '14', {}, 'idoso')?.status, 'alerta')
    assert.equal(evaluateFieldReference('timed_up_go', '22', {}, 'idoso')?.status, 'alterado')

    // Velocidade de marcha
    assert.equal(evaluateFieldReference('velocidade_marcha', '1.1', {}, 'idoso')?.status, 'normal')
    assert.equal(evaluateFieldReference('velocidade_marcha', '0.6', {}, 'idoso')?.status, 'alterado')

    // IVCF-20
    assert.equal(evaluateFieldReference('ivcf20', '4', {}, 'idoso')?.status, 'normal')
    assert.equal(evaluateFieldReference('ivcf20', '10', {}, 'idoso')?.status, 'alerta')
    assert.equal(evaluateFieldReference('ivcf20', '18', {}, 'idoso')?.status, 'alterado')

    // GDS-15
    assert.equal(evaluateFieldReference('gds15', '3', {}, 'idoso')?.status, 'normal')
    assert.equal(evaluateFieldReference('gds15', '8', {}, 'idoso')?.status, 'alerta')
    assert.equal(evaluateFieldReference('gds15', '13', {}, 'idoso')?.status, 'alterado')

    // MEEM
    assert.equal(evaluateFieldReference('meem', '27', {}, 'idoso')?.status, 'normal')
    assert.equal(evaluateFieldReference('meem', '21', {}, 'idoso')?.status, 'alerta')
    assert.equal(evaluateFieldReference('meem', '15', {}, 'idoso')?.status, 'alterado')

    // Katz
    assert.equal(evaluateFieldReference('katz_escore', '6', {}, 'idoso')?.status, 'normal')
    assert.equal(evaluateFieldReference('katz_escore', '5', {}, 'idoso')?.status, 'alerta')
    assert.equal(evaluateFieldReference('katz_escore', '2', {}, 'idoso')?.status, 'alterado')

    // Lawton
    assert.equal(evaluateFieldReference('lawton_escore', '27', {}, 'idoso')?.status, 'normal')
    assert.equal(evaluateFieldReference('lawton_escore', '22', {}, 'idoso')?.status, 'alerta')
    assert.equal(evaluateFieldReference('lawton_escore', '14', {}, 'idoso')?.status, 'alterado')

    // Polifarmácia (numero_medicamentos)
    assert.equal(evaluateFieldReference('numero_medicamentos', '3', {}, 'idoso')?.status, 'normal')
    assert.equal(evaluateFieldReference('numero_medicamentos', '6', {}, 'idoso')?.status, 'alerta')
    assert.equal(evaluateFieldReference('numero_medicamentos', '11', {}, 'idoso')?.status, 'alterado')

    // Quedas (numero_quedas)
    assert.equal(evaluateFieldReference('numero_quedas', '0', {}, 'idoso')?.status, 'normal')
    assert.equal(evaluateFieldReference('numero_quedas', '1', {}, 'idoso')?.status, 'alerta')
    assert.equal(evaluateFieldReference('numero_quedas', '3', {}, 'idoso')?.status, 'alterado')

    // Força de Preensão Palmar (EWGSOP2):
    // Homem: corte 27 kg
    assert.equal(evaluateFieldReference('forca_preensao', '22', { sexo: 'Masculino' }, 'idoso')?.status, 'alterado')
    assert.equal(evaluateFieldReference('forca_preensao', '32', { sexo: 'Masculino' }, 'idoso')?.status, 'normal')
    // Mulher: corte 16 kg
    assert.equal(evaluateFieldReference('forca_preensao', '14', { sexo: 'Feminino' }, 'idoso')?.status, 'alterado')
    assert.equal(evaluateFieldReference('forca_preensao', '20', { sexo: 'Feminino' }, 'idoso')?.status, 'normal')

    // Fluência Verbal Semântica
    assert.equal(evaluateFieldReference('fluencia_verbal', '7', {}, 'idoso')?.status, 'alterado')
    assert.equal(evaluateFieldReference('fluencia_verbal', '11', {}, 'idoso')?.status, 'alerta')
    assert.equal(evaluateFieldReference('fluencia_verbal', '16', {}, 'idoso')?.status, 'normal')

    // Levantar da Cadeira
    assert.equal(evaluateFieldReference('levantar_cadeira', 'Consegue', {}, 'idoso')?.status, 'normal')
    assert.equal(evaluateFieldReference('levantar_cadeira', 'Consegue com dificuldade', {}, 'idoso')?.status, 'alerta')
    assert.equal(evaluateFieldReference('levantar_cadeira', 'Não consegue', {}, 'idoso')?.status, 'alterado')

    // Equilíbrio em Três Posições (SPPB)
    assert.equal(evaluateFieldReference('equilibrio', 'Estável nas três posições', {}, 'idoso')?.status, 'normal')
    assert.equal(evaluateFieldReference('equilibrio', 'Instável', {}, 'idoso')?.status, 'alterado')

    // Lesões por Pressão (NPUAP)
    assert.equal(evaluateFieldReference('lesoes_pressao', 'Não apresenta', {}, 'idoso')?.status, 'normal')
    assert.equal(evaluateFieldReference('lesoes_pressao', 'Estágio 1', {}, 'idoso')?.status, 'alerta')
    assert.equal(evaluateFieldReference('lesoes_pressao', 'Estágios 2, 3, 4 ou Inclassificável', {}, 'idoso')?.status, 'alterado')
  }

  // 14. Testes de Pediatria e Obstetrícia (BCF, Peso ao nascer, IG, Tempo de tela, PC, Comprimento, Apgar, AU, Dilatação)
  console.log('14. Testando Pediatria e Obstetrícia...')
  {
    // BCF
    assert.equal(evaluateFieldReference('bcf', '95', {}, 'gestante')?.status, 'alterado')
    assert.equal(evaluateFieldReference('bcf', '140', {}, 'gestante')?.status, 'normal')
    assert.equal(evaluateFieldReference('bcf', '175', {}, 'gestante')?.status, 'alterado')

    // Peso ao nascer
    assert.equal(evaluateFieldReference('peso_nascimento', '1200', {}, 'crianca')?.status, 'alterado')
    assert.equal(evaluateFieldReference('peso_nascimento', '2200', {}, 'crianca')?.status, 'alerta')
    assert.equal(evaluateFieldReference('peso_nascimento', '3200', {}, 'crianca')?.status, 'normal')
    assert.equal(evaluateFieldReference('peso_nascimento', '4300', {}, 'crianca')?.status, 'alerta')

    // IG nascimento
    assert.equal(evaluateFieldReference('ig_nascimento', '34', {}, 'crianca')?.status, 'alerta')
    assert.equal(evaluateFieldReference('ig_nascimento', '39', {}, 'crianca')?.status, 'normal')
    assert.equal(evaluateFieldReference('ig_nascimento', '43', {}, 'crianca')?.status, 'alerta')

    // Tempo de tela
    assert.equal(evaluateFieldReference('tempo_tela', '1', {}, 'crianca')?.status, 'normal')
    assert.equal(evaluateFieldReference('tempo_tela', '2', {}, 'crianca')?.status, 'alerta')
    assert.equal(evaluateFieldReference('tempo_tela', '4', {}, 'crianca')?.status, 'alerta')

    // Perímetro Cefálico ao nascer (pc_nascimento)
    assert.equal(evaluateFieldReference('pc_nascimento', '31.0', {}, 'crianca')?.status, 'alterado')
    assert.equal(evaluateFieldReference('pc_nascimento', '35.0', {}, 'crianca')?.status, 'normal')
    assert.equal(evaluateFieldReference('pc_nascimento', '38.5', {}, 'crianca')?.status, 'alerta')

    // Comprimento ao nascer (comprimento_nascimento)
    assert.equal(evaluateFieldReference('comprimento_nascimento', '45.0', {}, 'crianca')?.status, 'alerta')
    assert.equal(evaluateFieldReference('comprimento_nascimento', '50.0', {}, 'crianca')?.status, 'normal')
    assert.equal(evaluateFieldReference('comprimento_nascimento', '55.0', {}, 'crianca')?.status, 'alerta')

    // Apgar (1º e 5º minutos)
    assert.equal(evaluateFieldReference('apgar', '2/3', {}, 'crianca')?.status, 'alterado')
    assert.equal(evaluateFieldReference('apgar', '5', {}, 'crianca')?.status, 'alerta')
    assert.equal(evaluateFieldReference('apgar', '7', {}, 'crianca')?.status, 'alerta')
    assert.equal(evaluateFieldReference('apgar', '8/9', {}, 'crianca')?.status, 'normal')

    // Altura Uterina (AU)
    assert.equal(evaluateFieldReference('altura_uterina', '12', {}, 'gestante')?.status, 'alerta')
    assert.equal(evaluateFieldReference('altura_uterina', '28', {}, 'gestante')?.status, 'normal')
    assert.equal(evaluateFieldReference('altura_uterina', '40', {}, 'gestante')?.status, 'alerta')

    // Dilatação Cervical
    assert.equal(evaluateFieldReference('dilatacao', '2', {}, 'gestante')?.status, 'normal')
    assert.equal(evaluateFieldReference('dilatacao', '6', {}, 'gestante')?.status, 'normal')
    assert.equal(evaluateFieldReference('dilatacao', '10', {}, 'gestante')?.status, 'normal')
    assert.equal(evaluateFieldReference('dilatacao', '12', {}, 'gestante'), null) // Fora do intervalo válido
  }

  // 15. Testes de Campos Qualitativos (Estado Geral, Consciência, Hidratação, Risco)
  console.log('15. Testando Campos Qualitativos...')
  {
    assert.equal(evaluateFieldReference('estado_geral', 'Bom', {}, 'geral')?.status, 'normal')
    assert.equal(evaluateFieldReference('estado_geral', 'Regular', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('estado_geral', 'Grave', {}, 'geral')?.status, 'alterado')

    assert.equal(evaluateFieldReference('consciencia', 'Lúcido e orientado', {}, 'geral')?.status, 'normal')
    assert.equal(evaluateFieldReference('consciencia', 'Sonolento', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('consciencia', 'Comatoso', {}, 'geral')?.status, 'alterado')

    assert.equal(evaluateFieldReference('classificacao_risco', 'Verde — pouco urgente', {}, 'geral')?.status, 'normal')
    assert.equal(evaluateFieldReference('classificacao_risco', 'Amarelo — urgente', {}, 'geral')?.status, 'alerta')
    assert.equal(evaluateFieldReference('classificacao_risco', 'Vermelho — emergência', {}, 'geral')?.status, 'alterado')

    assert.equal(evaluateFieldReference('ef_respiratorio_status', 'Sem alterações', {}, 'geral')?.status, 'normal')
    assert.equal(evaluateFieldReference('ef_respiratorio_status', 'Alterado', {}, 'geral')?.status, 'alerta')
  }

  // 16. Testes de Resiliência e Casos Limítrofes (Valores inválidos, nulos, vazios)
  console.log('16. Testando Resiliência contra dados inválidos ou nulos...')
  {
    assert.equal(evaluateFieldReference('pa_sistolica', '', {}), null)
    assert.equal(evaluateFieldReference('pa_sistolica', '   ', {}), null)
    assert.equal(evaluateFieldReference('pa_sistolica', 'texto', {}), null)
    assert.equal(evaluateFieldReference('pa_sistolica', undefined, {}), null)
    assert.equal(evaluateFieldReference('pa_sistolica', -50, {}), null)
    assert.equal(evaluateFieldReference('pa_sistolica', 0, {}), null)

    // IMC sem peso ou sem altura deve retornar null
    assert.equal(evaluateFieldReference('imc', undefined, { peso: '70' }), null)
    assert.equal(evaluateFieldReference('imc', undefined, { altura: '170' }), null)
    assert.equal(evaluateFieldReference('imc', undefined, { peso: 'abc', altura: '170' }), null)
    assert.equal(evaluateFieldReference('imc', undefined, { peso: '70', altura: '0' }), null)

    // getFieldReferenceInfo retorna dados para campo mesmo sem valor
    const infoImc = getFieldReferenceInfo('imc')
    assert.ok(infoImc)
    assert.equal(infoImc.unit, 'kg/m²')
    assert.ok(infoImc.ranges.length > 0)

    const infoPAS = getFieldReferenceInfo('pa_sistolica')
    assert.ok(infoPAS)
    assert.equal(infoPAS.unit, 'mmHg')
  }

  console.log('✅ Todos os 16 grupos de testes de valores de referência passaram com sucesso!')
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes de referências:', err)
  process.exit(1)
})
