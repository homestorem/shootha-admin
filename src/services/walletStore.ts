import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where
} from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "../lib/firebaseClient";

const STORAGE_KEY = "@shoota_owner_wallet_v1";

export type WalletEntryType =
  | "topup"
  | "booking_charge"
  | "dashboard_income"
  | "booking_income"
  | "expense"
  | "adjustment";

export type WalletEntryStatus = "completed" | "pending" | "failed";

export type WalletJournalEntry = {
  id: string;
  type: WalletEntryType;
  status: WalletEntryStatus;
  amount: number;
  direction: "credit" | "debit";
  note?: string;
  reference?: string;
  createdAt: string;
};

export type WalletAccount = {
  id: string;
  currency: "IQD";
  availableBalance: number;
  pendingBalance: number;
  /** رصيد محفظة الداشبورد (محلي/محاكاة) */
  dashboardBalance: number;
  updatedAt: string;
};

export type WalletVoucherCard = {
  code: string;
  provider: "apple" | "google";
  totalAmount: number;
  remainingAmount: number;
  used: boolean;
};

export type WalletSnapshot = {
  account: WalletAccount;
  entries: WalletJournalEntry[];
  vouchers: WalletVoucherCard[];
  scheduledSettlements: Array<{
    bookingRef: string;
    amount: number;
    dueAt: string;
    note?: string;
    processed: boolean;
  }>;
};

function nowIso(): string {
  return new Date().toISOString();
}

export function makeWalletEntryId(): string {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyWallet(): WalletSnapshot {
  const cards: WalletVoucherCard[] = [
    { code: "APL-100-2026", provider: "apple", totalAmount: 100000, remainingAmount: 100000, used: false },
    { code: "GGL-050-2026", provider: "google", totalAmount: 50000, remainingAmount: 50000, used: false },
    { code: "APL-250-2026", provider: "apple", totalAmount: 250000, remainingAmount: 250000, used: false }
  ];
  return {
    account: {
      id: "main",
      currency: "IQD",
      availableBalance: 0,
      pendingBalance: 0,
      dashboardBalance: 0,
      updatedAt: nowIso()
    },
    entries: [],
    vouchers: cards,
    scheduledSettlements: []
  };
}

export async function loadWalletSnapshot(): Promise<WalletSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyWallet();
    const parsed = JSON.parse(raw) as WalletSnapshot;
    if (!parsed?.account || !Array.isArray(parsed.entries)) return emptyWallet();
    const base = emptyWallet();
    const normalized: WalletSnapshot = {
      account: {
        id: typeof parsed.account.id === "string" ? parsed.account.id : "main",
        currency: "IQD",
        availableBalance:
          typeof parsed.account.availableBalance === "number" && Number.isFinite(parsed.account.availableBalance)
            ? parsed.account.availableBalance
            : 0,
        pendingBalance:
          typeof parsed.account.pendingBalance === "number" && Number.isFinite(parsed.account.pendingBalance)
            ? parsed.account.pendingBalance
            : 0,
        dashboardBalance:
          typeof parsed.account.dashboardBalance === "number" && Number.isFinite(parsed.account.dashboardBalance)
            ? parsed.account.dashboardBalance
            : 0,
        updatedAt: typeof parsed.account.updatedAt === "string" ? parsed.account.updatedAt : nowIso()
      },
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      vouchers: Array.isArray(parsed.vouchers) ? parsed.vouchers : base.vouchers,
      scheduledSettlements: Array.isArray(parsed.scheduledSettlements) ? parsed.scheduledSettlements : []
    };
    return normalized;
  } catch {
    return emptyWallet();
  }
}

export async function scheduleBookingWalletCharge(input: {
  amount: number;
  bookingRef: string;
  endAtIso: string;
  delayMinutes?: number;
  note?: string;
}): Promise<WalletSnapshot> {
  const amount = Math.round(input.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return loadWalletSnapshot();
  const endAt = new Date(input.endAtIso);
  if (Number.isNaN(endAt.getTime())) return loadWalletSnapshot();

  const dueAt = new Date(endAt.getTime() + (input.delayMinutes ?? 15) * 60_000).toISOString();
  const snap = await loadWalletSnapshot();
  if (snap.scheduledSettlements.some((s) => s.bookingRef === input.bookingRef)) {
    return snap;
  }
  const next: WalletSnapshot = {
    ...snap,
    scheduledSettlements: [
      {
        bookingRef: input.bookingRef,
        amount,
        dueAt,
        note: input.note,
        processed: false
      },
      ...snap.scheduledSettlements
    ]
  };
  await saveWalletSnapshot(next);
  return next;
}

export async function saveWalletSnapshot(s: WalletSnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export async function appendWalletEntry(input: {
  type: WalletEntryType;
  amount: number;
  direction: "credit" | "debit";
  note?: string;
  reference?: string;
  status?: WalletEntryStatus;
}): Promise<WalletSnapshot> {
  const amount = Math.round(input.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    return loadWalletSnapshot();
  }

  const snap = await loadWalletSnapshot();
  const status = input.status ?? "completed";
  const entry: WalletJournalEntry = {
    id: makeWalletEntryId(),
    type: input.type,
    status,
    amount,
    direction: input.direction,
    note: input.note?.trim() || undefined,
    reference: input.reference?.trim() || undefined,
    createdAt: nowIso()
  };

  let available = snap.account.availableBalance;
  let pending = snap.account.pendingBalance;

  if (status === "completed") {
    available += input.direction === "credit" ? amount : -amount;
  } else if (status === "pending") {
    pending += input.direction === "credit" ? amount : -amount;
  }

  const next: WalletSnapshot = {
    account: {
      ...snap.account,
      availableBalance: Math.round(available * 100) / 100,
      pendingBalance: Math.round(pending * 100) / 100,
      updatedAt: nowIso()
    },
    entries: [entry, ...snap.entries],
    vouchers: snap.vouchers,
    scheduledSettlements: snap.scheduledSettlements
  };
  await saveWalletSnapshot(next);
  return next;
}

export async function redeemVoucherCode(input: RedeemVoucherInput): Promise<RedeemVoucherResult> {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, reason: "not_found" };
  const userUid = input.userUid?.trim() || "";
  const ownerId = input.ownerId?.trim() || null;
  if (isFirebaseConfigured() && userUid) {
    const redeemed = await redeemVoucherFromCloud({
      code,
      note: input.note,
      userUid,
      ownerId
    });
    if (!redeemed.ok) return redeemed;
    const next = await applyLocalTopup({
      amount: redeemed.amount,
      note: input.note?.trim() || `بطاقة شحن — ${code}`,
      reference: code
    });
    return { ok: true, snapshot: next, amount: redeemed.amount };
  }

  return redeemVoucherLocally(input);
}

type RedeemVoucherInput = {
  code: string;
  note?: string;
  userUid?: string;
  ownerId?: string | null;
};

type RedeemVoucherResult =
  | { ok: true; snapshot: WalletSnapshot; amount: number }
  | { ok: false; reason: "not_found" | "already_used" | "auth_required" | "invalid_amount" | "unknown" };

async function redeemVoucherLocally(input: RedeemVoucherInput): Promise<RedeemVoucherResult> {
  const code = input.code.trim().toUpperCase();
  const snap = await loadWalletSnapshot();
  const idx = snap.vouchers.findIndex((v) => v.code.toUpperCase() === code);
  if (idx < 0) return { ok: false, reason: "not_found" };
  const card = snap.vouchers[idx];
  if (card.used || card.remainingAmount <= 0) return { ok: false, reason: "already_used" };
  const amount = card.remainingAmount;
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "invalid_amount" };

  const updatedVouchers = [...snap.vouchers];
  updatedVouchers[idx] = { ...card, remainingAmount: 0, used: true };
  const entry: WalletJournalEntry = {
    id: makeWalletEntryId(),
    type: "topup",
    status: "completed",
    amount,
    direction: "credit",
    note: input.note?.trim() || `${card.provider === "apple" ? "بطاقة Apple" : "بطاقة Google"} — ${card.code}`,
    reference: card.code,
    createdAt: nowIso()
  };
  const next: WalletSnapshot = {
    account: {
      ...snap.account,
      availableBalance: Math.round((snap.account.availableBalance + amount) * 100) / 100,
      updatedAt: nowIso()
    },
    entries: [entry, ...snap.entries],
    vouchers: updatedVouchers,
    scheduledSettlements: snap.scheduledSettlements
  };
  await saveWalletSnapshot(next);
  return { ok: true, snapshot: next, amount };
}

async function applyLocalTopup(input: { amount: number; note?: string; reference?: string }): Promise<WalletSnapshot> {
  const amount = Math.round(input.amount * 100) / 100;
  const snap = await loadWalletSnapshot();
  const entry: WalletJournalEntry = {
    id: makeWalletEntryId(),
    type: "topup",
    status: "completed",
    amount,
    direction: "credit",
    note: input.note?.trim() || "شحن رصيد",
    reference: input.reference?.trim() || undefined,
    createdAt: nowIso()
  };
  const next: WalletSnapshot = {
    account: {
      ...snap.account,
      availableBalance: Math.round((snap.account.availableBalance + amount) * 100) / 100,
      updatedAt: nowIso()
    },
    entries: [entry, ...snap.entries],
    vouchers: snap.vouchers,
    scheduledSettlements: snap.scheduledSettlements
  };
  await saveWalletSnapshot(next);
  return next;
}

function pickVoucherAmount(data: Record<string, unknown>): number {
  const values = [data.amount, data.remainingAmount, data.totalAmount];
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.round(value * 100) / 100;
    }
  }
  return 0;
}

async function resolveVoucherRef(code: string) {
  const db = getFirestoreDb();
  const byCodeDoc = doc(db, "vouchers", code);
  const byCodeSnap = await getDoc(byCodeDoc);
  if (byCodeSnap.exists()) return byCodeDoc;
  const q = query(collection(db, "vouchers"), where("code", "==", code), limit(1));
  const snap = await getDocs(q);
  return snap.docs[0]?.ref ?? null;
}

async function redeemVoucherFromCloud(input: {
  code: string;
  note?: string;
  userUid: string;
  ownerId: string | null;
}): Promise<
  { ok: true; amount: number } | { ok: false; reason: "not_found" | "already_used" | "auth_required" | "invalid_amount" | "unknown" }
> {
  if (!input.userUid) return { ok: false, reason: "auth_required" };
  const db = getFirestoreDb();
  const voucherRef = await resolveVoucherRef(input.code);
  if (!voucherRef) return { ok: false, reason: "not_found" };

  try {
    const amount = await runTransaction(db, async (tx) => {
      const voucherSnap = await tx.get(voucherRef);
      if (!voucherSnap.exists()) throw new Error("not_found");
      const voucherData = voucherSnap.data() as Record<string, unknown>;
      const used = Boolean(voucherData.isUsed ?? voucherData.used);
      if (used) throw new Error("already_used");
      const amountFromVoucher = pickVoucherAmount(voucherData);
      if (!Number.isFinite(amountFromVoucher) || amountFromVoucher <= 0) throw new Error("invalid_amount");

      const userRef = doc(db, "users", input.userUid);
      const userSnap = await tx.get(userRef);
      const userData = (userSnap.data() ?? {}) as Record<string, unknown>;
      const prevBalanceRaw = userData.walletBalance ?? userData.availableBalance ?? 0;
      const prevBalance =
        typeof prevBalanceRaw === "number" && Number.isFinite(prevBalanceRaw) ? prevBalanceRaw : 0;
      const nextBalance = Math.round((prevBalance + amountFromVoucher) * 100) / 100;

      tx.set(
        userRef,
        {
          walletBalance: nextBalance,
          walletUpdatedAt: serverTimestamp()
        },
        { merge: true }
      );

      tx.update(voucherRef, {
        isUsed: true,
        used: true,
        usedBy: input.userUid,
        usedAt: serverTimestamp(),
        redeemedAmount: amountFromVoucher
      });

      const txRef = doc(collection(db, "walletTransactions"));
      tx.set(txRef, {
        userUid: input.userUid,
        ownerId: input.ownerId,
        type: "voucher_topup",
        direction: "credit",
        amount: amountFromVoucher,
        voucherCode: input.code,
        note: input.note?.trim() || null,
        createdAt: serverTimestamp()
      });

      return amountFromVoucher;
    });
    return { ok: true, amount };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "already_used") return { ok: false, reason: "already_used" };
    if (msg === "not_found") return { ok: false, reason: "not_found" };
    if (msg === "invalid_amount") return { ok: false, reason: "invalid_amount" };
    return { ok: false, reason: "unknown" };
  }
}

export async function applyBookingWalletCharge(input: {
  amount: number;
  bookingRef: string;
  note?: string;
}): Promise<{ ok: true; snapshot: WalletSnapshot } | { ok: false; reason: "insufficient_balance" | "invalid_amount" }> {
  const amount = Math.round(input.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "invalid_amount" };

  const snap = await loadWalletSnapshot();
  if (snap.account.availableBalance < amount) return { ok: false, reason: "insufficient_balance" };

  const chargeEntry: WalletJournalEntry = {
    id: makeWalletEntryId(),
    type: "booking_charge",
    status: "completed",
    amount,
    direction: "debit",
    note: input.note?.trim() || "خصم تلقائي لحجز",
    reference: input.bookingRef,
    createdAt: nowIso()
  };
  const incomeEntry: WalletJournalEntry = {
    id: makeWalletEntryId(),
    type: "dashboard_income",
    status: "completed",
    amount,
    direction: "credit",
    note: "إضافة تلقائية لمحفظة الداشبورد",
    reference: input.bookingRef,
    createdAt: nowIso()
  };

  const next: WalletSnapshot = {
    account: {
      ...snap.account,
      availableBalance: Math.round((snap.account.availableBalance - amount) * 100) / 100,
      dashboardBalance: Math.round((snap.account.dashboardBalance + amount) * 100) / 100,
      updatedAt: nowIso()
    },
    entries: [chargeEntry, incomeEntry, ...snap.entries],
    vouchers: snap.vouchers,
    scheduledSettlements: snap.scheduledSettlements
  };
  await saveWalletSnapshot(next);
  return { ok: true, snapshot: next };
}

export async function processDueWalletSettlements(now: Date = new Date()): Promise<WalletSnapshot> {
  let snap = await loadWalletSnapshot();
  const due = snap.scheduledSettlements.filter((s) => !s.processed && new Date(s.dueAt).getTime() <= now.getTime());
  if (due.length === 0) return snap;

  const processedRefs = new Set(
    snap.entries
      .filter((e) => e.type === "booking_charge" || e.type === "dashboard_income")
      .map((e) => e.reference)
      .filter((v): v is string => typeof v === "string" && v.length > 0)
  );

  for (const item of due) {
    if (!processedRefs.has(item.bookingRef)) {
      const res = await applyBookingWalletCharge({
        amount: item.amount,
        bookingRef: item.bookingRef,
        note: item.note
      });
      if (res.ok) {
        processedRefs.add(item.bookingRef);
        snap = res.snapshot;
      }
    }
  }

  const current = await loadWalletSnapshot();
  const next: WalletSnapshot = {
    ...current,
    scheduledSettlements: current.scheduledSettlements.map((s) =>
      due.some((d) => d.bookingRef === s.bookingRef) ? { ...s, processed: true } : s
    )
  };
  await saveWalletSnapshot(next);
  return next;
}

