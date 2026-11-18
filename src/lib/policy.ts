// Short versions of the exchange / return / refund policy, for the FAQ and the
// product page. The full text is /shipping-returns; the day counts come from
// COMMERCE_FACTS so every place says the same numbers (client, 2026-11-16).
import { COMMERCE_FACTS } from "@/lib/seo";

const { refundDaysMin, refundDaysMax, replacementDaysMin, replacementDaysMax } = COMMERCE_FACTS;

/** Change of mind on a gemstone piece: the 48-hour exchange. */
export const INTENTIONS_EXCHANGE_POLICY = `If the piece isn't the right fit, request an exchange within 48 hours of delivery, unused and in its original packaging. The exchange/replacement product will be delivered within ${replacementDaysMin}–${replacementDaysMax} days.`;

/** Returns and refunds: damaged, defective or wrong pieces only. */
export const REFUND_POLICY_SHORT = `Returns are accepted when a piece arrives damaged, defective or isn't what you ordered — tell us within 48 hours of delivery with your order number and unboxing video. You can choose a replacement (delivered within ${replacementDaysMin}–${replacementDaysMax} days) or a refund. Approved refunds are processed within ${refundDaysMin}–${refundDaysMax} business days to your original payment method, or by UPI/bank transfer for Cash on Delivery orders. Change-of-mind returns aren't accepted — use the 48-hour exchange instead.`;
