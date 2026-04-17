import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import {
  extractFieldExtrasFromFirestore,
  parseFirestoreNumber,
  type FieldDocExtras
} from "../lib/fieldDocExtras";
import { getFirestoreDb } from "../lib/firebaseClient";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import { DASHBOARD_VENUES_COLLECTION } from "./dashboardVenuesFirestore";
import type { OwnerFieldDoc } from "./ownerFieldsFirestore";

export type FieldExtraItem = {
  id: string;
  name: string;
  price: number;
  iconKey?: string;
};

function normalizeNameForMatch(v: string): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u0640]/g, "")
    .replace(/[\s_\-]+/g, "")
    .trim();
}

function hasDurationPrices(raw: Record<string, unknown>): boolean {
  return (
    parseFirestoreNumber(raw.price_1_5_hours) != null ||
    parseFirestoreNumber(raw.price_2_hours) != null ||
    parseFirestoreNumber(raw.price_3_hours) != null ||
    parseFirestoreNumber(raw.price90) != null ||
    parseFirestoreNumber(raw.price120) != null ||
    parseFirestoreNumber(raw.price180) != null ||
    ((raw.durationPrices != null || raw.pricesByDuration != null || raw.bookingPrices != null) &&
      typeof (raw.durationPrices ?? raw.pricesByDuration ?? raw.bookingPrices) === "object")
  );
}

export type FieldRatings = {
  cleanliness?: number;
  grass?: number;
  lighting?: number;
};

/** تمثيل غني لمستند `fields/{id}` لواجهة شبيهة بتطبيق اللاعب */
export type ParsedFirebaseFieldDocument = FieldDocExtras & {
  id: string;
  displayName: string;
  /** عنوان نصي للعرض (من location / address في Firestore) */
  locationLine?: string;
  address?: string;
  description?: string;
  category?: string;
  status?: string;
  ownerName?: string;
  ownerPhone?: string;
  createdAtLabel?: string;
  services: string[];
  /** أيام العمل للعرض (مُستخرَجة من openDays / workingDays / schedule …) */
  openDays: string[];
  sizes: string[];
  extras: FieldExtraItem[];
  ratings?: FieldRatings | null;
  ratingAvg?: number;
  reviewCount?: number;
  /** إن وُجدت إحداثيات في المستند (للمسافة لاحقاً) */
  latitude?: number;
  longitude?: number;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function strArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => str(x)).filter(Boolean);
  if (typeof v === "string" && v.trim()) {
    return v
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

const AMENITY_LABELS_AR: Record<string, string> = {
  bathroom: "حمام",
  changing_room: "غرفة تبديل",
  commentary: "تعليق",
  first_aid: "إسعافات أولية",
  generator: "مولدة",
  parking: "موقف سيارات",
  referee: "حكم",
  speakers: "سماعات"
};

function amenityLabel(id: string): string {
  return AMENITY_LABELS_AR[id] ?? id.replace(/_/g, " ");
}

function parseExtras(raw: unknown, fallbackPrefix: string): FieldExtraItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FieldExtraItem[] = [];
  raw.forEach((item, i) => {
    if (item != null && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const name = str(o.name ?? o.title ?? o.label ?? o.arName);
      const price = parseFirestoreNumber(o.price ?? o.amount ?? o.extraPrice) ?? 0;
      if (name) {
        out.push({
          id: str(o.id) || `${fallbackPrefix}-${i}`,
          name,
          price,
          iconKey: typeof o.icon === "string" ? o.icon : typeof o.iconKey === "string" ? o.iconKey : undefined
        });
      }
    }
  });
  return out;
}

function parseRatings(data: Record<string, unknown>): FieldRatings | null {
  const r = data.ratings ?? data.reviewScores ?? data.scores;
  if (r != null && typeof r === "object") {
    const o = r as Record<string, unknown>;
    const cleanliness = parseFirestoreNumber(o.cleanliness ?? o.clean ?? o.نظافة);
    const grass = parseFirestoreNumber(o.grass ?? o.grassQuality ?? o.عشب);
    const lighting = parseFirestoreNumber(o.lighting ?? o.lights ?? o.إضاءة);
    if (cleanliness != null || grass != null || lighting != null) {
      return { cleanliness, grass, lighting };
    }
  }
  return null;
}

function parseGeo(data: Record<string, unknown>): { lat?: number; lng?: number } {
  const g = data.locationGeo ?? data.geo ?? data.coordinates;
  if (g != null && typeof g === "object") {
    const o = g as Record<string, unknown>;
    const lat = parseFirestoreNumber(o.latitude ?? o._latitude ?? o.lat);
    const lng = parseFirestoreNumber(o.longitude ?? o._longitude ?? o.lng ?? o.lon);
    return { lat, lng };
  }
  const lat = parseFirestoreNumber(data.latitude ?? data.lat);
  const lng = parseFirestoreNumber(data.longitude ?? data.lng ?? data.lon);
  return { lat, lng };
}

function parseCreatedAtLabel(v: unknown): string | undefined {
  if (!v) return undefined;
  const d =
    typeof v === "object" && v != null && "toDate" in (v as Record<string, unknown>) && typeof (v as { toDate?: () => Date }).toDate === "function"
      ? (v as { toDate: () => Date }).toDate()
      : typeof v === "object" && v != null && typeof (v as { seconds?: unknown }).seconds === "number"
        ? new Date(((v as { seconds: number }).seconds ?? 0) * 1000)
        : v instanceof Date
          ? v
          : undefined;
  if (!d || Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString("ar-IQ-u-nu-latn");
}

/** أسماء الأيام للعرض (٠=الأحد … ٦=السبت كما في Date.getDay()) */
const JS_DOW_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] as const;

function normalizeDayToken(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && n >= 0 && n <= 6) return JS_DOW_AR[n];
  const map: Record<string, string> = {
    sun: JS_DOW_AR[0],
    sunday: JS_DOW_AR[0],
    الاحد: JS_DOW_AR[0],
    الأحد: JS_DOW_AR[0],
    mon: JS_DOW_AR[1],
    monday: JS_DOW_AR[1],
    الاثنين: JS_DOW_AR[1],
    الإثنين: JS_DOW_AR[1],
    tue: JS_DOW_AR[2],
    tues: JS_DOW_AR[2],
    tuesday: JS_DOW_AR[2],
    الثلاثاء: JS_DOW_AR[2],
    wed: JS_DOW_AR[3],
    wednesday: JS_DOW_AR[3],
    الاربعاء: JS_DOW_AR[3],
    الأربعاء: JS_DOW_AR[3],
    thu: JS_DOW_AR[4],
    thur: JS_DOW_AR[4],
    thursday: JS_DOW_AR[4],
    الخميس: JS_DOW_AR[4],
    fri: JS_DOW_AR[5],
    friday: JS_DOW_AR[5],
    الجمعة: JS_DOW_AR[5],
    sat: JS_DOW_AR[6],
    saturday: JS_DOW_AR[6],
    السبت: JS_DOW_AR[6]
  };
  if (map[s]) return map[s];
  if ((JS_DOW_AR as readonly string[]).includes(s)) return s;
  for (const d of JS_DOW_AR) {
    if (d.toLowerCase() === s) return d;
  }
  return raw.trim();
}

function dedupeDays(days: string[]): string[] {
  const order = new Map<string, number>(JS_DOW_AR.map((d, i) => [d, i] as [string, number]));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of days) {
    if (seen.has(d)) continue;
    seen.add(d);
    out.push(d);
  }
  out.sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
  return out;
}

/**
 * أيام العمل من مستند الملعب — يدعم أسماء حقول شائعة في Firestore.
 */
export function parseOpenDaysFromFirestore(raw: Record<string, unknown>): string[] {
  const tryArray = (v: unknown): string[] | null => {
    if (Array.isArray(v)) {
      const out = v.map((x) => normalizeDayToken(String(x))).filter((x): x is string => Boolean(x));
      return out.length ? dedupeDays(out) : null;
    }
    if (typeof v === "string" && v.trim()) {
      const out = v
        .split(/[,،\s|]+/)
        .map((x) => normalizeDayToken(x))
        .filter((x): x is string => Boolean(x));
      return out.length ? dedupeDays(out) : null;
    }
    return null;
  };

  const keys = [
    "openDays",
    "workingDays",
    "daysOpen",
    "weekDays",
    "weekdays",
    "open_days",
    "working_days",
    "days",
    "availableDays",
    "operationDays"
  ];
  for (const k of keys) {
    const got = tryArray(raw[k]);
    if (got?.length) return got;
  }

  const sch = raw.daySchedule ?? raw.weekSchedule ?? raw.schedule ?? raw.availability;
  if (sch != null && typeof sch === "object" && !Array.isArray(sch)) {
    const o = sch as Record<string, unknown>;
    const out: string[] = [];
    for (const [key, val] of Object.entries(o)) {
      const on =
        val === true ||
        val === 1 ||
        val === "1" ||
        val === "true" ||
        (Array.isArray(val) && val.length > 0) ||
        (typeof val === "string" && val.trim().length > 0);
      if (on) {
        const label = normalizeDayToken(key);
        if (label) out.push(label);
      }
    }
    if (out.length) return dedupeDays(out);
  }

  return [];
}

function parseHoursFromSchedule(raw: Record<string, unknown>): { openHour?: number; closeHour?: number } {
  const sch = raw.schedule;
  if (sch == null || typeof sch !== "object" || Array.isArray(sch)) return {};
  const o = sch as Record<string, unknown>;
  let minStart = 24;
  let maxEnd = 0;
  let seen = false;
  for (const val of Object.values(o)) {
    const slots = Array.isArray(val) ? val : [val];
    for (const slot of slots) {
      if (typeof slot !== "string") continue;
      const m = slot.match(/(\d{1,2})\s*:\s*(\d{2})\s*-\s*(\d{1,2})\s*:\s*(\d{2})/);
      if (!m) continue;
      const sH = Number.parseInt(m[1], 10);
      const eH = Number.parseInt(m[3], 10);
      if (!Number.isFinite(sH) || !Number.isFinite(eH)) continue;
      minStart = Math.min(minStart, sH);
      maxEnd = Math.max(maxEnd, eH);
      seen = true;
    }
  }
  if (!seen) return {};
  return {
    openHour: Math.max(0, Math.min(23, minStart)),
    closeHour: Math.max(1, Math.min(24, maxEnd))
  };
}

function parseAmenities(raw: Record<string, unknown>): { services: string[]; extras: FieldExtraItem[] } {
  const meta = raw.metadata;
  if (meta == null || typeof meta !== "object" || Array.isArray(meta)) return { services: [], extras: [] };
  const amenities = (meta as Record<string, unknown>).amenities;
  if (amenities == null || typeof amenities !== "object" || Array.isArray(amenities)) {
    return { services: [], extras: [] };
  }
  const outServices: string[] = [];
  const outExtras: FieldExtraItem[] = [];
  for (const [id, val] of Object.entries(amenities as Record<string, unknown>)) {
    if (val == null || typeof val !== "object" || Array.isArray(val)) continue;
    const node = val as Record<string, unknown>;
    const enabled = node.enabled === true;
    if (!enabled) continue;
    const label = amenityLabel(id);
    outServices.push(label);
    const price = parseFirestoreNumber(node.price);
    if (price != null && price > 0) {
      outExtras.push({ id: `meta-${id}`, name: label, price });
    }
  }
  return { services: outServices, extras: outExtras };
}

/**
 * يحوّل مستند Firestore `fields` إلى شكل موحّد للواجهة.
 */
export function parseFirebaseFieldDocument(id: string, raw: Record<string, unknown>): ParsedFirebaseFieldDocument {
  const extras = extractFieldExtrasFromFirestore(raw);
  const displayName = str(raw.name ?? raw.field_name ?? raw.title ?? raw.fieldName) || "—";
  const locationPrimary = str(raw.location ?? raw.locationName ?? raw.location_text);
  const address = str(raw.address);
  const locationLine = [locationPrimary, address].filter(Boolean).join(" — ") || undefined;
  const description = str(raw.description ?? raw.desc ?? raw.about ?? raw.details) || undefined;
  const category = str(raw.category ?? raw.sport ?? raw.type ?? raw.gameType) || undefined;
  const status = str(raw.status) || undefined;
  const ownerName = str(raw.ownerName) || undefined;
  const ownerPhone = str(raw.ownerPhone ?? raw.phone) || undefined;
  const createdAtLabel = parseCreatedAtLabel(raw.createdAt);
  const explicitPricePerHour = parseFirestoreNumber(raw.pricePerHour);
  const explicitPrice90 = parseFirestoreNumber(raw.price_1_5_hours);
  const explicitPrice120 = parseFirestoreNumber(raw.price_2_hours);
  const explicitPrice180 = parseFirestoreNumber(raw.price_3_hours);
  const servicesRaw = strArray(raw.services ?? raw.amenities ?? raw.facilities ?? raw.tags).map((s) =>
    amenityLabel(s.trim())
  );
  const sizesRaw = raw.sizes ?? raw.fieldSizes ?? raw.availableSizes;
  let sizes = strArray(sizesRaw);
  if (!sizes.length) {
    const fs = str(raw.field_size ?? raw.fieldSize);
    if (fs) sizes = [fs];
  }
  const extrasListRaw = parseExtras(
    raw.extras ?? raw.addOns ?? raw.optionalServices ?? raw.paidServices ?? raw.paid_services,
    id
  );
  const amenitiesParsed = parseAmenities(raw);
  const services = Array.from(new Set([...servicesRaw, ...amenitiesParsed.services]));
  const extrasList = [...extrasListRaw, ...amenitiesParsed.extras];
  const openDays = parseOpenDaysFromFirestore(raw);
  const ratings = parseRatings(raw);
  const ratingAvg = parseFirestoreNumber(raw.rating ?? raw.ratingAvg ?? raw.avgRating);
  const reviewCount = parseFirestoreNumber(raw.reviewCount ?? raw.reviewsCount ?? raw.numReviews);
  const geo = parseGeo(raw);
  const scheduleHours = parseHoursFromSchedule(raw);

  return {
    id,
    displayName,
    locationLine,
    address: address || undefined,
    description,
    category,
    status,
    ownerName,
    ownerPhone,
    createdAtLabel,
    services,
    openDays,
    sizes,
    extras: extrasList,
    ratings: ratings && Object.keys(ratings).length ? ratings : null,
    ratingAvg: ratingAvg ?? undefined,
    reviewCount: reviewCount != null ? Math.round(reviewCount) : undefined,
    latitude: geo.lat,
    longitude: geo.lng,
    ...extras,
    ...(explicitPricePerHour != null ? { pricePerHour: explicitPricePerHour } : {}),
    ...(explicitPrice90 != null ? { price90: explicitPrice90 } : {}),
    ...(explicitPrice120 != null ? { price120: explicitPrice120 } : {}),
    ...(explicitPrice180 != null ? { price180: explicitPrice180 } : {}),
    ...(scheduleHours.openHour != null && extras.openHour == null ? { openHour: scheduleHours.openHour } : {}),
    ...(scheduleHours.closeHour != null && extras.closeHour == null ? { closeHour: scheduleHours.closeHour } : {})
  };
}

export async function fetchFieldDocumentById(fieldId: string): Promise<ParsedFirebaseFieldDocument | null> {
  if (!isFirebaseConfigured() || !fieldId.trim()) return null;
  const db = getFirestoreDb();
  const ref = doc(db, DASHBOARD_VENUES_COLLECTION, fieldId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return parseFirebaseFieldDocument(snap.id, snap.data() as Record<string, unknown>);
}

export async function fetchFieldDocumentByOwnerAndName(
  ownerId: string,
  fieldName: string
): Promise<ParsedFirebaseFieldDocument | null> {
  if (!isFirebaseConfigured()) return null;
  const owner = ownerId.trim();
  const targetName = fieldName.trim();
  if (!owner || !targetName) return null;

  const db = getFirestoreDb();
  const snap = await getDocs(
    query(collection(db, DASHBOARD_VENUES_COLLECTION), where("ownerId", "==", owner), limit(120))
  );
  const normalize = (v: string) => normalizeNameForMatch(v);
  const exactMatches = snap.docs.filter((d) => {
    const raw = d.data() as Record<string, unknown>;
    const n = String(raw.name ?? "").trim();
    return normalize(n) === normalize(targetName);
  });
  const exactWithPrices = exactMatches.find((d) => hasDurationPrices(d.data() as Record<string, unknown>));
  const direct = exactWithPrices ?? exactMatches[0];
  if (direct) return parseFirebaseFieldDocument(direct.id, direct.data() as Record<string, unknown>);

  const partialMatches = snap.docs.filter((d) => {
    const raw = d.data() as Record<string, unknown>;
    const n = String(raw.name ?? "").trim();
    const a = normalize(n);
    const b = normalize(targetName);
    return a.includes(b) || b.includes(a);
  });
  const partialWithPrices = partialMatches.find((d) => hasDurationPrices(d.data() as Record<string, unknown>));
  const partial = partialWithPrices ?? partialMatches[0];
  if (!partial) return null;
  return parseFirebaseFieldDocument(partial.id, partial.data() as Record<string, unknown>);
}

export async function fetchFieldDocumentByName(fieldName: string): Promise<ParsedFirebaseFieldDocument | null> {
  if (!isFirebaseConfigured()) return null;
  const targetName = fieldName.trim();
  if (!targetName) return null;

  const db = getFirestoreDb();
  const normalize = (v: string) => normalizeNameForMatch(v);
  const pickBest = (docs: Array<{ id: string; data: () => Record<string, unknown> }>) => {
    if (!docs.length) return null;
    const approved = docs.filter((d) => {
      const raw = d.data();
      const st = String(raw.status ?? "").trim().toLowerCase();
      return !st || st === "approved" || st === "accepted" || st === "active" || st === "مقبول" || st === "نشط";
    });
    const pool = approved.length ? approved : docs;
    const withPrices = pool.find((d) => hasDurationPrices(d.data()));
    return withPrices ?? pool[0];
  };

  const exactSnap = await getDocs(
    query(collection(db, DASHBOARD_VENUES_COLLECTION), where("name", "==", targetName), limit(20))
  );
  const exactDocs = exactSnap.docs.map((d) => ({ id: d.id, data: () => d.data() as Record<string, unknown> }));
  const exactPick = pickBest(exactDocs);
  if (exactPick) return parseFirebaseFieldDocument(exactPick.id, exactPick.data());

  const broadSnap = await getDocs(query(collection(db, DASHBOARD_VENUES_COLLECTION), limit(200)));
  const broadMatches = broadSnap.docs
    .filter((d) => {
      const raw = d.data() as Record<string, unknown>;
      const n = String(raw.name ?? "");
      const a = normalize(n);
      const b = normalize(targetName);
      return a === b || a.includes(b) || b.includes(a);
    })
    .map((d) => ({ id: d.id, data: () => d.data() as Record<string, unknown> }));
  const broadPick = pickBest(broadMatches);
  if (!broadPick) return null;
  return parseFirebaseFieldDocument(broadPick.id, broadPick.data());
}

export async function fetchFieldDocumentForOwner(
  ownerId: string,
  preferredName?: string
): Promise<ParsedFirebaseFieldDocument | null> {
  if (!isFirebaseConfigured()) return null;
  const owner = ownerId.trim();
  if (!owner) return null;

  const db = getFirestoreDb();
  const snap = await getDocs(
    query(collection(db, DASHBOARD_VENUES_COLLECTION), where("ownerId", "==", owner), limit(200))
  );
  if (snap.empty) return null;

  const target = normalizeNameForMatch(preferredName ?? "");
  const docs = snap.docs.map((d) => ({ id: d.id, raw: d.data() as Record<string, unknown> }));
  const withPrices = docs.filter((d) => hasDurationPrices(d.raw));
  if (!withPrices.length) return null;

  if (target) {
    const exact = withPrices.find((d) => normalizeNameForMatch(String(d.raw.name ?? "")) === target);
    if (exact) return parseFirebaseFieldDocument(exact.id, exact.raw);

    const partial = withPrices.find((d) => {
      const n = normalizeNameForMatch(String(d.raw.name ?? ""));
      return n.includes(target) || target.includes(n);
    });
    if (partial) return parseFirebaseFieldDocument(partial.id, partial.raw);
  }

  return parseFirebaseFieldDocument(withPrices[0].id, withPrices[0].raw);
}

/** يدمج ملعب المالك مع مستند `fields/{id}` لعرض السعر والساعات كما في تطبيق اللاعب */
export function mergeOwnerFieldWithFirebaseDoc(
  owner: OwnerFieldDoc | undefined,
  doc: ParsedFirebaseFieldDocument | null | undefined,
  fallbackName: string
): FieldDocExtras & { displayName: string } {
  const displayName = (doc?.displayName ?? owner?.name ?? fallbackName).trim();
  return {
    displayName,
    pricePerHour: doc?.pricePerHour ?? owner?.pricePerHour,
    price60: doc?.price60 ?? owner?.price60,
    price90: doc?.price90 ?? owner?.price90,
    price120: doc?.price120 ?? owner?.price120,
    price180: doc?.price180 ?? owner?.price180,
    openHour: doc?.openHour ?? owner?.openHour,
    closeHour: doc?.closeHour ?? owner?.closeHour,
    phone: doc?.phone ?? owner?.phone
  };
}
