import type { SoapBlock, SoapKey } from '../types/anamnese'

interface Props {
  blocks: SoapBlock[]
  active: SoapKey
  onSelect: (key: SoapKey) => void
}

export function SoapNav({ blocks, active, onSelect }: Props) {
  return (
    <div className="soap-nav" role="tablist" aria-label="Blocos SOAP">
      {blocks.map((block) => (
        <button
          key={block.key}
          type="button"
          role="tab"
          className="soap-tab"
          aria-selected={block.key === active}
          onClick={() => onSelect(block.key)}
        >
          <span className="soap-tab__key" aria-hidden="true">
            {block.key}
          </span>
          <span className="soap-tab__label">
            <strong>{block.title}</strong>
            <span>
              {block.sections.length} {block.sections.length === 1 ? 'seção' : 'seções'}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
