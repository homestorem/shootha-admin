
export function parseFirestoreNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const toAsciiDigits = (s: string) =>
      s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

    let s = toAsciiDigits(v.trim())
      .replace(/[\u066C,_\s]/g, "")
      .replace(/[−–—]/g, "-");

    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/,/g, "");
    } else if (s.includes(",") && !s.includes(".")) {
      const parts = s.split(",");
      s = parts.length === 2 && parts[1].length !== 3 ? `${parts[0]}.${parts[1]}` : parts.join("");
    } else if (s.includes(".") && !s.includes(",")) {
      const parts = s.split(".");
      if (parts.length === 2 && parts[1].length === 3) {
        s = parts.join("");
      }
    }

    s = s.replace(/[^\d.-]/g, "");
    const n = parseFloat(s);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function firstNumberFromKeys(data: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const n = parseFirestoreNumber(data[k]);
    if (n != null && n >= 0) return n;
  }
  return undefined;
}

/**
 * يبحث بعمق داخل كائن Firestore عن أول قيمة رقمية لأحد المفاتيح.
 * مفيد عندما تكون حقول الأسعار متداخلة وليست في الجذر.
 */
function deepFindNumberByKeys(root: unknown, keys: string[], maxDepth = 10): number | undefined {
  const keySet = new Set(keys);
  const visited = new WeakSet<object>();

  const walk = (node: unknown, depth: number): number | undefined => {
    if (depth > maxDepth) return undefined;

    if (node == null) return undefined;

    if (typeof node === "number" || typeof node === "string") {
      return undefined;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        const got = walk(item, depth + 1);
        if (got != null) return got;
      }
      return undefined;
    }

    if (typeof node !== "object") return undefined;
    const obj = node as Record<string, unknown>;

    // Firestore Timestamp-like objects
    if ("toDate" in obj && typeof (obj as { toDate?: () => Date }).toDate === "function") {
      return undefined;
    }

    if (visited.has(obj)) return undefined;
    visited.add(obj);

    for (const k of Object.keys(obj)) {
      if (keySet.has(k)) {
        const n = parseFirestoreNumber(obj[k]);
        if (n != null && n >= 0) return n;
      }
    }

    for (const v of Object.values(obj)) {
      const got = walk(v, depth + 1);
      if (got != null) return got;
    }

    return undefined;
  };

  return walk(root, 0);
}

function parseHourValue(v: unknown): number | undefined {
  if (typeof v === "number" && v >= 0 && v <= 24) return Math.min(23, Math.max(0, Math.floor(v)));
  if (typeof v === "string" && v.trim()) {
    const m = v.trim().match(/^(\d{1,2})(?::(\d{2}))?/);
    if (m) {
      const h = parseInt(m[1], 10);
      if (h >= 0 && h <= 23) return h;
    }
  }
  return undefined;
}

function firstHourFromKeys(data: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const h = parseHourValue(data[k]);
    if (h != null) return h;
  }
  return undefined;
}

export type FieldDocExtras = {
  pricePerHour?: number;
  price60?: number;
  price90?: number;
  price120?: number;
  price180?: number;
  openHour?: number;
  closeHour?: number;
  phone?: string;
};

export type DurationMinutes = 60 | 90 | 120 | 180;
export type DurationPriceMap = Record<DurationMinutes, number | null>;

export function extractFieldExtrasFromFirestore(data: Record<string, unknown>): FieldDocExtras {
  console.log("RAW FIRESTORE DATA:", JSON.stringify(data, null, 2));

  const pricingNode =
    (data.pricing != null && typeof data.pricing === "object" && !Array.isArray(data.pricing)
      ? (data.pricing as Record<string, unknown>)
      : null) ??
    (data.prices != null && typeof data.prices === "object" && !Array.isArray(data.prices)
      ? (data.prices as Record<string, unknown>)
      : null) ??
    (data.price != null && typeof data.price === "object" && !Array.isArray(data.price)
      ? (data.price as Record<string, unknown>)
      : null) ??
    null;

  const metadataNode =
    data.metadata != null && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : null;
  const metadataPricingNode =
    metadataNode?.pricing != null &&
    typeof metadataNode.pricing === "object" &&
    !Array.isArray(metadataNode.pricing)
      ? (metadataNode.pricing as Record<string, unknown>)
      : null;

  const sourceNodes: Record<string, unknown>[] = [data];
  if (metadataNode) sourceNodes.push(metadataNode);
  if (pricingNode) sourceNodes.push(pricingNode);
  if (metadataPricingNode) sourceNodes.push(metadataPricingNode);

  const firstNumberFromSources = (keys: string[]): number | undefined => {
    for (const node of sourceNodes) {
      const found = firstNumberFromKeys(node, keys);
      if (found != null) return found;
    }
    return undefined;
  };
  const firstHourFromSources = (keys: string[]): number | undefined => {
    for (const node of sourceNodes) {
      const found = firstHourFromKeys(node, keys);
      if (found != null) return found;
    }
    return undefined;
  };

  const explicitPricePerHour = firstNumberFromSources([
    "pricePerHour",
    "price_per_hour",
    "hourlyPrice",
    "hourPrice",
    "priceHour",
    "hourly_price",
    "basePrice",
    "defaultPrice",
    "rentPrice",
    "fieldPrice",
    "venuePrice",
    "bookingBasePrice",
    "سعر_الساعة",
    "سعرالساعة",
    "سعرالحجز",
    "سعر_الحجز"
  ]);
  const fallbackGenericPrice = firstNumberFromSources(["price", "سعر"]);
  const pricePerHour = explicitPricePerHour ?? fallbackGenericPrice;

  const price60 = firstNumberFromSources([
    "price60",
    "price_60",
    "priceFor60",
    "bookingPrice60",
    "سعر60",
    "سعر_60"
  ]);
  const price90Keys = [
    "price90",
    "price_90",
    "price_1_5_hours",
    "price1_5_hours",
    "price_1.5_hours",
    "price_1_5_hour",
    "price_1.5_hour",
    "price90min",
    "priceFor90",
    "bookingPrice90",
    "سعر90",
    "سعر_90"
  ];
  const price120Keys = [
    "price120",
    "price_120",
    "price_2_hours",
    "price2_hours",
    "price_2_hour",
    "price2_hour",
    "priceFor120",
    "bookingPrice120",
    "price2h",
    "price_2h",
    "سعر120",
    "سعر_120"
  ];
  const price180Keys = [
    "price180",
    "price_180",
    "price_3_hours",
    "price3_hours",
    "price_3_hour",
    "price3_hour",
    "priceFor180",
    "bookingPrice180",
    "price3h",
    "price_3h",
    "سعر180",
    "سعر_180"
  ];

  const price90 = firstNumberFromSources(price90Keys) ?? deepFindNumberByKeys(data, price90Keys);
  const price120 = firstNumberFromSources(price120Keys) ?? deepFindNumberByKeys(data, price120Keys);
  const price180 = firstNumberFromSources(price180Keys) ?? deepFindNumberByKeys(data, price180Keys);

  console.log("EXTRACTED:", { price90, price120, price180 });

  let openHour = firstHourFromSources([
    "openHour","open_hour","openingHour","startHour","workStartHour","dayStartHour","opensAt","openTime"
  ]);
  let closeHour = firstHourFromSources([
    "closeHour","close_hour","closingHour","endHour","workEndHour","dayEndHour","closesAt","closeTime"
  ]);

  if (openHour != null && closeHour != null && openHour >= closeHour) {
    openHour = undefined;
    closeHour = undefined;
  }

  const phoneRaw = data.phone ?? data.ownerPhone ?? data.contactPhone ?? data.mobile;
  const phone = typeof phoneRaw === "string" && phoneRaw.trim() ? phoneRaw.trim() : undefined;

  const base: FieldDocExtras = {
    ...(pricePerHour != null ? { pricePerHour } : {}),
    ...(price60 != null ? { price60 } : {}),
    ...(price90 != null ? { price90 } : {}),
    ...(price120 != null ? { price120 } : {}),
    ...(price180 != null ? { price180 } : {}),
    ...(openHour != null ? { openHour } : {}),
    ...(closeHour != null ? { closeHour } : {}),
    ...(phone ? { phone } : {})
  };

  // ✅ FIX الوحيد: ترتيب الدمج حتى لا تنمسح القيم
  const mergedData = {
    ...(data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : {}),
    ...(pricingNode ?? {}),
    ...(metadataPricingNode ?? {}),
    ...data
  };

  const extras = mergeDurationPriceMap(mergedData, base);

  console.log("[Pricing Debug]", {
    rawData: data,
    extracted: extras,
    map: buildDurationPriceMap(extras)
  });

  return extras;
}

/** كائن مثل `durationPrices: { "60": 25000, "90": 35000, ... }` أو مفاتيح رقمية من Firestore */
function mergeDurationPriceMap(data: Record<string, unknown>, base: FieldDocExtras): FieldDocExtras {
  const raw =
    data.durationPrices ??
    data.pricesByDuration ??
    data.bookingPrices ??
    data.duration_prices ??
    data.prices ??
    data.slotPrices;

  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return base;

  const o = raw as Record<string, unknown>;

  const pick = (keys: string[]) => {
    for (const k of keys) {
      const n = parseFirestoreNumber(o[k]);
      if (n != null) return n;
    }
    return undefined;
  };

  let next: FieldDocExtras = {
    ...base,
    price60: base.price60 ?? pick(["60","m60","1h","oneHour"]),
    price90: base.price90 ?? pick(["90","m90","1.5h","oneHalf","90min"]),
    price120: base.price120 ?? pick(["120","m120","2h","twoHours"]),
    price180: base.price180 ?? pick(["180","m180","3h","threeHours"])
  };

  for (const [key, val] of Object.entries(o)) {
    const mins = parseInt(key, 10);
    const num = parseFirestoreNumber(val);
    if (num == null || !Number.isFinite(mins)) continue;
    if (mins === 60 && next.price60 == null) next = { ...next, price60: num };
    else if (mins === 90 && next.price90 == null) next = { ...next, price90: num };
    else if (mins === 120 && next.price120 == null) next = { ...next, price120: num };
    else if (mins === 180 && next.price180 == null) next = { ...next, price180: num };
  }

  return {
    ...next,
    price60: parseFirestoreNumber(next.price60),
    price90: parseFirestoreNumber(next.price90),
    price120: parseFirestoreNumber(next.price120),
    price180: parseFirestoreNumber(next.price180),
    pricePerHour: parseFirestoreNumber(next.pricePerHour)
  };
}

export function computeSuggestedBookingPrice(
  extras: FieldDocExtras,
  durationMins: number
): number | undefined {
  return getDurationPrice(extras, durationMins);
}

export function buildDurationPriceMap(
  extras: Partial<FieldDocExtras> | null | undefined
): DurationPriceMap {
  const safe = extras ?? {};

  const toValid = (n: unknown): number | null => {
    const parsed = parseFirestoreNumber(n);
    return parsed != null && parsed >= 0 ? parsed : null;
  };

  const map: DurationPriceMap = {
    60: toValid(safe.price60 ?? safe.pricePerHour),
    90: toValid(safe.price90),
    120: toValid(safe.price120),
    180: toValid(safe.price180)
  };

  return map;
}

export function getDurationPrice(
  extras: Partial<FieldDocExtras> | null | undefined,
  durationMins: number
): number | undefined {
  const map = buildDurationPriceMap(extras);
  if (durationMins !== 60 && durationMins !== 90 && durationMins !== 120 && durationMins !== 180)
    return undefined;

  const price = map[durationMins];
  return price == null ? undefined : price;
}