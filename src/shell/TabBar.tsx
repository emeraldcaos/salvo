import { Icon } from '../ui'
import { toAbsoluteUrl } from '../routing/path'
import { tabBar, type TabId } from '../routing/routes'
import { navigate } from '../routing/usePath'
import './TabBar.css'

export type TabLabels = Record<TabId, string>

type TabBarProps = {
  activePath: string
  navLabel: string
  labels: TabLabels
}

export function TabBar({ activePath, navLabel, labels }: TabBarProps) {
  return (
    <nav className="tab-bar" aria-label={navLabel}>
      {tabBar.map((tab) => {
        const active = activePath === tab.path
        return (
          <a
            key={tab.id}
            href={toAbsoluteUrl(tab.path)}
            className={['tab-bar__item', active ? 'tab-bar__item--active' : '']
              .filter(Boolean)
              .join(' ')}
            aria-label={labels[tab.id]}
            aria-current={active ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              navigate(tab.path)
            }}
          >
            <Icon name={tab.icon} />
          </a>
        )
      })}
    </nav>
  )
}
