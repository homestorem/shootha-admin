import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
  type DocumentReference,
  type QuerySnapshot
} from "firebase/firestore";
import { getFirestoreDb } from "./firebaseClient";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import { FIELD_REQUESTS_COLLECTION } from "../services/fieldRequestService";
import { t } from "../strings";

/** بادئة معرفات وهمية في القائمة تربط الإشعار بمستند field_requests */
const FIELD_REQUEST_NOTIFICATION_PREFIX = "field_req:" as const;

/** مستندات مجموعة الجذر `notifications` — يُميّزها عن المسار users/.../notifications */
const ROOT_NOTIFICATIONS_PREFIX = "notif_root:" as const;

/** مجموعة الإشعارات في الجذر (مجلد notifications في Firestore) */
export const NOTIFICATIONS_ROOT_COLLECTION = "notifications" as const;

/** يطابق مستندات `users/{userId}/notifications/{id}` أو `notifications/{id}` في Firestore */
export type NotificationRow = {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  type: "booking" | "approval" | "system" | null;
  is_read: boolean | null;
  created_at: string | null;
  /**
   * يطابق `Booking.id` في شاشة الحجوزات: معرف owner_bookings كما هو، أو `vb:{docId}` لحجوزات الداشبورد.
   * الحقول في Firestore (أي واحد يكفي): `bookingUiId` | `deepLinkBookingId` | `bookingId` + `bookingSource`
   */
  booking_ui_id: string | null;
};

const MAX_FETCH = 100;
const MAX_FIELD_REQUESTS = 50;
const MAX_BATCH = 500;

/**
 * يبني معرف فتح الحجز من حقول الداشبورد/الخادم.
 * - bookingSource = owner | owner_booking | owner_bookings → معرف مستند owner_bookings
 * - غير ذلك → يُفترض مستند في مجموعة bookings فيُبنى `vb:{bookingId}`
 */
export function parseBookingUiIdFromNotificationData(data: Record<string, unknown>): string | null {
  if (typeof data.bookingUiId === "string" && data.bookingUiId.trim()) return data.bookingUiId.trim();
  if (typeof data.deepLinkBookingId === "string" && data.deepLinkBookingId.trim()) {
    return data.deepLinkBookingId.trim();
  }
  const bid = typeof data.bookingId === "string" ? data.bookingId.trim() : "";
  if (!bid) return null;
  const src = String(data.bookingSource ?? data.bookingFrom ?? "").toLowerCase();
  if (
    src === "owner" ||
    src === "owner_booking" ||
    src === "owner_bookings" ||
    src === "app"
  ) {
    return bid;
  }
  return `vb:${bid}`;
}

function timestampToIso(raw: unknown): string | null {
  if (raw instanceof Timestamp) {
    return raw.toDate().toISOString();
  }
  if (typeof raw === "string") {
    return raw;
  }
  return null;
}

function mapDoc(docId: string, data: Record<string, unknown>, userId: string): NotificationRow {
  const created_at = timestampToIso(data.createdAt ?? data.created_at);

  let typeRaw: unknown = data.type;
  if (
    typeRaw == null &&
    typeof data.channel === "string" &&
    data.channel.trim().length > 0
  ) {
    typeRaw = "system";
  }
  if (
    typeRaw == null &&
    (String(data.title ?? "").trim().length > 0 || String(data.body ?? data.message ?? "").trim().length > 0)
  ) {
    typeRaw = "system";
  }
  const type =
    typeRaw === "booking" || typeRaw === "approval" || typeRaw === "system" ? typeRaw : null;

  const isReadVal = data.isRead ?? data.is_read ?? data.read;

  return {
    id: docId,
    user_id: userId,
    title: String(data.title ?? ""),
    body: String(data.body ?? data.message ?? ""),
    type,
    is_read: typeof isReadVal === "boolean" ? isReadVal : Boolean(isReadVal),
    created_at,
    booking_ui_id: type === "booking" ? parseBookingUiIdFromNotificationData(data) : null
  };
}

function interpolateName(template: string, fieldName: string): string {
  return template.replace(/\{name\}/g, fieldName || "—");
}

function normalizeStatus(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function isApprovedStatus(s: string): boolean {
  return (
    s === "approved" ||
    s === "accepted" ||
    s === "accept" ||
    s === "مقبول" ||
    s === "تم القبول" ||
    s === "تم الموافقة"
  );
}

function isRejectedStatus(s: string): boolean {
  return (
    s === "rejected" ||
    s === "refused" ||
    s === "declined" ||
    s === "denied" ||
    s === "مرفوض" ||
    s === "رفض" ||
    s === "مرفوضة"
  );
}

function mapFieldRequestsSnapshot(snap: QuerySnapshot, userId: string): NotificationRow[] {
  const rows: NotificationRow[] = [];
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const requestUserUid = typeof data.userUid === "string" ? data.userUid.trim() : "";
    if (!requestUserUid || requestUserUid !== userId) {
      return;
    }
    const st = normalizeStatus(data.status);
    const approved = isApprovedStatus(st);
    const rejected = isRejectedStatus(st);
    if (!approved && !rejected) {
      return;
    }

    const fieldName = String(data.fieldName ?? "").trim();
    const noticeRead = data.approvalNoticeRead === true;

    const created_at =
      timestampToIso(data.reviewedAt ?? data.statusUpdatedAt ?? data.updatedAt ?? data.createdAt) ??
      null;

    if (approved) {
      rows.push({
        id: `${FIELD_REQUEST_NOTIFICATION_PREFIX}${d.id}`,
        user_id: userId,
        title: t.notifications.fieldRequestApprovedTitle,
        body: interpolateName(t.notifications.fieldRequestApprovedBody, fieldName),
        type: "approval",
        is_read: noticeRead,
        created_at,
        booking_ui_id: null
      });
    } else {
      rows.push({
        id: `${FIELD_REQUEST_NOTIFICATION_PREFIX}${d.id}`,
        user_id: userId,
        title: t.notifications.fieldRequestRejectedTitle,
        body: interpolateName(t.notifications.fieldRequestRejectedBody, fieldName),
        type: "approval",
        is_read: noticeRead,
        created_at,
        booking_ui_id: null
      });
    }
  });
  return rows;
}

function mapInboxSnapshot(snap: QuerySnapshot, userId: string): NotificationRow[] {
  const rows: NotificationRow[] = [];
  snap.forEach((d) => {
    rows.push(mapDoc(d.id, d.data() as Record<string, unknown>, userId));
  });
  return rows;
}

function mapRootNotificationsSnapshot(
  snap: QuerySnapshot,
  userId: string,
  ownerPublicId?: string | null
): NotificationRow[] {
  const rows: NotificationRow[] = [];
  const ownerKey = ownerPublicId?.trim() || "";
  snap.forEach((d) => {
    const raw = d.data() as Record<string, unknown>;
    const targetUserUid = typeof raw.userUid === "string" ? raw.userUid.trim() : "";
    const targetUserLegacy = typeof raw.user_id === "string" ? raw.user_id.trim() : "";
    const targetOwnerUserId = typeof raw.userId === "string" ? raw.userId.trim() : "";
    const targetOwnerId = typeof raw.ownerId === "string" ? raw.ownerId.trim() : "";
    const directUidMatch = targetUserUid === userId || targetUserLegacy === userId;
    const ownerMatch = Boolean(ownerKey) && (targetOwnerUserId === ownerKey || targetOwnerId === ownerKey);
    if (!directUidMatch && !ownerMatch) return;

    const base = mapDoc(d.id, raw, userId);
    /**
     * إشعارات الموافقة/الرفض حساسة: يجب أن تكون موجّهة مباشرة إلى uid
     * لتفادي عرض نتيجة طلب ملعب لمستخدم آخر بسبب توجيه ownerId عام.
     */
    if (base.type === "approval" && !directUidMatch) return;
    rows.push({ ...base, id: `${ROOT_NOTIFICATIONS_PREFIX}${d.id}` });
  });
  return rows;
}

/** دمج عدة نتائج من مجموعة `notifications` الجذرية بدون تكرار (نفس معرف المستند) */
function mergeRootNotificationRowsMany(...parts: NotificationRow[][]): NotificationRow[] {
  const byDocId = new Map<string, NotificationRow>();
  const docKey = (row: NotificationRow) =>
    row.id.startsWith(ROOT_NOTIFICATIONS_PREFIX) ? row.id.slice(ROOT_NOTIFICATIONS_PREFIX.length) : row.id;
  for (const part of parts) {
    for (const r of part) {
      const k = docKey(r);
      if (!byDocId.has(k)) {
        byDocId.set(k, r);
      }
    }
  }
  return Array.from(byDocId.values());
}

function mergeAndSort(...parts: NotificationRow[][]): NotificationRow[] {
  const merged = parts.flat();
  merged.sort((x, y) => {
    const tx = x.created_at ? Date.parse(x.created_at) : 0;
    const ty = y.created_at ? Date.parse(y.created_at) : 0;
    return ty - tx;
  });
  return merged;
}

function snapshotFromSettled(r: PromiseSettledResult<QuerySnapshot>, label: string): QuerySnapshot | null {
  if (r.status === "fulfilled") {
    return r.value;
  }
  console.warn(`[notifications] ${label}:`, r.reason);
  return null;
}

function isFirestoreIndexError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "failed-precondition";
}

function snapshotListenerError(e: unknown, onError?: (error: Error) => void): void {
  if (isFirestoreIndexError(e)) {
    console.warn("[notifications] يُحتاج فهرس مركّب في Firestore (أو تحقق من تبويب الفهارس في الكونسول):", e);
    return;
  }
  onError?.(e instanceof Error ? e : new Error(String(e)));
}

/**
 * @param firebaseUid معرّف Firebase Auth (users/... و userUid في الإشعارات)
 * @param ownerPublicId معرّف المالك العام owner_... كما يرسله الداشبورد في حقل `userId`
 */
export async function fetchNotificationsForUser(
  firebaseUid: string,
  ownerPublicId?: string | null
): Promise<NotificationRow[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }
  const db = getFirestoreDb();
  const ownerKey = ownerPublicId?.trim() || null;

  const promises: Promise<QuerySnapshot>[] = [
    getDocs(
      query(collection(db, "users", firebaseUid, "notifications"), orderBy("createdAt", "desc"), limit(MAX_FETCH))
    ),
    getDocs(
      query(
        collection(db, NOTIFICATIONS_ROOT_COLLECTION),
        where("userUid", "==", firebaseUid),
        limit(MAX_FETCH)
      )
    ),
    getDocs(
      query(
        collection(db, NOTIFICATIONS_ROOT_COLLECTION),
        where("user_id", "==", firebaseUid),
        limit(MAX_FETCH)
      )
    )
  ];
  if (ownerKey) {
    promises.push(
      getDocs(
        query(
          collection(db, NOTIFICATIONS_ROOT_COLLECTION),
          where("userId", "==", ownerKey),
          limit(MAX_FETCH)
        )
      ),
      getDocs(
        query(
          collection(db, NOTIFICATIONS_ROOT_COLLECTION),
          where("ownerId", "==", ownerKey),
          limit(MAX_FETCH)
        )
      )
    );
  }
  promises.push(
    getDocs(
      query(collection(db, FIELD_REQUESTS_COLLECTION), where("userUid", "==", firebaseUid), limit(MAX_FIELD_REQUESTS))
    )
  );

  const settled = await Promise.allSettled(promises);

  let idx = 0;
  const inboxSnap = snapshotFromSettled(settled[idx++], "users/.../notifications");
  const rootUidSnap = snapshotFromSettled(settled[idx++], "notifications (userUid)");
  const rootLegacySnap = snapshotFromSettled(settled[idx++], "notifications (user_id)");
  let rootOwnerSnap: QuerySnapshot | null = null;
  let rootOwnerIdFieldSnap: QuerySnapshot | null = null;
  if (ownerKey) {
    rootOwnerSnap = snapshotFromSettled(settled[idx++], "notifications (userId owner_)");
    rootOwnerIdFieldSnap = snapshotFromSettled(settled[idx++], "notifications (ownerId field)");
  }
  const frSnap = snapshotFromSettled(settled[idx], "field_requests");

  const inboxRows = inboxSnap ? mapInboxSnapshot(inboxSnap, firebaseUid) : [];
  const rootRows = mergeRootNotificationRowsMany(
    rootUidSnap ? mapRootNotificationsSnapshot(rootUidSnap, firebaseUid, ownerKey) : [],
    rootLegacySnap ? mapRootNotificationsSnapshot(rootLegacySnap, firebaseUid, ownerKey) : [],
    rootOwnerSnap ? mapRootNotificationsSnapshot(rootOwnerSnap, firebaseUid, ownerKey) : [],
    rootOwnerIdFieldSnap ? mapRootNotificationsSnapshot(rootOwnerIdFieldSnap, firebaseUid, ownerKey) : []
  );
  const frRows = frSnap ? mapFieldRequestsSnapshot(frSnap, firebaseUid) : [];

  return mergeAndSort(inboxRows, rootRows, frRows);
}

/**
 * اشتراك مباشر في Firestore — تتحدث القائمة فور إضافة إشعار أو تغيير حالة طلب ملعب.
 * @param ownerPublicId مطلوب لإشعارات الداشبورد التي تستخدم حقل `userId` = owner_...
 */
export function subscribeNotificationsForUser(
  firebaseUid: string,
  ownerPublicId: string | null | undefined,
  onUpdate: (rows: NotificationRow[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured()) {
    onUpdate([]);
    return () => {};
  }

  const db = getFirestoreDb();
  const ownerKey = ownerPublicId?.trim() || null;

  let inboxRows: NotificationRow[] = [];
  let rootUidRows: NotificationRow[] = [];
  let rootLegacyRows: NotificationRow[] = [];
  let rootOwnerRows: NotificationRow[] = [];
  let rootOwnerIdFieldRows: NotificationRow[] = [];
  let frRows: NotificationRow[] = [];

  const emit = () =>
    onUpdate(
      mergeAndSort(
        inboxRows,
        mergeRootNotificationRowsMany(rootUidRows, rootLegacyRows, rootOwnerRows, rootOwnerIdFieldRows),
        frRows
      )
    );

  const inboxQ = query(
    collection(db, "users", firebaseUid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(MAX_FETCH)
  );
  const rootUidQ = query(
    collection(db, NOTIFICATIONS_ROOT_COLLECTION),
    where("userUid", "==", firebaseUid),
    limit(MAX_FETCH)
  );
  const rootLegacyQ = query(
    collection(db, NOTIFICATIONS_ROOT_COLLECTION),
    where("user_id", "==", firebaseUid),
    limit(MAX_FETCH)
  );
  const rootOwnerQ = ownerKey
    ? query(
        collection(db, NOTIFICATIONS_ROOT_COLLECTION),
        where("userId", "==", ownerKey),
        limit(MAX_FETCH)
      )
    : null;
  const rootOwnerIdFieldQ = ownerKey
    ? query(
        collection(db, NOTIFICATIONS_ROOT_COLLECTION),
        where("ownerId", "==", ownerKey),
        limit(MAX_FETCH)
      )
    : null;
  const frQ = query(
    collection(db, FIELD_REQUESTS_COLLECTION),
    where("userUid", "==", firebaseUid),
    limit(MAX_FIELD_REQUESTS)
  );

  const unsubInbox = onSnapshot(
    inboxQ,
    (snap) => {
      inboxRows = mapInboxSnapshot(snap, firebaseUid);
      emit();
    },
    (e) => snapshotListenerError(e, onError)
  );

  const unsubRootUid = onSnapshot(
    rootUidQ,
    (snap) => {
      rootUidRows = mapRootNotificationsSnapshot(snap, firebaseUid, ownerKey);
      emit();
    },
    (e) => snapshotListenerError(e, onError)
  );

  const unsubRootLegacy = onSnapshot(
    rootLegacyQ,
    (snap) => {
      rootLegacyRows = mapRootNotificationsSnapshot(snap, firebaseUid, ownerKey);
      emit();
    },
    (e) => snapshotListenerError(e, onError)
  );

  const unsubRootOwner = rootOwnerQ
    ? onSnapshot(
        rootOwnerQ,
        (snap) => {
          rootOwnerRows = mapRootNotificationsSnapshot(snap, firebaseUid, ownerKey);
          emit();
        },
        (e) => snapshotListenerError(e, onError)
      )
    : null;

  const unsubRootOwnerIdField = rootOwnerIdFieldQ
    ? onSnapshot(
        rootOwnerIdFieldQ,
        (snap) => {
          rootOwnerIdFieldRows = mapRootNotificationsSnapshot(snap, firebaseUid, ownerKey);
          emit();
        },
        (e) => snapshotListenerError(e, onError)
      )
    : null;

  const unsubFr = onSnapshot(
    frQ,
    (snap) => {
      frRows = mapFieldRequestsSnapshot(snap, firebaseUid);
      emit();
    },
    (e) => snapshotListenerError(e, onError)
  );

  return () => {
    unsubInbox();
    unsubRootUid();
    unsubRootLegacy();
    unsubRootOwner?.();
    unsubRootOwnerIdField?.();
    unsubFr();
  };
}

function parseFieldRequestDocId(notificationId: string): string | null {
  if (!notificationId.startsWith(FIELD_REQUEST_NOTIFICATION_PREFIX)) {
    return null;
  }
  const rest = notificationId.slice(FIELD_REQUEST_NOTIFICATION_PREFIX.length);
  return rest.length > 0 ? rest : null;
}

function parseRootNotificationDocId(notificationId: string): string | null {
  if (!notificationId.startsWith(ROOT_NOTIFICATIONS_PREFIX)) {
    return null;
  }
  const rest = notificationId.slice(ROOT_NOTIFICATIONS_PREFIX.length);
  return rest.length > 0 ? rest : null;
}

export async function markNotificationRead(firebaseUid: string, notificationId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirestoreDb();
  const frId = parseFieldRequestDocId(notificationId);
  if (frId) {
    await updateDoc(doc(db, FIELD_REQUESTS_COLLECTION, frId), { approvalNoticeRead: true });
    return;
  }
  const rootId = parseRootNotificationDocId(notificationId);
  if (rootId) {
    /** الداشبورد يستخدم `read`؛ نحدّث الحقلين لتوحيد السلوك */
    await updateDoc(doc(db, NOTIFICATIONS_ROOT_COLLECTION, rootId), { read: true, isRead: true });
    return;
  }
  await updateDoc(doc(db, "users", firebaseUid, "notifications", notificationId), { isRead: true });
}

function runBatchedUpdates(
  db: ReturnType<typeof getFirestoreDb>,
  updates: Array<{ ref: DocumentReference; data: Record<string, unknown> }>
): Promise<void> {
  let batch = writeBatch(db);
  let ops = 0;
  const out: Promise<void>[] = [];

  for (const u of updates) {
    batch.update(u.ref, u.data);
    ops++;
    if (ops >= MAX_BATCH) {
      out.push(batch.commit());
      batch = writeBatch(db);
      ops = 0;
    }
  }
  if (ops > 0) {
    out.push(batch.commit());
  }
  return out.length ? Promise.all(out).then(() => undefined) : Promise.resolve();
}

function isRootDocUnread(data: Record<string, unknown>): boolean {
  const read =
    data.isRead === true ||
    data.is_read === true ||
    data.read === true;
  return !read;
}

export async function markAllNotificationsReadForUser(
  firebaseUid: string,
  ownerPublicId?: string | null
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirestoreDb();
  const ownerKey = ownerPublicId?.trim() || null;

  const inboxSnap = await getDocs(collection(db, "users", firebaseUid, "notifications"));
  const inboxUpdates: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];
  for (const d of inboxSnap.docs) {
    const data = d.data();
    const read = data.isRead === true || data.is_read === true;
    if (read) continue;
    inboxUpdates.push({ ref: d.ref, data: { isRead: true } });
  }

  const rootUpdates: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];
  const rootUidSnap = await getDocs(
    query(collection(db, NOTIFICATIONS_ROOT_COLLECTION), where("userUid", "==", firebaseUid), limit(MAX_FETCH))
  );
  for (const d of rootUidSnap.docs) {
    const data = d.data();
    if (!isRootDocUnread(data)) continue;
    rootUpdates.push({ ref: d.ref, data: { read: true, isRead: true } });
  }
  const rootLegacySnap = await getDocs(
    query(collection(db, NOTIFICATIONS_ROOT_COLLECTION), where("user_id", "==", firebaseUid), limit(MAX_FETCH))
  );
  for (const d of rootLegacySnap.docs) {
    const data = d.data();
    if (!isRootDocUnread(data)) continue;
    const already = rootUpdates.some((u) => u.ref.id === d.id);
    if (already) continue;
    rootUpdates.push({ ref: d.ref, data: { read: true, isRead: true } });
  }
  if (ownerKey) {
    const rootOwnerSnap = await getDocs(
      query(collection(db, NOTIFICATIONS_ROOT_COLLECTION), where("userId", "==", ownerKey), limit(MAX_FETCH))
    );
    for (const d of rootOwnerSnap.docs) {
      const data = d.data();
      if (!isRootDocUnread(data)) continue;
      const already = rootUpdates.some((u) => u.ref.id === d.id);
      if (already) continue;
      rootUpdates.push({ ref: d.ref, data: { read: true, isRead: true } });
    }
    const rootOwnerIdSnap = await getDocs(
      query(collection(db, NOTIFICATIONS_ROOT_COLLECTION), where("ownerId", "==", ownerKey), limit(MAX_FETCH))
    );
    for (const d of rootOwnerIdSnap.docs) {
      const data = d.data();
      if (!isRootDocUnread(data)) continue;
      const already = rootUpdates.some((u) => u.ref.id === d.id);
      if (already) continue;
      rootUpdates.push({ ref: d.ref, data: { read: true, isRead: true } });
    }
  }

  const frSnap = await getDocs(
    query(collection(db, FIELD_REQUESTS_COLLECTION), where("userUid", "==", firebaseUid), limit(MAX_FIELD_REQUESTS))
  );
  const frUpdates: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];
  for (const d of frSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const st = normalizeStatus(data.status);
    if (!isApprovedStatus(st) && !isRejectedStatus(st)) continue;
    if (data.approvalNoticeRead === true) continue;
    frUpdates.push({ ref: d.ref, data: { approvalNoticeRead: true } });
  }

  await runBatchedUpdates(db, [...inboxUpdates, ...rootUpdates, ...frUpdates]);
}
