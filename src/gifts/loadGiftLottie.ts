import {
  giftLottieUrl,
  giftModelForRole,
  giftModelLottieUrl,
  giftSlugForRole,
  type GiftRole,
} from '@/gifts/catalog'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LottieAnimationData = Record<string, any>

const cache = new Map<string, Promise<LottieAnimationData>>()

export function loadGiftLottie(
  slug: string,
  model?: string,
): Promise<LottieAnimationData> {
  const gift = slug.trim().toLowerCase()
  const key = model ? `${gift}::${model}` : gift
  const existing = cache.get(key)
  if (existing) return existing

  const url = model ? giftModelLottieUrl(gift, model) : giftLottieUrl(gift)

  const promise = fetch(url)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Gift Lottie failed (${res.status}): ${key}`)
      }
      const data = (await res.json()) as LottieAnimationData
      if (!data || typeof data !== 'object') {
        throw new Error(`Invalid gift Lottie JSON: ${key}`)
      }
      return data
    })
    .catch((err) => {
      cache.delete(key)
      throw err
    })

  cache.set(key, promise)
  return promise
}

/** Prefetch gift animations so reveals are instant. */
export function preloadGiftLotties(
  items: Array<string | { gift: string; model?: string }>,
): Promise<LottieAnimationData[]> {
  return Promise.all(
    items.map((item) =>
      typeof item === 'string'
        ? loadGiftLottie(item)
        : loadGiftLottie(item.gift, item.model),
    ),
  )
}

export function preloadGiftRoles(
  roles: GiftRole[],
): Promise<LottieAnimationData[]> {
  return preloadGiftLotties(
    roles.map((role) => ({
      gift: giftSlugForRole(role),
      model: giftModelForRole(role),
    })),
  )
}

export function clearGiftLottieCache() {
  cache.clear()
}
