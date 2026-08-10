import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { INITIAL_CHIP_BALANCE } from '@/lib/constants'
import { db } from '@/lib/firebase'
import { randomGuestName } from '@/lib/format'
import { emptyStats, normalizeStats, type Transaction, type UserProfile } from '@/types/user'

type UserDoc = {
  displayName: string
  chipBalance: number
  createdAt: Timestamp | number
  lastDailyBonusAt: Timestamp | number | null
  stats?: UserProfile['stats']
}

function toMillis(value: Timestamp | number | null | undefined): number | null {
  if (value == null) return null
  if (typeof value === 'number') return value
  return value.toMillis()
}

function mapUser(uid: string, data: UserDoc): UserProfile {
  return {
    uid,
    displayName: data.displayName,
    chipBalance: data.chipBalance,
    createdAt: toMillis(data.createdAt) ?? Date.now(),
    lastDailyBonusAt: toMillis(data.lastDailyBonusAt),
    stats: normalizeStats(data.stats),
  }
}

export async function ensureUserProfile(uid: string): Promise<UserProfile> {
  if (!db) throw new Error('Firestore is not configured')

  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    return mapUser(uid, snap.data() as UserDoc)
  }

  const displayName = randomGuestName()
  const stats = emptyStats()
  await setDoc(ref, {
    displayName,
    chipBalance: INITIAL_CHIP_BALANCE,
    createdAt: serverTimestamp(),
    lastDailyBonusAt: null,
    stats,
  })

  return {
    uid,
    displayName,
    chipBalance: INITIAL_CHIP_BALANCE,
    createdAt: Date.now(),
    lastDailyBonusAt: null,
    stats,
  }
}

export async function updateDisplayName(
  uid: string,
  displayName: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not configured')
  const trimmed = displayName.trim()
  if (!trimmed || trimmed.length > 32) {
    throw new Error('Display name must be 1–32 characters')
  }
  await updateDoc(doc(db, 'users', uid), { displayName: trimmed })
}

export async function listTransactions(
  uid: string,
  max = 25,
): Promise<Transaction[]> {
  if (!db) throw new Error('Firestore is not configured')

  const q = query(
    collection(db, 'transactions'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(max),
  )
  const snap = await getDocs(q)

  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      uid: data.uid as string,
      game: (data.game as string | null) ?? null,
      type: data.type as Transaction['type'],
      amount: data.amount as number,
      refId: (data.refId as string | null) ?? null,
      createdAt: toMillis(data.createdAt as Timestamp | number) ?? 0,
    }
  })
}
