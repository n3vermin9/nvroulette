import { giftModelPngUrl, giftPngUrl } from '@/gifts/catalog'
import type { Suit } from '@/games/blackjack/engine'

/** Signet Ring models with the four card suits. */
export const BJ_SIGNET_GIFT = 'signet-ring'

export const BJ_SUIT_MODELS: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
}

export const BJ_CARD_BACK_GIFT = 'signet-ring'

export function bjSuitPng(suit: Suit, size: 64 | 128 | 256 = 128): string {
  return giftModelPngUrl(BJ_SIGNET_GIFT, BJ_SUIT_MODELS[suit], size)
}

export function bjCardBackPng(size: 64 | 128 | 256 = 128): string {
  return giftPngUrl(BJ_CARD_BACK_GIFT, size)
}

/** Prefetch suit + back PNGs. */
export function bjAssetUrls(): string[] {
  return [
    ...Object.keys(BJ_SUIT_MODELS).map((s) => bjSuitPng(s as Suit, 128)),
    bjCardBackPng(128),
  ]
}

export function preloadBjAssets(): Promise<void[]> {
  return Promise.all(
    bjAssetUrls().map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = src
        }),
    ),
  )
}
