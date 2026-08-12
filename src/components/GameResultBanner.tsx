export type ResultBannerTone = 'win' | 'lose' | 'push'

export type ResultBannerState = {
  tone: ResultBannerTone
  title: string
  detail: string
}

type Props = {
  banner: ResultBannerState | null
}

/** Shared win / lose / push alert overlay for game boards. */
export function GameResultBanner({ banner }: Props) {
  return (
    <div
      className={[
        'game-result-banner',
        banner ? `is-show is-${banner.tone}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-live="assertive"
    >
      {banner ? (
        <>
          <p className="game-result-banner-title">{banner.title}</p>
          <p className="game-result-banner-detail">{banner.detail}</p>
        </>
      ) : null}
    </div>
  )
}

export function toneFromNet(net: number): ResultBannerTone {
  if (net > 0) return 'win'
  if (net < 0) return 'lose'
  return 'push'
}
