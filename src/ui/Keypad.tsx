import { Button } from './Button'
import { Icon } from './Icon'

type KeypadProps = {
  onDigit: (digit: string) => void
  onDelete: () => void
  deleteLabel: string
}

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export function Keypad({ onDigit, onDelete, deleteLabel }: KeypadProps) {
  return (
    <div className="ui-keypad">
      {digits.map((digit) => (
        <Button
          key={digit}
          variant="ghost"
          className="ui-keypad__key"
          onClick={() => onDigit(digit)}
        >
          {digit}
        </Button>
      ))}
      <span className="ui-keypad__spacer" aria-hidden="true" />
      <Button
        variant="ghost"
        className="ui-keypad__key"
        onClick={() => onDigit('0')}
      >
        0
      </Button>
      <Button
        variant="ghost"
        className="ui-keypad__key"
        aria-label={deleteLabel}
        onClick={onDelete}
      >
        <Icon name="backspace" />
      </Button>
    </div>
  )
}

type PinDotsProps = {
  filled: number
  total: number
  label: string
}

export function PinDots({ filled, total, label }: PinDotsProps) {
  return (
    <div className="ui-pin-dots" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={['ui-pin-dot', index < filled ? 'ui-pin-dot--filled' : '']
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </div>
  )
}
