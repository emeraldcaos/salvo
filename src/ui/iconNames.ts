export const iconNames = [
  'home',
  'plan',
  'help',
  'alerts',
  'rights',
  'settings',
  'backspace',
  'check',
] as const

export type IconName = (typeof iconNames)[number]
