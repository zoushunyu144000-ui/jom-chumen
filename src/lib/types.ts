export const CITY_IDS = ["all", "penang", "kl", "jb", "singapore", "bangkok"] as const;
export type CityId = (typeof CITY_IDS)[number];
export const CATEGORY_IDS = ["all", "frisbee", "photo", "hike", "reading", "citywalk", "water", "racket", "camp", "talk", "yoga"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];
export const PAYMENT_METHODS = ["tng", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number] | "wechat" | "alipay";
export type Currency = "MYR" | "SGD" | "THB";
export type ApplyStatus = "pending" | "approved" | "rejected" | "cancelled";
export type EventStatus = "draft" | "published" | "closed" | "cancelled" | "archived";

export type RichRun = { text: string; bold?: boolean; href?: string };
export type BodyBlock =
  | { type: "h"; text: string; level?: 1 | 2; runs?: RichRun[] }
  | { type: "p"; text: string; runs?: RichRun[]; divider?: boolean }
  | { type: "quote"; text: string; runs?: RichRun[] }
  | { type: "ul"; items: string[]; richItems?: RichRun[][]; ordered?: boolean }
  | { type: "img"; src: string; caption: string };

export type EventRecord = {
  id: string; slug: string; title: string; subtitle: string;
  category: Exclude<CategoryId, "all">; city: Exclude<CityId, "all">;
  venue: string; address: string; lat: number | null; lng: number | null;
  startsAt: string; endsAt: string; currency: Currency; price: number; capacity: number;
  sold: number; booked: number; remaining: number; coverUrl: string; description: string;
  highlights: string[]; hostName: string; hostNote: string; level: "newbie" | "all" | "intermediate";
  body: BodyBlock[]; clubId: string | null; clubName: string | null; userId: string | null;
  open: boolean; status: EventStatus; cancelReason: string; whatsapp: string;
  wechatQr: string; alipayQr: string; tngQr: string;
};
export type ClubStaff = { userId: string; name: string; avatarUrl: string; role: "owner" | "admin" };
export type ClubRecord = { id: string; name: string; bio: string; city: Exclude<CityId, "all">; coverUrl: string; avatarUrl: string; hostName: string; eventCount: number; isOwner: boolean; isAdmin: boolean; staff: ClubStaff[] };
export type TicketRecord = { id: string; code: string; applyNo: string; nickname: string; phoneMasked: string; seats: number; paymentMethod: PaymentMethod | "free"; paymentStatus: ApplyStatus | "paid" | "failed"; amount: number; currency: Currency; createdAt: string; rejectReason: string; cancelReason: string; contactWechat: string; contactWhatsapp: string; verifyUrl: string; event: EventRecord };
export type ProfileRecord = { displayName: string; avatarUrl: string; tags: string[] };
export type MessageRecord = { id: string; title: string; body: string; href: string; read: boolean; createdAt: string };
