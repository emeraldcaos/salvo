import { Button } from './Button'
import { Icon } from './Icon'

type KeypadProps = {
  onDigit: (digit: string) => void
  onDelete: () => void
  deleteLabel: string
  disabled?: boolean
  onSubmit?: () => void
  submitLabel?: string
  canSubmit?: boolean
}

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export function Keypad({
  onDigit,
  onDelete,
  deleteLabel,
  disabled = false,
  onSubmit,
  submitLabel = 'Unlock',
  canSubmit = false,
}: KeypadProps) {
  return (
    <div className="ui-keypad">
      {digits.map((digit) => (
        <Button
          key={digit}
          variant="ghost"
          className="ui-keypad__key"
          disabled={disabled}
          onClick={() => onDigit(digit)}
        >
          {digit}
        </Button>
      ))}
      <Button
        variant={canSubmit ? 'primary' : 'ghost'}
        className={[
          'ui-keypad__key',
          'ui-keypad__submit',
          canSubmit ? 'ui-keypad__submit--ready' : 'ui-keypad__submit--idle',
        ].join(' ')}
        disabled={disabled || !canSubmit}
        aria-label={submitLabel}
        onClick={onSubmit}
      >
        <Icon
          name="check"
          className={
            canSubmit ? 'ui-icon--check-solid' : 'ui-icon--check-outline'
          }
        />
      </Button>
      <Button
        variant="ghost"
        className="ui-keypad__key"
        disabled={disabled}
        onClick={() => onDigit('0')}
      >
        0
      </Button>
      <Button
        variant="ghost"
        className="ui-keypad__key"
        aria-label={deleteLabel}
        disabled={disabled}
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
