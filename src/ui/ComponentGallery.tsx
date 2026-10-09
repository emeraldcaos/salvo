import { useState } from 'react'
import { Badge } from './Badge'
import { Button, ButtonLink } from './Button'
import { Card, CardTitle, Muted, Row } from './Card'
import { Chip, ChipRow } from './Chip'
import { Icon } from './Icon'
import { iconNames } from './iconNames'
import { Keypad, PinDots } from './Keypad'
import { ListRow } from './ListRow'
import { ProgressBar } from './ProgressBar'

export type GalleryMessages = {
  title: string
  intro: string
  tokens: string
  buttons: string
  badges: string
  chips: string
  listRows: string
  progress: string
  keypad: string
  icons: string
  primary: string
  ghost: string
  danger: string
  linkStyled: string
  okBadge: string
  warnBadge: string
  chipLegal: string
  chipFood: string
  chipClinic: string
  rowDone: string
  rowTodo: string
  done: string
  todo: string
  progressLabel: string
  pinDotsLabel: string
  deleteLabel: string
  ink: string
  mint: string
  amber: string
  cardSampleTitle: string
  cardSampleBody: string
  back: string
}

type ComponentGalleryProps = {
  messages: GalleryMessages
  onBack: () => void
}

export function ComponentGallery({ messages, onBack }: ComponentGalleryProps) {
  const [selectedChip, setSelectedChip] = useState('legal')
  const [pinLength, setPinLength] = useState(3)

  return (
    <div className="ui-screen ui-gallery">
      <Row>
        <h1>{messages.title}</h1>
        <Button variant="ghost" compact onClick={onBack}>
          {messages.back}
        </Button>
      </Row>
      <Muted>{messages.intro}</Muted>

      <section className="ui-gallery__section" aria-labelledby="gallery-tokens">
        <h2 id="gallery-tokens">{messages.tokens}</h2>
        <div className="ui-gallery__swatches">
          <div
            className="ui-gallery__swatch"
            style={{ background: 'var(--ink)', color: 'var(--text)' }}
          >
            {messages.ink}
            <br />
            #0E1A24
          </div>
          <div
            className="ui-gallery__swatch"
            style={{ background: 'var(--mint)', color: 'var(--mint-ink)' }}
          >
            {messages.mint}
            <br />
            #5FD3B0
          </div>
          <div
            className="ui-gallery__swatch"
            style={{ background: 'var(--amber)', color: 'var(--amber-deep)' }}
          >
            {messages.amber}
            <br />
            #F2B84B
          </div>
          <div
            className="ui-gallery__swatch"
            style={{
              background: 'var(--ink-raised)',
              color: 'var(--text)',
              borderColor: 'var(--ink-border)',
            }}
          >
            <CardTitle>{messages.cardSampleTitle}</CardTitle>
            <Muted>{messages.cardSampleBody}</Muted>
          </div>
        </div>
      </section>

      <section
        className="ui-gallery__section"
        aria-labelledby="gallery-buttons"
      >
        <h2 id="gallery-buttons">{messages.buttons}</h2>
        <Button block>{messages.primary}</Button>
        <Button variant="ghost" block>
          {messages.ghost}
        </Button>
        <Button variant="danger" block>
          {messages.danger}
        </Button>
        <ButtonLink href="#gallery" block>
          {messages.linkStyled}
        </ButtonLink>
      </section>

      <section className="ui-gallery__section" aria-labelledby="gallery-badges">
        <h2 id="gallery-badges">{messages.badges}</h2>
        <Row>
          <Badge tone="ok">{messages.okBadge}</Badge>
          <Badge tone="warn">{messages.warnBadge}</Badge>
        </Row>
      </section>

      <section className="ui-gallery__section" aria-labelledby="gallery-chips">
        <h2 id="gallery-chips">{messages.chips}</h2>
        <ChipRow>
          <Chip
            selected={selectedChip === 'legal'}
            onClick={() => setSelectedChip('legal')}
          >
            {messages.chipLegal}
          </Chip>
          <Chip
            selected={selectedChip === 'food'}
            onClick={() => setSelectedChip('food')}
          >
            {messages.chipFood}
          </Chip>
          <Chip
            selected={selectedChip === 'clinic'}
            onClick={() => setSelectedChip('clinic')}
          >
            {messages.chipClinic}
          </Chip>
        </ChipRow>
      </section>

      <section className="ui-gallery__section" aria-labelledby="gallery-rows">
        <h2 id="gallery-rows">{messages.listRows}</h2>
        <ListRow
          title={messages.rowDone}
          badge={messages.done}
          badgeTone="ok"
        />
        <ListRow
          title={messages.rowTodo}
          badge={messages.todo}
          badgeTone="warn"
        />
      </section>

      <section
        className="ui-gallery__section"
        aria-labelledby="gallery-progress"
      >
        <h2 id="gallery-progress">{messages.progress}</h2>
        <Card>
          <Row>
            <CardTitle>{messages.progressLabel}</CardTitle>
            <Badge tone="ok">4 of 6</Badge>
          </Row>
          <ProgressBar value={4} max={6} label={messages.progressLabel} />
        </Card>
      </section>

      <section className="ui-gallery__section" aria-labelledby="gallery-keypad">
        <h2 id="gallery-keypad">{messages.keypad}</h2>
        <PinDots filled={pinLength} total={6} label={messages.pinDotsLabel} />
        <Keypad
          deleteLabel={messages.deleteLabel}
          onDigit={() => setPinLength((n) => Math.min(6, n + 1))}
          onDelete={() => setPinLength((n) => Math.max(0, n - 1))}
        />
      </section>

      <section className="ui-gallery__section" aria-labelledby="gallery-icons">
        <h2 id="gallery-icons">{messages.icons}</h2>
        <div className="ui-gallery__icons">
          {iconNames.map((name) => (
            <span key={name}>
              <Icon name={name} />
              {name}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
