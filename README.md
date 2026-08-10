# NV Roulette

Mobile-first social/virtual-chip casino shell. Chips have **no cash value** and cannot be cashed out — entertainment only.

This repo currently ships the **platform foundation** (auth, wallet, lobby, profile). Game modules are not implemented yet.

## Stack

- React + Vite + Tailwind
- Capacitor (iOS first)
- Firebase Auth / Firestore / Realtime Database (optional for local demo)

## Quick start (demo mode)

No Firebase project required. The app uses a local demo wallet.

```bash
npm install
npm run dev
```

Open the printed localhost URL. Claim a daily bonus from the lobby to exercise the wallet.

## Firebase setup

1. Create a Firebase project and enable **Anonymous Auth**, **Firestore**, and **Realtime Database**.
2. Copy `.env.example` → `.env` and fill in web app config values.
3. Deploy rules:

```bash
npx firebase login
npx firebase use <your-project-id>
npx firebase deploy --only firestore:rules,firestore:indexes,database
```

4. Restart `npm run dev`.

With Firebase connected:

- Anonymous sign-in creates `users/{uid}` with `10_000` chips
- Clients cannot mutate `chipBalance` after create (rules enforce this)
- Daily bonus / bets / payouts will be Cloud Functions next

## Capacitor iOS

```bash
npm run build
npx cap add ios    # once
npm run cap:sync
npm run cap:ios    # opens Xcode
```

### Live reload (simulator updates on save)

Keep Vite running, point the native shell at it, then run from Xcode:

```bash
npm run dev                 # terminal 1
npm run ios:live:sync       # writes server.url → http://localhost:5173
npm run cap:ios             # Run in the simulator from Xcode
```

Edits hot-reload in the simulator while `npm run dev` is up. Or one-shot deploy:

```bash
npm run dev                 # terminal 1
npm run ios:live            # needs Xcode CLI (`xcode-select`) + simctl
```

For TestFlight/release builds, sync without live-reload so the app uses bundled `dist`:

```bash
npm run cap:sync
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production bundle |
| `npm run preview` | Preview `dist` |
| `npm run cap:sync` | Copy web build into native projects |
| `npm run cap:ios` | Open Xcode |

## Project layout

```
src/
  components/layout/   # App shell + nav
  context/             # Auth + wallet session
  lib/                 # Firebase, demo store, constants
  pages/               # Lobby, Activity, Profile
  services/            # Firestore user/transactions
  types/
```

## Next milestones

1. Cloud Functions: `claimDailyBonus`, shared `placeBet` / `settleRound`
2. Roulette game module (UI + RTDB table sync + server RNG)
3. Push notifications, Sign in with Apple, TestFlight
