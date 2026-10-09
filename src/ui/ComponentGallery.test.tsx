import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { translations } from '../i18n'
import { ComponentGallery } from './ComponentGallery'

describe('ComponentGallery', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders shared components and icons', () => {
    const onBack = () => undefined
    render(
      <ComponentGallery messages={translations.en.gallery} onBack={onBack} />,
    )

    expect(
      screen.getByRole('heading', { name: 'Component gallery' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Primary action' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ghost action' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Wipe all data now' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByText('home')).toBeInTheDocument()
    expect(screen.getByText('backspace')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '4',
    )
  })

  it('updates pin dots from the keypad', () => {
    render(
      <ComponentGallery
        messages={translations.en.gallery}
        onBack={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    expect(screen.getByRole('img', { name: 'PIN length so far' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  })
})
