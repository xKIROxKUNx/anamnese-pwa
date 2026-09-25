import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Importa a implementação real compartilhada com o componente ReferencePopover
const { computePopoverPlacement, getEstimatedPopoverHeight } = await import(
  '../src/lib/popoverPlacement.ts'
)

async function runTests() {
  console.log('🧪 Iniciando testes de posicionamento e integridade do ReferencePopover...')

  // 1. Cenário da imagem 1: Glicemia capilar no terço inferior da tela
  // Viewport: 895x924. Trigger em bottom=620 (spaceBelow=280, spaceAbove=572).
  console.log('1. Testando posicionamento inteligente no terço inferior (Glicemia Capilar)...')
  {
    const result = computePopoverPlacement({
      triggerRect: { top: 596, bottom: 620, left: 500, right: 524 },
      windowInnerWidth: 895,
      windowInnerHeight: 924,
      measuredContentHeight: 460,
    })

    assert.equal(
      result.placeAbove,
      true,
      'Deve inverter para cima quando espaço inferior for menor que o conteúdo e houver mais espaço acima',
    )
    assert.equal(result.top, undefined)
    assert.equal(result.bottom, 924 - 596 + 8) // 336
    assert.ok(result.maxHeight >= 460, 'maxHeight acima deve comportar o conteúdo completo')
    assert.ok(result.left >= 12 && result.left + 360 <= 895 - 12, 'left deve estar contido na tela')
  }

  // 2. Cenário da imagem 4: Escala de Glasgow (trigger próximo à base)
  console.log('2. Testando Escala de Glasgow no terço inferior...')
  {
    const result = computePopoverPlacement({
      triggerRect: { top: 680, bottom: 704, left: 260, right: 284 },
      windowInnerWidth: 895,
      windowInnerHeight: 924,
      measuredContentHeight: 420,
    })

    assert.equal(
      result.placeAbove,
      true,
      'Deve abrir acima pois spaceBelow (~196) < 420 e spaceAbove (656) > spaceBelow',
    )
    assert.ok(result.maxHeight >= 420, 'maxHeight acima comporta a tabela de Glasgow inteira sem cortes')
  }

  // 3. Cenário da imagem 3: PA Sistólica no topo da tela
  console.log('3. Testando PA sistólica na metade superior...')
  {
    const result = computePopoverPlacement({
      triggerRect: { top: 220, bottom: 244, left: 250, right: 274 },
      windowInnerWidth: 895,
      windowInnerHeight: 924,
      measuredContentHeight: 500,
    })

    assert.equal(
      result.placeAbove,
      false,
      'Deve abrir abaixo pois spaceBelow (656) é abundante e maior que spaceAbove (196)',
    )
    assert.equal(result.top, 244 + 8)
    assert.equal(result.bottom, undefined)
    assert.ok(result.maxHeight >= 500, 'maxHeight deve comportar o conteúdo de 500px sem corte artificial')
  }

  // 4. Cenário de tela compacta (altura 600px, trigger no meio)
  console.log('4. Testando viewport compacto com espaço intermediário...')
  {
    const result = computePopoverPlacement({
      triggerRect: { top: 280, bottom: 304, left: 400, right: 424 },
      windowInnerWidth: 800,
      windowInnerHeight: 600,
      measuredContentHeight: 480,
    })

    // spaceBelow = 600 - 304 - 24 = 272. spaceAbove = 280 - 24 = 256.
    // spaceAbove (256) NÃO é maior que spaceBelow (272). Fica abaixo.
    assert.equal(result.placeAbove, false)
    assert.equal(result.maxHeight, 272)
    assert.ok(result.maxHeight > 0)
    assert.ok(result.top + result.maxHeight <= 600 - 16, 'Não deve ultrapassar a base da tela')
  }

  // 5. Testando alinhamento horizontal contra bordas laterais
  console.log('5. Testando limites horizontais (clamping)...')
  {
    // Trigger grudado na margem esquerda (right = 100)
    const resultLeftEdge = computePopoverPlacement({
      triggerRect: { top: 300, bottom: 324, left: 76, right: 100 },
      windowInnerWidth: 800,
      windowInnerHeight: 900,
    })
    assert.equal(resultLeftEdge.left, 12, 'Left deve ser clampado no mínimo de 12px')

    // Trigger grudado na margem direita (right = 790)
    const resultRightEdge = computePopoverPlacement({
      triggerRect: { top: 300, bottom: 324, left: 766, right: 790 },
      windowInnerWidth: 800,
      windowInnerHeight: 900,
    })
    const expectedMaxLeft = 800 - 360 - 12
    assert.equal(resultRightEdge.left, expectedMaxLeft, 'Left não deve estourar a borda direita')
  }

  // 6. Verificação estática dos estilos CSS críticos contra corte de tabela
  console.log('6. Verificando integridade das regras CSS no global.css...')
  {
    const cssPath = path.resolve('src/styles/global.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    // Deve garantir flex-shrink: 0 nos filhos do popover para que a tabela nunca seja comprimida
    assert.ok(
      cssContent.includes('.ref-popover > *') && cssContent.includes('flex-shrink: 0'),
      'global.css deve conter ".ref-popover > *" com "flex-shrink: 0"',
    )

    // Deve conter scrollbar e contenção de overscroll no popover
    assert.ok(
      cssContent.includes('overscroll-behavior: contain'),
      'global.css deve conter overscroll-behavior: contain no popover',
    )
    assert.ok(
      cssContent.includes('scrollbar-gutter: stable'),
      'global.css deve conter scrollbar-gutter: stable no popover',
    )

    // A tabela deve ter flex-shrink: 0 e min-height: min-content
    assert.ok(
      cssContent.includes('.ref-popover__table {') && cssContent.includes('min-height: min-content'),
      'global.css deve conter min-height: min-content em .ref-popover__table',
    )

    // Linhas da tabela devem ter flex-shrink: 0
    assert.ok(
      cssContent.includes('.ref-popover__row {') && cssContent.includes('flex-shrink: 0'),
      'global.css deve conter flex-shrink: 0 em .ref-popover__row',
    )

    // Proteção mobile: bottom-sheet modal não pode sofrer conflito de animação com place-above
    assert.ok(
      cssContent.includes('.ref-popover[data-place-above=\'true\']') &&
      cssContent.includes('refPopoverMobileIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important'),
      'global.css deve blindar animação mobile contra conflitos com data-place-above',
    )
  }

  // 7. Teste de estimativa de altura preditiva (evita saltos/flipping de layout)
  console.log('7. Testando cálculo de getEstimatedPopoverHeight...')
  {
    // Glasgow sem avaliação (hint vazio, 4 faixas, nota clínica)
    const glasgowHeight = getEstimatedPopoverHeight(null, {
      fieldId: 'glasgow',
      title: 'Escala de Coma de Glasgow',
      rangesTitle: 'Gravidade',
      ranges: [
        { label: 'Normal', range: '15', status: 'normal' },
        { label: 'Leve', range: '13-14', status: 'alerta' },
        { label: 'Moderado', range: '9-12', status: 'alterado' },
        { label: 'Grave', range: '3-8', status: 'alterado' },
      ],
      clinicalNote: 'Avalia abertura ocular...',
    })
    assert.ok(glasgowHeight >= 400 && glasgowHeight <= 500, `Glasgow height ${glasgowHeight} dentro da faixa esperada`)

    // Glicemia com avaliação ativa (banner alerta, 5 faixas, nota clínica)
    const glicemiaHeight = getEstimatedPopoverHeight(
      {
        fieldId: 'glicemia_capilar',
        status: 'alerta',
        statusLabel: 'Alerta',
        classification: 'Glicemia elevada',
        currentValueFormatted: '153 mg/dL',
        rangesTitle: 'Valores',
        ranges: new Array(5).fill({ label: 'Faixa', range: '0-100', status: 'normal' }),
        clinicalNote: 'Indagar sobre tempo...',
      },
      null,
    )
    assert.ok(glicemiaHeight >= 500 && glicemiaHeight <= 600, `Glicemia height ${glicemiaHeight} dentro da faixa esperada`)
  }

  // 8. Teste de estabilidade determinística (evita inversão/salto antes e após montagem)
  console.log('8. Testando estabilidade determinística de posicionamento pré e pós-mount...')
  {
    const triggerRect = { top: 400, bottom: 424, left: 300, right: 324 }
    const estimatedHeight = 520

    // Cálculo pré-mount (apenas com estimatedHeight)
    const preMount = computePopoverPlacement({
      triggerRect,
      windowInnerWidth: 800,
      windowInnerHeight: 900,
      estimatedHeight,
    })

    // Cálculo pós-mount (quando scrollHeight real é medido como 515px)
    const postMount = computePopoverPlacement({
      triggerRect,
      windowInnerWidth: 800,
      windowInnerHeight: 900,
      measuredContentHeight: 515,
      estimatedHeight,
    })

    assert.equal(
      preMount.placeAbove,
      postMount.placeAbove,
      'placeAbove não pode oscilar/saltar entre a estimativa pré-mount e a medição pós-mount',
    )
  }

  console.log('✅ Todos os testes de posicionamento e resiliência da tabela passaram com sucesso!')
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes de popover:', err)
  process.exit(1)
})
