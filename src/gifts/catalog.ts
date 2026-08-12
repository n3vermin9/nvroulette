/** GiftChanges API base — originals as decompressed Lottie JSON. */
export const GIFT_CHANGES_API = 'https://api.changes.tg'

export type GiftRole = 'gem' | 'mine' | 'cashout' | 'bonus' | 'roulette' | 'crash'

/** Role → GiftChanges slug (dashed lowercase gift name). */
export const GIFT_ROLES: Record<GiftRole, string> = {
  gem: 'sakura-flower',
  mine: 'electric-skull',
  cashout: 'party-sparkler',
  bonus: 'loot-bag',
  roulette: 'desk-calendar',
  crash: 'surge-board',
}

/** Optional GiftChanges model name for a role (e.g. crafted skin). */
export const GIFT_ROLE_MODELS: Partial<Record<GiftRole, string>> = {
  roulette: 'First Date',
  crash: 'Balls of Steel',
}

/** Local PNG override when a specific model still must match pixel-perfect. */
export const GIFT_ROLE_LOCAL_PNG: Partial<Record<GiftRole, string>> = {
  roulette: '/gifts/desk-calendar-first-date.png',
  crash: '/gifts/surge-board-balls-of-steel.png',
}

export function giftSlugForRole(role: GiftRole): string {
  return GIFT_ROLES[role]
}

export function giftModelForRole(role: GiftRole): string | undefined {
  return GIFT_ROLE_MODELS[role]
}

export function giftLocalPngForRole(role: GiftRole): string | undefined {
  return GIFT_ROLE_LOCAL_PNG[role]
}

export function giftLottieUrl(slug: string): string {
  return `${GIFT_CHANGES_API}/original/${encodeURIComponent(slug)}.json`
}

/** Static PNG for lobby previews (no animation). */
export function giftPngUrl(slug: string, size: 64 | 128 | 256 = 128): string {
  return `${GIFT_CHANGES_API}/original/${encodeURIComponent(slug)}.png?size=${size}`
}

/** Gift model asset (e.g. Signet Ring → Hearts). */
export function giftModelPngUrl(
  gift: string,
  model: string,
  size: 64 | 128 | 256 = 128,
): string {
  return `${GIFT_CHANGES_API}/model/${encodeURIComponent(gift)}/${encodeURIComponent(model)}.png?size=${size}`
}

export function giftModelLottieUrl(gift: string, model: string): string {
  return `${GIFT_CHANGES_API}/model/${encodeURIComponent(gift)}/${encodeURIComponent(model)}.json`
}

/** Role PNG — prefers local override, else model skin, else original. */
export function giftPngForRole(
  role: GiftRole,
  size: 64 | 128 | 256 = 128,
): string {
  const local = giftLocalPngForRole(role)
  if (local) return local
  const gift = giftSlugForRole(role)
  const model = giftModelForRole(role)
  return model ? giftModelPngUrl(gift, model, size) : giftPngUrl(gift, size)
}
