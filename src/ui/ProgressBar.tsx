type ProgressBarProps = {
  value: number
  max?: number
  label?: string
}

export function ProgressBar({ value, max = 1, label }: ProgressBarProps) {
  const ratio = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max))
  const percent = Math.round(ratio * 100)

  return (
    <div
      className="ui-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className="ui-progress__fill" style={{ width: `${percent}%` }} />
    </div>
  )
}
