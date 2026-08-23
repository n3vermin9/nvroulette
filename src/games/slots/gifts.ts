import { preloadGiftLotties } from '@/gifts/loadGiftLottie'
import { SLOT_SYMBOLS } from '@/games/slots/engine'

/** Prefetch all slot reel gift animations. */
export function preloadSlotsAssets(): Promise<unknown[]> {
  return preloadGiftLotties(SLOT_SYMBOLS.map((s) => s.slug))
}
