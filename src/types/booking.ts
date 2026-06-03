// ─────────────────────────────────────────────────────────────────────────────
// MK2R Fitness — Booking Ecosystem Types
// ─────────────────────────────────────────────────────────────────────────────

// ── Membership tiers (matches mk2_users/{uid}/membership in Firebase) ─────────
export type MembershipTier =
  | "basic" // free, no class bookings
  | "u18" // R700/mo · 24 classes/mo · CrossFit only · 1 booking/day
  | "hybrid_12m" // R950/mo  · 14 classes/mo · all except Open Gym · 1/day
  | "hybrid_6m" // R1 065/mo
  | "hybrid_m2m" // R1 150/mo
  | "unlimited_12m" // R1 150/mo · 50 classes/mo · all classes · 2/day
  | "unlimited_6m" // R1 265/mo
  | "unlimited_m2m"; // R1 390/mo

// ── Derived tier family (for limit checks) ───────────────────────────────────
export type TierFamily = "basic" | "u18" | "hybrid" | "unlimited";

export function getTierFamily(tier: MembershipTier): TierFamily {
  if (tier === "basic") return "basic";
  if (tier === "u18") return "u18";
  if (tier.startsWith("hybrid")) return "hybrid";
  return "unlimited";
}

// ── Per-tier booking rules ────────────────────────────────────────────────────
export interface TierRules {
  maxClassesPerMonth: number; // rolling 30-day window
  maxBookingsPerDay: number;
  allowedCategories: string[]; // empty = all allowed
  requiresCredits: boolean; // non-members spend classCredits
}

export const TIER_RULES: Record<TierFamily, TierRules> = {
  basic: {
    maxClassesPerMonth: 0,
    maxBookingsPerDay: 0,
    allowedCategories: [],
    requiresCredits: true, // pay-per-class via credits
  },
  u18: {
    maxClassesPerMonth: 24,
    maxBookingsPerDay: 1,
    allowedCategories: ["Crossfit"], // CrossFit only
    requiresCredits: false,
  },
  hybrid: {
    maxClassesPerMonth: 14,
    maxBookingsPerDay: 1,
    // All except Open Gym
    allowedCategories: [
      "Crossfit",
      "Gymnastics",
      "Strength",
      "Olympic Lifting",
      "Saturday Smasher",
    ],
    requiresCredits: false,
  },
  unlimited: {
    maxClassesPerMonth: 50,
    maxBookingsPerDay: 2,
    allowedCategories: [], // empty = all categories allowed
    requiresCredits: false,
  },
};

// ── Class (from admin_classes in Firebase) ────────────────────────────────────
export interface GymClass {
  id: string;
  name: string;
  time: string; // "06:00"
  trainer: string;
  spots: number;
  duration: string;
  intensity: string;
  category: string;
  subtitle?: string;
  details?: string[];
  wod?: string;
  scheduleType: "day" | "date";
  day?: string; // "Monday" — for recurring
  specificDate?: string; // "2025-06-14" — for once-off
  chargeNonMembers: boolean;
  price: number;
  bookedCount?: number;
}

// ── Individual booking record (stored in class_bookings/{key}/{uid}) ──────────
export interface BookingRecord {
  name: string;
  email: string;
  bookedAt: number; // Unix ms
  status: "confirmed" | "pending_payment" | "cancelled";
  membershipTier: MembershipTier;
}

// ── Pending payment (stored in pending_bookings/{bookingId}) ──────────────────
export interface PendingBooking {
  userId: string;
  userEmail: string;
  userName: string;
  classId: string;
  className: string;
  dateKey: string; // "2025-06-14"
  dateDisplay: string; // "Saturday, 14 June 2025"
  time: string;
  price: number;
  creditsPurchased?: number; // if buying a credit pack instead of single class
  status: "pending_payment" | "confirmed" | "failed" | "cancelled";
  createdAt: number;
  confirmedAt?: number;
  payfastPfPaymentId?: string;
}

// ── Credit pack (stored in packages/{id} in Firebase) ────────────────────────
export interface CreditPack {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number; // ZAR
  badge?: string;
  active: boolean;
  perClassRate: number; // computed: price / credits
  createdAt?: number;
  updatedAt?: number;
}

// ── User profile (stored in mk2_users/{uid}) ─────────────────────────────────
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  membership: MembershipTier;
  classCredits: number;
  points?: number;
  bookings: UserBooking[];
  creditHistory?: CreditHistoryEntry[];
  createdAt?: number;
}

export interface UserBooking {
  name: string;
  dateKey: string;
  date: string;
  displayDate: string;
  time?: string;
  trainer?: string;
  category?: string;
}

export interface CreditHistoryEntry {
  amount: number; // positive = added, negative = spent
  type:
    | "pack_purchase" // bought a credit pack via PayFast
    | "class_spend" // used a credit to book a class
    | "admin_assign" // admin manually added credits
    | "admin_cancel" // admin cancelled booking, credit refunded
    | "user_cancel"; // user cancelled, credit refunded
  note: string;
  timestamp: number;
  payfastBookingId?: string;
  adminAssigned?: boolean;
}

// ── PayFast ITN payload (what PayFast POSTs to your webhook) ─────────────────
export interface PayFastITN {
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: "COMPLETE" | "FAILED" | "CANCELLED";
  item_name: string;
  amount_gross: string;
  amount_fee: string;
  amount_net: string;
  custom_str1: string; // our bookingId / packPurchaseId
  custom_str2: string; // "class_booking" | "credit_pack"
  custom_str3: string; // userId
  custom_int1: string; // credits purchased (for pack flow)
  email_address: string;
  merchant_id: string;
  signature: string;
}

// ── Booking error ─────────────────────────────────────────────────────────────
export class BookingError extends Error {
  constructor(
    public readonly code:
      | "CLASS_FULL"
      | "ALREADY_BOOKED"
      | "CLASS_PASSED"
      | "MONTHLY_LIMIT"
      | "DAILY_LIMIT"
      | "CATEGORY_BLOCKED"
      | "NO_CREDITS"
      | "PAYMENT_FAILED"
      | "UNKNOWN",
    message: string,
  ) {
    super(message);
    this.name = "BookingError";
  }

  /** User-friendly toast message */
  get userMessage(): string {
    const map: Record<BookingError["code"], string> = {
      CLASS_FULL: "This class is full — check another time slot.",
      ALREADY_BOOKED: "You're already booked into this class.",
      CLASS_PASSED: "This class has already started.",
      MONTHLY_LIMIT:
        "You've reached your monthly class limit for your membership tier.",
      DAILY_LIMIT:
        "You've reached your daily booking limit. Upgrade to Unlimited for 2 bookings per day.",
      CATEGORY_BLOCKED:
        "This class type isn't included in your membership. Upgrade to access it.",
      NO_CREDITS: "You don't have any class credits. Buy a pack to continue.",
      PAYMENT_FAILED: "Payment could not be completed. Please try again.",
      UNKNOWN: "Something went wrong. Please try again.",
    };
    return map[this.code];
  }
}
