import { createContext, useContext } from 'react'

const PinKeyContext = createContext<CryptoKey | null>(null)

export function usePinKey(): CryptoKey | null {
  return useContext(PinKeyContext)
}

export default PinKeyContext
