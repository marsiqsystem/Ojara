import { COMMERCE_FACTS } from "@/lib/seo";

// ============================================================================
// Delivery dates — built from the real dispatch rule (COMMERCE_FACTS):
//
//   • ordered before 8 pm IST on Mon–Sat → packed and shipped the same day,
//   • after 8 pm, or on a Sunday          → shipped the next working day,
//   • then 3–7 business days in transit (Sundays don't count).
//
// Everything is reckoned in India time, whatever the shopper's device clock zone,
// because that's when the packing actually happens. Used by the product page
// (timeline + countdown), the bag, checkout and the order confirmation, so every
// page promises the same dates.
// ============================================================================

const IST_OFFSET_MIN = 330;
const CUTOFF_HOUR = COMMERCE_FACTS.dispatchCutoffHourIST;

/** A Date whose UTC fields read as the wall-clock time in India. */
const toIst = (d: Date) => new Date(d.getTime() + IST_OFFSET_MIN * 60_000);

const isWorkingDay = (istDay: Date) => istDay.getUTCDay() !== 0; // closed Sundays

const addDays = (d: Date, days: number) => {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const nextWorkingDay = (istDay: Date) => {
  let d = addDays(istDay, 1);
  while (!isWorkingDay(d)) d = addDays(d, 1);
  return d;
};

const addBusinessDays = (istDay: Date, days: number) => {
  let d = istDay;
  let added = 0;
  while (added < days) {
    d = addDays(d, 1);
    if (isWorkingDay(d)) added++;
  }
  return d;
};

/** The IST calendar day an order placed at `now` is packed and shipped. */
export const shipDay = (now: Date = new Date()): Date => {
  const ist = toIst(now);
  const today = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
  if (isWorkingDay(today) && ist.getUTCHours() < CUTOFF_HOUR) return today;
  return nextWorkingDay(today);
};

const formatDay = (istDay: Date) =>
  istDay.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** e.g. "Mon, 22 Sept – Fri, 26 Sept" — the delivery window for an order placed at `now`. */
export const deliveryWindowLabel = (now: Date = new Date()): string => {
  const shipped = shipDay(now);
  return `${formatDay(addBusinessDays(shipped, COMMERCE_FACTS.transitDaysMin))} – ${formatDay(
    addBusinessDays(shipped, COMMERCE_FACTS.transitDaysMax),
  )}`;
};

export interface DispatchTimeline {
  /** "Today", "Tomorrow" or "Mon, 22 Sept". */
  shipLabel: string;
  deliveryLabel: string;
  /** Minutes left to make today's dispatch; null when today's dispatch has gone. */
  minutesToCutoff: number | null;
}

/** Everything the product page's delivery timeline shows, for `now`. */
export const dispatchTimeline = (now: Date = new Date()): DispatchTimeline => {
  const ist = toIst(now);
  const today = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
  const shipped = shipDay(now);
  const daysOut = Math.round((shipped.getTime() - today.getTime()) / 86_400_000);
  const shipLabel = daysOut === 0 ? "Today" : daysOut === 1 ? "Tomorrow" : formatDay(shipped);
  const minutesToCutoff =
    daysOut === 0 ? CUTOFF_HOUR * 60 - (ist.getUTCHours() * 60 + ist.getUTCMinutes()) : null;
  return { shipLabel, deliveryLabel: deliveryWindowLabel(now), minutesToCutoff };
};

/** Shopper-facing sentence of the dispatch rule, for policy pages and accordions. */
export const DISPATCH_POLICY_TEXT =
  "Orders placed before 8 pm are packed and shipped the same day; orders after 8 pm ship the next working day. We dispatch Monday to Saturday.";
