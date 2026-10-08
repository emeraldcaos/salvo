import { createContext, useContext } from 'react'
import type { PinIdentity } from './pinKey'

export interface PinKeyContextValue {
  key: CryptoKey
  profileId: string
}

const PinKeyContext = createContext<PinKeyContextValue | null>(null)

export function usePinKey(): PinKeyContextValue | null {
  return useContext(PinKeyContext)
}

export type { PinIdentity }

export default PinKeyContext
