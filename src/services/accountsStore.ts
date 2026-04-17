import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@shoota_owner_accounts_v1";

export type AccountEntryKind = "expense" | "income_external" | "income_manual" | "income_booking";

export type AccountEntry = {
  id: string;
  kind: AccountEntryKind;
  amount: number;
  note: string;
  at: string;
  /** يمنع تكرار تسجيل وارد نفس الحجز */
  linkedBookingId?: string;
  /** تصنيف المصروف (اختياري) */
  category?: string;
  /** وارد يدوي من حجز: مدة بالساعات × سعر الساعة */
  durationHours?: number;
  pricePerHour?: number;
};

export type AccountsSnapshot = {
  entries: AccountEntry[];
};

function emptySnapshot(): AccountsSnapshot {
  return { entries: [] };
}

export async function loadAccountsSnapshot(): Promise<AccountsSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as AccountsSnapshot;
    if (!parsed?.entries || !Array.isArray(parsed.entries)) return emptySnapshot();
    return parsed;
  } catch {
    return emptySnapshot();
  }
}

export async function saveAccountsSnapshot(s: AccountsSnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function makeEntryId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** وارد خارجي (منصة / API / تسجيل يدوي كـ خارجي) — بدون وارد نهاية الحجز التلقائي */
export function sumExternalIncome(entries: AccountEntry[]): number {
  return entries.filter((e) => e.kind === "income_external").reduce((a, e) => a + e.amount, 0);
}

/** وارد تلقائي عند انتهاء حجز (PostMatch / إنهاء الجلسة) — ضمن إجمالي الوارد */
export function sumBookingAutoIncome(entries: AccountEntry[]): number {
  return entries.filter((e) => e.kind === "income_booking").reduce((a, e) => a + e.amount, 0);
}

/** مجموع كل أنواع الوارد المسجّلة في نفس اليوم التقويمي (محلي) — يُعرض كـ«وارد يومي» ويُصفّر مع بداية يوم جديد */
export function sumIncomeForCalendarDay(entries: AccountEntry[], ref: Date = new Date()): number {
  const y = ref.getFullYear();
  const mo = ref.getMonth();
  const d = ref.getDate();
  const incomeKinds: AccountEntryKind[] = ["income_external", "income_manual", "income_booking"];
  return entries
    .filter((e) => incomeKinds.includes(e.kind))
    .filter((e) => {
      const dt = new Date(e.at);
      return dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d;
    })
    .reduce((a, e) => a + e.amount, 0);
}

/** مجموع وارد يدوي */
export function sumManualIncome(entries: AccountEntry[]): number {
  return entries.filter((e) => e.kind === "income_manual").reduce((a, e) => a + e.amount, 0);
}

/** مجموع المصاريف */
export function sumExpenses(entries: AccountEntry[]): number {
  return entries.filter((e) => e.kind === "expense").reduce((a, e) => a + e.amount, 0);
}

/** وارد الشهر الحالي (كل أنواع الوارد) */
export function sumMonthlyIncome(entries: AccountEntry[], ref: Date = new Date()): number {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  return entries
    .filter(
      (e) =>
        e.kind === "income_external" ||
        e.kind === "income_manual" ||
        e.kind === "income_booking"
    )
    .filter((e) => {
      const d = new Date(e.at);
      return d.getFullYear() === y && d.getMonth() === m;
    })
    .reduce((a, e) => a + e.amount, 0);
}

export async function appendBookingIncomeEntry(input: {
  linkedBookingId: string;
  amount: number;
  note: string;
  kind?: AccountEntryKind;
}): Promise<AccountEntry | null> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return null;
  const snap = await loadAccountsSnapshot();
  if (snap.entries.some((e) => e.linkedBookingId === input.linkedBookingId)) return null;
  const entry: AccountEntry = {
    id: makeEntryId(),
    kind: input.kind ?? "income_booking",
    amount: Math.round(input.amount * 100) / 100,
    note: input.note,
    at: new Date().toISOString(),
    linkedBookingId: input.linkedBookingId
  };
  await saveAccountsSnapshot({ entries: [entry, ...snap.entries] });
  return entry;
}
